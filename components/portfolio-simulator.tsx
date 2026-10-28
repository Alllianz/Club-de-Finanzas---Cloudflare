"use client";

import React, { useState, useMemo } from "react";
import {
  OFFICIAL_ASSETS,
  HISTORICAL_PERFORMANCE_CURVE,
  CORRELATION_MATRIX,
} from "@/lib/finance/portfolio-data";
import {
  calculatePortfolioMetrics,
  generateEfficientFrontier,
  normalizeWeights,
} from "@/lib/finance/markowitz";
import { STRESS_SCENARIOS, calculateScenarioImpact } from "@/lib/finance/risk-scenarios";
import type { PortfolioWeights } from "@/lib/finance/portfolio-types";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Scatter,
} from "recharts";

export function PortfolioSimulator() {
  // Ponderaciones de estado
  const [weights, setWeights] = useState<PortfolioWeights>({
    XOM: 0.25,
    SO: 0.25,
    WMB: 0.20,
    ETN: 0.10,
    VST: 0.10,
    YPF: 0.10,
  });

  const [activeTab, setActiveTab] = useState<"frontier" | "performance" | "correlation" | "scenarios">("frontier");

  // Métricas calculadas en tiempo real
  const normalizedWeights = useMemo(() => normalizeWeights(weights), [weights]);
  const metrics = useMemo(() => calculatePortfolioMetrics(normalizedWeights), [normalizedWeights]);
  const efficientFrontier = useMemo(() => generateEfficientFrontier(30), []);

  // Presets
  const applyPreset = (presetName: "official" | "gmv" | "max_sharpe" | "equal") => {
    switch (presetName) {
      case "official":
      case "max_sharpe":
        setWeights({ XOM: 0.25, SO: 0.25, WMB: 0.20, ETN: 0.10, VST: 0.10, YPF: 0.10 });
        break;
      case "gmv":
        setWeights({ SO: 0.30, WMB: 0.25, XOM: 0.25, ETN: 0.10, VST: 0.05, YPF: 0.05 });
        break;
      case "equal":
        setWeights({ XOM: 0.1667, SO: 0.1667, WMB: 0.1667, ETN: 0.1667, VST: 0.1667, YPF: 0.1667 });
        break;
    }
  };

  const handleWeightChange = (ticker: string, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [ticker]: Math.max(0, Math.min(1, value)),
    }));
  };

  // Datos para gráfico de Frontera Eficiente
  const frontierChartData = useMemo(() => {
    return efficientFrontier.map((pt) => ({
      volatility: Number((pt.volatility * 100).toFixed(1)),
      cagr: Number((pt.expectedReturn * 100).toFixed(1)),
      sharpe: pt.sharpeRatio,
    }));
  }, [efficientFrontier]);

  // Puntos individuales de activos
  const assetScatterPoints = useMemo(() => {
    return OFFICIAL_ASSETS.map((a) => ({
      ticker: a.ticker,
      volatility: Number((a.volatility * 100).toFixed(1)),
      cagr: Number((a.expectedReturn * 100).toFixed(1)),
    }));
  }, []);

  // Punto de la cartera actual del alumno
  const studentPortfolioPoint = useMemo(() => {
    return [
      {
        name: "Tu Cartera Simulada",
        volatility: Number((metrics.volatility * 100).toFixed(1)),
        cagr: Number((metrics.cagr * 100).toFixed(1)),
      },
    ];
  }, [metrics]);

  return (
    <div className="space-y-8">
      {/* Barra de Presets y Control Rápido */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#0062ff]">
            Laboratorio Cuantitativo
          </span>
          <h2 className="text-xl font-bold text-[#0e2246]">Simulador de Portafolio · Markowitz</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-[#64748b]">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset("official")}
            className="rounded-lg border border-[#d8e5f8] bg-[#f0f6ff] px-3 py-1.5 text-xs font-bold text-[#0062ff] transition hover:bg-[#0062ff] hover:text-white"
          >
            ★ Cartera Oficial Club
          </button>
          <button
            type="button"
            onClick={() => applyPreset("gmv")}
            className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-bold text-[#0e2246] transition hover:bg-[#f8fafc]"
          >
            🛡️ Mínima Varianza (GMV)
          </button>
          <button
            type="button"
            onClick={() => applyPreset("equal")}
            className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-bold text-[#0e2246] transition hover:bg-[#f8fafc]"
          >
            ⚖️ Equal Weight (1/N)
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Cuantitativas en Tiempo Real */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <div className="flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">CAGR Esperado</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0062ff]">
            {(metrics.cagr * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">Volatilidad</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0e2246]">
            {(metrics.volatility * 100).toFixed(1)}%
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">Ratio Sharpe</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0062ff]">
            {metrics.sharpeRatio.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">Beta vs Bench</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0e2246]">
            {metrics.betaBenchmark.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">Beta vs SPY</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0062ff]">
            {metrics.betaMarket.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">Max Drawdown</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0e2246]">
            {(metrics.maxDrawdown * 100).toFixed(1)}%
          </span>
        </div>

        <div className="col-span-2 flex flex-col items-center rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-center shadow-sm sm:col-span-2 lg:col-span-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748b]">Div Yield</span>
          <span className="mt-1 font-mono text-2xl font-black text-[#0062ff]">
            {(metrics.divYield * 100).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Controles de Ponderación (Sliders) */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between border-b border-[#f1f5f9] pb-4">
          <div>
            <h3 className="text-lg font-bold text-[#0e2246]">Ponderación de Activos</h3>
            <p className="text-xs text-[#64748b]">Ajustá los pesos de cada activo. La suma se auto-normaliza al 100%.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3 py-1 text-xs font-mono font-bold text-[#0062ff]">
              Σ = 100.0%
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {OFFICIAL_ASSETS.map((asset) => {
            const currentWeight = (normalizedWeights[asset.ticker] || 0) * 100;
            return (
              <div
                key={asset.ticker}
                className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4 transition hover:border-[#0062ff]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#091a36] px-2 py-0.5 font-mono text-xs font-bold text-white">
                        {asset.ticker}
                      </span>
                      <span className="text-xs font-bold text-[#0e2246]">{asset.name}</span>
                    </div>
                    <span className="font-mono text-sm font-black text-[#0062ff]">
                      {currentWeight.toFixed(1)}%
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] text-[#64748b] line-clamp-1">{asset.role}</p>

                  <input
                    type="range"
                    min="0"
                    max="40"
                    step="1"
                    value={Math.round(currentWeight)}
                    onChange={(e) => handleWeightChange(asset.ticker, Number(e.target.value) / 100)}
                    className="mt-4 w-full accent-[#0062ff] cursor-pointer"
                  />
                </div>

                <div className="mt-3 flex justify-between border-t border-[#e2e8f0] pt-2 text-[10px] text-[#64748b]">
                  <span>Mín: {(asset.minWeight * 100).toFixed(0)}%</span>
                  <span>Máx: {(asset.maxWeight * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de Asignación por Naturaleza de Riesgo */}
        <div className="mt-6 border-t border-[#f1f5f9] pt-4">
          <div className="flex justify-between text-xs font-bold text-[#0e2246] mb-2">
            <span>Asignación por Naturaleza de Riesgo:</span>
            <span>
              Regulado: {(metrics.riskAllocation.regulatedAndToll * 100).toFixed(1)}% | Crudo:{" "}
              {(metrics.riskAllocation.oilAndGasExposure * 100).toFixed(1)}% | Capex IA:{" "}
              {(metrics.riskAllocation.aiInfrastructureCapex * 100).toFixed(1)}%
            </span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#f1f5f9]">
            <div
              className="bg-[#0062ff] transition-all duration-300"
              style={{ width: `${metrics.riskAllocation.regulatedAndToll * 100}%` }}
              title="Ingreso Regulado / Peaje"
            />
            <div
              className="bg-[#091a36] transition-all duration-300"
              style={{ width: `${metrics.riskAllocation.oilAndGasExposure * 100}%` }}
              title="Exposición a Crudo & Gas"
            />
            <div
              className="bg-[#00a8a8] transition-all duration-300"
              style={{ width: `${metrics.riskAllocation.aiInfrastructureCapex * 100}%` }}
              title="Ciclo de Inversión IA"
            />
          </div>
        </div>
      </div>

      {/* Pestañas de Gráficos y Análisis Interactivo */}
      <div className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("frontier")}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "frontier"
                  ? "bg-[#091a36] text-white shadow-sm"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0e2246]"
              }`}
            >
              📈 Frontera Eficiente
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("performance")}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "performance"
                  ? "bg-[#091a36] text-white shadow-sm"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0e2246]"
              }`}
            >
              📊 Evolución de Capital
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("correlation")}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "correlation"
                  ? "bg-[#091a36] text-white shadow-sm"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0e2246]"
              }`}
            >
              🔲 Matriz de Correlación
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("scenarios")}
              className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === "scenarios"
                  ? "bg-[#091a36] text-white shadow-sm"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:text-[#0e2246]"
              }`}
            >
              ⚡ Escenarios de Estrés
            </button>
          </div>
        </div>

        {/* Contenido de cada pestaña */}
        <div className="mt-6">
          {activeTab === "frontier" && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748b]">
                La curva azul representa la <strong>Frontera Eficiente de Markowitz</strong> calculada con las 1.255 ruedas operativas. El punto dorado indica la posición de riesgo/retorno de tu cartera configurada.
              </p>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={frontierChartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="volatility"
                      name="Volatilidad (%)"
                      unit="%"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="cagr"
                      name="Retorno Esperado (%)"
                      unit="%"
                      tick={{ fill: "#64748b", fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val}%`, name === "cagr" ? "Retorno CAGR" : "Volatilidad"]}
                      contentStyle={{ backgroundColor: "#091a36", color: "#fff", borderRadius: "10px", fontSize: "12px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cagr"
                      name="Frontera Eficiente"
                      stroke="#0062ff"
                      strokeWidth={3}
                      dot={false}
                    />
                    {/* Punto de la cartera actual */}
                    <Scatter
                      data={studentPortfolioPoint}
                      name="Tu Cartera Simulada"
                      fill="#f59e0b"
                      line={false}
                      shape="cross"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "performance" && (
            <div className="space-y-4">
              <p className="text-xs text-[#64748b]">
                Evolución de un capital inicial de <strong>USD 100</strong> invertido en agosto de 2021 frente al benchmark 50/50 XLE/XLU y al mercado general (SPY).
              </p>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={HISTORICAL_PERFORMANCE_CURVE} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`USD ${val}`, "Capital Acumulado"]}
                      contentStyle={{ backgroundColor: "#091a36", color: "#fff", borderRadius: "10px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Line type="monotone" dataKey="portfolio" name="Cartera Club de Finanzas" stroke="#0062ff" strokeWidth={3} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="benchmark5050" name="Benchmark 50/50 XLE-XLU" stroke="#091a36" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="spy" name="S&P 500 (SPY)" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === "correlation" && (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#091a36] text-white">
                    <th className="p-3 text-left">Activo</th>
                    {OFFICIAL_ASSETS.map((a) => (
                      <th key={a.ticker} className="p-3 font-mono">{a.ticker}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {OFFICIAL_ASSETS.map((row) => (
                    <tr key={row.ticker} className="hover:bg-[#f8fafc]">
                      <td className="p-3 text-left font-bold text-[#0e2246]">{row.ticker}</td>
                      {OFFICIAL_ASSETS.map((col) => {
                        const corr = CORRELATION_MATRIX[row.ticker]?.[col.ticker] ?? 0;
                        const isSelf = row.ticker === col.ticker;
                        const isLow = corr < 0.25 && !isSelf;
                        return (
                          <td
                            key={col.ticker}
                            className={`p-3 font-mono font-bold ${
                              isSelf
                                ? "bg-[#091a36]/10 text-[#091a36]"
                                : isLow
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-[#475569]"
                            }`}
                          >
                            {corr.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "scenarios" && (
            <div className="grid gap-6 md:grid-cols-2">
              {STRESS_SCENARIOS.map((sc) => {
                const impact = calculateScenarioImpact(normalizedWeights, sc.id) * 100;
                const isPositive = impact >= 0;
                return (
                  <article key={sc.id} className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0062ff]">{sc.probability}</span>
                        <span className={`font-mono text-sm font-black ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
                          {isPositive ? `+${impact.toFixed(1)}%` : `${impact.toFixed(1)}%`}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-[#0e2246]">{sc.title}</h4>
                      <p className="mt-1.5 text-xs text-[#64748b]">{sc.description}</p>
                    </div>

                    <div className="mt-4 border-t border-[#e2e8f0] pt-3 text-[11px]">
                      <span className="font-bold text-[#0e2246]">Drivers clave: </span>
                      <span className="text-[#475569]">{sc.primaryDrivers.join(", ")}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
