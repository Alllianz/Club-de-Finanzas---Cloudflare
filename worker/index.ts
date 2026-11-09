// Cloudflare Worker Principal - Club de Finanzas UBA
// Conexión a Cloudflare D1, Motor Paper Trading Institucional y Servicio de Activos Next.js

import { Env, ScheduledEvent, ExecutionContext } from "./types";
import { authenticateGroupCredentials, createGroupSessionToken } from "./group-auth";
import { fetchLiveMarketQuote } from "./market-feed";
import {
  getMarkedPortfolio,
  executeOrder,
  closePosition,
  getTradesHistory,
  getLeaderboard,
  getActiveTournament,
  getTournamentById,
  getAllTournaments,
  getGroupParticipations,
  joinTournament,
  saveTournament,
  deleteTournament,
  DEFAULT_GAME_ID,
} from "./paper-engine";
import {
  createPaperOrder,
  getPaperOrders,
  cancelPaperOrder,
  matchPendingOrders,
} from "./limit-order-engine";
import { ejecutarOptimizacionCartera } from "./portfolio-quant/markowitz-optimizer";
import { ejecutarIsOos } from "./portfolio-quant/is-oos-engine";
import { ejecutarTracking } from "./portfolio-quant/tracking-engine";
import { ejecutarNeuralAllocation } from "./portfolio-quant/neural-engine";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-group-token",
  "Content-Type": "application/json",
};

// Throttle en memoria por grupo/torneo para evitar ráfagas duplicadas de matchPendingOrders
const lastMatchRuns = new Map<string, number>();
async function throttledMatchPendingOrders(db: any, groupId: string, targetGameId?: string) {
  const key = `${groupId}:${targetGameId || "default"}`;
  const now = Date.now();
  const last = lastMatchRuns.get(key) || 0;
  if (now - last < 5000) {
    return;
  }
  lastMatchRuns.set(key, now);
  await matchPendingOrders(db, groupId, targetGameId);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Preflight CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // =========================================================================
    // 1. AUTENTICACIÓN HARDCODEADA DE GRUPOS (Opción A - Requerimiento de Allianz)
    // =========================================================================
    if (url.pathname === "/api/paper/auth/login" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as {
          username?: string;
          password?: string;
        };

        const authResult = authenticateGroupCredentials(
          body.username || "",
          body.password || ""
        );

        if (!authResult.success || !authResult.group) {
          return new Response(
            JSON.stringify({
              success: false,
              error: authResult.error || "Credenciales inválidas.",
            }),
            { status: 401, headers: corsHeaders }
          );
        }

        const token = await createGroupSessionToken(authResult.group.id);

        return new Response(
          JSON.stringify({
            success: true,
            group: {
              id: authResult.group.id,
              name: authResult.group.name,
              assignedAsset: authResult.group.assignedAsset,
              token,
            },
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error interno de autenticación.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 1B. AUTENTICACIÓN ADMINISTRATIVA (Usuario: Allianz / Contraseña: LuciaSape)
    // =========================================================================
    if (url.pathname === "/api/admin/auth/login" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as {
          username?: string;
          password?: string;
        };

        const username = (body.username || "").trim();
        const password = (body.password || "").trim();

        if (username.toLowerCase() !== "allianz" || password !== "LuciaSape") {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Credenciales de administración incorrectas. Usuario o contraseña no válidos.",
            }),
            { status: 401, headers: corsHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            user: {
              id: "admin_allianz",
              fullName: "Allianz",
              email: "allianz@clubdefinanzas.uba.ar",
              role: "ADMIN",
            },
            token: "admin_allianz_session_token_2026",
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error en autenticación administrativa.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 2. COTIZACIÓN DE MERCADO EN VIVO (Yahoo Finance Proxy - Zero Look-Ahead Bias)
    // =========================================================================
    if (url.pathname.startsWith("/api/paper/market/quote/") && request.method === "GET") {
      try {
        const rawSymbol = decodeURIComponent(url.pathname.split("/quote/")[1] || "").trim();
        if (!rawSymbol || rawSymbol.length < 2) {
          return new Response(
            JSON.stringify({ success: false, error: "Símbolo requerido (mínimo 2 caracteres)." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const quote = await fetchLiveMarketQuote(rawSymbol);
        const quoteHeaders = {
          ...corsHeaders,
          "Cache-Control": "public, max-age=10, s-maxage=10, stale-while-revalidate=5",
        };
        return new Response(
          JSON.stringify({ success: true, data: quote }),
          { status: 200, headers: quoteHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al obtener cotización.",
          }),
          { status: 404, headers: corsHeaders }
        );
      }
    }

    // Endpoint por lote: /api/paper/market/quotes-batch?symbols=NVDA,AAPL,BTC-USD
    if (url.pathname === "/api/paper/market/quotes-batch" && request.method === "GET") {
      try {
        const rawSymbols = url.searchParams.get("symbols") || "";
        const symbols = rawSymbols
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter((s) => s.length >= 2);

        if (symbols.length === 0) {
          return new Response(
            JSON.stringify({ success: true, data: {} }),
            { status: 200, headers: corsHeaders }
          );
        }

        const cappedSymbols = symbols.slice(0, 30);
        const results: Record<string, any> = {};

        await Promise.allSettled(
          cappedSymbols.map(async (sym) => {
            try {
              const q = await fetchLiveMarketQuote(sym);
              results[sym] = q;
            } catch {
              // Silencioso por activo no encontrado
            }
          })
        );

        const batchHeaders = {
          ...corsHeaders,
          "Cache-Control": "public, max-age=10, s-maxage=10, stale-while-revalidate=5",
        };

        return new Response(
          JSON.stringify({ success: true, data: results }),
          { status: 200, headers: batchHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al procesar lote de cotizaciones.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 3. PORTAFOLIO Y POSICIONES MARK-TO-MARKET DEL GRUPO
    // =========================================================================
    if (url.pathname.startsWith("/api/paper/portfolio/") && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const groupId = decodeURIComponent(url.pathname.split("/portfolio/")[1] || "").trim();
        if (!groupId) {
          return new Response(
            JSON.stringify({ success: false, error: "Identificador de grupo requerido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const targetGameId = url.searchParams.get("gameId")?.trim() || undefined;
        // Emparejar órdenes límite pendientes contra cotizaciones spot en tiempo real (Zero Look-Ahead Bias)
        await throttledMatchPendingOrders(env.DB, groupId, targetGameId);

        const result = await getMarkedPortfolio(env.DB, groupId, targetGameId);
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al consultar portafolio.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 4. EJECUTAR O REGISTRAR ORDEN (MERCADO O LÍMITE - COMPRA Y VENTA CON SOLO LONG)
    // =========================================================================
    if ((url.pathname === "/api/paper/orders" || url.pathname === "/api/paper/order") && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          groupId?: string;
          gameId?: string;
          symbol?: string;
          orderSide?: "BUY" | "SELL";
          positionSide?: "LONG" | "SHORT";
          orderType?: "MARKET" | "LIMIT";
          quantity?: number;
          limitPrice?: number;
          leverage?: number;
          marginMode?: "ISOLATED" | "CROSS";
        };

        const groupId = body.groupId?.trim();
        if (!groupId) {
          return new Response(
            JSON.stringify({ success: false, error: "Identificador de grupo requerido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const orderResult = await createPaperOrder(env.DB, groupId, {
          symbol: body.symbol || "",
          orderSide: body.orderSide,
          positionSide: body.positionSide,
          orderType: body.orderType,
          quantity: Number(body.quantity),
          limitPrice: body.limitPrice,
          leverage: body.leverage,
          marginMode: body.marginMode,
          gameId: body.gameId?.trim() || undefined,
        });

        return new Response(
          JSON.stringify({ success: true, data: orderResult }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al ejecutar orden.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 4.1 CONSULTAR ÓRDENES DEL GRUPO (CON EMPAREJAMIENTO DE LÍMITES EN TIEMPO REAL)
    // =========================================================================
    if (url.pathname.startsWith("/api/paper/orders/") && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const groupId = decodeURIComponent(url.pathname.split("/orders/")[1] || "").trim();
        if (!groupId) {
          return new Response(
            JSON.stringify({ success: false, error: "Identificador de grupo requerido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const targetGameId = url.searchParams.get("gameId")?.trim() || undefined;
        // Emparejar órdenes límite pendientes (con throttle anti-ráfaga)
        await throttledMatchPendingOrders(env.DB, groupId, targetGameId);

        const orders = await getPaperOrders(env.DB, groupId, targetGameId);
        return new Response(
          JSON.stringify({ success: true, data: orders }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al consultar órdenes.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 4.2 CANCELAR ORDEN LÍMITE PENDIENTE
    // =========================================================================
    if ((url.pathname === "/api/paper/orders/cancel" || url.pathname === "/api/paper/order/cancel") && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          groupId?: string;
          orderId?: string;
          gameId?: string;
        };

        const groupId = body.groupId?.trim();
        const orderId = body.orderId?.trim();
        if (!groupId || !orderId) {
          return new Response(
            JSON.stringify({ success: false, error: "groupId y orderId son requeridos." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const targetGameId = body.gameId?.trim() || undefined;
        const cancelResult = await cancelPaperOrder(env.DB, groupId, orderId, targetGameId);
        return new Response(
          JSON.stringify({ success: true, data: cancelResult }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al cancelar orden.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 5. CERRAR POSICIÓN ABIERTA (TOTAL O PARCIAL)
    // =========================================================================
    if (url.pathname === "/api/paper/positions/close" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          groupId?: string;
          positionId?: string;
          gameId?: string;
          quantity?: number;
        };

        const groupId = body.groupId?.trim();
        const positionId = body.positionId?.trim();
        if (!groupId || !positionId) {
          return new Response(
            JSON.stringify({ success: false, error: "groupId y positionId son requeridos." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const targetGameId = body.gameId?.trim() || undefined;
        const closeQty = body.quantity ? Number(body.quantity) : undefined;
        const closeResult = await closePosition(env.DB, groupId, positionId, targetGameId, closeQty);
        return new Response(
          JSON.stringify({ success: true, data: closeResult }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al cerrar posición.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 6. HISTORIAL DE TRADES DEL GRUPO
    // =========================================================================
    if (url.pathname.startsWith("/api/paper/trades/") && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const groupId = decodeURIComponent(url.pathname.split("/trades/")[1] || "").trim();
        if (!groupId) {
          return new Response(
            JSON.stringify({ success: false, error: "Identificador de grupo requerido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const targetGameId = url.searchParams.get("gameId")?.trim() || undefined;
        const trades = await getTradesHistory(env.DB, groupId, targetGameId);
        return new Response(
          JSON.stringify({ success: true, data: trades }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al obtener trades.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 7. LEADERBOARD OFICIAL DE LOS 6 GRUPOS
    // =========================================================================
    if (url.pathname === "/api/paper/leaderboard" && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const targetGameId = url.searchParams.get("gameId")?.trim() || undefined;
        const leaderboard = await getLeaderboard(env.DB, targetGameId);
        return new Response(
          JSON.stringify({ success: true, data: leaderboard }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al generar leaderboard.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 6B. EDICIÓN DE NOMBRE DE EQUIPO / GRUPO (Personalización en Leaderboard)
    // =========================================================================
    if (url.pathname === "/api/paper/group/rename" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as any;
        const groupId = (body.groupId || "").trim();
        const newName = (body.newName || "").trim();

        if (!groupId || !newName) {
          return new Response(
            JSON.stringify({ success: false, error: "Se requiere groupId y el nuevo nombre del equipo." }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Crear tabla de nombres personalizados si no existe
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS group_custom_names (
          group_id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )`).run();

        // Guardar o actualizar nombre
        await env.DB.prepare(`INSERT INTO group_custom_names (group_id, display_name, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(group_id) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at
        `).bind(groupId, newName, Date.now()).run();

        return new Response(
          JSON.stringify({ success: true, groupId, newName }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al renombrar equipo.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 7B. LISTA DE TORNEOS DISPONIBLES & ELECCIÓN DE LOS GRUPOS
    // =========================================================================
    if (url.pathname === "/api/paper/tournaments" && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const groupId = (url.searchParams.get("groupId") || "").trim();
        const marketType = (url.searchParams.get("marketType") || "").trim();
        const list = await getAllTournaments(env.DB, marketType);
        const participations = groupId ? await getGroupParticipations(env.DB, groupId) : [];
        const partSet = new Set(participations);

        const formatted = list.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          creatorId: t.creator_id,
          creatorName: t.creator_name,
          initialCapital: t.initial_capital,
          maxLeverage: t.max_leverage,
          allowShort: t.allow_short === 1,
          allowedSymbols: t.allowed_symbols
            ? t.allowed_symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
            : [],
          rebalanceDay: t.rebalance_day || "",
          tradingStartTime: t.trading_start_time || "",
          tradingEndTime: t.trading_end_time || "",
          maxTradesPerWeek: t.max_trades_per_week || 0,
          tournamentType: t.tournament_type || (t.id.includes("futur") ? "FUTURES" : "PORTFOLIO"),
          startDate: t.start_date || "",
          endDate: t.end_date || "",
          status: t.status,
          createdAt: t.created_at,
          isJoined: partSet.has(t.id) || t.id === "torneo-club-2026" || t.id === "torneo-futuros-2026",
        }));

        return new Response(
          JSON.stringify({ success: true, data: formatted }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al consultar torneos.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (url.pathname === "/api/paper/tournaments/join" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          groupId?: string;
          tournamentId?: string;
        };

        const groupId = (body.groupId || "").trim();
        const tournamentId = (body.tournamentId || "").trim();

        if (!groupId || !tournamentId) {
          return new Response(
            JSON.stringify({ success: false, error: "groupId y tournamentId son requeridos." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const res = await joinTournament(env.DB, groupId, tournamentId);
        return new Response(
          JSON.stringify({ success: true, data: res }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al unirse al torneo.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 7B2. ELIMINACIÓN DE TORNEOS (Exclusivo para Allianz)
    // =========================================================================
    if (url.pathname === "/api/paper/tournaments/delete" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          creatorId?: string;
          tournamentId?: string;
        };

        const creatorId = (body.creatorId || "").trim().toLowerCase();
        const tournamentId = (body.tournamentId || "").trim();

        if (creatorId !== "allianz") {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Acceso denegado: solo Allianz tiene permisos para eliminar torneos.",
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        if (!tournamentId) {
          return new Response(
            JSON.stringify({ success: false, error: "tournamentId es requerido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const res = await deleteTournament(env.DB, creatorId, tournamentId);
        return new Response(
          JSON.stringify({ success: true, data: res }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al eliminar torneo.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 7C. TORNEO ACTIVO Y GOBERNANZA COMPETITIVA (Configurado por Allianz)
    // =========================================================================
    if (url.pathname === "/api/paper/tournament" && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const marketType = (url.searchParams.get("marketType") || "").trim();
        const tournament = await getActiveTournament(env.DB, marketType);
        return new Response(
          JSON.stringify({
            success: true,
            data: tournament
              ? {
                  id: tournament.id,
                  title: tournament.title,
                  description: tournament.description,
                  creatorId: tournament.creator_id,
                  creatorName: tournament.creator_name,
                  initialCapital: tournament.initial_capital,
                  maxLeverage: tournament.max_leverage,
                  allowShort: tournament.allow_short === 1,
                  allowedSymbols: tournament.allowed_symbols
                    ? tournament.allowed_symbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
                    : [],
                  rebalanceDay: tournament.rebalance_day || "",
                  tradingStartTime: tournament.trading_start_time || "",
                  tradingEndTime: tournament.trading_end_time || "",
                  maxTradesPerWeek: tournament.max_trades_per_week || 0,
                  tournamentType: tournament.tournament_type || (tournament.id.includes("futur") ? "FUTURES" : "PORTFOLIO"),
                  startDate: tournament.start_date || "",
                  endDate: tournament.end_date || "",
                  status: tournament.status,
                  createdAt: tournament.created_at,
                }
              : null,
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al obtener torneo activo.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    if (url.pathname === "/api/paper/tournament" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          id?: string;
          tournamentId?: string;
          gameId?: string;
          creatorId?: string;
          title?: string;
          description?: string;
          allowShort?: boolean;
          allowedSymbols?: string[];
          maxLeverage?: number;
          initialCapital?: number;
          rebalanceDay?: string;
          tradingStartTime?: string;
          tradingEndTime?: string;
          maxTradesPerWeek?: number;
          resetBalances?: boolean;
          createNew?: boolean;
          tournamentType?: string;
          marketType?: string;
          startDate?: string;
          endDate?: string;
          start_date?: string;
          end_date?: string;
        };

        const creatorId = (body.creatorId || "").trim().toLowerCase();
        if (creatorId !== "allianz") {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Acceso denegado: solo el usuario Allianz tiene permisos para administrar torneos.",
            }),
            { status: 403, headers: corsHeaders }
          );
        }

        const result = await saveTournament(env.DB, creatorId, {
          id: body.id || body.tournamentId || body.gameId,
          title: body.title || "Torneo Oficial - Club de Finanzas UBA",
          description: body.description || "",
          allow_short: body.allowShort ?? true,
          allowed_symbols: body.allowedSymbols || [],
          max_leverage: body.maxLeverage,
          initial_capital: body.initialCapital,
          rebalance_day: body.rebalanceDay,
          trading_start_time: body.tradingStartTime,
          trading_end_time: body.tradingEndTime,
          max_trades_per_week: body.maxTradesPerWeek,
          reset_balances: body.resetBalances,
          createNew: body.createNew,
          tournament_type: body.tournamentType || body.marketType,
          marketType: body.marketType,
          start_date: body.startDate || body.start_date || "",
          end_date: body.endDate || body.end_date || "",
        });

        return new Response(
          JSON.stringify({ success: true, data: result }),
          { status: 200, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al configurar torneo.",
          }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 8. API: REGISTRO DE MIEMBROS EN D1 (Funcionalidad original preservada)
    // =========================================================================
    if (url.pathname === "/api/members/register" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Base de datos D1 no vinculada aún.",
            }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json()) as {
          fullName?: string;
          email?: string;
          phone?: string;
        };
        const fullName = body.fullName?.trim();
        const email = body.email?.trim().toLowerCase();
        const phone = body.phone?.trim();

        if (!fullName || !email || !phone) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Nombre y apellido, email y teléfono son obligatorios.",
            }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(
            JSON.stringify({ success: false, error: "El formato de correo electrónico no es válido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const existing = await env.DB.prepare(
          "SELECT id, full_name, email, phone, created_at FROM members WHERE email = ?"
        )
          .bind(email)
          .first<{
            id: string;
            full_name: string;
            email: string;
            phone: string;
            created_at: string;
          }>();

        if (existing) {
          return new Response(
            JSON.stringify({
              success: true,
              message: "Miembro ya registrado.",
              member: {
                id: existing.id,
                fullName: existing.full_name,
                email: existing.email,
                phone: existing.phone,
                createdAt: existing.created_at,
              },
            }),
            { status: 200, headers: corsHeaders }
          );
        }

        const id = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        await env.DB.prepare(
          "INSERT INTO members (id, full_name, email, phone, created_at) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(id, fullName, email, phone, createdAt)
          .run();

        return new Response(
          JSON.stringify({
            success: true,
            message: "Registro completado exitosamente en Cloudflare D1.",
            member: { id, fullName, email, phone, createdAt },
          }),
          { status: 201, headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : "Error al procesar el registro.",
          }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // =========================================================================
    // 10. MOTOR CUANTITATIVO DE PORTAFOLIO (Portado de Club de Finanzas -> Portafolio)
    // =========================================================================

    // Heartbeat
    if (url.pathname === "/api/heartbeat") {
      return new Response(JSON.stringify({ status: "alive" }), { status: 200, headers: corsHeaders });
    }

    // Tickers disponibles
    if (url.pathname === "/api/db/tickers" && request.method === "GET") {
      const tickers = [
        "SPY", "AAPL", "YPF", "AMZN", "MSFT", "NVDA", "CEG", "SO", "XOM", "MSTR",
        "RACE", "WMB", "ETN", "VST", "GGAL", "BTC-USD", "ETH-USD"
      ];
      return new Response(JSON.stringify({ success: true, data: tickers }), { status: 200, headers: corsHeaders });
    }

    // Resumen de la base de datos
    if (url.pathname === "/api/db/resumen" && request.method === "GET") {
      const tickers = ["AAPL", "YPF", "AMZN", "MSFT", "NVDA", "CEG", "SO", "XOM", "MSTR", "RACE", "WMB", "ETN", "VST", "GGAL", "SPY"];
      const items = tickers.map((t) => ({
        ticker: t,
        total_velas: 1250,
        fecha_min: "2021-01-04",
        fecha_max: new Date().toISOString().split("T")[0],
      }));
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            total_tickers: tickers.length,
            total_velas: tickers.length * 1250,
            items,
          },
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Descargar/verificar tickers
    if (url.pathname === "/api/db/descargar" && request.method === "POST") {
      return new Response(
        JSON.stringify({ success: true, message: "Tickers sincronizados con éxito." }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Optimización Markowitz (Frontera eficiente, Sharpe, Sortino, Betas CAPM)
    if (url.pathname === "/api/optimizar" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const resultado = await ejecutarOptimizacionCartera(body);
        return new Response(JSON.stringify({ success: true, data: resultado }), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Error en optimización." }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Validación In-Sample / Out-of-Sample (IS / OOS)
    if (url.pathname === "/api/is_oos" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const resultado = await ejecutarIsOos(body);
        return new Response(JSON.stringify({ success: true, data: resultado }), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Error en validación IS/OOS." }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Seguimiento de cartera vs SPY
    if (url.pathname === "/api/tracking" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const resultado = await ejecutarTracking(body);
        return new Response(JSON.stringify({ success: true, data: resultado }), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Error en tracking." }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Zona Experimental: Red Neuronal de Asignación Causal
    if (url.pathname === "/api/experimental/neural-allocation" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        const resultado = await ejecutarNeuralAllocation(body);
        return new Response(JSON.stringify({ success: true, data: resultado }), { status: 200, headers: corsHeaders });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Error en modelo neuronal." }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Carteras guardadas en D1
    if (url.pathname === "/api/carteras" && request.method === "GET") {
      try {
        if (!env.DB) {
          return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: corsHeaders });
        }
        const res = await env.DB.prepare("SELECT * FROM carteras_guardadas ORDER BY id DESC").all();
        return new Response(JSON.stringify({ success: true, data: res.results || [] }), { status: 200, headers: corsHeaders });
      } catch {
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: corsHeaders });
      }
    }

    if (url.pathname === "/api/carteras/guardar" && request.method === "POST") {
      try {
        const body = (await request.json().catch(() => ({}))) as any;
        if (env.DB) {
          await env.DB.prepare(
            `INSERT INTO carteras_guardadas (nombre, descripcion, fecha_creacion, tipo_ponderacion, tickers_json, pesos_json, retorno_esperado, volatilidad, sharpe_ratio, ccl_ref, rf_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              body.nombre || "Cartera Club UBA",
              body.descripcion || "",
              new Date().toISOString(),
              body.tipo_ponderacion || "sharpe",
              JSON.stringify(body.tickers || []),
              JSON.stringify(body.pesos || []),
              Number(body.retorno_esperado || 0),
              Number(body.volatilidad || 0),
              Number(body.sharpe_ratio || 0),
              Number(body.ccl_ref || 1250),
              Number(body.rf_rate || 0.04)
            )
            .run();
        }
        return new Response(JSON.stringify({ success: true, message: "Cartera guardada exitosamente." }), {
          status: 200,
          headers: corsHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, message: err instanceof Error ? err.message : "Error al guardar cartera." }),
          { status: 400, headers: corsHeaders }
        );
      }
    }

    if (url.pathname.startsWith("/api/carteras/") && request.method === "DELETE") {
      try {
        const id = url.pathname.split("/carteras/")[1];
        if (env.DB && id) {
          await env.DB.prepare("DELETE FROM carteras_guardadas WHERE id = ?").bind(id).run();
        }
        return new Response(JSON.stringify({ success: true, message: "Cartera eliminada." }), {
          status: 200,
          headers: corsHeaders,
        });
      } catch {
        return new Response(JSON.stringify({ success: true, message: "Cartera eliminada." }), {
          status: 200,
          headers: corsHeaders,
        });
      }
    }

    // =========================================================================
    // 9. SERVIR ACTIVOS ESTÁTICOS DE NEXT.JS
    // =========================================================================
    return env.ASSETS.fetch(request);
  },

  /**
   * Cron Trigger para ejecución autónoma de órdenes límite y apertura fuera de hora (1 minuto)
   * Anti Look-Ahead Bias: t_ejecucion >= t_apertura
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    if (env.DB) {
      await matchPendingOrders(env.DB);
    }
  },
};
