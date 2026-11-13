// Motor Ultra-Modular de Órdenes Límite, Ejecución Parcial y Cumplimiento Solo Long
// Basado en Aegis Engine - Zero Look-Ahead Bias (t <= T)

import {
  D1Database,
  OrderRecord,
  PositionRecord,
  PortfolioRecord,
  TournamentRecord,
  TradeRecord,
} from "./types";
import { fetchLiveMarketQuote, fetchLiveMarketQuotesBatch } from "./market-feed";
import {
  checkTournamentDateRange,
  getActiveTournament,
  getTournamentById,
  checkRebalanceWindow,
  checkWeeklyTradeLimit,
  computeOrderFee,
  calculateLiquidationPrice,
  validateTpSlBounds,
  ensurePortfolioSeed,
  computeCrossUnrealizedPnl,
  DEFAULT_GAME_ID,
  DEFAULT_FUTURES_GAME_ID,
  INITIAL_CAPITAL,
  MAX_LEVERAGE,
} from "./paper-engine";

let ordersTableInitialized = false;

/**
 * Garantiza la existencia de la tabla paper_orders y sus índices en SQLite D1
 */
export async function ensurePaperOrdersTable(db: D1Database): Promise<void> {
  if (ordersTableInitialized) return;
  ordersTableInitialized = true;

  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS paper_orders (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          symbol TEXT NOT NULL,
          asset_type TEXT NOT NULL,
          order_side TEXT NOT NULL,
          position_side TEXT NOT NULL,
          order_type TEXT NOT NULL,
          quantity REAL NOT NULL,
          filled_quantity REAL DEFAULT 0,
          limit_price REAL,
          take_profit REAL DEFAULT NULL,
          stop_loss REAL DEFAULT NULL,
          leverage REAL NOT NULL DEFAULT 1,
          margin_mode TEXT DEFAULT 'ISOLATED',
          status TEXT NOT NULL DEFAULT 'PENDING',
          created_at INTEGER NOT NULL,
          filled_at INTEGER
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_paper_orders_lookup 
         ON paper_orders(game_id, user_id, status)`
      )
      .run();
  } catch {
    // Si la tabla o índice ya existen, continuar
  }

  try {
    await db.prepare("ALTER TABLE paper_orders ADD COLUMN take_profit REAL DEFAULT NULL").run();
  } catch {}
  try {
    await db.prepare("ALTER TABLE paper_orders ADD COLUMN stop_loss REAL DEFAULT NULL").run();
  } catch {}
  try {
    await db.prepare("ALTER TABLE paper_positions ADD COLUMN take_profit REAL DEFAULT NULL").run();
  } catch {}
  try {
    await db.prepare("ALTER TABLE paper_positions ADD COLUMN stop_loss REAL DEFAULT NULL").run();
  } catch {}
}

/**
 * Obtiene la posición LONG abierta para un símbolo específico
 */
export async function getOpenLongPosition(
  db: D1Database,
  gameId: string,
  groupId: string,
  symbol: string
): Promise<PositionRecord | null> {
  return await db
    .prepare(
      `SELECT * FROM paper_positions
       WHERE game_id = ? AND user_id = ? AND symbol = ? AND side = 'LONG'`
    )
    .bind(gameId, groupId, symbol)
    .first<PositionRecord>();
}

/**
 * Calcula la cantidad de unidades reservadas en órdenes de venta límite PENDING para un símbolo
 */
export async function getReservedSellQuantity(
  db: D1Database,
  gameId: string,
  groupId: string,
  symbol: string,
  excludeOrderId?: string
): Promise<number> {
  const query = excludeOrderId
    ? `SELECT SUM(quantity - filled_quantity) as total_reserved 
       FROM paper_orders 
       WHERE game_id = ? AND user_id = ? AND symbol = ? AND order_side = 'SELL' AND status IN ('PENDING', 'PENDING_OPEN', 'PARTIALLY_FILLED') AND id != ?`
    : `SELECT SUM(quantity - filled_quantity) as total_reserved 
       FROM paper_orders 
       WHERE game_id = ? AND user_id = ? AND symbol = ? AND order_side = 'SELL' AND status IN ('PENDING', 'PENDING_OPEN', 'PARTIALLY_FILLED')`;

  const stmt = excludeOrderId
    ? db.prepare(query).bind(gameId, groupId, symbol, excludeOrderId)
    : db.prepare(query).bind(gameId, groupId, symbol);

  const row = await stmt.first<{ total_reserved: number | null }>();
  return Number(row?.total_reserved) || 0;
}

/**
 * Ejecuta el cierre parcial o total de una posición existente
 */
export async function executeClosePositionOperation(
  db: D1Database,
  pos: PositionRecord,
  closeQty: number,
  exitPrice: number,
  nowMs: number,
  orderId?: string
) {
  const isFullClose = closeQty >= pos.quantity - 1e-9;
  const executedCloseQty = isFullClose ? pos.quantity : closeQty;
  const notional = exitPrice * executedCloseQty;
  const closeFee = computeOrderFee(pos.asset_type as "Crypto" | "Stock" | "Futures", executedCloseQty, notional);

  let grossPnl = 0;
  if (pos.side === "LONG") {
    grossPnl = (exitPrice - pos.entry_price) * executedCloseQty;
  } else {
    grossPnl = (pos.entry_price - exitPrice) * executedCloseQty;
  }
  const netRealizedPnl = grossPnl - closeFee;

  // Margen proporcional a liberar
  const marginRatio = executedCloseQty / pos.quantity;
  const releasedMargin = pos.initial_margin * marginRatio;
  const cashReturned = releasedMargin + netRealizedPnl;

  const tradeId = `tr_close_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
  const closeOrderSide: "BUY" | "SELL" = pos.side === "LONG" ? "SELL" : "BUY";

  // 1. Insertar Trade
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
      pos.game_id,
      pos.user_id,
      pos.symbol,
      pos.asset_type,
      closeOrderSide,
      pos.side,
      executedCloseQty,
      exitPrice,
      closeFee,
      netRealizedPnl,
      pos.leverage,
      pos.margin_mode,
      nowMs
    )
    .run();

  // 2. Modificar o eliminar la posición
  if (isFullClose) {
    await db
      .prepare("DELETE FROM paper_positions WHERE id = ?")
      .bind(pos.id)
      .run();
  } else {
    const remainingQty = pos.quantity - executedCloseQty;
    const remainingMargin = Math.max(0, pos.initial_margin - releasedMargin);
    await db
      .prepare(
        `UPDATE paper_positions 
         SET quantity = ?, initial_margin = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(remainingQty, remainingMargin, nowMs, pos.id)
      .run();
  }

  // 3. Reintegrar efectivo y registrar PnL en portafolio
  await db
    .prepare(
      `UPDATE paper_portfolios
       SET cash_balance = cash_balance + ?,
           realized_pnl = realized_pnl + ?,
           total_fees = total_fees + ?,
           updated_at = ?
       WHERE game_id = ? AND user_id = ?`
    )
    .bind(cashReturned, netRealizedPnl, closeFee, nowMs, pos.game_id, pos.user_id)
    .run();

  return {
    tradeId,
    executedCloseQty,
    exitPrice,
    grossPnl,
    closeFee,
    netRealizedPnl,
    cashReturned,
    isFullClose,
  };
}

/**
 * Ejecuta apertura o adición de posición LONG/SHORT
 */
export async function executeOpenPositionOperation(
  db: D1Database,
  gameId: string,
  groupId: string,
  symbol: string,
  assetType: "Crypto" | "Stock" | "Futures",
  positionSide: "LONG" | "SHORT",
  orderSide: "BUY" | "SELL",
  quantity: number,
  executedPrice: number,
  leverage: number,
  marginMode: "ISOLATED" | "CROSS",
  initialCap: number,
  nowMs: number,
  takeProfit?: number | null,
  stopLoss?: number | null
) {
  const notional = executedPrice * quantity;
  const fee = computeOrderFee(assetType, quantity, notional);
  const initialMargin = notional / leverage;
  const requiredFunds = initialMargin + fee;

  // Verificar caja / margen disponible
  const port = await ensurePortfolioSeed(db, groupId, gameId, initialCap);
  let crossUnrealizedPnl = 0;
  if (marginMode === "CROSS") {
    crossUnrealizedPnl = await computeCrossUnrealizedPnl(
      db,
      gameId,
      groupId,
      new Map([[symbol, executedPrice]])
    );
  }
  const availableCash = marginMode === "CROSS" ? port.cash_balance + crossUnrealizedPnl : port.cash_balance;
  if (availableCash < requiredFunds) {
    throw new Error(
      `Poder de compra insuficiente: requiere $${requiredFunds.toFixed(2)} ($${initialMargin.toFixed(2)} margen + $${fee.toFixed(2)} comisión) y dispone de $${availableCash.toFixed(2)}${marginMode === "CROSS" ? ` ($${port.cash_balance.toFixed(2)} caja + $${crossUnrealizedPnl.toFixed(2)} PnL cruzado)` : ""}.`
    );
  }

  const tradeId = `tr_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
  const positionId = `pos_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;
  const liquidationPrice = calculateLiquidationPrice(executedPrice, leverage, positionSide);

  // Débito atómico de caja
  let debitRes;
  if (marginMode === "CROSS") {
    debitRes = await db
      .prepare(
        `UPDATE paper_portfolios
         SET cash_balance = cash_balance - ?,
             total_fees = total_fees + ?,
             updated_at = ?
         WHERE game_id = ? AND user_id = ?`
      )
      .bind(requiredFunds, fee, nowMs, gameId, groupId)
      .run();
  } else {
    debitRes = await db
      .prepare(
        `UPDATE paper_portfolios
         SET cash_balance = cash_balance - ?,
             total_fees = total_fees + ?,
             updated_at = ?
         WHERE game_id = ? AND user_id = ? AND cash_balance >= ?`
      )
      .bind(requiredFunds, fee, nowMs, gameId, groupId, requiredFunds)
      .run();
  }

  if (!debitRes.success) {
    throw new Error("No se pudo debitar el saldo. Saldo insuficiente o colisión de concurrencia.");
  }

  // Insertar Trade
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
      symbol,
      assetType,
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

  // Crear o sumar a posición existente del mismo símbolo y lado
  const existingPos = await db
    .prepare(
      `SELECT * FROM paper_positions 
       WHERE game_id = ? AND user_id = ? AND symbol = ? AND side = ?`
    )
    .bind(gameId, groupId, symbol, positionSide)
    .first<PositionRecord>();

  if (existingPos) {
    const totalQty = existingPos.quantity + quantity;
    const weightedEntryPrice =
      (existingPos.entry_price * existingPos.quantity + executedPrice * quantity) / totalQty;
    const totalMargin = existingPos.initial_margin + initialMargin;
    const newLiqPrice = calculateLiquidationPrice(weightedEntryPrice, leverage, positionSide);

    const updatedTp = takeProfit !== undefined ? takeProfit : (existingPos.take_profit ?? null);
    const updatedSl = stopLoss !== undefined ? stopLoss : (existingPos.stop_loss ?? null);

    await db
      .prepare(
        `UPDATE paper_positions
         SET quantity = ?, entry_price = ?, current_price = ?, initial_margin = ?, liquidation_price = ?, take_profit = ?, stop_loss = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(totalQty, weightedEntryPrice, executedPrice, totalMargin, newLiqPrice, updatedTp, updatedSl, nowMs, existingPos.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO paper_positions (
           id, game_id, user_id, symbol, asset_type, side, quantity,
           entry_price, current_price, leverage, margin_mode, initial_margin,
           unrealized_pnl, liquidation_price, take_profit, stop_loss, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?)`
      )
      .bind(
        positionId,
        gameId,
        groupId,
        symbol,
        assetType,
        positionSide,
        quantity,
        executedPrice,
        executedPrice,
        leverage,
        marginMode,
        initialMargin,
        liquidationPrice,
        takeProfit ?? null,
        stopLoss ?? null,
        nowMs
      )
      .run();
  }

  return {
    tradeId,
    positionId: existingPos ? existingPos.id : positionId,
    executedPrice,
    initialMargin,
    fee,
    liquidationPrice,
  };
}

export interface CreatePaperOrderInput {
  symbol: string;
  orderSide?: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT";
  orderType?: "MARKET" | "LIMIT";
  quantity: number;
  limitPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  leverage?: number;
  marginMode?: "ISOLATED" | "CROSS";
  gameId?: string;
  marketType?: string;
}

/**
 * Verifica la solvencia de efectivo disponible para una compra,
 * computando el capital comprometido en órdenes pendientes (PENDING, PENDING_OPEN, PARTIALLY_FILLED)
 */
async function checkBuySolvency(
  db: D1Database,
  gameId: string,
  groupId: string,
  initialCap: number,
  assetType: "Crypto" | "Stock" | "Futures",
  quantity: number,
  effectivePrice: number,
  leverage: number,
  actionLabel: string,
  excludeOrderId?: string,
  marginMode?: "ISOLATED" | "CROSS"
): Promise<void> {
  const notional = effectivePrice * quantity;
  const estFee = computeOrderFee(assetType, quantity, notional);
  const requiredMargin = notional / leverage;
  const totalRequired = requiredMargin + estFee;

  const port = await ensurePortfolioSeed(db, groupId, gameId, initialCap);

  let query = `SELECT symbol, asset_type, limit_price, quantity, filled_quantity, leverage 
       FROM paper_orders 
       WHERE game_id = ? AND user_id = ? AND order_side = 'BUY' AND status IN ('PENDING', 'PENDING_OPEN', 'PARTIALLY_FILLED')`;
  const params: unknown[] = [gameId, groupId];

  if (excludeOrderId) {
    query += " AND id != ?";
    params.push(excludeOrderId);
  }

  const pendingBuyOrdersRes = await db
    .prepare(query)
    .bind(...params)
    .all<{
      symbol: string;
      asset_type: string;
      limit_price: number | null;
      quantity: number;
      filled_quantity: number | null;
      leverage: number;
    }>();

  let committedPendingCapital = 0;
  if (pendingBuyOrdersRes.results && pendingBuyOrdersRes.results.length > 0) {
    for (const pOrd of pendingBuyOrdersRes.results) {
      const pQty = Math.max(0, pOrd.quantity - (pOrd.filled_quantity || 0));
      const pPrice = pOrd.limit_price || effectivePrice;
      const pNotional = pPrice * pQty;
      const pLev = Math.max(1, pOrd.leverage || 1);
      const pMargin = pNotional / pLev;
      const pFee = computeOrderFee(
        (pOrd.asset_type as "Crypto" | "Stock" | "Futures") || assetType,
        pQty,
        pNotional
      );
      committedPendingCapital += pMargin + pFee;
    }
  }

  let crossUnrealizedPnl = 0;
  if (marginMode === "CROSS") {
    crossUnrealizedPnl = await computeCrossUnrealizedPnl(db, gameId, groupId);
  }

  const availableCash = port.cash_balance + crossUnrealizedPnl - committedPendingCapital;
  if (availableCash < totalRequired) {
    throw new Error(
      `Efectivo insuficiente para ${actionLabel}: Se requieren $${totalRequired.toFixed(2)} ($${requiredMargin.toFixed(2)} de margen + $${estFee.toFixed(2)} de comisión) a precio de referencia $${effectivePrice.toFixed(2)}. Saldo de cuenta: $${port.cash_balance.toFixed(2)}${marginMode === "CROSS" ? `, PnL no realizado cruzado: $${crossUnrealizedPnl.toFixed(2)}` : ""}, comprometido en órdenes pendientes: $${committedPendingCapital.toFixed(2)}, efectivo libre disponible: $${Math.max(0, availableCash).toFixed(2)}.`
    );
  }
}

/**
 * Punto de entrada principal para creación y ejecución de órdenes (Market y Limit)
 * con cumplimiento de Solo Long y soporte para órdenes y ventas parciales
 */
export async function createPaperOrder(
  db: D1Database,
  groupId: string,
  input: CreatePaperOrderInput
) {
  await ensurePaperOrdersTable(db);

  const symbol = input.symbol.trim().toUpperCase();
  const quantity = Number(input.quantity);
  const orderType: "MARKET" | "LIMIT" = input.orderType === "LIMIT" ? "LIMIT" : "MARKET";
  const limitPrice = input.limitPrice ? Number(input.limitPrice) : undefined;
  const takeProfit =
    input.takeProfit !== undefined && input.takeProfit !== null && !isNaN(Number(input.takeProfit))
      ? Number(input.takeProfit)
      : undefined;
  const stopLoss =
    input.stopLoss !== undefined && input.stopLoss !== null && !isNaN(Number(input.stopLoss))
      ? Number(input.stopLoss)
      : undefined;
  const leverage = Math.min(Math.max(1, Number(input.leverage) || 1), MAX_LEVERAGE);
  const marginMode: "ISOLATED" | "CROSS" = input.marginMode === "CROSS" ? "CROSS" : "ISOLATED";

  if (!symbol) throw new Error("El símbolo es requerido.");
  if (isNaN(quantity) || quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");
  if (orderType === "LIMIT" && (!limitPrice || isNaN(limitPrice) || limitPrice <= 0)) {
    throw new Error("Para una orden límite se requiere especificar un precio límite válido mayor a 0.");
  }

  const isFutures = (input.marketType || "").toUpperCase() === "FUTURES" || (input.gameId && input.gameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = input.gameId ? await getTournamentById(db, input.gameId) : await getActiveTournament(db, isFutures ? "FUTURES" : input.marketType);
  const gameId = tournament?.id || input.gameId || defaultGameId;
  const initialCap = tournament?.initial_capital || (isFutures ? 10000.0 : INITIAL_CAPITAL);
  const maxAllowedLeverage = tournament?.max_leverage || MAX_LEVERAGE;
  const isSoloLong = tournament ? !tournament.allow_short : false;

  // 1. Control de Fechas del Torneo (Zero Look-Ahead Bias)
  const dateCheck = checkTournamentDateRange(tournament);
  if (!dateCheck.allowed) {
    throw new Error(dateCheck.reason || "Operación rechazada: el torneo no se encuentra en período hábil para operar.");
  }

  // 2. Ventana de rebalanceo y cupo semanal (excepto Allianz)
  if (groupId.toLowerCase() !== "allianz") {
    const windowCheck = checkRebalanceWindow(tournament);
    if (!windowCheck.allowed) {
      throw new Error(windowCheck.reason || "Operación rechazada por restricciones de ventana de rebalanceo.");
    }

    if (tournament && tournament.max_trades_per_week && tournament.max_trades_per_week > 0) {
      const limitCheck = await checkWeeklyTradeLimit(db, gameId, groupId, tournament.max_trades_per_week);
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.reason || "Límite semanal de operaciones superado.");
      }
    }
  }

  if (tournament && leverage > maxAllowedLeverage) {
    throw new Error(`El apalancamiento máximo permitido en este torneo es ${maxAllowedLeverage}x.`);
  }

  // Determinar orderSide y positionSide
  let orderSide: "BUY" | "SELL" = input.orderSide === "SELL" ? "SELL" : "BUY";
  if (!input.orderSide && input.positionSide) {
    orderSide = input.positionSide === "SHORT" ? "SELL" : "BUY";
  }

  let positionSide: "LONG" | "SHORT" = input.positionSide
    ? input.positionSide
    : orderSide === "BUY"
    ? "LONG"
    : "SHORT";

  // REGLA CRÍTICA SOLO LONG:
  // "Si tenemos solo long activado la de venta no se ejecutara salvo tengamos la misma cantidad comprada. Tambien pueden ser parciales."
  let existingLongPos: PositionRecord | null = null;
  if (isSoloLong) {
    if (orderSide === "SELL") {
      // En modo Solo Long, no se permite abrir Short. Una venta es forzosamente el cierre (parcial o total) de una posición LONG comprada.
      positionSide = "LONG";

      existingLongPos = await getOpenLongPosition(db, gameId, groupId, symbol);
      if (!existingLongPos || existingLongPos.quantity <= 0) {
        throw new Error(
          `Operación rechazada: En modo Solo Long únicamente podés emitir órdenes de venta si poseés una posición comprada (LONG) en ${symbol}. Actualmente tu tenencia es de 0 unidades.`
        );
      }

      const reservedQty = await getReservedSellQuantity(db, gameId, groupId, symbol);
      const availableToSell = existingLongPos.quantity - reservedQty;

      if (quantity > availableToSell + 1e-9) {
        throw new Error(
          `Operación rechazada: La cantidad a vender (${quantity}) excede tu posición comprada disponible (${availableToSell.toFixed(4)} ${symbol}${reservedQty > 0 ? ` - ${reservedQty.toFixed(4)} unidades ya reservadas en órdenes pendientes` : ""}).`
        );
      }
    } else {
      // Compra en Solo Long
      positionSide = "LONG";
    }
  } else {
    // Si Shorting está permitido, validar apalancamiento y reglas
    if (positionSide === "SHORT" && !tournament?.allow_short) {
      throw new Error("Las operaciones en corto (SHORT) no están habilitadas en este torneo.");
    }
  }

  // Cotización en vivo (Anti Look-Ahead Bias)
  const quote = await fetchLiveMarketQuote(symbol);
  const nowMs = Date.now();
  const orderId = `ord_${nowMs}_${Math.random().toString(36).substring(2, 7)}`;

  const effectivePrice = orderType === "LIMIT" && limitPrice ? limitPrice : quote.price;
  if (!(isSoloLong && orderSide === "SELL") && (takeProfit !== undefined || stopLoss !== undefined)) {
    validateTpSlBounds(effectivePrice, positionSide, takeProfit, stopLoss);
  }

  const isStockMarketClosed = quote.asset_type === "Stock" && !quote.is_market_open;

  // Si el mercado bursátil está cerrado para acciones:
  if (isStockMarketClosed) {
    if (orderType === "MARKET") {
      // 1. Encolado de orden de mercado fuera de hora -> PENDING_OPEN
      // Cero look-ahead bias: NO se ejecuta con precio anterior, se programa para la apertura (09:30 ET)
      if (orderSide === "BUY") {
        await checkBuySolvency(
          db,
          gameId,
          groupId,
          initialCap,
          quote.asset_type,
          quantity,
          quote.price,
          leverage,
          "programar orden para la apertura",
          undefined,
          marginMode
        );
      }

      await db
        .prepare(
          `INSERT INTO paper_orders (
             id, game_id, user_id, symbol, asset_type, order_side,
             position_side, order_type, quantity, filled_quantity, limit_price,
             take_profit, stop_loss, leverage, margin_mode, status, created_at, filled_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, NULL, ?, ?, ?, ?, 'PENDING_OPEN', ?, NULL)`
        )
        .bind(
          orderId,
          gameId,
          groupId,
          symbol,
          quote.asset_type,
          orderSide,
          positionSide,
          orderType,
          quantity,
          takeProfit ?? null,
          stopLoss ?? null,
          leverage,
          marginMode,
          nowMs
        )
        .run();

      return {
        success: true,
        orderId,
        isFilled: false,
        orderType,
        orderSide,
        limitPrice: null,
        quantity,
        status: "PENDING_OPEN",
        message: "Orden programada con éxito para la apertura de mercado (09:30 ET).",
      };
    } else {
      // 2. Orden límite fuera de hora -> PENDING
      if (orderSide === "BUY") {
        await checkBuySolvency(
          db,
          gameId,
          groupId,
          initialCap,
          quote.asset_type,
          quantity,
          limitPrice || quote.price,
          leverage,
          "colocar orden límite fuera de hora",
          undefined,
          marginMode
        );
      }

      await db
        .prepare(
          `INSERT INTO paper_orders (
             id, game_id, user_id, symbol, asset_type, order_side,
             position_side, order_type, quantity, filled_quantity, limit_price,
             take_profit, stop_loss, leverage, margin_mode, status, created_at, filled_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?, ?, 'PENDING', ?, NULL)`
        )
        .bind(
          orderId,
          gameId,
          groupId,
          symbol,
          quote.asset_type,
          orderSide,
          positionSide,
          orderType,
          quantity,
          limitPrice || null,
          takeProfit ?? null,
          stopLoss ?? null,
          leverage,
          marginMode,
          nowMs
        )
        .run();

      return {
        success: true,
        orderId,
        isFilled: false,
        orderType,
        orderSide,
        limitPrice,
        quantity,
        status: "PENDING",
        message: "Orden límite registrada en espera de condiciones de mercado.",
      };
    }
  }

  // Verificar si la orden es de mercado o si es límite ejecutable inmediatamente (Mercado Abierto)
  let canFillImmediately = false;
  let executionPrice = quote.price;

  if (orderType === "MARKET") {
    canFillImmediately = true;
    executionPrice = quote.price;
  } else if (orderType === "LIMIT" && limitPrice) {
    if (orderSide === "BUY") {
      // Compra límite: se llena si el precio de mercado es menor o igual al límite (tick.price <= limit_p)
      if (quote.price <= limitPrice) {
        canFillImmediately = true;
        executionPrice = Math.min(quote.price, limitPrice);
      }
    } else {
      // Venta límite: se llena si el precio de mercado es mayor o igual al límite (tick.price >= limit_p)
      if (quote.price >= limitPrice) {
        canFillImmediately = true;
        executionPrice = Math.max(quote.price, limitPrice);
      }
    }
  }

  // Caso 1: Se llena de inmediato (Market o Limit ejecutable)
  if (canFillImmediately) {
    const isMarketableLimit = orderType === "LIMIT";

    if (orderSide === "SELL" && isSoloLong && existingLongPos) {
      // Cierre parcial o total de la posición LONG existente
      const closeResult = await executeClosePositionOperation(
        db,
        existingLongPos,
        quantity,
        executionPrice,
        nowMs,
        orderId
      );

      // Registrar orden como FILLED
      await db
        .prepare(
          `INSERT INTO paper_orders (
             id, game_id, user_id, symbol, asset_type, order_side,
             position_side, order_type, quantity, filled_quantity, limit_price,
             take_profit, stop_loss, leverage, margin_mode, status, created_at, filled_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'FILLED', ?, ?)`
        )
        .bind(
          orderId,
          gameId,
          groupId,
          symbol,
          quote.asset_type,
          orderSide,
          positionSide,
          orderType,
          quantity,
          quantity,
          limitPrice || null,
          leverage,
          marginMode,
          nowMs,
          nowMs
        )
        .run();

      const prefixMsg = isMarketableLimit ? "⚡ [Marketable Limit Fill] " : "";
      return {
        success: true,
        orderId,
        isFilled: true,
        isMarketableLimit,
        status: "FILLED",
        orderType,
        orderSide,
        executedPrice: executionPrice,
        quantity,
        tradeId: closeResult.tradeId,
        netRealizedPnl: closeResult.netRealizedPnl,
        isFullClose: closeResult.isFullClose,
        message: closeResult.isFullClose
          ? `${prefixMsg}Posición comprada en ${symbol} cerrada en su totalidad a $${executionPrice.toFixed(2)}.`
          : `${prefixMsg}Venta parcial de ${quantity} unidades de ${symbol} ejecutada a $${executionPrice.toFixed(2)}. Restan ${(existingLongPos.quantity - quantity).toFixed(4)} unidades.`,
      };
    } else {
      // Apertura de posición (BUY o SHORT si permitido)
      // Garantizar solvencia computando capital comprometido en órdenes pendientes
      if (orderSide === "BUY") {
        await checkBuySolvency(
          db,
          gameId,
          groupId,
          initialCap,
          quote.asset_type,
          quantity,
          executionPrice,
          leverage,
          "ejecutar orden de compra",
          undefined,
          marginMode
        );
      }

      const openResult = await executeOpenPositionOperation(
        db,
        gameId,
        groupId,
        symbol,
        quote.asset_type,
        positionSide,
        orderSide,
        quantity,
        executionPrice,
        leverage,
        marginMode,
        initialCap,
        nowMs,
        takeProfit,
        stopLoss
      );

      // Registrar orden como FILLED
      await db
        .prepare(
          `INSERT INTO paper_orders (
             id, game_id, user_id, symbol, asset_type, order_side,
             position_side, order_type, quantity, filled_quantity, limit_price,
             take_profit, stop_loss, leverage, margin_mode, status, created_at, filled_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FILLED', ?, ?)`
        )
        .bind(
          orderId,
          gameId,
          groupId,
          symbol,
          quote.asset_type,
          orderSide,
          positionSide,
          orderType,
          quantity,
          quantity,
          limitPrice || null,
          takeProfit ?? null,
          stopLoss ?? null,
          leverage,
          marginMode,
          nowMs,
          nowMs
        )
        .run();

      return {
        success: true,
        orderId,
        isFilled: true,
        isMarketableLimit,
        status: "FILLED",
        orderType,
        orderSide,
        executedPrice: executionPrice,
        quantity,
        tradeId: openResult.tradeId,
        positionId: openResult.positionId,
        message: isMarketableLimit
          ? `⚡ [Marketable Limit Fill] Orden Límite ${orderSide} de ${quantity} ${symbol} ejecutada de inmediato a $${executionPrice.toFixed(2)} por cruzar el mercado actual (Límite: $${limitPrice?.toFixed(2)}).`
          : `Orden ${orderType} ${orderSide} de ${quantity} ${symbol} ejecutada a $${executionPrice.toFixed(2)}.`,
      };
    }
  }

  // Caso 2: Orden Límite No Ejecutable de Inmediato -> Estado PENDING
  if (orderSide === "BUY") {
    await checkBuySolvency(
      db,
      gameId,
      groupId,
      initialCap,
      quote.asset_type,
      quantity,
      limitPrice || quote.price,
      leverage,
      "colocar orden límite",
      undefined,
      marginMode
    );
  }

  // Insertar orden PENDING
  await db
    .prepare(
      `INSERT INTO paper_orders (
         id, game_id, user_id, symbol, asset_type, order_side,
         position_side, order_type, quantity, filled_quantity, limit_price,
         take_profit, stop_loss, leverage, margin_mode, status, created_at, filled_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, ?, ?, ?, 'PENDING', ?, NULL)`
    )
    .bind(
      orderId,
      gameId,
      groupId,
      symbol,
      quote.asset_type,
      orderSide,
      positionSide,
      orderType,
      quantity,
      limitPrice || null,
      takeProfit ?? null,
      stopLoss ?? null,
      leverage,
      marginMode,
      nowMs
    )
    .run();

  return {
    success: true,
    orderId,
    isFilled: false,
    orderType,
    orderSide,
    limitPrice,
    quantity,
    status: "PENDING",
    message:
      orderSide === "BUY"
        ? `Orden Límite de Compra registrada para ${quantity} ${symbol} a $${limitPrice?.toFixed(2)}. Se ejecutará cuando el precio sea ≤ $${limitPrice?.toFixed(2)} (Actual: $${quote.price.toFixed(2)}).`
        : `Orden Límite de Venta registrada para ${quantity} ${symbol} a $${limitPrice?.toFixed(2)}. Se ejecutará cuando el precio sea ≥ $${limitPrice?.toFixed(2)} (Actual: $${quote.price.toFixed(2)}).`,
  };
}

/**
 * Consulta las órdenes pendientes o recientes de un grupo
 */
export async function getPaperOrders(
  db: D1Database,
  groupId: string,
  targetGameId?: string,
  statusFilter?: string,
  marketType?: string
): Promise<OrderRecord[]> {
  await ensurePaperOrdersTable(db);
  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (targetGameId && targetGameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);
  const gameId = tournament?.id || targetGameId || defaultGameId;

  let query = "SELECT * FROM paper_orders WHERE game_id = ? AND user_id = ?";
  const params: unknown[] = [gameId, groupId];

  if (statusFilter) {
    query += " AND status = ?";
    params.push(statusFilter);
  }

  query += " ORDER BY created_at DESC LIMIT 50";

  const res = await db.prepare(query).bind(...params).all<OrderRecord>();
  return res.results || [];
}

/**
 * Cancela una orden límite o encolada en estado PENDING o PENDING_OPEN
 */
export async function cancelPaperOrder(
  db: D1Database,
  groupId: string,
  orderId: string,
  targetGameId?: string,
  marketType?: string
): Promise<{ success: boolean; message: string }> {
  await ensurePaperOrdersTable(db);
  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (targetGameId && targetGameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);
  const gameId = tournament?.id || targetGameId || defaultGameId;

  const order = await db
    .prepare("SELECT * FROM paper_orders WHERE id = ? AND game_id = ? AND user_id = ?")
    .bind(orderId, gameId, groupId)
    .first<OrderRecord>();

  if (!order) {
    throw new Error("La orden no existe o no pertenece a tu grupo.");
  }

  if (order.status !== "PENDING" && order.status !== "PENDING_OPEN") {
    throw new Error(`La orden no se puede cancelar porque su estado actual es ${order.status}.`);
  }

  await db
    .prepare("UPDATE paper_orders SET status = 'CANCELLED' WHERE id = ?")
    .bind(orderId)
    .run();

  return {
    success: true,
    message: `Orden ${order.order_type === "MARKET" ? "programada" : "límite"} ${order.id} en ${order.symbol} cancelada correctamente.`,
  };
}

/**
 * Motor de Emparejamiento en Vivo para Órdenes Pendientes
 * Verifica los ticks actuales de mercado para todas las órdenes PENDING, PENDING_OPEN y PARTIALLY_FILLED
 * respetando estrictamente Cero Look-Ahead Bias (t_ejecucion >= t_apertura)
 */
export async function matchPendingOrders(
  db: D1Database,
  groupId?: string,
  targetGameId?: string,
  marketType?: string
): Promise<{ matchedCount: number; ordersFilled: string[] }> {
  await ensurePaperOrdersTable(db);
  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (targetGameId && targetGameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);

  // Si se especificó un targetGameId y el torneo no está en período activo, no se procesa
  if (targetGameId) {
    const dateCheck = checkTournamentDateRange(tournament);
    if (!dateCheck.allowed) {
      return { matchedCount: 0, ordersFilled: [] };
    }
  }

  let query = "SELECT * FROM paper_orders WHERE status IN ('PENDING', 'PENDING_OPEN', 'PARTIALLY_FILLED')";
  const params: unknown[] = [];
  if (targetGameId) {
    query += " AND game_id = ?";
    params.push(targetGameId);
  } else if (marketType) {
    const effectiveGameId = tournament?.id || defaultGameId;
    query += " AND game_id = ?";
    params.push(effectiveGameId);
  }
  if (groupId) {
    query += " AND user_id = ?";
    params.push(groupId);
  }
  query += " ORDER BY created_at ASC";

  const pending = await db.prepare(query).bind(...params).all<OrderRecord>();
  const orders = pending.results || [];

  if (orders.length === 0) {
    return { matchedCount: 0, ordersFilled: [] };
  }

  let matchedCount = 0;
  const ordersFilled: string[] = [];
  const tournamentCache = new Map<string, TournamentRecord | null>();

  const quotesMap = await fetchLiveMarketQuotesBatch(orders.map((o) => o.symbol));

  for (const ord of orders) {
    try {
      // Obtener torneo para verificar reglas y fechas
      let ordTournament = tournament;
      if (ord.game_id !== tournament?.id) {
        if (!tournamentCache.has(ord.game_id)) {
          tournamentCache.set(ord.game_id, await getTournamentById(db, ord.game_id));
        }
        ordTournament = tournamentCache.get(ord.game_id) || null;
      }

      const dateCheck = checkTournamentDateRange(ordTournament);
      if (!dateCheck.allowed) {
        continue;
      }

      const nowMs = Date.now();
      // Zero Look-Ahead Bias: comprobación estricta de tiempo monotónico
      if (ord.created_at > nowMs) {
        continue;
      }

      const quote = quotesMap.get(ord.symbol);
      if (!quote) {
        continue;
      }

      // Cero Look-Ahead Bias: si es acción bursátil y el mercado está cerrado, omitir estrictamente (t_ejec >= t_apertura)
      if (quote.asset_type === "Stock" && !quote.is_market_open) {
        continue;
      }

      let isTriggered = false;
      let fillPrice = quote.price;

      if (ord.status === "PENDING_OPEN") {
        // Orden fuera de hora encolada para apertura: se dispara con el primer precio disponible en vivo de apertura
        isTriggered = true;
        fillPrice = quote.price;
      } else if (ord.status === "PENDING" || ord.status === "PARTIALLY_FILLED") {
        if (!ord.limit_price || ord.limit_price <= 0) continue;

        if (ord.order_side === "BUY") {
          // Compra límite: tick.price <= limit_price
          if (quote.price <= ord.limit_price) {
            isTriggered = true;
            fillPrice = Math.min(quote.price, ord.limit_price);
          }
        } else {
          // Venta límite: tick.price >= limit_price
          if (quote.price >= ord.limit_price) {
            isTriggered = true;
            fillPrice = Math.max(quote.price, ord.limit_price);
          }
        }
      }

      if (!isTriggered) continue;

      const remainingQty = ord.quantity - (ord.filled_quantity || 0);
      if (remainingQty <= 0) continue;

      const isSoloLong = ordTournament ? !ordTournament.allow_short : false;
      const initialCap = ordTournament?.initial_capital || INITIAL_CAPITAL;

      // Ejecutar la orden disparada
      if (ord.order_side === "SELL" && isSoloLong) {
        const longPos = await getOpenLongPosition(db, ord.game_id, ord.user_id, ord.symbol);
        if (!longPos || longPos.quantity <= 0) {
          // No hay posición para cerrar en Solo Long: rechazar
          await db
            .prepare("UPDATE paper_orders SET status = 'REJECTED' WHERE id = ?")
            .bind(ord.id)
            .run();
          continue;
        }

        const closeQty = Math.min(remainingQty, longPos.quantity);
        await executeClosePositionOperation(db, longPos, closeQty, fillPrice, nowMs, ord.id);

        const totalFilled = (ord.filled_quantity || 0) + closeQty;
        if (totalFilled >= ord.quantity - 1e-9) {
          // Cierre total
          await db
            .prepare(
              "UPDATE paper_orders SET status = 'FILLED', filled_quantity = ?, filled_at = ? WHERE id = ?"
            )
            .bind(ord.quantity, nowMs, ord.id)
            .run();
        } else {
          // Cierre parcial
          await db
            .prepare(
              "UPDATE paper_orders SET status = 'PARTIALLY_FILLED', filled_quantity = ?, filled_at = ? WHERE id = ?"
            )
            .bind(totalFilled, nowMs, ord.id)
            .run();
        }

        matchedCount++;
        ordersFilled.push(ord.id);
      } else {
        // Ejecución de compra o apertura normal
        await executeOpenPositionOperation(
          db,
          ord.game_id,
          ord.user_id,
          ord.symbol,
          quote.asset_type,
          ord.position_side,
          ord.order_side,
          remainingQty,
          fillPrice,
          ord.leverage,
          ord.margin_mode,
          initialCap,
          nowMs,
          ord.take_profit,
          ord.stop_loss
        );

        await db
          .prepare("UPDATE paper_orders SET status = 'FILLED', filled_quantity = ?, filled_at = ? WHERE id = ?")
          .bind(ord.quantity, nowMs, ord.id)
          .run();

        matchedCount++;
        ordersFilled.push(ord.id);
      }
    } catch (err) {
      console.warn(
        `[LimitOrderEngine] Advertencia al procesar orden ${ord.id} (${ord.symbol}):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { matchedCount, ordersFilled };
}

/**
 * Evalúa las posiciones abiertas con Take Profit o Stop Loss configurado.
 * Obtiene las cotizaciones en lote y ejecuta el cierre de las posiciones que hayan tocado el nivel.
 * Respeta Cero Look-Ahead Bias (t <= T y mercado abierto si es Stock).
 */
export async function evaluatePositionsTpSl(
  db: D1Database,
  groupId?: string,
  targetGameId?: string,
  marketType?: string
): Promise<{ closedCount: number; positionsClosed: string[] }> {
  await ensurePaperOrdersTable(db);
  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (targetGameId && targetGameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);

  if (targetGameId) {
    const dateCheck = checkTournamentDateRange(tournament);
    if (!dateCheck.allowed) {
      return { closedCount: 0, positionsClosed: [] };
    }
  }

  let query = "SELECT * FROM paper_positions WHERE (take_profit IS NOT NULL OR stop_loss IS NOT NULL)";
  const params: unknown[] = [];
  if (targetGameId) {
    query += " AND game_id = ?";
    params.push(targetGameId);
  } else if (marketType) {
    const effectiveGameId = tournament?.id || defaultGameId;
    query += " AND game_id = ?";
    params.push(effectiveGameId);
  }
  if (groupId) {
    query += " AND user_id = ?";
    params.push(groupId);
  }

  const res = await db.prepare(query).bind(...params).all<PositionRecord>();
  const positions = res.results || [];
  if (positions.length === 0) {
    return { closedCount: 0, positionsClosed: [] };
  }

  const symbols = Array.from(new Set(positions.map((p) => p.symbol)));
  const quotesMap = await fetchLiveMarketQuotesBatch(symbols);

  let closedCount = 0;
  const positionsClosed: string[] = [];
  const tournamentCache = new Map<string, TournamentRecord | null>();

  for (const pos of positions) {
    try {
      let posTournament = tournament;
      if (pos.game_id !== tournament?.id) {
        if (!tournamentCache.has(pos.game_id)) {
          tournamentCache.set(pos.game_id, await getTournamentById(db, pos.game_id));
        }
        posTournament = tournamentCache.get(pos.game_id) || null;
      }

      const dateCheck = checkTournamentDateRange(posTournament);
      if (!dateCheck.allowed) {
        continue;
      }

      const quote = quotesMap.get(pos.symbol);
      if (!quote) continue;

      // Cero Look-Ahead Bias: si es acción bursátil y el mercado está cerrado, omitir estrictamente
      if (quote.asset_type === "Stock" && !quote.is_market_open) {
        continue;
      }

      const currentPrice = quote.price;
      let isTriggered = false;

      if (pos.side === "LONG") {
        if (pos.take_profit != null && currentPrice >= pos.take_profit) {
          isTriggered = true;
        } else if (pos.stop_loss != null && currentPrice <= pos.stop_loss) {
          isTriggered = true;
        }
      } else if (pos.side === "SHORT") {
        if (pos.take_profit != null && currentPrice <= pos.take_profit) {
          isTriggered = true;
        } else if (pos.stop_loss != null && currentPrice >= pos.stop_loss) {
          isTriggered = true;
        }
      }

      if (!isTriggered) continue;

      const nowMs = Date.now();
      await executeClosePositionOperation(
        db,
        pos,
        pos.quantity,
        currentPrice,
        nowMs
      );

      closedCount++;
      positionsClosed.push(pos.id);
    } catch (err) {
      console.warn(
        `[TpSlEngine] Error al evaluar TP/SL para posición ${pos.id} (${pos.symbol}):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { closedCount, positionsClosed };
}
