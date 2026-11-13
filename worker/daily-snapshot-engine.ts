import { D1Database, DailySnapshotRecord, PositionRecord, TournamentRecord, PortfolioRecord } from "./types";
import { fetchLiveMarketQuote, fetchLiveMarketQuotesBatch } from "./market-feed";
import {
  ensurePortfolioSeed,
  getActiveTournament,
  getTournamentById,
  DEFAULT_GAME_ID,
  DEFAULT_FUTURES_GAME_ID,
  INITIAL_CAPITAL,
} from "./paper-engine";
import { OFFICIAL_GROUPS } from "./group-auth";

let dailySnapshotsTableInitialized = false;
let futures15mTableInitialized = false;

export interface FuturesSnapshot15mRecord {
  id: string;
  game_id: string;
  user_id: string;
  bucket_ts: number;
  timestamp: number;
  cash_balance: number;
  used_margin: number;
  unrealized_pnl: number;
  equity: number;
  peak_equity: number;
  dd_nominal: number;
  dd_pct: number;
  max_dd_nominal: number;
  max_dd_pct: number;
  positions_json: string;
  created_at: number;
}

export interface EquityCurvePoint {
  timestamp: number;
  date?: string;
  bucketTs?: number;
  equity: number;
  peakEquity: number;
  drawdownPct: number;
  maxDrawdownPct: number;
}

export interface GroupEquitySeries {
  groupId: string;
  groupName: string;
  points: EquityCurvePoint[];
}

export interface EquityCurveSeriesResult {
  gameId: string;
  marketType: "FUTURES" | "PORTFOLIO";
  frequency: "15m" | "daily";
  series: GroupEquitySeries[];
}

export function getSnapshotDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function ensureDailySnapshotsTable(db: D1Database): Promise<void> {
  await ensureFutures15mSnapshotsTable(db);
  if (dailySnapshotsTableInitialized) return;
  dailySnapshotsTableInitialized = true;

  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS portfolio_daily_snapshots (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          snapshot_date TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          cash_balance REAL NOT NULL,
          invested_value REAL NOT NULL,
          nav REAL NOT NULL,
          peak_nav REAL NOT NULL,
          daily_dd_pct REAL NOT NULL,
          max_dd_pct REAL NOT NULL,
          daily_dd_nominal REAL NOT NULL,
          max_dd_nominal REAL NOT NULL,
          invested_pct REAL NOT NULL,
          is_fully_invested INTEGER NOT NULL,
          positions_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          nominal_pnl REAL DEFAULT 0.0,
          score REAL DEFAULT 0.0,
          UNIQUE(game_id, user_id, snapshot_date)
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_portfolio_daily_snapshots_lookup
         ON portfolio_daily_snapshots(game_id, user_id, snapshot_date DESC)`
      )
      .run();

    try {
      await db.prepare("ALTER TABLE portfolio_daily_snapshots ADD COLUMN nominal_pnl REAL DEFAULT 0.0").run();
    } catch {
    }
    try {
      await db.prepare("ALTER TABLE portfolio_daily_snapshots ADD COLUMN score REAL DEFAULT 0.0").run();
    } catch {
    }

    try {
      await db.prepare("ALTER TABLE paper_portfolios ADD COLUMN max_drawdown_pct REAL DEFAULT 0.0").run();
    } catch {
    }
  } catch (err) {
    console.error("[DailySnapshotEngine] Error al inicializar esquema D1:", err);
  }
}

export async function ensureFutures15mSnapshotsTable(db: D1Database): Promise<void> {
  if (futures15mTableInitialized) return;
  futures15mTableInitialized = true;

  try {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS futures_equity_snapshots_15m (
          id TEXT PRIMARY KEY,
          game_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          bucket_ts INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          cash_balance REAL NOT NULL,
          used_margin REAL NOT NULL,
          unrealized_pnl REAL NOT NULL,
          equity REAL NOT NULL,
          peak_equity REAL NOT NULL,
          dd_nominal REAL NOT NULL,
          dd_pct REAL NOT NULL,
          max_dd_nominal REAL NOT NULL,
          max_dd_pct REAL NOT NULL,
          positions_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          UNIQUE(game_id, user_id, bucket_ts)
        )`
      )
      .run();

    await db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_futures_snapshots_15m_lookup
         ON futures_equity_snapshots_15m(game_id, user_id, bucket_ts DESC)`
      )
      .run();
  } catch (err) {
    console.error("[DailySnapshotEngine] Error al inicializar tabla futures_equity_snapshots_15m:", err);
  }
}

export async function getLatestDailySnapshot(
  db: D1Database,
  gameId: string,
  userId: string,
  beforeDate?: string
): Promise<DailySnapshotRecord | null> {
  await ensureDailySnapshotsTable(db);

  let query = "SELECT * FROM portfolio_daily_snapshots WHERE game_id = ? AND user_id = ?";
  const params: unknown[] = [gameId, userId];

  if (beforeDate) {
    query += " AND snapshot_date < ?";
    params.push(beforeDate);
  }

  query += " ORDER BY snapshot_date DESC LIMIT 1";

  return await db.prepare(query).bind(...params).first<DailySnapshotRecord>();
}

export async function getDailySnapshotsForGroup(
  db: D1Database,
  gameId: string,
  userId: string,
  limit = 60
): Promise<DailySnapshotRecord[]> {
  await ensureDailySnapshotsTable(db);

  const res = await db
    .prepare(
      `SELECT * FROM portfolio_daily_snapshots 
       WHERE game_id = ? AND user_id = ? 
       ORDER BY snapshot_date ASC LIMIT ?`
    )
    .bind(gameId, userId, limit)
    .all<DailySnapshotRecord>();

  return res.results || [];
}

export async function processDailyMarketCloseSnapshot(
  db: D1Database,
  customDateStr?: string,
  targetGameId?: string,
  marketType?: string
): Promise<{
  success: boolean;
  snapshotDate: string;
  processedCount: number;
  snapshots: DailySnapshotRecord[];
}> {
  await ensureDailySnapshotsTable(db);

  const snapshotDate = customDateStr || getSnapshotDateString();
  const nowMs = Date.now();

  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (targetGameId && targetGameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);
  const gameId = targetGameId || tournament?.id || defaultGameId;
  const initialCap = tournament?.initial_capital || (isFutures ? 10000.0 : INITIAL_CAPITAL);

  const groups = Object.values(OFFICIAL_GROUPS);
  const createdSnapshots: DailySnapshotRecord[] = [];
  const priceCache = new Map<string, number>();

  for (const grp of groups) {
    try {
      const port = await ensurePortfolioSeed(db, grp.id, gameId, initialCap, isFutures ? "FUTURES" : marketType);
      const posRes = await db
        .prepare("SELECT * FROM paper_positions WHERE game_id = ? AND user_id = ?")
        .bind(gameId, grp.id)
        .all<PositionRecord>();

      const positions = posRes.results || [];

      let totalUsedMargin = 0;
      let totalUnrealizedPnl = 0;
      let investedValue = 0;

      for (const pos of positions) {
        let livePrice = pos.current_price || pos.entry_price;
        if (!priceCache.has(pos.symbol)) {
          try {
            const q = await fetchLiveMarketQuote(pos.symbol);
            priceCache.set(pos.symbol, q.price);
          } catch {
            priceCache.set(pos.symbol, livePrice);
          }
        }
        livePrice = priceCache.get(pos.symbol) || livePrice;

        let unrealized = 0;
        if (pos.side === "LONG") {
          unrealized = (livePrice - pos.entry_price) * pos.quantity;
        } else {
          unrealized = (pos.entry_price - livePrice) * pos.quantity;
        }

        const margin = Number(pos.initial_margin) || 0;
        totalUsedMargin += margin;
        totalUnrealizedPnl += unrealized;
        investedValue += pos.quantity * livePrice;
      }

      const nav = port.cash_balance + totalUsedMargin + totalUnrealizedPnl;

      const prevSnapshot = await getLatestDailySnapshot(db, gameId, grp.id, snapshotDate);
      const prevPeak = Math.max(initialCap, Number(port.peak_equity) || 0, Number(prevSnapshot?.peak_nav) || 0);
      const prevMaxDdNominal = Math.max(Number(port.max_drawdown_nominal) || 0.0, Number(prevSnapshot?.max_dd_nominal) || 0.0);
      const prevMaxDdPct = Math.max(Number(port.max_drawdown_pct) || 0.0, Number(prevSnapshot?.max_dd_pct) || 0.0);

      const peakNav = Math.max(prevPeak, nav);
      const dailyDdNominal = Math.max(0, peakNav - nav);
      const dailyDdPct = peakNav > 1e-6 ? (dailyDdNominal / peakNav) * 100 : 0.0;

      const maxDdNominal = Math.max(prevMaxDdNominal, dailyDdNominal);
      const maxDdPct = Math.max(prevMaxDdPct, dailyDdPct);

      const investedPct = nav > 1e-6 ? Math.min(100, Math.max(0, (investedValue / nav) * 100)) : 0.0;
      const isFullyInvested = investedPct >= 95.0 ? 1 : 0;
      const nominalPnl = nav - initialCap;
      const investmentFactor = isFullyInvested === 1 ? 1.0 : Math.pow(Math.max(0, investedPct) / 95.0, 2);
      let snapshotScore = 0.0;
      if (maxDdNominal > 0) {
        const raw = (nominalPnl / maxDdNominal) * investmentFactor;
        snapshotScore = Number.isFinite(raw) ? raw : 0.0;
      } else if (nominalPnl > 0) {
        const raw = nominalPnl * investmentFactor;
        snapshotScore = Number.isFinite(raw) ? raw : 0.0;
      } else {
        snapshotScore = 0.0;
      }

      const positionsJson = JSON.stringify(
        positions.map((p) => ({
          symbol: p.symbol,
          quantity: p.quantity,
          entryPrice: p.entry_price,
          currentPrice: priceCache.get(p.symbol) || p.current_price,
          side: p.side,
        }))
      );

      const snapshotId = `snp_${gameId}_${grp.id}_${snapshotDate}`;

      const snapshotRecord: DailySnapshotRecord = {
        id: snapshotId,
        game_id: gameId,
        user_id: grp.id,
        snapshot_date: snapshotDate,
        timestamp: nowMs,
        cash_balance: port.cash_balance,
        invested_value: investedValue,
        nav,
        peak_nav: peakNav,
        daily_dd_pct: dailyDdPct,
        max_dd_pct: maxDdPct,
        daily_dd_nominal: dailyDdNominal,
        max_dd_nominal: maxDdNominal,
        invested_pct: investedPct,
        is_fully_invested: isFullyInvested,
        positions_json: positionsJson,
        created_at: nowMs,
        nominal_pnl: nominalPnl,
        score: snapshotScore,
      };

      await db
        .prepare(
          `INSERT INTO portfolio_daily_snapshots (
             id, game_id, user_id, snapshot_date, timestamp,
             cash_balance, invested_value, nav, peak_nav,
             daily_dd_pct, max_dd_pct, daily_dd_nominal, max_dd_nominal,
             invested_pct, is_fully_invested, positions_json, created_at,
             nominal_pnl, score
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(game_id, user_id, snapshot_date) DO UPDATE SET
             timestamp = excluded.timestamp,
             cash_balance = excluded.cash_balance,
             invested_value = excluded.invested_value,
             nav = excluded.nav,
             peak_nav = excluded.peak_nav,
             daily_dd_pct = excluded.daily_dd_pct,
             max_dd_pct = excluded.max_dd_pct,
             daily_dd_nominal = excluded.daily_dd_nominal,
             max_dd_nominal = excluded.max_dd_nominal,
             invested_pct = excluded.invested_pct,
             is_fully_invested = excluded.is_fully_invested,
             positions_json = excluded.positions_json,
             nominal_pnl = excluded.nominal_pnl,
             score = excluded.score`
        )
        .bind(
          snapshotId,
          gameId,
          grp.id,
          snapshotDate,
          nowMs,
          port.cash_balance,
          investedValue,
          nav,
          peakNav,
          dailyDdPct,
          maxDdPct,
          dailyDdNominal,
          maxDdNominal,
          investedPct,
          isFullyInvested,
          positionsJson,
          nowMs,
          nominalPnl,
          snapshotScore
        )
        .run();

      await db
        .prepare(
          `UPDATE paper_portfolios 
           SET peak_equity = ?, max_drawdown_nominal = ?, max_drawdown_pct = ?, updated_at = ?
           WHERE game_id = ? AND user_id = ?`
        )
        .bind(peakNav, maxDdNominal, maxDdPct, nowMs, gameId, grp.id)
        .run();

      createdSnapshots.push(snapshotRecord);
    } catch (grpErr) {
      console.warn(
        `[DailySnapshotEngine] Error al computar snapshot diario para grupo ${grp.id}:`,
        grpErr instanceof Error ? grpErr.message : grpErr
      );
    }
  }

  return {
    success: true,
    snapshotDate,
    processedCount: createdSnapshots.length,
    snapshots: createdSnapshots,
  };
}

export async function processFutures15mSnapshots(
  db: D1Database,
  targetGameId?: string,
  customTs?: number
): Promise<{
  success: boolean;
  bucketTs: number;
  processedCount: number;
  snapshots: FuturesSnapshot15mRecord[];
}> {
  await ensureFutures15mSnapshotsTable(db);

  const nowMs = customTs || Date.now();
  const BUCKET_15M_MS = 15 * 60 * 1000;
  const bucketTs = Math.floor(nowMs / BUCKET_15M_MS) * BUCKET_15M_MS;

  const tournament = targetGameId
    ? await getTournamentById(db, targetGameId)
    : await getActiveTournament(db, "FUTURES");
  const gameId = targetGameId || tournament?.id || DEFAULT_FUTURES_GAME_ID;
  const initialCap = tournament?.initial_capital || 10000.0;

  const groups = Object.values(OFFICIAL_GROUPS);
  const createdSnapshots: FuturesSnapshot15mRecord[] = [];
  const priceCache = new Map<string, number>();

  for (const grp of groups) {
    try {
      const port = await ensurePortfolioSeed(db, grp.id, gameId, initialCap, "FUTURES");
      const posRes = await db
        .prepare("SELECT * FROM paper_positions WHERE game_id = ? AND user_id = ?")
        .bind(gameId, grp.id)
        .all<PositionRecord>();

      const positions = posRes.results || [];

      let totalUsedMargin = 0;
      let totalUnrealizedPnl = 0;

      for (const pos of positions) {
        let livePrice = pos.current_price || pos.entry_price;
        if (!priceCache.has(pos.symbol)) {
          try {
            const q = await fetchLiveMarketQuote(pos.symbol);
            priceCache.set(pos.symbol, q.price);
          } catch {
            priceCache.set(pos.symbol, livePrice);
          }
        }
        livePrice = priceCache.get(pos.symbol) || livePrice;

        let unrealized = 0;
        if (pos.side === "LONG") {
          unrealized = (livePrice - pos.entry_price) * pos.quantity;
        } else {
          unrealized = (pos.entry_price - livePrice) * pos.quantity;
        }

        totalUsedMargin += Number(pos.initial_margin) || 0;
        totalUnrealizedPnl += unrealized;
      }

      const equity = port.cash_balance + totalUsedMargin + totalUnrealizedPnl;

      const prevSnap = await db
        .prepare(
          `SELECT peak_equity, max_dd_nominal, max_dd_pct 
           FROM futures_equity_snapshots_15m 
           WHERE game_id = ? AND user_id = ? AND bucket_ts < ? 
           ORDER BY bucket_ts DESC LIMIT 1`
        )
        .bind(gameId, grp.id, bucketTs)
        .first<{ peak_equity: number; max_dd_nominal: number; max_dd_pct: number }>();

      const prevPeak = Math.max(initialCap, Number(port.peak_equity) || 0, Number(prevSnap?.peak_equity) || 0);
      const prevMaxDdNominal = Math.max(Number(port.max_drawdown_nominal) || 0.0, Number(prevSnap?.max_dd_nominal) || 0.0);
      const prevMaxDdPct = Math.max(Number(port.max_drawdown_pct) || 0.0, Number(prevSnap?.max_dd_pct) || 0.0);

      const peakEquity = Math.max(prevPeak, equity);
      const ddNominal = Math.max(0, peakEquity - equity);
      const ddPct = peakEquity > 1e-6 ? (ddNominal / peakEquity) * 100 : 0.0;

      const maxDdNominal = Math.max(prevMaxDdNominal, ddNominal);
      const maxDdPct = Math.max(prevMaxDdPct, ddPct);

      const positionsJson = JSON.stringify(
        positions.map((p) => ({
          symbol: p.symbol,
          quantity: p.quantity,
          entryPrice: p.entry_price,
          currentPrice: priceCache.get(p.symbol) || p.current_price,
          side: p.side,
          initialMargin: p.initial_margin,
          leverage: p.leverage,
        }))
      );

      const snapshotId = `snp15m_${gameId}_${grp.id}_${bucketTs}`;

      const snapshotRecord: FuturesSnapshot15mRecord = {
        id: snapshotId,
        game_id: gameId,
        user_id: grp.id,
        bucket_ts: bucketTs,
        timestamp: nowMs,
        cash_balance: port.cash_balance,
        used_margin: totalUsedMargin,
        unrealized_pnl: totalUnrealizedPnl,
        equity,
        peak_equity: peakEquity,
        dd_nominal: ddNominal,
        dd_pct: ddPct,
        max_dd_nominal: maxDdNominal,
        max_dd_pct: maxDdPct,
        positions_json: positionsJson,
        created_at: nowMs,
      };

      await db
        .prepare(
          `INSERT INTO futures_equity_snapshots_15m (
             id, game_id, user_id, bucket_ts, timestamp,
             cash_balance, used_margin, unrealized_pnl,
             equity, peak_equity, dd_nominal, dd_pct,
             max_dd_nominal, max_dd_pct, positions_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(game_id, user_id, bucket_ts) DO UPDATE SET
             timestamp = excluded.timestamp,
             cash_balance = excluded.cash_balance,
             used_margin = excluded.used_margin,
             unrealized_pnl = excluded.unrealized_pnl,
             equity = excluded.equity,
             peak_equity = excluded.peak_equity,
             dd_nominal = excluded.dd_nominal,
             dd_pct = excluded.dd_pct,
             max_dd_nominal = excluded.max_dd_nominal,
             max_dd_pct = excluded.max_dd_pct,
             positions_json = excluded.positions_json`
        )
        .bind(
          snapshotId,
          gameId,
          grp.id,
          bucketTs,
          nowMs,
          port.cash_balance,
          totalUsedMargin,
          totalUnrealizedPnl,
          equity,
          peakEquity,
          ddNominal,
          ddPct,
          maxDdNominal,
          maxDdPct,
          positionsJson,
          nowMs
        )
        .run();

      await db
        .prepare(
          `UPDATE paper_portfolios 
           SET peak_equity = ?, max_drawdown_nominal = ?, max_drawdown_pct = ?, updated_at = ?
           WHERE game_id = ? AND user_id = ?`
        )
        .bind(peakEquity, maxDdNominal, maxDdPct, nowMs, gameId, grp.id)
        .run();

      createdSnapshots.push(snapshotRecord);
    } catch (grpErr) {
      console.warn(
        `[DailySnapshotEngine] Error en snapshot 15m para grupo ${grp.id}:`,
        grpErr instanceof Error ? grpErr.message : grpErr
      );
    }
  }

  return {
    success: true,
    bucketTs,
    processedCount: createdSnapshots.length,
    snapshots: createdSnapshots,
  };
}

export async function reconstructEquityCurveFromTrades(
  db: D1Database,
  gameId?: string,
  marketType?: string
): Promise<Record<string, EquityCurvePoint[]>> {
  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (gameId && gameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = gameId ? await getTournamentById(db, gameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);
  const resolvedGameId = gameId || tournament?.id || defaultGameId;
  const initialCap = tournament?.initial_capital || (isFutures ? 10000.0 : INITIAL_CAPITAL);
  const groups = Object.values(OFFICIAL_GROUPS);

  let tournamentStartTs = Date.now() - 7 * 86400000;
  if (tournament?.start_date) {
    const parsed = new Date(tournament.start_date).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      tournamentStartTs = parsed;
    }
  } else if (tournament?.created_at && tournament.created_at > 0) {
    tournamentStartTs = tournament.created_at;
  }

  const tradesRes = await db
    .prepare(
      `SELECT id, game_id, user_id, symbol, asset_type, order_side,
              position_side, quantity, price, fee, realized_pnl, leverage,
              margin_mode, timestamp
       FROM paper_trades
       WHERE game_id = ?
       ORDER BY timestamp ASC, id ASC`
    )
    .bind(resolvedGameId)
    .all<{
      id: string;
      game_id: string;
      user_id: string;
      symbol: string;
      asset_type: string;
      order_side: string;
      position_side: string;
      quantity: number;
      price: number;
      fee: number;
      realized_pnl: number;
      leverage: number;
      margin_mode: string;
      timestamp: number;
    }>();
  const allTrades = tradesRes.results || [];

  const [portsRes, posRes] = await Promise.all([
    db.prepare("SELECT * FROM paper_portfolios WHERE game_id = ?").bind(resolvedGameId).all<PortfolioRecord>(),
    db.prepare("SELECT * FROM paper_positions WHERE game_id = ?").bind(resolvedGameId).all<PositionRecord>(),
  ]);
  const allPorts = portsRes.results || [];
  const allPositions = posRes.results || [];

  const symbolsToQuote = Array.from(new Set(allPositions.map((p) => p.symbol).filter(Boolean)));
  const livePriceMap = new Map<string, number>();
  if (symbolsToQuote.length > 0) {
    try {
      const quotes = await fetchLiveMarketQuotesBatch(symbolsToQuote);
      for (const [sym, q] of quotes.entries()) {
        livePriceMap.set(sym, q.price);
      }
    } catch {}
  }

  const reconstructedByGroup: Record<string, EquityCurvePoint[]> = {};
  const nowMs = Date.now();

  for (const grp of groups) {
    const groupTrades = allTrades.filter((t) => t.user_id === grp.id);
    const firstTradeTs = groupTrades.length > 0 ? Number(groupTrades[0].timestamp) : null;
    const initialTs = firstTradeTs !== null && firstTradeTs <= tournamentStartTs ? firstTradeTs - 1000 : tournamentStartTs;

    let runningEquity = initialCap;
    let peakEquity = initialCap;
    let maxDrawdownPct = 0.0;

    const points: EquityCurvePoint[] = [];

    // Start from initialCapital ($10,000)
    points.push({
      timestamp: initialTs,
      date: getSnapshotDateString(new Date(initialTs)),
      bucketTs: Math.floor(initialTs / (15 * 60 * 1000)) * (15 * 60 * 1000),
      equity: initialCap,
      peakEquity: initialCap,
      drawdownPct: 0.0,
      maxDrawdownPct: 0.0,
    });

    // Track open position lots per (group_id, symbol, position_side)
    const openLots = new Map<string, number>();

    for (const tr of groupTrades) {
      const sym = tr.symbol;
      const posSide = (tr.position_side || "LONG").toUpperCase();
      const orderSide = (tr.order_side || "BUY").toUpperCase();
      const key = `${sym}:${posSide}`;
      const isLong = posSide === "LONG";
      const isBuy = orderSide === "BUY";
      const isOpen = (isLong && isBuy) || (!isLong && !isBuy);
      const qty = Number(tr.quantity) || 0;
      const fee = Number(tr.fee) || 0;
      const realizedPnl = Number(tr.realized_pnl) || 0;

      if (isOpen) {
        const curLots = openLots.get(key) || 0;
        openLots.set(key, curLots + qty);
        runningEquity -= fee;
      } else {
        const curLots = openLots.get(key) || 0;
        openLots.set(key, Math.max(0, curLots - qty));
        runningEquity += realizedPnl;
      }

      if (runningEquity > peakEquity) {
        peakEquity = runningEquity;
      }
      const ddNom = Math.max(0, peakEquity - runningEquity);
      const ddPct = peakEquity > 1e-6 ? (ddNom / peakEquity) * 100 : 0.0;
      if (ddPct > maxDrawdownPct) {
        maxDrawdownPct = ddPct;
      }

      const trTs = Number(tr.timestamp) || initialTs;
      points.push({
        timestamp: trTs,
        date: getSnapshotDateString(new Date(trTs)),
        bucketTs: Math.floor(trTs / (15 * 60 * 1000)) * (15 * 60 * 1000),
        equity: Math.round(runningEquity * 100) / 100,
        peakEquity: Math.round(peakEquity * 100) / 100,
        drawdownPct: Math.round(ddPct * 100) / 100,
        maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
      });
    }

    // Append current live MTM point from paper_portfolios/paper_positions
    const port = allPorts.find((p) => p.user_id === grp.id);
    const grpPositions = allPositions.filter((p) => p.user_id === grp.id);
    const cashBalance = port ? Number(port.cash_balance) : runningEquity;

    let totalUsedMargin = 0;
    let totalUnrealizedPnl = 0;
    for (const pos of grpPositions) {
      const livePrice = livePriceMap.get(pos.symbol) ?? (pos.current_price || pos.entry_price);
      let unrealized = 0;
      if (pos.side === "LONG") {
        unrealized = (livePrice - pos.entry_price) * pos.quantity;
      } else {
        unrealized = (pos.entry_price - livePrice) * pos.quantity;
      }
      totalUsedMargin += Number(pos.initial_margin) || 0;
      totalUnrealizedPnl += unrealized;
    }

    const liveEquity = cashBalance + totalUsedMargin + totalUnrealizedPnl;
    if (liveEquity > peakEquity) {
      peakEquity = liveEquity;
    }
    const liveDdNom = Math.max(0, peakEquity - liveEquity);
    const liveDdPct = peakEquity > 1e-6 ? (liveDdNom / peakEquity) * 100 : 0.0;
    if (liveDdPct > maxDrawdownPct) {
      maxDrawdownPct = liveDdPct;
    }

    points.push({
      timestamp: nowMs,
      date: getSnapshotDateString(new Date(nowMs)),
      bucketTs: Math.floor(nowMs / (15 * 60 * 1000)) * (15 * 60 * 1000),
      equity: Math.round(liveEquity * 100) / 100,
      peakEquity: Math.round(peakEquity * 100) / 100,
      drawdownPct: Math.round(liveDdPct * 100) / 100,
      maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    });

    reconstructedByGroup[grp.id] = points;
  }

  return reconstructedByGroup;
}

export async function getEquityCurveSeries(
  db: D1Database,
  gameId?: string,
  marketType?: string,
  reconstruct: boolean = false
): Promise<EquityCurveSeriesResult> {
  const isFutures = (marketType || "").toUpperCase() === "FUTURES" || (gameId && gameId.toLowerCase().includes("futur"));
  const defaultGameId = isFutures ? DEFAULT_FUTURES_GAME_ID : DEFAULT_GAME_ID;
  const tournament = gameId ? await getTournamentById(db, gameId) : await getActiveTournament(db, isFutures ? "FUTURES" : marketType);
  const resolvedGameId = gameId || tournament?.id || defaultGameId;

  const customNamesMap: Record<string, string> = {};
  try {
    const rows = await db.prepare("SELECT group_id, display_name FROM group_custom_names").all();
    if (rows && rows.results) {
      for (const r of rows.results as any[]) {
        if (r.group_id && r.display_name) {
          customNamesMap[r.group_id] = r.display_name;
        }
      }
    }
  } catch {}

  const groups = Object.values(OFFICIAL_GROUPS);
  const seriesByGroup: Record<string, GroupEquitySeries> = {};

  for (const grp of groups) {
    const groupName = customNamesMap[grp.id] || grp.name;
    seriesByGroup[grp.id] = {
      groupId: grp.id,
      groupName,
      points: [],
    };
  }

  if (isFutures) {
    await ensureFutures15mSnapshotsTable(db);
    const rowsRes = await db
      .prepare(
        `SELECT user_id, bucket_ts, timestamp, equity, peak_equity, dd_pct, max_dd_pct
         FROM futures_equity_snapshots_15m
         WHERE game_id = ?
         ORDER BY bucket_ts ASC`
      )
      .bind(resolvedGameId)
      .all<{
        user_id: string;
        bucket_ts: number;
        timestamp: number;
        equity: number;
        peak_equity: number;
        dd_pct: number;
        max_dd_pct: number;
      }>();

    const rows = rowsRes.results || [];
    for (const r of rows) {
      if (seriesByGroup[r.user_id]) {
        seriesByGroup[r.user_id].points.push({
          timestamp: r.bucket_ts || r.timestamp,
          bucketTs: r.bucket_ts,
          equity: r.equity,
          peakEquity: r.peak_equity,
          drawdownPct: r.dd_pct,
          maxDrawdownPct: r.max_dd_pct,
        });
      }
    }
  } else {
    await ensureDailySnapshotsTable(db);
    const rowsRes = await db
      .prepare(
        `SELECT user_id, snapshot_date, timestamp, nav, peak_nav, daily_dd_pct, max_dd_pct
         FROM portfolio_daily_snapshots
         WHERE game_id = ?
         ORDER BY snapshot_date ASC`
      )
      .bind(resolvedGameId)
      .all<{
        user_id: string;
        snapshot_date: string;
        timestamp: number;
        nav: number;
        peak_nav: number;
        daily_dd_pct: number;
        max_dd_pct: number;
      }>();

    const rows = rowsRes.results || [];
    for (const r of rows) {
      if (seriesByGroup[r.user_id]) {
        seriesByGroup[r.user_id].points.push({
          timestamp: r.timestamp,
          date: r.snapshot_date,
          equity: r.nav,
          peakEquity: r.peak_nav,
          drawdownPct: r.daily_dd_pct,
          maxDrawdownPct: r.max_dd_pct,
        });
      }
    }
  }

  const needsReconstruct = reconstruct || groups.some((grp) => seriesByGroup[grp.id].points.length < 2);

  if (needsReconstruct) {
    try {
      const reconstructedCurves = await reconstructEquityCurveFromTrades(db, resolvedGameId, isFutures ? "FUTURES" : "PORTFOLIO");
      for (const grp of groups) {
        if (reconstruct || seriesByGroup[grp.id].points.length < 2) {
          const tradePoints = reconstructedCurves[grp.id] || [];
          const sourcePoints = reconstruct
            ? [...tradePoints]
            : (seriesByGroup[grp.id].points.length === 0
                ? [...tradePoints]
                : [...seriesByGroup[grp.id].points, ...tradePoints]);
          sourcePoints.sort((a, b) => a.timestamp - b.timestamp);

          const merged: EquityCurvePoint[] = [];
          for (const pt of sourcePoints) {
            if (merged.length === 0) {
              merged.push(pt);
              continue;
            }
            const prev = merged[merged.length - 1];
            if (Math.abs(pt.timestamp - prev.timestamp) < 1000) {
              merged[merged.length - 1] = pt;
            } else {
              merged.push(pt);
            }
          }

          let rollingPeak = 0;
          let rollingMaxDd = 0;
          for (const pt of merged) {
            if (pt.equity > rollingPeak) {
              rollingPeak = pt.equity;
            }
            pt.peakEquity = Math.round(rollingPeak * 100) / 100;
            const ddNom = Math.max(0, rollingPeak - pt.equity);
            const ddPct = rollingPeak > 1e-6 ? (ddNom / rollingPeak) * 100 : 0.0;
            if (ddPct > rollingMaxDd) {
              rollingMaxDd = ddPct;
            }
            pt.drawdownPct = Math.round(ddPct * 100) / 100;
            pt.maxDrawdownPct = Math.round(rollingMaxDd * 100) / 100;
          }

          seriesByGroup[grp.id].points = merged;
        }
      }
    } catch (err) {
      console.error("[getEquityCurveSeries] Error reconstructing curve from trades:", err);
    }
  }

  return {
    gameId: resolvedGameId,
    marketType: isFutures ? "FUTURES" : "PORTFOLIO",
    frequency: isFutures ? "15m" : "daily",
    series: Object.values(seriesByGroup),
  };
}
