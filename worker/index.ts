// Cloudflare Worker Principal - Club de Finanzas UBA
// Conexión a Cloudflare D1, Motor Paper Trading Institucional y Servicio de Activos Next.js

import { Env } from "./types";
import { authenticateGroupCredentials, createGroupSessionToken } from "./group-auth";
import { fetchLiveMarketQuote } from "./market-feed";
import {
  getMarkedPortfolio,
  executeOrder,
  closePosition,
  getTradesHistory,
  getLeaderboard,
  DEFAULT_GAME_ID,
} from "./paper-engine";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-group-token",
  "Content-Type": "application/json",
};

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
    // 2. COTIZACIÓN DE MERCADO EN VIVO (Yahoo Finance Proxy - Zero Look-Ahead Bias)
    // =========================================================================
    if (url.pathname.startsWith("/api/paper/market/quote/") && request.method === "GET") {
      try {
        const rawSymbol = decodeURIComponent(url.pathname.split("/quote/")[1] || "").trim();
        if (!rawSymbol) {
          return new Response(
            JSON.stringify({ success: false, error: "Símbolo requerido." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const quote = await fetchLiveMarketQuote(rawSymbol);
        return new Response(
          JSON.stringify({ success: true, data: quote }),
          { status: 200, headers: corsHeaders }
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

        const result = await getMarkedPortfolio(env.DB, groupId);
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
    // 4. EJECUTAR ORDEN DE COMPRA / VENTA (APERTURA CON APALANCAMIENTO)
    // =========================================================================
    if (url.pathname === "/api/paper/orders" && request.method === "POST") {
      try {
        if (!env.DB) {
          return new Response(
            JSON.stringify({ success: false, error: "Base de datos D1 no disponible." }),
            { status: 503, headers: corsHeaders }
          );
        }

        const body = (await request.json().catch(() => ({}))) as {
          groupId?: string;
          symbol?: string;
          positionSide?: "LONG" | "SHORT";
          quantity?: number;
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

        const orderResult = await executeOrder(env.DB, groupId, {
          symbol: body.symbol || "",
          positionSide: body.positionSide,
          quantity: Number(body.quantity),
          leverage: body.leverage,
          marginMode: body.marginMode,
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
    // 5. CERRAR POSICIÓN ABIERTA
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
        };

        const groupId = body.groupId?.trim();
        const positionId = body.positionId?.trim();
        if (!groupId || !positionId) {
          return new Response(
            JSON.stringify({ success: false, error: "groupId y positionId son requeridos." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const closeResult = await closePosition(env.DB, groupId, positionId);
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

        const trades = await getTradesHistory(env.DB, groupId);
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

        const leaderboard = await getLeaderboard(env.DB);
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
    // 9. SERVIR ACTIVOS ESTÁTICOS DE NEXT.JS
    // =========================================================================
    return env.ASSETS.fetch(request);
  },
};
