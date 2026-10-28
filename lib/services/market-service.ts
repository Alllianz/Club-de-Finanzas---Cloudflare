import prisma from "../prisma";
import { MemoryTtlCache } from "../utils/cache";
import {
  fallbackMarketItem,
  parseCommodityItemFromAlphaSeries,
  parseIndexItemFromAlphaQuote,
  parseRateItemFromAlphaSeries,
} from "../utils/market-parsers";
import type {
  CountryRiskLatestResponse,
  CountryRiskPoint,
  CountryRiskResponse,
  GlobalMarketItem,
  GlobalMarketResponse,
  GlobalMarketSection,
} from "../types";

type IndexConfig = {
  symbol: string;
  label: string;
};

type RateConfig = {
  symbol: string;
  label: string;
  maturity: "5year" | "10year" | "30year";
};

type CommodityConfig = {
  symbol: string;
  label: string;
  functionName: "WTI" | "BRENT" | "GASOLINE" | "NATURAL_GAS";
  fallbackFunctionName?: "NATURAL_GAS";
};

type SectionResult = {
  section: GlobalMarketSection;
  hasFailures: boolean;
};

const alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY ?? "";
const alphaVantageBaseUrl = process.env.ALPHA_VANTAGE_BASE_URL ?? "https://www.alphavantage.co/query";
const argentinaDatosBaseUrl = process.env.ARGENTINA_DATOS_BASE_URL ?? "https://api.argentinadatos.com";
const CACHE_TTL_MS = 5 * 60_000; // 5 minutos de caché para ahorrar peticiones a Alpha Vantage
const COUNTRY_RISK_CACHE_TTL_MS = 15 * 60_000;
const ALPHA_MIN_INTERVAL_MS = 1000;
const ALPHA_TIMEOUT_MS = Number(process.env.ALPHA_TIMEOUT_MS ?? 8_000);
const ARGENTINA_DATOS_TIMEOUT_MS = Number(process.env.ARGENTINA_DATOS_TIMEOUT_MS ?? 8_000);
const ALPHA_RATE_LIMIT_COOLDOWN_MS = Number(process.env.ALPHA_RATE_LIMIT_COOLDOWN_MS ?? 60 * 60 * 1000); // 1 hora cooldown

const indicesConfig: IndexConfig[] = [
  { symbol: "SPY", label: "S&P 500" },
  { symbol: "QQQ", label: "Nasdaq 100" },
  { symbol: "DIA", label: "Dow Jones" },
];

const ratesConfig: RateConfig[] = [
  { symbol: "UST10Y", label: "UST 10Y", maturity: "10year" },
  { symbol: "UST30Y", label: "UST 30Y", maturity: "30year" },
  { symbol: "UST5Y", label: "UST 5Y", maturity: "5year" },
];

const energyConfig: CommodityConfig[] = [
  { symbol: "WTI", label: "WTI", functionName: "WTI" },
  { symbol: "BRENT", label: "Brent", functionName: "BRENT" },
  { symbol: "GASOLINE", label: "Gasolina", functionName: "GASOLINE", fallbackFunctionName: "NATURAL_GAS" },
];

const marketCache = new MemoryTtlCache<GlobalMarketResponse>(CACHE_TTL_MS);
const countryRiskCache = new MemoryTtlCache<CountryRiskResponse>(COUNTRY_RISK_CACHE_TTL_MS);
const countryRiskLatestCache = new MemoryTtlCache<CountryRiskLatestResponse>(COUNTRY_RISK_CACHE_TTL_MS);
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;
let alphaRateLimitedUntil = 0;
let countryRiskRefreshInFlight: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function mapSnapshotPoints(
  points: Array<{ riskDate: Date; value: number }>,
): CountryRiskPoint[] {
  return points
    .map((point) => ({
      date: point.riskDate.toISOString().slice(0, 10),
      value: point.value,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function scheduleAlphaRequest(): Promise<void> {
  const scheduled = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    const waitMs = Math.max(0, ALPHA_MIN_INTERVAL_MS - elapsed);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
    lastRequestAt = Date.now();
  });

  requestQueue = scheduled.catch(() => undefined);
  await scheduled;
}

function buildAlphaUrl(params: Record<string, string>) {
  const search = new URLSearchParams({
    ...params,
    apikey: alphaVantageApiKey,
  });
  return `${alphaVantageBaseUrl}?${search.toString()}`;
}

function buildArgentinaDatosUrl(pathname: string) {
  const base = argentinaDatosBaseUrl.replace(/\/+$/, "");
  return `${base}${pathname}`;
}

function validateAlphaPayload(payload: unknown): void {
  if (!payload || typeof payload !== "object") {
    throw new Error("Alpha Vantage payload invalido");
  }

  const alphaPayload = payload as Record<string, unknown>;
  if (typeof alphaPayload.Note === "string") {
    throw new Error(alphaPayload.Note);
  }

  if (typeof alphaPayload.Information === "string") {
    throw new Error(alphaPayload.Information);
  }

  if (typeof alphaPayload["Error Message"] === "string") {
    throw new Error(alphaPayload["Error Message"]);
  }
}

function isAlphaRateLimitError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("rate limit") || message.includes("25 requests per day") || message.includes("frequency");
}

async function fetchAlphaData(params: Record<string, string>) {
  if (!alphaVantageApiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY no definido");
  }
  if (Date.now() < alphaRateLimitedUntil) {
    throw new Error("Alpha Vantage rate limit cooldown activo");
  }

  await scheduleAlphaRequest();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALPHA_TIMEOUT_MS);
  const response = await fetch(buildAlphaUrl(params), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    throw new Error(`Alpha Vantage HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  try {
    validateAlphaPayload(payload);
  } catch (error) {
    if (isAlphaRateLimitError(error)) {
      alphaRateLimitedUntil = Date.now() + ALPHA_RATE_LIMIT_COOLDOWN_MS;
    }
    throw error;
  }
  return payload;
}

async function resolveIndexItem(config: IndexConfig): Promise<{ item: GlobalMarketItem; failed: boolean }> {
  try {
    const payload = await fetchAlphaData({
      function: "GLOBAL_QUOTE",
      symbol: config.symbol,
    });

    return {
      item: parseIndexItemFromAlphaQuote(
        payload as { "Global Quote"?: Record<string, string> },
        config,
      ),
      failed: false,
    };
  } catch (error) {
    console.error(`[market] Error resolviendo indice ${config.symbol}`, error);
    return { item: fallbackMarketItem(config.symbol, config.label), failed: true };
  }
}

async function resolveRateItem(config: RateConfig): Promise<{ item: GlobalMarketItem; failed: boolean }> {
  try {
    const payload = await fetchAlphaData({
      function: "TREASURY_YIELD",
      interval: "daily",
      maturity: config.maturity,
    });

    return {
      item: parseRateItemFromAlphaSeries(payload as { data?: { date?: string; value?: string }[] }, config),
      failed: false,
    };
  } catch (error) {
    console.error(`[market] Error resolviendo tasa ${config.symbol}`, error);
    return { item: fallbackMarketItem(config.symbol, config.label), failed: true };
  }
}

async function resolveCommodityItem(config: CommodityConfig): Promise<{ item: GlobalMarketItem; failed: boolean }> {
  try {
    let payload: unknown;

    try {
      payload = await fetchAlphaData({
        function: config.functionName,
        interval: "daily",
      });
    } catch (error) {
      if (isAlphaRateLimitError(error)) {
        throw error;
      }
      if (!config.fallbackFunctionName) {
        throw error;
      }

      payload = await fetchAlphaData({
        function: config.fallbackFunctionName,
        interval: "daily",
      });
    }

    return {
      item: parseCommodityItemFromAlphaSeries(payload as { data?: { date?: string; value?: string }[] }, config),
      failed: false,
    };
  } catch (error) {
    console.error(
      `[market][energy] Error resolviendo commodity ${config.symbol}`,
      error,
    );
    return { item: fallbackMarketItem(config.symbol, config.label), failed: true };
  }
}

async function resolveIndicesSection(): Promise<SectionResult> {
  const results = await Promise.all(indicesConfig.map((config) => resolveIndexItem(config)));

  return {
    section: {
      key: "indices",
      title: "Índices",
      items: results.map((result) => result.item),
    },
    hasFailures: results.some((result) => result.failed),
  };
}

async function resolveRatesSection(): Promise<SectionResult> {
  const results = await Promise.all(ratesConfig.map((config) => resolveRateItem(config)));

  return {
    section: {
      key: "rates",
      title: "Tasas",
      items: results.map((result) => result.item),
    },
    hasFailures: results.some((result) => result.failed),
  };
}

async function resolveEnergySection(): Promise<SectionResult> {
  const results = await Promise.all(energyConfig.map((config) => resolveCommodityItem(config)));

  return {
    section: {
      key: "energy",
      title: "Energía",
      items: results.map((result) => result.item),
    },
    hasFailures: results.some((result) => result.failed),
  };
}

function buildPayload(sections: GlobalMarketSection[]): GlobalMarketResponse {
  return {
    updatedAt: new Date().toISOString(),
    sections,
  };
}

export async function getGlobalMarketData(): Promise<GlobalMarketResponse> {
  const freshCache = marketCache.getFresh();
  if (freshCache) return freshCache;

  const staleCache = marketCache.getStale();

  const [indices, rates, energy] = await Promise.all([
    resolveIndicesSection(),
    resolveRatesSection(),
    resolveEnergySection(),
  ]);

  const hasFailures = indices.hasFailures || rates.hasFailures || energy.hasFailures;
  if (hasFailures && staleCache) {
    return {
      ...staleCache,
      stale: true,
    };
  }

  const payload = buildPayload([indices.section, rates.section, energy.section]);
  marketCache.set(payload);
  return payload;
}

function parseCountryRiskPoint(payload: unknown): CountryRiskPoint {
  if (!payload || typeof payload !== "object") {
    throw new Error("ArgentinaDatos payload invalido");
  }

  const record = payload as { fecha?: unknown; valor?: unknown };
  const parsedValue =
    typeof record.valor === "number"
      ? record.valor
      : typeof record.valor === "string"
        ? Number(record.valor.replace(",", "."))
        : NaN;

  if (typeof record.fecha !== "string" || !Number.isFinite(parsedValue)) {
    throw new Error("ArgentinaDatos schema invalido para riesgo pais");
  }

  return {
    date: record.fecha,
    value: parsedValue,
  };
}

export async function getCountryRiskData(limit?: number): Promise<CountryRiskResponse> {
  const fresh = countryRiskCache.getFresh();
  if (fresh) {
    const slicedItems = typeof limit === "number" ? fresh.items.slice(-limit) : fresh.items;
    return {
      ...fresh,
      total: slicedItems.length,
      items: slicedItems,
    };
  }

  const today = startOfUtcDay(new Date());

  try {
    const existingToday = await prisma.countryRiskSnapshot.findUnique({
      where: { tradingDate: today },
      include: { points: { orderBy: { riskDate: "asc" } } },
    });

    if (existingToday && existingToday.points.length > 0) {
      const items = mapSnapshotPoints(existingToday.points);
      const slicedItems = typeof limit === "number" ? items.slice(-limit) : items;
      const response: CountryRiskResponse = {
        updatedAt: existingToday.fetchedAt.toISOString(),
        source: "ArgentinaDatos",
        total: slicedItems.length,
        items: slicedItems,
        stale: existingToday.stale,
      };
      countryRiskCache.set({
        ...response,
        total: items.length,
        items,
        stale: existingToday.stale,
      });
      return response;
    }
  } catch (error) {
    console.warn("[market][riesgo-pais] Base de datos no disponible, consultando directamente API:", error);
  }

  if (!countryRiskRefreshInFlight) {
    countryRiskRefreshInFlight = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ARGENTINA_DATOS_TIMEOUT_MS);
      try {
        const response = await fetch(buildArgentinaDatosUrl("/v1/finanzas/indices/riesgo-pais"), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`ArgentinaDatos HTTP ${response.status}`);
        }

        const payload = (await response.json()) as unknown;
        if (!Array.isArray(payload)) {
          throw new Error("ArgentinaDatos schema invalido para lista de riesgo pais");
        }

        const items = payload
          .map((point) => {
            try {
              return parseCountryRiskPoint(point);
            } catch {
              return null;
            }
          })
          .filter((point): point is CountryRiskPoint => point !== null);

        if (!items.length) {
          throw new Error("ArgentinaDatos no devolvio puntos validos");
        }

        try {
          await prisma.$transaction(async (tx: any) => {
            const snapshot = await tx.countryRiskSnapshot.upsert({
              where: { tradingDate: today },
              create: {
                tradingDate: today,
                source: "ArgentinaDatos",
                stale: false,
              },
              update: {
                stale: false,
                fetchedAt: new Date(),
                points: { deleteMany: {} },
              },
            });

            await tx.countryRiskPointDb.createMany({
              data: items.map((item) => ({
                snapshotId: snapshot.id,
                riskDate: new Date(item.date),
                value: item.value,
              })),
            });
          });
        } catch (dbError) {
          console.warn("[market][riesgo-pais] No se pudo persistir snapshot en DB:", dbError);
        }

        const riskResp: CountryRiskResponse = {
          updatedAt: new Date().toISOString(),
          source: "ArgentinaDatos",
          total: items.length,
          items,
          stale: false,
        };
        countryRiskCache.set(riskResp);
      } finally {
        clearTimeout(timeout);
      }
    })()
      .catch((error) => {
        console.error("[market][riesgo-pais] Error refrescando snapshot diario", error);
      })
      .finally(() => {
        countryRiskRefreshInFlight = null;
      });
  }

  await countryRiskRefreshInFlight;

  const cached = countryRiskCache.getFresh() ?? countryRiskCache.getStale();
  if (cached) {
    const slicedItems = typeof limit === "number" ? cached.items.slice(-limit) : cached.items;
    return {
      ...cached,
      total: slicedItems.length,
      items: slicedItems,
    };
  }

  throw new Error("No se pudo obtener datos de riesgo país.");
}

export async function getCountryRiskLatestData(): Promise<CountryRiskLatestResponse> {
  const fresh = countryRiskLatestCache.getFresh();
  if (fresh) return fresh;

  const series = await getCountryRiskData(2);
  if (!series.items.length) {
    throw new Error("No hay datos de riesgo país disponibles");
  }

  const latest = series.items[series.items.length - 1];
  const result: CountryRiskLatestResponse = {
    updatedAt: series.updatedAt,
    source: "ArgentinaDatos",
    item: latest,
    stale: series.stale,
  };
  countryRiskLatestCache.set(result);
  return result;
}
