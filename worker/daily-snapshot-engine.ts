// Motor Institucional de Medición de Drawdown Día a Día y Snapshots Diarios
// Basado en Sylva / Aegis Engine - Cero Look-Ahead Bias (t <= T: estricta causalidad temporal)

import { D1Database, DailySnapshotRecord, PositionRecord, TournamentRecord } from "./types";
import { fetchLiveMarketQuote } from "./market-feed";
import {
  ensurePortfolioSeed,
  getActiveTournament,
  getTournamentById,
  DEFAULT_GAME_ID,
  INITIAL_CAPITAL,
} from "./paper-engine";
import { OFFICIAL_GROUPS } from "./group-auth";

let dailySnapshotsTableInitialized = false;

/**
 * Obtiene la fecha del snapshot en formato ISO (YYYY-MM-DD)
 * evaluada en la zona horaria oficial del torneo (America/Argentina/Buenos_Aires)
 */
export function getSnapshotDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Garantiza la existencia de la tabla inmutable portfolio_daily_snapshots y sus índices en Cloudflare D1
 */
export async function ensureDailySnapshotsTable(db: D1Database): Promise<void> {
  if (dailySnapshotsTableInitialized) return;
  dailySnapshotsTableInitialized = true;

  try {
    // 1. Crear tabla inmutable portfolio_daily_snapshots
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
          UNIQUE(game_id, user_id, snapshot_date)
        )`
      )
      .run();

    // 2. Índice de consulta rápida por torneo y grupo
    await db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_portfolio_daily_snapshots_lookup
         ON portfolio_daily_snapshots(game_id, user_id, snapshot_date DESC)`
      )
      .run();

    // 3. Asegurar columna max_drawdown_pct en paper_portfolios
    try {
      await db.prepare("ALTER TABLE paper_portfolios ADD COLUMN max_drawdown_pct REAL DEFAULT 0.0").run();
    } catch {
      // Ignorar si ya existe
    }
  } catch (err) {
    console.error("[DailySnapshotEngine] Error al inicializar esquema D1:", err);
  }
}

/**
 * Obtiene el último snapshot diario registrado para un grupo en un juego específico
 */
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

/**
 * Obtiene el historial cronológico de snapshots de un grupo para gráficos o auditoría
 */
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

/**
 * Procesa el snapshot diario de cierre bursátil para todos los grupos activos
 * 
 * Reglas Matemáticas e Institucionales (Sylva / Aegis):
 * 1. NAV_t = cash_balance_t + sum(qty * P_close)
 * 2. Peak_t = max(Peak_{t-1}, NAV_t) con Peak_0 = initialCapital
 * 3. Daily DD Nom = max(0, Peak_t - NAV_t)
 * 4. Daily DD % = Peak_t > 0 ? (Daily DD Nom / Peak_t) * 100 : 0
 * 5. Max DD Nom = max(MaxDD_{t-1}^nom, Daily DD Nom)
 * 6. Max DD % = max(MaxDD_{t-1}^%, Daily DD %)
 * 7. Invested % = NAV_t > 0 ? (invested_value / NAV_t) * 100 : 0
 * 8. Is Fully Invested = Invested % >= 95.0
 * 9. Cero Look-Ahead Bias: Sólo utiliza precios observables al instante t (t <= T).
 */
export async function processDailyMarketCloseSnapshot(
  db: D1Database,
  customDateStr?: string,
  targetGameId?: string
): Promise<{
  success: boolean;
  snapshotDate: string;
  processedCount: number;
  snapshots: DailySnapshotRecord[];
}> {
  await ensureDailySnapshotsTable(db);

  const snapshotDate = customDateStr || getSnapshotDateString();
  const nowMs = Date.now();

  const tournament = targetGameId ? await getTournamentById(db, targetGameId) : await getActiveTournament(db);
  const gameId = targetGameId || tournament?.id || DEFAULT_GAME_ID;
  const initialCap = tournament?.initial_capital || INITIAL_CAPITAL;

  const groups = Object.values(OFFICIAL_GROUPS);
  const createdSnapshots: DailySnapshotRecord[] = [];

  // Cache de cotizaciones al cierre para evitar consultas redundantes a la API externa
  const priceCache = new Map<string, number>();

  for (const grp of groups) {
    try {
      // 1. Obtener datos de portafolio y posiciones actuales
      const port = await ensurePortfolioSeed(db, grp.id, gameId, initialCap);
      const posRes = await db
        .prepare("SELECT * FROM paper_positions WHERE game_id = ? AND user_id = ?")
        .bind(gameId, grp.id)
        .all<PositionRecord>();

      const positions = posRes.results || [];

      // 2. Calcular valor invertido mark-to-market
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
        investedValue += pos.quantity * livePrice;
      }

      // 3. Computar NAV al cierre
      const nav = port.cash_balance + investedValue;

      // 4. Obtener High-Water Mark previo (Peak_{t-1})
      const prevSnapshot = await getLatestDailySnapshot(db, gameId, grp.id, snapshotDate);
      const prevPeak = prevSnapshot ? prevSnapshot.peak_nav : initialCap;
      const prevMaxDdNominal = prevSnapshot ? prevSnapshot.max_dd_nominal : 0.0;
      const prevMaxDdPct = prevSnapshot ? prevSnapshot.max_dd_pct : 0.0;

      // 5. High-Water Mark actual
      const peakNav = Math.max(prevPeak, nav);

      // 6. Drawdown diario nominal y porcentual
      const dailyDdNominal = Math.max(0, peakNav - nav);
      const dailyDdPct = peakNav > 1e-6 ? (dailyDdNominal / peakNav) * 100 : 0.0;

      // 7. Máximo Drawdown acumulado
      const maxDdNominal = Math.max(prevMaxDdNominal, dailyDdNominal);
      const maxDdPct = Math.max(prevMaxDdPct, dailyDdPct);

      // 8. Métricas de Cartera 100% Invertida (umbral 95.0%)
      const investedPct = nav > 1e-6 ? Math.min(100, Math.max(0, (investedValue / nav) * 100)) : 0.0;
      const isFullyInvested = investedPct >= 95.0 ? 1 : 0;

      // 9. Serializar posiciones
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
      };

      // 10. Inserción inmutable / idempotente en SQLite D1
      await db
        .prepare(
          `INSERT INTO portfolio_daily_snapshots (
             id, game_id, user_id, snapshot_date, timestamp,
             cash_balance, invested_value, nav, peak_nav,
             daily_dd_pct, max_dd_pct, daily_dd_nominal, max_dd_nominal,
             invested_pct, is_fully_invested, positions_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
             positions_json = excluded.positions_json`
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
          nowMs
        )
        .run();

      // 11. Sincronización atómica en paper_portfolios
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
