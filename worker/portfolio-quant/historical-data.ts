// Gestor de Series Históricas y Cotizaciones de Mercado - Zero Look-Ahead Bias

export interface HistoricalCandle {
  date: string;
  timestamp: number;
  close: number;
}

const memoryCache = new Map<string, { fetchedAt: number; candles: HistoricalCandle[] }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos

export function normalizeTicker(raw: string): string {
  const s = (raw || "").trim().toUpperCase();
  if (s === "BTC" || s === "BITCOIN") return "BTC-USD";
  if (s === "ETH" || s === "ETHEREUM") return "ETH-USD";
  return s;
}

/**
 * Descarga velas diarias de los últimos 5 años desde Yahoo Finance
 */
export async function fetchHistoricalCandles(rawTicker: string): Promise<HistoricalCandle[]> {
  const ticker = normalizeTicker(rawTicker);
  const now = Date.now();

  const cached = memoryCache.get(ticker);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.candles;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=5y`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Error al obtener histórico para '${ticker}' (${res.status})`);
  }

  const json = (await res.json()) as any;
  const result = json?.chart?.result?.[0];
  if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
    throw new Error(`Datos históricos incompletos para '${ticker}'`);
  }

  const timestamps = result.timestamp as number[];
  const closes = result.indicators.quote[0].close as (number | null)[];
  const adjCloses = result.indicators?.adjclose?.[0]?.adjclose as (number | null)[] | undefined;

  const candles: HistoricalCandle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const price = adjCloses?.[i] ?? closes[i];
    if (price !== null && price !== undefined && !isNaN(price) && price > 0) {
      const d = new Date(ts * 1000);
      const dateStr = d.toISOString().split("T")[0];
      candles.push({
        date: dateStr,
        timestamp: ts * 1000,
        close: Number(price),
      });
    }
  }

  // Ordenar cronológicamente (Zero Look-Ahead Bias)
  candles.sort((a, b) => a.timestamp - b.timestamp);

  memoryCache.set(ticker, { fetchedAt: now, candles });
  return candles;
}

/**
 * Alinea las series de precios de múltiples tickers sobre las fechas comunes
 */
export async function getAlignedPriceMatrix(tickers: string[], maxVelas = 2520) {
  const normTickers = tickers.map(normalizeTicker);
  const seriesByTicker = new Map<string, Map<string, number>>();

  for (const t of normTickers) {
    const candles = await fetchHistoricalCandles(t);
    const dateMap = new Map<string, number>();
    for (const c of candles) {
      dateMap.set(c.date, c.close);
    }
    seriesByTicker.set(t, dateMap);
  }

  // Encontrar intersección de fechas disponibles en todos los tickers
  const firstTickerMap = seriesByTicker.get(normTickers[0])!;
  let commonDates = Array.from(firstTickerMap.keys());

  for (let i = 1; i < normTickers.length; i++) {
    const curMap = seriesByTicker.get(normTickers[i])!;
    commonDates = commonDates.filter((d) => curMap.has(d));
  }

  // Ordenar fechas cronológicamente
  commonDates.sort();

  // Limitar al número de velas pedido
  if (commonDates.length > maxVelas) {
    commonDates = commonDates.slice(commonDates.length - maxVelas);
  }

  if (commonDates.length < 5) {
    throw new Error("No hay suficientes fechas comunes entre los activos seleccionados para optimizar.");
  }

  // Construir mapa de series y matriz [N_velas, N_activos]
  const seriesMap: Record<string, number[]> = {};
  for (const t of normTickers) {
    const map = seriesByTicker.get(t)!;
    seriesMap[t] = commonDates.map((d) => map.get(d)!);
  }

  return {
    tickers: normTickers,
    dates: commonDates,
    seriesMap,
    numVelas: commonDates.length,
  };
}
