import type { GlobalMarketItem, MarketDirection, MarketStatus } from "../types";

export type NormalizeMarketItemInput = {
  symbol: string;
  label: string;
  value: number | null;
  changePercent: number | null;
  updatedAt: string | null;
  source?: "Alpha Vantage";
};

type AlphaGlobalQuotePayload = {
  "Global Quote"?: Record<string, string>;
};

type AlphaSeriesPoint = {
  date?: string;
  value?: string;
};

type AlphaSeriesPayload = {
  data?: AlphaSeriesPoint[];
};

function parseNumber(input: unknown): number | null {
  if (typeof input !== "string") return null;
  const normalized = input.replace("%", "").replace(/,/g, "").trim();
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  const asDate = new Date(value);
  if (Number.isNaN(asDate.getTime())) return null;
  return asDate.toISOString();
}

function deriveDirectionAndStatus(changePercent: number | null): {
  direction: MarketDirection;
  status: MarketStatus;
} {
  if (changePercent === null || changePercent === 0) {
    return { direction: "flat", status: "neutral" };
  }

  if (changePercent > 0) {
    return { direction: "up", status: "positive" };
  }

  return { direction: "down", status: "negative" };
}

export function normalizeMarketItem(input: NormalizeMarketItemInput): GlobalMarketItem {
  const { direction, status } = deriveDirectionAndStatus(input.changePercent);

  return {
    symbol: input.symbol,
    label: input.label,
    value: input.value,
    changePercent: input.changePercent,
    direction,
    status,
    updatedAt: input.updatedAt,
    source: input.source ?? "Alpha Vantage",
  };
}

function extractLatestAndPrevious(data: AlphaSeriesPoint[]) {
  const validPoints = data
    .map((point) => ({ date: point.date ?? "", value: parseNumber(point.value) }))
    .filter((point) => point.date && point.value !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    latest: validPoints[0] ?? null,
    previous: validPoints[1] ?? null,
  };
}

function calculateChangePercent(latest: number | null, previous: number | null): number | null {
  if (latest === null || previous === null || previous === 0) return null;
  return Number((((latest - previous) / Math.abs(previous)) * 100).toFixed(4));
}

export function parseIndexItemFromAlphaQuote(
  payload: AlphaGlobalQuotePayload,
  params: { symbol: string; label: string },
): GlobalMarketItem {
  const quote = payload["Global Quote"] ?? {};
  const value = parseNumber(quote["05. price"]);
  const changePercent = parseNumber(quote["10. change percent"]);
  const updatedAt = toIsoDate(quote["07. latest trading day"] ?? null);

  return normalizeMarketItem({
    symbol: params.symbol,
    label: params.label,
    value,
    changePercent,
    updatedAt,
  });
}

export function parseRateItemFromAlphaSeries(
  payload: AlphaSeriesPayload,
  params: { symbol: string; label: string },
): GlobalMarketItem {
  const { latest, previous } = extractLatestAndPrevious(payload.data ?? []);
  const value = latest?.value ?? null;
  const changePercent = calculateChangePercent(value, previous?.value ?? null);

  return normalizeMarketItem({
    symbol: params.symbol,
    label: params.label,
    value,
    changePercent,
    updatedAt: toIsoDate(latest?.date ?? null),
  });
}

export function parseCommodityItemFromAlphaSeries(
  payload: AlphaSeriesPayload,
  params: { symbol: string; label: string },
): GlobalMarketItem {
  const { latest, previous } = extractLatestAndPrevious(payload.data ?? []);
  const value = latest?.value ?? null;
  const changePercent = calculateChangePercent(value, previous?.value ?? null);

  return normalizeMarketItem({
    symbol: params.symbol,
    label: params.label,
    value,
    changePercent,
    updatedAt: toIsoDate(latest?.date ?? null),
  });
}

export function fallbackMarketItem(symbol: string, label: string): GlobalMarketItem {
  return normalizeMarketItem({
    symbol,
    label,
    value: null,
    changePercent: null,
    updatedAt: null,
  });
}
