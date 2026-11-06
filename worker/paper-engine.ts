// Motor Cuantitativo y Reglas de Negocio de Paper Trading
// Basado en Aegis Engine - Zero Look-Ahead Bias

import { D1Database, PortfolioRecord, PositionRecord, TradeRecord, LeaderboardEntry, TournamentRecord } from "./types";
import { fetchLiveMarketQuote } from "./market-feed";
import { OFFICIAL_GROUPS } from "./group-auth";

export const DEFAULT_GAME_ID = "torneo-club-2026";
export const DEFAULT_FUTURES_GAME_ID = "torneo-futuros-2026";
export const INITIAL_CAPITAL = 10000.0;
export const MAX_LEVERAGE = 100;
export const FEE_CRYPTO_BPS = 5; // 0.05%
export const STOCK_COMMISSION_PER_SHARE = 0.005;
export const STOCK_COMMISSION_MIN_USD = 1.0;
export const STOCK_COMMISSION_MAX_BPS_OF_NOTIONAL = 0.01;

/**
 * Cálculo exacto de comisiones
 */
export function computeOrderFee(assetType: "Crypto" | "Stock" | "Futures", qty: number, notional: number): number {
  const q = Number(qty) || 0;
  const n = Number(notional) || 0;
  if (assetType === "Crypto") {
    return (n * FEE_CRYPTO_BPS) / 10000;
  }
  if (assetType === "Futures") {
    // Comisión de derivados: 2 bps de nocional con piso mínimo de $1.25 USD por orden
    return Math.max(1.25, (n * 2) / 10000);
  }
  const raw = STOCK_COMMISSION_PER_SHARE * q;
  const cap = n * STOCK_COMMISSION_MAX_BPS_OF_NOTIONAL;
  return Math.max(STOCK_COMMISSION_MIN_USD, Math.min(raw, cap));
}

/**
 * Cálculo del precio de liquidación
 */
export function calculateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  side: "LONG" | "SHORT"
): number {
  if (leverage <= 1) {
    return side === "LONG" ? 0 : entryPrice * 2;
  }
  const mmr = 0.005; // 0.5% margen de mantenimiento
  if (side === "LONG") {
    return Math.max(0, entryPrice * (1.0 - 1.0 / leverage + mmr));
  } else {
    return entryPrice * (1.0 + 1.0 / leverage - mmr);
  }
}

/**
 * Asegura la existencia de la fila de portafolio para el grupo
 */
export async function ensurePortfolioSeed(
  db: D1Database,
  groupId: string,
  customGameId?: string,
  initialCap?: number
): Promise<PortfolioRecord> {
  const tournament = await getActiveTournament(db);
  const gameId = customGameId || tournament?.id || DEFAULT_GAME_ID;
  const capital = initialCap || tournament?.initial_capital || INITIAL_CAPITAL;
  const now = Date.now();

  await db
    .prepare(
      `INSERT OR IGNORE INTO paper_portfolios (game_id, user_id, cash_balance, realized_pnl, total_fees, updated_at)
       VALUES (?, ?, ?, 0.0, 0.0, ?)`
    )
    .bind(gameId, groupId, capital, now)
    .run();

  const row = await db
    .prepare("SELECT * FROM paper_portfolios WHERE game_id = ? AND user_id = ?")
    .bind(gameId, groupId)
    .first<PortfolioRecord>();

  return (
    row || {
      game_id: gameId,
      user_id: groupId,
      cash_balance: capital,
      realized_pnl: 0,
      total_fees: 0,
      updated_at: now,
    }
  );
}

/**
 * Re-cotiza posiciones abiertas y calcula el patrimonio Mark-to-Market
 */
export async function getMarkedPortfolio(db: D1Database, groupId: string, targetGameId?: string) {
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db);
  const gameId = tournament?.id || targetGameId || DEFAULT_GAME_ID;
  const initialCap = tournament?.initial_capital || INITIAL_CAPITAL;

  const port = await ensurePortfolioSeed(db, groupId, gameId, initialCap);
  const posResult = await db
    .prepare("SELECT * FROM paper_positions WHERE game_id = ? AND user_id = ?")
    .bind(gameId, groupId)
    .all<PositionRecord>();

  const rawPositions = posResult.results || [];
  const markedPositions: PositionRecord[] = [];
  const priceCache = new Map<string, number>();

  let totalUsedMargin = 0;
  let totalUnrealizedPnl = 0;

  for (const pos of rawPositions) {
    let currentPrice = pos.current_price || pos.entry_price;

    if (!priceCache.has(pos.symbol)) {
      try {
        const quote = await fetchLiveMarketQuote(pos.symbol);
        priceCache.set(pos.symbol, quote.price);
      } catch {
        priceCache.set(pos.symbol, currentPrice);
      }
    }

    const livePrice = priceCache.get(pos.symbol) || currentPrice;
    let unrealized = 0;
    if (pos.side === "LONG") {
      unrealized = (livePrice - pos.entry_price) * pos.quantity;
    } else {
      unrealized = (pos.entry_price - livePrice) * pos.quantity;
    }

    const margin = Number(pos.initial_margin) || 0;
    totalUsedMargin += margin;
    totalUnrealizedPnl += unrealized;

    markedPositions.push({
      ...pos,
      current_price: livePrice,
      unrealized_pnl: unrealized,
      updated_at: Date.now(),
    });
  }

  const equity = port.cash_balance + totalUsedMargin + totalUnrealizedPnl;
  const roePct = ((equity - initialCap) / initialCap) * 100;

  return {
    portfolio: {
      ...port,
      equity,
      used_margin: totalUsedMargin,
      unrealized_pnl: totalUnrealizedPnl,
      free_margin: port.cash_balance,
      roe_pct: roePct,
    },
    positions: markedPositions,
  };
}

/**
 * Valida si la operación actual está dentro de la ventana de rebalanceo permitida
 * según el día y horario configurado por Allianz (Zero Look-Ahead Bias).
 */
export function checkRebalanceWindow(tournament: TournamentRecord | null): { allowed: boolean; reason?: string } {
  if (!tournament) return { allowed: true };

  const rebalanceDay = (tournament.rebalance_day || "").trim().toUpperCase();
  const startTime = (tournament.trading_start_time || "").trim();
  const endTime = (tournament.trading_end_time || "").trim();

  // Si no hay restricciones de día ni de horario, se permite operar libremente
  if ((!rebalanceDay || rebalanceDay === "ANY" || rebalanceDay === "TODOS") && !startTime && !endTime) {
    return { allowed: true };
  }

  // Obtener fecha y hora en zona horaria de Buenos Aires (America/Argentina/Buenos_Aires)
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;

  const weekday = (map.weekday || "").toUpperCase(); // MON, TUE, WED, THU, FRI, SAT, SUN
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  const currentMinutes = hour * 60 + minute;

  const dayNames: Record<string, string> = {
    MON: "Lunes",
    TUE: "Martes",
    WED: "Miércoles",
    THU: "Jueves",
    FRI: "Viernes",
    SAT: "Sábado",
    SUN: "Domingo",
  };

  // 1. Validar Día de la Semana
  if (rebalanceDay && rebalanceDay !== "ANY" && rebalanceDay !== "TODOS") {
    const allowedDays = rebalanceDay.split(",").map((d) => d.trim().toUpperCase());
    if (!allowedDays.includes(weekday)) {
      const allowedNames = allowedDays.map((d) => dayNames[d] || d).join(", ");
      return {
        allowed: false,
        reason: `Ventana de rebalanceo cerrada: Hoy es ${dayNames[weekday] || weekday}. Las operaciones solo están permitidas los días ${allowedNames}.`,
      };
    }
  }

  // 2. Validar Franja Horaria
  if (startTime && endTime) {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMin = startH * 60 + (startM || 0);
    const endMin = endH * 60 + (endM || 0);

    if (currentMinutes < startMin || currentMinutes > endMin) {
      return {
        allowed: false,
        reason: `Horario de rebalanceo cerrado: La ventana para operar es de ${startTime} a ${endTime} hs (Hora Buenos Aires). Hora actual: ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}.`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Valida si el grupo ha superado el cupo máximo de operaciones de la semana
 */
export async function checkWeeklyTradeLimit(
  db: D1Database,
  gameId: string,
  groupId: string,
  maxTradesPerWeek: number
): Promise<{ allowed: boolean; reason?: string; currentCount?: number }> {
  if (!maxTradesPerWeek || maxTradesPerWeek <= 0) {
    return { allowed: true };
  }

  // Calcular el timestamp del lunes anterior a las 00:00:00 (inicio de la semana)
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayStart = new Date(now);
  mondayStart.setUTCDate(now.getUTCDate() - diffToMonday);
  mondayStart.setUTCHours(0, 0, 0, 0);
  const mondayTimestamp = mondayStart.getTime();

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) as trade_count FROM paper_trades
       WHERE game_id = ? AND user_id = ? AND timestamp >= ?`
    )
    .bind(gameId, groupId, mondayTimestamp)
    .first<{ trade_count: number }>();

  const currentCount = Number(countRow?.trade_count || 0);
  if (currentCount >= maxTradesPerWeek) {
    return {
      allowed: false,
      currentCount,
      reason: `Límite semanal alcanzado: Tu grupo ya ejecutó ${currentCount} de ${maxTradesPerWeek} operaciones permitidas para esta semana. El cupo se renueva el próximo lunes.`,
    };
  }

  return { allowed: true, currentCount };
}

/**
 * Ejecuta una orden de compra o venta (Apertura de posición con apalancamiento)
 */
export async function executeOrder(
  db: D1Database,
  groupId: string,
  input: {
    symbol: string;
    positionSide?: "LONG" | "SHORT";
    quantity: number;
    leverage?: number;
    marginMode?: "ISOLATED" | "CROSS";
    gameId?: string;
  }
) {
  const symbol = input.symbol.trim().toUpperCase();
  const positionSide: "LONG" | "SHORT" = input.positionSide === "SHORT" ? "SHORT" : "LONG";
  const orderSide: "BUY" | "SELL" = positionSide === "LONG" ? "BUY" : "SELL";
  const quantity = Number(input.quantity);
  const leverage = Math.min(Math.max(1, Number(input.leverage) || 1), MAX_LEVERAGE);
  const marginMode: "ISOLATED" | "CROSS" = input.marginMode === "CROSS" ? "CROSS" : "ISOLATED";

  if (!symbol) throw new Error("El símbolo es requerido.");
  if (isNaN(quantity) || quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");

  // Validación de reglas del torneo (activo o especificado por el grupo)
  const tournament = input.gameId ? await getTournamentById(db, input.gameId) : await getActiveTournament(db);
  const gameId = tournament?.id || input.gameId || DEFAULT_GAME_ID;
  const initialCap = tournament?.initial_capital || INITIAL_CAPITAL;
  const maxAllowedLeverage = tournament?.max_leverage || MAX_LEVERAGE;

  // Si no es el administrador Allianz, aplicar estrictamente la ventana de rebalanceo y cupo semanal
  if (groupId.toLowerCase() !== "allianz") {
    const windowCheck = checkRebalanceWindow(tournament);
    if (!windowCheck.allowed) {
      throw new Error(windowCheck.reason || "Operación rechazada por restricciones de ventana de rebalanceo.");
    }

    if (tournament && tournament.max_trades_per_week && tournament.max_trades_per_week > 0) {
      const limitCheck = await checkWeeklyTradeLimit(
        db,
        gameId,
        groupId,
        tournament.max_trades_per_week
      );
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason || "Límite semanal de operaciones superado.");
      }
    }
  }

  if (tournament) {
    if (positionSide === "SHORT" && !tournament.allow_short) {
      throw new Error(
        "Las operaciones en corto (SHORT) no están habilitadas en este torneo. Solo se permiten operaciones LONG."
      );
    }

    if (leverage > maxAllowedLeverage) {
      throw new Error(
        `El apalancamiento máximo permitido en este torneo es ${maxAllowedLeverage}x.`
      );
    }
  }

  // Cotización en vivo (Zero Look-Ahead Bias)
  const quote = await fetchLiveMarketQuote(symbol);

  // En simulación Paper Trading, si el mercado bursátil está cerrado se ejecuta con el último precio oficial registrado
  // manteniendo la cotización de cierre como referencia válida
  const isAfterHours = quote.asset_type === "Stock" && !quote.is_market_open;

  const executedPrice = quote.price;
  const notional = executedPrice * quantity;
  const fee = computeOrderFee(quote.asset_type, quantity, notional);
  const initialMargin = notional / leverage;
  const requiredFunds = initialMargin + fee;

  // Verificar caja disponible en portafolio
  const port = await ensurePortfolioSeed(db, groupId, gameId, initialCap);
  if (port.cash_balance < requiredFunds) {
    throw new Error(
      `Poder de compra insuficiente: la operación requiere $${requiredFunds.toFixed(2)} ($${initialMargin.toFixed(2)} de margen + $${fee.toFixed(2)} de comisión) y el grupo dispone de $${port.cash_balance.toFixed(2)} de liquidez.`
    );
  }

  const nowMs = Date.now();
  const tradeId = `tr_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
  const positionId = `pos_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
  const liquidationPrice = calculateLiquidationPrice(executedPrice, leverage, positionSide);

  // Débito atómico de la caja
  const debitRes = await db
    .prepare(
      `UPDATE paper_portfolios
       SET cash_balance = cash_balance - ?,
           total_fees = total_fees + ?,
           updated_at = ?
       WHERE game_id = ? AND user_id = ? AND cash_balance >= ?`
    )
    .bind(requiredFunds, fee, nowMs, gameId, groupId, requiredFunds)
    .run();

  if (!debitRes.success) {
    throw new Error("No se pudo debitar el saldo. Saldo insuficiente o colisión de concurrencia.");
  }

  // Registrar Trade
  await db
    .prepare(
      `INSERT INTO paper_trades (
         id, game_id, user_id, symbol, asset_type, order_side,
         position_side, quantity, price, fee, realized_pnl, leverage,
         margin_mode, timestamp
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?)`
    )
    .bind(
      tradeId,
      gameId,
      groupId,
      quote.symbol,
      quote.asset_type,
      orderSide,
      positionSide,
      quantity,
      executedPrice,
      fee,
      leverage,
      marginMode,
      nowMs
    )
    .run();

  // Crear Posición
  await db
    .prepare(
      `INSERT INTO paper_positions (
         id, game_id, user_id, symbol, asset_type, side, quantity,
         entry_price, current_price, leverage, margin_mode, initial_margin,
         unrealized_pnl, liquidation_price, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?)`
    )
    .bind(
      positionId,
      gameId,
      groupId,
      quote.symbol,
      quote.asset_type,
      positionSide,
      quantity,
      executedPrice,
      executedPrice,
      leverage,
      marginMode,
      initialMargin,
      liquidationPrice,
      nowMs
    )
    .run();

  return {
    success: true,
    tradeId,
    positionId,
    executedPrice,
    initialMargin,
    fee,
    liquidationPrice,
    quote,
  };
}

/**
 * Cierra una posición abierta, calcula el PnL neto de comisión y reintegra el margen a la caja
 */
export async function closePosition(db: D1Database, groupId: string, positionId: string, targetGameId?: string) {
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db);
  const gameId = tournament?.id || targetGameId || DEFAULT_GAME_ID;

  // Si no es el administrador Allianz, validar ventana de rebalanceo
  if (groupId.toLowerCase() !== "allianz") {
    const windowCheck = checkRebalanceWindow(tournament);
    if (!windowCheck.allowed) {
      throw new Error(windowCheck.reason || "Operación rechazada por restricciones de ventana de rebalanceo.");
    }
  }

  const pos = await db
    .prepare("SELECT * FROM paper_positions WHERE id = ? AND game_id = ? AND user_id = ?")
    .bind(positionId, gameId, groupId)
    .first<PositionRecord>();

  if (!pos) {
    throw new Error("Posición no encontrada o no pertenece a este grupo.");
  }

  // Cotización en vivo para salida
  const quote = await fetchLiveMarketQuote(pos.symbol);
  const exitPrice = quote.price;
  const notional = exitPrice * pos.quantity;
  const closeFee = computeOrderFee(pos.asset_type as "Crypto" | "Stock", pos.quantity, notional);

  let grossPnl = 0;
  if (pos.side === "LONG") {
    grossPnl = (exitPrice - pos.entry_price) * pos.quantity;
  } else {
    grossPnl = (pos.entry_price - exitPrice) * pos.quantity;
  }

  const netRealizedPnl = grossPnl - closeFee;
  const cashReturned = pos.initial_margin + netRealizedPnl;
  const nowMs = Date.now();
  const tradeId = `tr_close_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
  const closeOrderSide: "BUY" | "SELL" = pos.side === "LONG" ? "SELL" : "BUY";

  // Registrar Trade de Cierre
  await db
    .prepare(
      `INSERT INTO paper_trades (
         id, game_id, user_id, symbol, asset_type, order_side,
         position_side, quantity, price, fee, realized_pnl, leverage,
         margin_mode, timestamp
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      tradeId,
      gameId,
      groupId,
      pos.symbol,
      pos.asset_type,
      closeOrderSide,
      pos.side,
      pos.quantity,
      exitPrice,
      closeFee,
      netRealizedPnl,
      pos.leverage,
      pos.margin_mode,
      nowMs
    )
    .run();

  // Eliminar Posición
  await db
    .prepare("DELETE FROM paper_positions WHERE id = ? AND game_id = ? AND user_id = ?")
    .bind(positionId, gameId, groupId)
    .run();

  // Actualizar Caja y Métricas
  await db
    .prepare(
      `UPDATE paper_portfolios
       SET cash_balance = cash_balance + ?,
           realized_pnl = realized_pnl + ?,
           total_fees = total_fees + ?,
           updated_at = ?
       WHERE game_id = ? AND user_id = ?`
    )
    .bind(cashReturned, netRealizedPnl, closeFee, nowMs, gameId, groupId)
    .run();

  return {
    success: true,
    exitPrice,
    grossPnl,
    closeFee,
    netRealizedPnl,
    cashReturned,
  };
}

/**
 * Consulta el historial de trades de un grupo
 */
export async function getTradesHistory(db: D1Database, groupId: string, targetGameId?: string): Promise<TradeRecord[]> {
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db);
  const gameId = tournament?.id || targetGameId || DEFAULT_GAME_ID;

  const res = await db
    .prepare(
      `SELECT * FROM paper_trades
       WHERE game_id = ? AND user_id = ?
       ORDER BY timestamp DESC
       LIMIT 50`
    )
    .bind(gameId, groupId)
    .all<TradeRecord>();

  return res.results || [];
}

/**
 * Genera el Leaderboard en tiempo real evaluando el patrimonio Mark-to-Market de los grupos
 */
export async function getLeaderboard(db: D1Database, targetGameId?: string): Promise<LeaderboardEntry[]> {
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db);
  const gameId = targetGameId || tournament?.id || DEFAULT_GAME_ID;
  const initialCap = tournament?.initial_capital || INITIAL_CAPITAL;
  const groups = Object.values(OFFICIAL_GROUPS);
  const leaderboard: LeaderboardEntry[] = [];

  for (const group of groups) {
    try {
      const data = await getMarkedPortfolio(db, group.id, gameId);
      leaderboard.push({
        groupId: group.id,
        groupName: group.name,
        initialCapital: initialCap,
        cashBalance: data.portfolio.cash_balance,
        usedMargin: data.portfolio.used_margin,
        unrealizedPnl: data.portfolio.unrealized_pnl,
        realizedPnl: data.portfolio.realized_pnl,
        totalFees: data.portfolio.total_fees,
        equity: data.portfolio.equity,
        roePct: data.portfolio.roe_pct,
        openPositionsCount: data.positions.length,
        rank: 0,
      });
    } catch {
      leaderboard.push({
        groupId: group.id,
        groupName: group.name,
        initialCapital: initialCap,
        cashBalance: initialCap,
        usedMargin: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        totalFees: 0,
        equity: initialCap,
        roePct: 0,
        openPositionsCount: 0,
        rank: 0,
      });
    }
  }

  // Ordenar por patrimonio (equity) descendente
  leaderboard.sort((a, b) => b.equity - a.equity);
  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return leaderboard;
}

/**
 * Consulta un torneo por ID específico
 */
export async function getTournamentById(db: D1Database, id: string): Promise<TournamentRecord | null> {
  const row = await db
    .prepare("SELECT * FROM games WHERE id = ? LIMIT 1")
    .bind(id)
    .first<TournamentRecord>();
  return row || null;
}

/**
 * Migración silenciosa y automática para garantizar la columna tournament_type
 * y la existencia del torneo base de futuros sin colisiones
 */
let tournamentMigrationDone = false;
export async function ensureTournamentTypeMigration(db: D1Database) {
  if (tournamentMigrationDone) return;
  tournamentMigrationDone = true;

  try {
    await db.prepare("ALTER TABLE games ADD COLUMN tournament_type TEXT DEFAULT 'PORTFOLIO'").run();
  } catch {
    // Columna ya existe
  }

  try {
    const fut = await db.prepare("SELECT id FROM games WHERE id = ?").bind(DEFAULT_FUTURES_GAME_ID).first();
    if (!fut) {
      const nowMs = Date.now();
      await db
        .prepare(
          `INSERT OR IGNORE INTO games (
            id, title, description, creator_id, creator_name,
            initial_capital, max_leverage, allow_short,
            fee_crypto_bps, fee_stock_bps, status, created_at, ended_at, allowed_symbols,
            rebalance_day, trading_start_time, trading_end_time, max_trades_per_week, tournament_type
          ) VALUES (?, ?, ?, 'allianz', 'Allianz', 10000.0, 100, 1, 5, 2, 'ACTIVE', ?, NULL, ?, '', '', '', 0, 'FUTURES')`
        )
        .bind(
          DEFAULT_FUTURES_GAME_ID,
          "Competencia Oficial de Futuros & Derivados - Club de Finanzas UBA",
          "Torneo de Paper Trading en derivados enfocado en futuros Matba Rofex, commodities CME, índices y coberturas.",
          nowMs,
          "DLR-ABR26,DLR-MAY26,DLR-JUN26,CL=F,GC=F,ZS=F,ES=F,NQ=F,BTC-USD,ETH-USD"
        )
        .run();

      for (const gid of Object.keys(OFFICIAL_GROUPS)) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO game_participants (game_id, user_id, user_name, joined_at)
             VALUES (?, ?, ?, ?)`
          )
          .bind(DEFAULT_FUTURES_GAME_ID, gid, OFFICIAL_GROUPS[gid]?.name || gid, nowMs)
          .run();

        await db
          .prepare(
            `INSERT OR IGNORE INTO paper_portfolios (game_id, user_id, cash_balance, realized_pnl, total_fees, updated_at)
             VALUES (?, ?, 10000.0, 0.0, 0.0, ?)`
          )
          .bind(DEFAULT_FUTURES_GAME_ID, gid, nowMs)
          .run();
      }
    }

    // Actualizar torneos de futuros previos que tenían max_leverage limitado por debajo de 100x
    await db
      .prepare(
        "UPDATE games SET max_leverage = 100 WHERE (tournament_type = 'FUTURES' OR id = ?) AND max_leverage < 100"
      )
      .bind(DEFAULT_FUTURES_GAME_ID)
      .run();
  } catch {
    // Silencioso
  }
}

/**
 * Lista todos los torneos activos disponibles filtrados por categoría (PORTFOLIO vs FUTURES)
 */
export async function getAllTournaments(db: D1Database, marketType?: string): Promise<TournamentRecord[]> {
  await ensureTournamentTypeMigration(db);
  const type = (marketType || "").toUpperCase();

  if (type === "FUTURES") {
    const res = await db
      .prepare(
        `SELECT * FROM games 
         WHERE status = 'ACTIVE' 
           AND (tournament_type = 'FUTURES' OR id LIKE '%futur%')
         ORDER BY created_at DESC`
      )
      .all<TournamentRecord>();
    return res.results || [];
  }

  // Por defecto PORTFOLIO (no incluye torneos de futuros)
  const res = await db
    .prepare(
      `SELECT * FROM games 
       WHERE status = 'ACTIVE' 
         AND (tournament_type = 'PORTFOLIO' OR tournament_type IS NULL OR tournament_type = '' OR id NOT LIKE '%futur%')
         AND id != 'torneo-futuros-2026'
       ORDER BY created_at DESC`
    )
    .all<TournamentRecord>();
  return res.results || [];
}

/**
 * Consulta los IDs de torneos en los que un grupo ya está inscrito
 */
export async function getGroupParticipations(db: D1Database, groupId: string): Promise<string[]> {
  const res = await db
    .prepare("SELECT game_id FROM game_participants WHERE user_id = ?")
    .bind(groupId)
    .all<{ game_id: string }>();
  return (res.results || []).map((r) => r.game_id);
}

/**
 * Inscribe a un grupo en un torneo y crea su semilla de portafolio
 */
export async function joinTournament(db: D1Database, groupId: string, tournamentId: string) {
  const tournament = await getTournamentById(db, tournamentId);
  if (!tournament) {
    throw new Error("El torneo solicitado no existe.");
  }
  if (tournament.status !== "ACTIVE") {
    throw new Error("Este torneo ya no se encuentra activo.");
  }

  const groupName = OFFICIAL_GROUPS[groupId]?.name || groupId;
  const nowMs = Date.now();

  // Registrar en tabla game_participants
  await db
    .prepare(
      `INSERT OR IGNORE INTO game_participants (game_id, user_id, user_name, joined_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(tournamentId, groupId, groupName, nowMs)
    .run();

  // Asegurar balance y portafolio en este torneo
  const port = await ensurePortfolioSeed(db, groupId, tournamentId, tournament.initial_capital);

  return {
    success: true,
    tournamentId,
    groupId,
    portfolio: port,
  };
}

/**
 * Consulta el torneo activo actual según el mercado (PORTFOLIO vs FUTURES)
 */
export async function getActiveTournament(db: D1Database, marketType?: string): Promise<TournamentRecord | null> {
  await ensureTournamentTypeMigration(db);
  const type = (marketType || "").toUpperCase();

  if (type === "FUTURES") {
    const row = await db
      .prepare(
        `SELECT * FROM games 
         WHERE status = 'ACTIVE' 
           AND (tournament_type = 'FUTURES' OR id LIKE '%futur%')
         ORDER BY created_at DESC LIMIT 1`
      )
      .first<TournamentRecord>();
    if (row) return row;
    return await getTournamentById(db, DEFAULT_FUTURES_GAME_ID);
  }

  const row = await db
    .prepare(
      `SELECT * FROM games 
       WHERE status = 'ACTIVE' 
         AND (tournament_type = 'PORTFOLIO' OR tournament_type IS NULL OR tournament_type = '' OR id NOT LIKE '%futur%')
         AND id != 'torneo-futuros-2026'
       ORDER BY created_at DESC LIMIT 1`
    )
    .first<TournamentRecord>();
  if (row) return row;
  return await getTournamentById(db, DEFAULT_GAME_ID);
}

/**
 * Crea o actualiza un torneo competitivo (Exclusivo para Allianz)
 */
export async function saveTournament(
  db: D1Database,
  creatorId: string,
  params: {
    title: string;
    description?: string;
    allow_short: boolean;
    allowed_symbols: string[];
    max_leverage?: number;
    initial_capital?: number;
    rebalance_day?: string;
    trading_start_time?: string;
    trading_end_time?: string;
    max_trades_per_week?: number;
    reset_balances?: boolean;
    createNew?: boolean;
    tournament_type?: string;
    marketType?: string;
  }
) {
  if (creatorId.toLowerCase() !== "allianz") {
    throw new Error("Permiso denegado: solo el usuario Allianz puede crear o configurar torneos.");
  }
  await ensureTournamentTypeMigration(db);

  const nowMs = Date.now();
  const rawType = (params.tournament_type || params.marketType || "PORTFOLIO").toUpperCase();
  const tournamentType = rawType === "FUTURES" ? "FUTURES" : "PORTFOLIO";

  const defaultTitle =
    tournamentType === "FUTURES"
      ? "Torneo de Futuros & Derivados - Club de Finanzas UBA"
      : "Torneo Oficial - Club de Finanzas UBA";

  const title = (params.title || defaultTitle).trim();
  const description = (params.description || `Torneo administrado por Allianz (${tournamentType})`).trim();
  const allowShort = params.allow_short ? 1 : 0;
  const allowedSymbolsStr = (params.allowed_symbols || [])
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
  const maxLeverage = Math.min(Math.max(1, Number(params.max_leverage) || 10), tournamentType === "FUTURES" ? 100 : 10);
  const initialCapital = Number(params.initial_capital) || 10000.0;
  const rebalanceDay = (params.rebalance_day || "").trim().toUpperCase();
  const tradingStartTime = (params.trading_start_time || "").trim();
  const tradingEndTime = (params.trading_end_time || "").trim();
  const maxTradesPerWeek = Math.max(0, Number(params.max_trades_per_week) || 0);

  let tournamentId = tournamentType === "FUTURES" ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;

  if (params.createNew) {
    tournamentId = tournamentType === "FUTURES" ? `torneo_futuros_${nowMs}` : `torneo_${nowMs}`;
    await db
      .prepare(
        `INSERT INTO games (
          id, title, description, creator_id, creator_name,
          initial_capital, max_leverage, allow_short,
          fee_crypto_bps, fee_stock_bps, status, created_at, ended_at, allowed_symbols,
          rebalance_day, trading_start_time, trading_end_time, max_trades_per_week, tournament_type
        ) VALUES (?, ?, ?, 'allianz', 'Allianz', ?, ?, ?, 5, 2, 'ACTIVE', ?, NULL, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        tournamentId,
        title,
        description,
        initialCapital,
        maxLeverage,
        allowShort,
        nowMs,
        allowedSymbolsStr,
        rebalanceDay,
        tradingStartTime,
        tradingEndTime,
        maxTradesPerWeek,
        tournamentType
      )
      .run();
  } else {
    // Si existe uno activo de esta categoría, actualizar sus reglas directamente
    const active = await getActiveTournament(db, tournamentType);
    if (active) {
      tournamentId = active.id;
      await db
        .prepare(
          `UPDATE games
           SET title = ?, description = ?, allow_short = ?, allowed_symbols = ?, max_leverage = ?, initial_capital = ?,
               rebalance_day = ?, trading_start_time = ?, trading_end_time = ?, max_trades_per_week = ?, tournament_type = ?
           WHERE id = ?`
        )
        .bind(
          title,
          description,
          allowShort,
          allowedSymbolsStr,
          maxLeverage,
          initialCapital,
          rebalanceDay,
          tradingStartTime,
          tradingEndTime,
          maxTradesPerWeek,
          tournamentType,
          tournamentId
        )
        .run();
    } else {
      await db
        .prepare(
          `INSERT INTO games (
            id, title, description, creator_id, creator_name,
            initial_capital, max_leverage, allow_short,
            fee_crypto_bps, fee_stock_bps, status, created_at, ended_at, allowed_symbols,
            rebalance_day, trading_start_time, trading_end_time, max_trades_per_week, tournament_type
          ) VALUES (?, ?, ?, 'allianz', 'Allianz', ?, ?, ?, 5, 2, 'ACTIVE', ?, NULL, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          tournamentId,
          title,
          description,
          initialCapital,
          maxLeverage,
          allowShort,
          nowMs,
          allowedSymbolsStr,
          rebalanceDay,
          tradingStartTime,
          tradingEndTime,
          maxTradesPerWeek,
          tournamentType
        )
        .run();
    }
  }

  // Si se solicita reiniciar balances para todos los participantes
  if (params.reset_balances || params.createNew) {
    await db.prepare("DELETE FROM paper_positions WHERE game_id = ?").bind(tournamentId).run();
    await db.prepare("DELETE FROM paper_trades WHERE game_id = ?").bind(tournamentId).run();
    await db
      .prepare(
        `UPDATE paper_portfolios
         SET cash_balance = ?, realized_pnl = 0.0, total_fees = 0.0, updated_at = ?
         WHERE game_id = ?`
      )
      .bind(initialCapital, nowMs, tournamentId)
      .run();

    // Asegurar semillas de portafolios para todos los grupos en el torneo
    for (const gid of Object.keys(OFFICIAL_GROUPS)) {
      await ensurePortfolioSeed(db, gid, tournamentId, initialCapital);
    }
  } else {
    // Si no se solicitó reinicio completo, actualizar el saldo de los grupos sin actividad previa al nuevo capital inicial
    await db
      .prepare(
        `UPDATE paper_portfolios
         SET cash_balance = ?, updated_at = ?
         WHERE game_id = ? AND total_fees = 0.0 AND realized_pnl = 0.0`
      )
      .bind(initialCapital, nowMs, tournamentId)
      .run();
  }

  return {
    success: true,
    tournamentId,
    title,
    description,
    allowShort: !!allowShort,
    allowedSymbols: allowedSymbolsStr ? allowedSymbolsStr.split(",") : [],
    maxLeverage,
    initialCapital,
    rebalanceDay,
    tradingStartTime,
    tradingEndTime,
    maxTradesPerWeek,
    tournamentType,
  };
}

/**
 * Elimina permanentemente un torneo y todas sus posiciones, trades y datos vinculados
 * Exclusivo para el usuario Allianz
 */
export async function deleteTournament(
  db: D1Database,
  creatorId: string,
  tournamentId: string
): Promise<{ success: boolean; deletedTournamentId: string }> {
  if (creatorId.toLowerCase() !== "allianz") {
    throw new Error("Permiso denegado: solo el usuario Allianz puede eliminar torneos.");
  }

  const cleanId = (tournamentId || "").trim();
  if (!cleanId) {
    throw new Error("ID de torneo inválido.");
  }

  // Eliminar posiciones, trades, balances y participantes vinculados al torneo
  await db.prepare("DELETE FROM paper_positions WHERE game_id = ?").bind(cleanId).run();
  await db.prepare("DELETE FROM paper_trades WHERE game_id = ?").bind(cleanId).run();
  await db.prepare("DELETE FROM paper_portfolios WHERE game_id = ?").bind(cleanId).run();
  await db.prepare("DELETE FROM game_participants WHERE game_id = ?").bind(cleanId).run();
  await db.prepare("DELETE FROM games WHERE id = ?").bind(cleanId).run();

  return {
    success: true,
    deletedTournamentId: cleanId,
  };
}
