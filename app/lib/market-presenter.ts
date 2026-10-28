import type { GlobalMarketItem, GlobalMarketSection } from "./types";

export function getMarketItemIcon(sectionKey: GlobalMarketSection["key"], symbol: string): string {
  if (sectionKey === "indices") {
    if (symbol === "SPY") return "📈";
    if (symbol === "QQQ") return "💻";
    if (symbol === "DIA") return "🏦";
  }

  if (sectionKey === "rates") return "🇺🇸";

  if (sectionKey === "energy") {
    if (symbol === "GASOLINE") return "⛽";
    return "🛢️";
  }

  return "•";
}

export function formatMarketValue(
  value: number | null,
  sectionKey: GlobalMarketSection["key"],
  symbol: string,
): string {
  if (value === null) return "--";

  const decimals = getFixedDecimalPlaces(sectionKey, symbol);
  const formatted = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return sectionKey === "rates" ? `${formatted}%` : formatted;
}

export function formatMarketChangePercent(value: number | null): string {
  if (value === null) return "--";
  const triangle = value > 0 ? "▲" : value < 0 ? "▼" : "•";
  return `${triangle} ${Math.abs(value).toFixed(2)}%`;
}

export function marketStatusTextClass(item: GlobalMarketItem): string {
  if (item.status === "positive") return "text-emerald-600";
  if (item.status === "negative") return "text-rose-600";
  return "text-[var(--color-muted)]";
}

export function marketStatusDotClass(item: GlobalMarketItem): string {
  if (item.status === "positive") return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]";
  if (item.status === "negative") return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]";
  return "bg-[var(--color-muted)] shadow-[0_0_8px_rgba(85,98,120,0.35)]";
}

function getFixedDecimalPlaces(sectionKey: GlobalMarketSection["key"], symbol: string): number {
  if (sectionKey === "rates") return 3;

  if (sectionKey === "energy") {
    if (symbol === "GASOLINE") return 4;
    return 2;
  }

  return 2;
}
