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

/**
 * Infiere el tipo de activo (Crypto vs Stock)
 */
export function inferAssetType(symbol: string): "Crypto" | "Stock" {
  const norm = normalizeSymbol(symbol);
  if (
    norm.endsWith("-USD") ||
    norm.endsWith("-USDT") ||
    norm.endsWith("USDT") ||
    norm.includes("BTC") ||
    norm.includes("ETH") ||
    norm.includes("SOL")
  ) {
    return "Crypto";
  }
  return "Stock";
}

/**
 * Verifica si el mercado bursátil está abierto según horario oficial de Nueva York (ET)
 * Crypto opera 24/7/365
 */
export function getMarketHoursStatus(assetType: "Crypto" | "Stock"): { isOpen: boolean; message: string } {
  if (assetType === "Crypto") {
    return {
      isOpen: true,
      message: "Mercado Crypto 24/7 Abierto",
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

/**
 * Consulta la cotización en vivo desde Yahoo Finance
 * Implementa Zero Look-Ahead Bias utilizando la última cotización real en el instante de ejecución.
 */
export async function fetchLiveMarketQuote(rawSymbol: string): Promise<MarketQuote> {
  const symbol = normalizeSymbol(rawSymbol);
  const assetType = inferAssetType(symbol);
  const marketStatus = getMarketHoursStatus(assetType);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json",
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
  const price = meta.regularMarketPrice ?? meta.previousClose ?? meta.chartPreviousClose;
  if (price === undefined || price === null || isNaN(price)) {
    throw new Error(`Precio no disponible para '${symbol}'`);
  }

  const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price;
  const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

  return {
    symbol: meta.symbol || symbol,
    asset_type: assetType,
    price: Number(price),
    change_24h_pct: Number(changePct),
    previous_close: Number(prevClose),
    is_market_open: marketStatus.isOpen,
    status_message: marketStatus.message,
    timestamp_ms: Date.now(),
  };
}
