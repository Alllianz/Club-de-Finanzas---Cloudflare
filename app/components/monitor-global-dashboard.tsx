"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useGlobalMarket } from "../hooks/useGlobalMarket";
import type { CountryRiskPoint, GlobalMarketItem, GlobalMarketSection } from "../lib/types";
import {
  formatMarketChangePercent,
  formatMarketValue,
  getMarketItemIcon,
  marketStatusDotClass,
  marketStatusTextClass,
} from "../lib/market-presenter";
import { MonitorGlobalSkeleton } from "./monitor-global-skeleton";

function DotStatus({ item }: { item: GlobalMarketItem }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${marketStatusDotClass(item)}`} />;
}

function SectionTable({ section }: { section: GlobalMarketSection }) {
  return (
    <section className="overflow-hidden border-t border-[#e2e8f0] first:border-t-0">
      <div className="bg-[#f8fafc] px-6 py-3 border-b border-[#e2e8f0]">
        <h2 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#091a36]">
          {section.title}
        </h2>
      </div>
      <div className="divide-y divide-[#f1f5f9]">
        {section.items.map((item) => (
          <div
            key={`${section.key}-${item.symbol}`}
            className="grid grid-cols-[minmax(0,1fr)_40px_auto] items-center gap-4 bg-[#ffffff] px-6 py-4 transition hover:bg-[#f0f6ff]/50"
          >
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f6ff] text-xl text-[#0062ff] shadow-sm">
                {getMarketItemIcon(section.key, item.symbol)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold uppercase tracking-wider text-[#64748b]">{item.label}</p>
                <p className="truncate font-mono text-xl font-extrabold text-[#0e2246]">
                  {formatMarketValue(item.value, section.key, item.symbol)}
                </p>
              </div>
            </div>
            <div className="flex justify-center">
              <DotStatus item={item} />
            </div>
            <div className={`text-right font-mono text-base font-extrabold ${marketStatusTextClass(item)}`}>
              <span>{formatMarketChangePercent(item.changePercent)}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatRiskValue(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function RiskTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CountryRiskPoint & { previous: CountryRiskPoint | null } }>;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const previous = point.previous;
  const variation = previous ? point.value - previous.value : null;
  const variationPercent = previous && previous.value !== 0 ? (variation! / previous.value) * 100 : null;

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-3 text-xs text-[#0e2246] shadow-md">
      <p className="font-bold text-[#091a36]">{point.date}</p>
      <p className="mt-1 font-mono text-[#475569]">
        Riesgo país: <span className="font-extrabold text-[#0062ff]">{formatRiskValue(point.value)} pts</span>
      </p>
      {variation !== null ? (
        <p className={`mt-1 font-mono font-bold ${variation >= 0 ? "text-rose-600" : "text-emerald-600"}`}>
          Variación: {variation >= 0 ? "+" : ""}
          {formatRiskValue(variation)} pts
          {variationPercent !== null ? ` (${variationPercent >= 0 ? "+" : ""}${variationPercent.toFixed(2)}%)` : ""}
        </p>
      ) : null}
      {previous ? <p className="mt-1 font-mono text-[#64748b]">Día anterior: {formatRiskValue(previous.value)} pts</p> : null}
    </div>
  );
}

export function MonitorGlobalDashboard() {
  const { data, countryRisk, loading, refreshing, globalError, refresh } = useGlobalMarket();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const updatedAtLabel = useMemo(() => {
    if (!hydrated) return "Sin actualización";
    if (!data?.updatedAt) return "Sin actualización";
    const date = new Date(data.updatedAt);
    if (Number.isNaN(date.getTime())) return "Sin actualización";
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, [data?.updatedAt, hydrated]);

  const countryRiskSeries = useMemo(
    () =>
      countryRisk.series.map((point, index, items) => ({
        ...point,
        previous: index > 0 ? items[index - 1] : null,
      })),
    [countryRisk.series],
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#0062ff]">
            Monitoreo en Tiempo Real
          </p>
          <h2 className="font-serif text-3xl font-bold text-[#0e2246] md:text-4xl">
            Indicadores Financieros Globales
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748b]">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1.5 font-bold text-[#0062ff] transition hover:bg-[#0062ff] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar datos"}
          </button>
          <span className="font-mono text-[11px]">Última actualización: {updatedAtLabel}</span>
        </div>
      </header>

      {/* Tarjeta de Riesgo País Argentina con Gráfico */}
      <section className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
          <div>
            <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#0062ff]">
              Argentina · Deuda Soberana
            </span>
            <h3 className="mt-2 font-serif text-2xl font-bold text-[#0e2246]">
              Riesgo País (EMBI+)
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">Serie histórica diaria provista por ArgentinaDatos.</p>
          </div>
          <div className="text-right">
            {countryRisk.latest ? (
              <p className="font-mono text-3xl font-extrabold text-[#0062ff]">
                {formatRiskValue(countryRisk.latest.value)} <span className="text-lg font-bold text-[#0e2246]">pts</span>
              </p>
            ) : (
              <p className="font-mono text-3xl font-extrabold text-[#94a3b8]">--</p>
            )}
            <p className="mt-1 font-mono text-xs text-[#64748b]">
              {countryRisk.latest ? `Fecha: ${countryRisk.latest.date}` : "Sin dato"}
            </p>
          </div>
        </div>

        {countryRisk.error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {countryRisk.error}
            <button
              type="button"
              onClick={() => void refresh()}
              className="ml-3 font-bold underline"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {!countryRisk.error && countryRiskSeries.length ? (
          <div className="mt-6 h-[300px] w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-3 md:h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={countryRiskSeries} margin={{ top: 12, right: 16, left: 2, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                {countryRisk.latest ? (
                  <ReferenceLine y={countryRisk.latest.value} stroke="#cbd5e1" strokeDasharray="4 4" />
                ) : null}
                <XAxis
                  dataKey="date"
                  minTickGap={40}
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(value) => String(value).slice(0, 7)}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(value) => formatRiskValue(Number(value))}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                  width={60}
                />
                <Tooltip content={<RiskTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0062ff"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#091a36", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </section>

      {/* Grilla de Secciones Financieras (Índices, Tasas, Commodities) */}
      <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
        {loading ? <MonitorGlobalSkeleton /> : null}
        {globalError ? (
          <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{globalError}</p>
        ) : null}

        {!loading && !globalError && data ? (
          <>
            {data.sections.map((section) => (
              <SectionTable key={section.key} section={section} />
            ))}
          </>
        ) : null}
      </section>
    </section>
  );
}
