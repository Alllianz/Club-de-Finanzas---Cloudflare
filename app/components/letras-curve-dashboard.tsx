"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { LetrasCurveResponse, LetrasPoint } from "../lib/types";
import { marketService } from "../services/market-service";

function formatPercent(value: number | null): string {
  if (value === null) return "--";
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function LetrasCurveDashboard() {
  const [data, setData] = useState<LetrasCurveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);

  const load = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const payload = await marketService.getLetrasCurve({ refresh });
      setData(payload);
      if (!selectedTicker && payload.points.length) {
        setSelectedTicker(payload.points[0].ticker);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar letras");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.points
      .filter((point) => point.teaPercent !== null)
      .map((point) => ({
        ...point,
        teaPercent: point.teaPercent as number,
      }));
  }, [data]);

  const lineData = useMemo(() => data?.curve.sample ?? [], [data]);

  const updatedAtLabel = useMemo(() => {
    if (!data?.updatedAt) return "Sin actualización";
    const date = new Date(data.updatedAt);
    if (Number.isNaN(date.getTime())) return "Sin actualización";
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }, [data?.updatedAt]);

  const selected = useMemo(
    () => data?.points.find((point) => point.ticker === selectedTicker) ?? null,
    [data?.points, selectedTicker],
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0062ff]">
            ARS · LECAPs & BONCAPs
          </span>
          <h2 className="mt-2 font-serif text-3xl font-bold text-[#0e2246] sm:text-4xl">
            Curva de Rendimientos
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#64748b]">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1.5 font-bold text-[#0062ff] transition hover:bg-[#0062ff] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar cierre"}
          </button>
          <span className="font-mono text-[11px]">Último dato: {updatedAtLabel}</span>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-8 text-center text-sm font-semibold text-[#64748b] shadow-sm">
          Calculando ajuste de curva y cotizaciones...
        </div>
      ) : null}

      {!loading && data ? (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          {/* Tabla de Instrumentos con Cabecera Navy */}
          <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] bg-[#f8fafc] px-5 py-3.5">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#091a36]">
                Detalle de Instrumentos Activos
              </p>
              <span className="font-mono text-xs font-bold text-[#0062ff]">{data.total} letras</span>
            </div>
            <div className="hidden max-h-[580px] overflow-auto md:block">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-[#091a36] text-white">
                  <tr>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">Ticker</th>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">DTM</th>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">TEM</th>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">TNA</th>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">TEA</th>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">VPV</th>
                    <th className="px-4 py-3 text-xs font-extrabold uppercase">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {data.points.map((point: LetrasPoint) => {
                    const selectedRow = point.ticker === selectedTicker;
                    return (
                      <tr
                        key={point.ticker}
                        onClick={() => setSelectedTicker(point.ticker)}
                        className={`cursor-pointer transition font-mono text-xs ${
                          selectedRow
                            ? "bg-[#eff6ff] font-bold"
                            : "hover:bg-[#f0f6ff]/50 odd:bg-[#ffffff] even:bg-[#f8fafc]"
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-[#0062ff]">{point.ticker}</td>
                        <td className="px-4 py-3 text-[#64748b]">{point.dtmDays}d</td>
                        <td className="px-4 py-3 text-[#334155]">{formatPercent(point.temPercent)}</td>
                        <td className="px-4 py-3 text-[#334155]">{formatPercent(point.tnaPercent)}</td>
                        <td className="px-4 py-3 font-bold text-[#091a36]">{formatPercent(point.teaPercent)}</td>
                        <td className="px-4 py-3 text-[#64748b]">${formatNumber(point.vpv)}</td>
                        <td className="px-4 py-3 font-semibold text-[#0e2246]">${formatNumber(point.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Gráfico Cuantitativo TEA x DTM */}
          <section className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#0062ff]">TEA vs DTM (Días al Vto)</p>
                <p className="font-mono text-xs text-[#64748b]">
                  Regresión cuadrática · {data.curve.coefficients?.points ?? 0} pts
                </p>
              </div>
              <div className="h-[360px] w-full sm:h-[420px]">
                {chartData.length ? (
                  <ChartContainer
                    className="h-full w-full"
                    config={{
                      teaPercent: { label: "TEA", color: "#0062ff" },
                      curve: { label: "Curva", color: "#091a36" },
                    }}
                  >
                    <ComposedChart margin={{ top: 12, right: 16, left: 4, bottom: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        dataKey="dtmDays"
                        domain={["dataMin - 10", "dataMax + 10"]}
                        tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                        tickFormatter={(value) => `${Math.round(Number(value))}d`}
                        stroke="#cbd5e1"
                        minTickGap={28}
                      />
                      <YAxis
                        type="number"
                        dataKey="teaPercent"
                        tick={{ fill: "#64748b", fontSize: 11, fontFamily: "monospace" }}
                        tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                        stroke="#cbd5e1"
                        width={52}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            className="border-[#e2e8f0] bg-[#ffffff] text-[#0e2246] shadow-md"
                            formatter={(value, _name, context) => {
                              const payload = context.payload as LetrasPoint | undefined;
                              if (!payload) return null;
                              return (
                                <div className="space-y-1 font-mono text-xs">
                                  <p className="font-bold text-[#0062ff]">{payload.ticker}</p>
                                  <p className="text-[#64748b]">Plazo: {payload.dtmDays} días</p>
                                  <p className="font-bold text-[#091a36]">TEA: {Number(value).toFixed(2)}%</p>
                                </div>
                              );
                            }}
                          />
                        }
                      />
                      <Scatter data={chartData} fill="#0062ff" />
                      {lineData.length ? (
                        <Line
                          type="monotone"
                          data={lineData}
                          dataKey="teaPercent"
                          stroke="#091a36"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ) : null}
                    </ComposedChart>
                  </ChartContainer>
                ) : (
                  <div className="grid h-full place-items-center rounded-xl border border-dashed border-[#e2e8f0] text-xs text-[#64748b]">
                    No hay puntos TEA válidos para dibujar la curva.
                  </div>
                )}
              </div>
            </div>

            {selected ? (
              <div className="mt-4 rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-3 text-xs font-semibold text-[#091a36]">
                Letra seleccionada: <span className="font-mono font-bold text-[#0062ff]">{selected.ticker}</span> · DTM: {selected.dtmDays}d · TEA:{" "}
                <span className="font-mono font-bold text-[#0062ff]">{formatPercent(selected.teaPercent)}</span>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
