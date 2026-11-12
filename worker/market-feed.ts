// Módulo de Cotizaciones y Mercado Financiero en Tiempo Real
// Portado directamente de Aegis Audit Engine - Zero Look-Ahead Bias

import { MarketQuote } from "./types";

/**
 * Normaliza tickers para Yahoo Finance
 */
export function normalizeSymbol(raw: string): string {
  const s = (raw || "").trim().toUpperCase();
  if (s === "BTC" || s === "BITCOIN") return "BTC-USD";
  if (s === "ETH" || s === "ETHEREUM") return "ETH-USD";
  if (s === "SOL" || s === "SOLANA") return "SOL-USD";
  if (s === "BNB") return "BNB-USD";
  return s;
}

export function isBinanceSymbol(symbol: string): boolean {
  const s = normalizeSymbol(symbol).replace("-USD", "USDT").replace(/[-_/]/g, "");
  return (
    s.endsWith("USDT") ||
    s.startsWith("USDT") ||
    s.endsWith("ARS") ||
    s.startsWith("ARS") ||
    s.endsWith("BTC") ||
    s.startsWith("BTC") ||
    s.endsWith("ETH") ||
    s.startsWith("ETH")
  );
}

/**
 * Infiere el tipo de activo (Crypto, Stock, Futures)
 */
export function inferAssetType(symbol: string): "Crypto" | "Stock" | "Futures" {
  const norm = normalizeSymbol(symbol);
  if (norm.endsWith("=F") || norm.includes("PERP")) {
    return "Futures";
  }
  if (
    isBinanceSymbol(norm) ||
    norm.endsWith("-USD") ||
    norm.endsWith("-USDT") ||
    norm.includes("BTC") ||
    norm.includes("ETH") ||
    norm.includes("SOL")
  ) {
    return "Crypto";
  }
  return "Stock";
}

/**
 * Verifica si el mercado está abierto
 */
export function getMarketHoursStatus(assetType: "Crypto" | "Stock" | "Futures"): { isOpen: boolean; message: string } {
  if (assetType === "Crypto") {
    return {
      isOpen: true,
      message: "Mercado Crypto 24/7 Abierto",
    };
  }

  if (assetType === "Futures") {
    return {
      isOpen: true,
      message: "Mercado de Futuros Continuo (CME / Derivados)",
    };
  }

  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const partMap: Record<string, string> = {};
    for (const p of parts) {
      partMap[p.type] = p.value;
    }

    const weekday = partMap.weekday; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    const hour = parseInt(partMap.hour, 10);
    const minute = parseInt(partMap.minute, 10);
    const currentMinuteOfDay = hour * 60 + minute;

    if (weekday === "Sat" || weekday === "Sun") {
      return {
        isOpen: false,
        message: "Mercado cerrado: Fin de semana en Wall Street (apertura lunes 09:30 ET)",
      };
    }

    const marketOpen = 9 * 60 + 30; // 09:30 ET
    const marketClose = 16 * 60; // 16:00 ET

    if (currentMinuteOfDay >= marketOpen && currentMinuteOfDay < marketClose) {
      return {
        isOpen: true,
        message: "Mercado Regular Abierto (09:30 - 16:00 ET)",
      };
    }

    return {
      isOpen: false,
      message: `Mercado cerrado (${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ET). Horario regular: 09:30-16:00 ET.`,
    };
  } catch {
    return {
      isOpen: true,
      message: "Estado de mercado continuo",
    };
  }
}

interface QuoteCacheEntry {
  quote: MarketQuote;
  expiresAt: number;
}

const quoteCache = new Map<string, QuoteCacheEntry>();
const CACHE_TTL_MS = 10000; // 10 segundos de ciclo exacto de actualización para Binance y Yahoo Finance

/**
 * Consulta de ultra-baja latencia para Criptomonedas vía Binance API
 * Garantiza la toma del precio más reciente con bypass de caché intermedia
 */
async function fetchBinanceCryptoQuote(symbol: string): Promise<MarketQuote | null> {
  try {
    let pair = symbol.toUpperCase().replace("-USD", "USDT").replace(/[-_/]/g, "");
    if (pair === "BTC") pair = "BTCUSDT";
    if (pair === "ETH") pair = "ETHUSDT";
    if (pair === "SOL") pair = "SOLUSDT";
    if (pair === "BNB") pair = "BNBUSDT";

    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(pair)}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "AegisQuantEngine/2.0",
      },
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const price = parseFloat(data.lastPrice);
    const changePct = parseFloat(data.priceChangePercent);
    const prevClose = parseFloat(data.prevClosePrice);

    if (isNaN(price)) return null;

    return {
      symbol,
      asset_type: symbol.includes("PERP") ? "Futures" : "Crypto",
      price,
      change_24h_pct: isNaN(changePct) ? 0 : changePct,
      previous_close: isNaN(prevClose) ? price : prevClose,
      is_market_open: true,
      status_message: "Mercado Crypto 24/7 Abierto (Binance Spot Feed - Ciclo 10s)",
      timestamp_ms: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Consulta la cotización en vivo desde Yahoo Finance o Binance con Caché Edge
 * Implementa Zero Look-Ahead Bias utilizando la última cotización real en el instante de ejecución.
 */
export async function fetchLiveMarketQuote(rawSymbol: string): Promise<MarketQuote> {
  const symbol = normalizeSymbol(rawSymbol);
  const now = Date.now();

  // 1. Verificar si existe en la caché Edge y sigue vigente
  const cached = quoteCache.get(symbol);
  if (cached && now < cached.expiresAt) {
    return cached.quote;
  }

  const assetType = inferAssetType(symbol);

  // 2. Si es Cripto, Cripto Perpetuo o par de Binance, consultar primero el feed de Binance Spot/Perp
  if (isBinanceSymbol(symbol) || assetType === "Crypto" || symbol.includes("PERP")) {
    const cleanSym = symbol.replace("-PERP", "");
    const binanceQuote = await fetchBinanceCryptoQuote(cleanSym);
    if (binanceQuote) {
      binanceQuote.symbol = symbol;
      binanceQuote.asset_type = assetType;
      binanceQuote.is_market_open = true;
      quoteCache.set(symbol, {
        quote: binanceQuote,
        expiresAt: now + CACHE_TTL_MS,
      });
      return binanceQuote;
    }
  }

  // 3. Consulta a Yahoo Finance para Acciones (Wall Street) o Fallback
  // Se añade bypass de caché e intervalo de 10 segundos para garantizar el precio más reciente
  const marketStatus = getMarketHoursStatus(assetType);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&_t=${Date.now()}`;
  
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });

  if (!res.ok) {
    throw new Error(`Ticker '${symbol}' no encontrado en el mercado (${res.status})`);
  }

  const json = (await res.json()) as any;
  const result = json?.chart?.result?.[0];
  if (!result || !result.meta) {
    throw new Error(`Datos no disponibles para '${symbol}'`);
  }

  const meta = result.meta;
  // Obtener el precio más reciente actualizado:
  // 1. regularMarketPrice en tiempo real
  // 2. Último valor en los indicadores de cierre intradía
  // 3. previousClose o chartPreviousClose como salvaguarda
  const candlesClose = result.indicators?.quote?.[0]?.close;
  let latestCandleClose: number | undefined = undefined;
  if (Array.isArray(candlesClose) && candlesClose.length > 0) {
    const validCloses = candlesClose.filter((c: any) => typeof c === "number" && !isNaN(c));
    if (validCloses.length > 0) {
      latestCandleClose = validCloses[validCloses.length - 1];
    }
  }

  const price = meta.regularMarketPrice ?? latestCandleClose ?? meta.previousClose ?? meta.chartPreviousClose;
  if (price === undefined || price === null || isNaN(price)) {
    throw new Error(`Precio no disponible para '${symbol}'`);
  }

  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

  const quote: MarketQuote = {
    symbol: meta.symbol || symbol,
    asset_type: assetType,
    price: Number(price),
    change_24h_pct: Number(changePct),
    previous_close: Number(prevClose),
    is_market_open: marketStatus.isOpen,
    status_message: marketStatus.message,
    timestamp_ms: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
  };

  // Guardar en caché Edge con vigencia de 10 segundos
  quoteCache.set(symbol, {
    quote,
    expiresAt: now + CACHE_TTL_MS,
  });

  return quote;
}
