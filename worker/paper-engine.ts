// Motor Cuantitativo y Reglas de Negocio de Paper Trading
// Basado en Aegis Engine - Zero Look-Ahead Bias

import { D1Database, PortfolioRecord, PositionRecord, TradeRecord, LeaderboardEntry } from "./types";
import { fetchLiveMarketQuote } from "./market-feed";
import { OFFICIAL_GROUPS } from "./group-auth";

export const DEFAULT_GAME_ID = "torneo-club-2026";
export const INITIAL_CAPITAL = 10000.0;
export const MAX_LEVERAGE = 10;
export const FEE_CRYPTO_BPS = 5; // 0.05%
export const STOCK_COMMISSION_PER_SHARE = 0.005;
export const STOCK_COMMISSION_MIN_USD = 1.0;
export const STOCK_COMMISSION_MAX_BPS_OF_NOTIONAL = 0.01;

/**
 * Cálculo exacto de comisiones
 */
export function computeOrderFee(assetType: "Crypto" | "Stock", qty: number, notional: number): number {
  const q = Number(qty) || 0;
  const n = Number(notional) || 0;
  if (assetType === "Crypto") {
    return (n * FEE_CRYPTO_BPS) / 10000;
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
export async function ensurePortfolioSeed(db: D1Database, groupId: string): Promise<PortfolioRecord> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT OR IGNORE INTO paper_portfolios (game_id, user_id, cash_balance, realized_pnl, total_fees, updated_at)
       VALUES (?, ?, ?, 0.0, 0.0, ?)`
    )
    .bind(DEFAULT_GAME_ID, groupId, INITIAL_CAPITAL, now)
    .run();

  const row = await db
    .prepare("SELECT * FROM paper_portfolios WHERE game_id = ? AND user_id = ?")
    .bind(DEFAULT_GAME_ID, groupId)
    .first<PortfolioRecord>();

  return (
    row || {
      game_id: DEFAULT_GAME_ID,
      user_id: groupId,
      cash_balance: INITIAL_CAPITAL,
      realized_pnl: 0,
      total_fees: 0,
      updated_at: now,
    }
  );
}

/**
 * Re-cotiza posiciones abiertas y calcula el patrimonio Mark-to-Market
 */
export async function getMarkedPortfolio(db: D1Database, groupId: string) {
  const port = await ensurePortfolioSeed(db, groupId);
  const posResult = await db
    .prepare("SELECT * FROM paper_positions WHERE game_id = ? AND user_id = ?")
    .bind(DEFAULT_GAME_ID, groupId)
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
  const roePct = ((equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100;

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

  // Cotización en vivo (Zero Look-Ahead Bias)
  const quote = await fetchLiveMarketQuote(symbol);

  // Validación de horario de mercado para Acciones
  if (quote.asset_type === "Stock" && !quote.is_market_open) {
    throw new Error(
      `Mercado cerrado para ${symbol}. ${quote.status_message} (Wall Street opera 09:30-16:00 ET).`
    );
  }

  const executedPrice = quote.price;
  const notional = executedPrice * quantity;
  const fee = computeOrderFee(quote.asset_type, quantity, notional);
  const initialMargin = notional / leverage;
  const requiredFunds = initialMargin + fee;

  // Verificar caja disponible en portafolio
  const port = await ensurePortfolioSeed(db, groupId);
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
    .bind(requiredFunds, fee, nowMs, DEFAULT_GAME_ID, groupId, requiredFunds)
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
      DEFAULT_GAME_ID,
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
      DEFAULT_GAME_ID,
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
export async function closePosition(db: D1Database, groupId: string, positionId: string) {
  const pos = await db
    .prepare("SELECT * FROM paper_positions WHERE id = ? AND game_id = ? AND user_id = ?")
    .bind(positionId, DEFAULT_GAME_ID, groupId)
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
      DEFAULT_GAME_ID,
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
    .bind(positionId, DEFAULT_GAME_ID, groupId)
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
    .bind(cashReturned, netRealizedPnl, closeFee, nowMs, DEFAULT_GAME_ID, groupId)
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
export async function getTradesHistory(db: D1Database, groupId: string): Promise<TradeRecord[]> {
  const res = await db
    .prepare(
      `SELECT * FROM paper_trades
       WHERE game_id = ? AND user_id = ?
       ORDER BY timestamp DESC
       LIMIT 50`
    )
    .bind(DEFAULT_GAME_ID, groupId)
    .all<TradeRecord>();

  return res.results || [];
}

/**
 * Genera el Leaderboard en tiempo real evaluando el patrimonio Mark-to-Market de los 6 grupos
 */
export async function getLeaderboard(db: D1Database): Promise<LeaderboardEntry[]> {
  const groups = Object.values(OFFICIAL_GROUPS);
  const leaderboard: LeaderboardEntry[] = [];

  for (const group of groups) {
    try {
      const data = await getMarkedPortfolio(db, group.id);
      leaderboard.push({
        groupId: group.id,
        groupName: group.name,
        initialCapital: INITIAL_CAPITAL,
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
        initialCapital: INITIAL_CAPITAL,
        cashBalance: INITIAL_CAPITAL,
        usedMargin: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        totalFees: 0,
        equity: INITIAL_CAPITAL,
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
