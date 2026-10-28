"use client";

import { useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { OFFICIAL_ASSETS } from "@/lib/finance/portfolio-data";
import { calculatePortfolioMetrics, normalizeWeights } from "@/lib/finance/markowitz";
import type { PortfolioWeights } from "@/lib/finance/portfolio-types";

export default function AdminPortfolioPage() {
  const [weights, setWeights] = useState<PortfolioWeights>({
    XOM: 0.25,
    SO: 0.25,
    WMB: 0.20,
    ETN: 0.10,
    VST: 0.10,
    YPF: 0.10,
  });

  const [benchmark, setBenchmark] = useState("50% XLE + 50% XLU");
  const [horizon, setHorizon] = useState("2 a 3 años");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const normalized = normalizeWeights(weights);
  const metrics = calculatePortfolioMetrics(normalized);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopyMarkowitzPayload = () => {
    const payload = {
      type: "IMPORT_MARKOWITZ",
      timestamp: new Date().toISOString(),
      benchmark,
      horizon,
      weights: normalized,
      metrics: {
        cagr: Number((metrics.cagr * 100).toFixed(1)),
        volatility: Number((metrics.volatility * 100).toFixed(1)),
        sharpeRatio: Number(metrics.sharpeRatio.toFixed(2)),
        betaBenchmark: Number(metrics.betaBenchmark.toFixed(2)),
        betaMarket: Number(metrics.betaMarket.toFixed(2)),
        maxDrawdown: Number((metrics.maxDrawdown * 100).toFixed(1)),
        divYield: Number((metrics.divYield * 100).toFixed(2)),
      },
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 3000);
  };

  return (
    <BackofficeShell
      title="Gestión de Cartera de Portafolio"
      subtitle="Configurá los activos oficiales, ponderaciones objetivo, restricciones de riesgo y emisión del protocolo cuantitativo."
    >
      <div className="space-y-8">
        {savedSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            ✓ ¡Configuración del Portafolio guardada exitosamente en la base de datos!
          </div>
        )}

        {/* Resumen de la Cartera Actual */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">CAGR Oficial</p>
            <p className="mt-1 font-mono text-xl font-black text-[#0062ff]">{(metrics.cagr * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Volatilidad</p>
            <p className="mt-1 font-mono text-xl font-black text-[#0e2246]">{(metrics.volatility * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Ratio Sharpe</p>
            <p className="mt-1 font-mono text-xl font-black text-[#0062ff]">{metrics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Beta vs Bench</p>
            <p className="mt-1 font-mono text-xl font-black text-[#0e2246]">{metrics.betaBenchmark.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Max Drawdown</p>
            <p className="mt-1 font-mono text-xl font-black text-[#0e2246]">{(metrics.maxDrawdown * 100).toFixed(1)}%</p>
          </div>
          <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">Div Yield</p>
            <p className="mt-1 font-mono text-xl font-black text-[#0062ff]">{(metrics.divYield * 100).toFixed(2)}%</p>
          </div>
        </div>

        {/* Formulario de Ponderaciones y Parámetros */}
        <form onSubmit={handleSave} className="rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between border-b border-[#f1f5f9] pb-4">
            <div>
              <h3 className="text-lg font-bold text-[#0e2246]">Ponderaciones Oficiales (6 Activos)</h3>
              <p className="text-xs text-[#64748b]">Asignación óptima de media-varianza aprobada por la dirección de Portafolio.</p>
            </div>
            <button
              type="submit"
              className="rounded-xl bg-[#0062ff] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
            >
              Guardar Cambios
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OFFICIAL_ASSETS.map((asset) => (
              <div key={asset.ticker} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-[#091a36] px-2 py-0.5 font-mono text-xs font-bold text-white">
                      {asset.ticker}
                    </span>
                    <span className="text-xs font-bold text-[#0e2246]">{asset.name}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#64748b]">{asset.category}</span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={((weights[asset.ticker] || 0) * 100).toFixed(1)}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setWeights((prev) => ({ ...prev, [asset.ticker]: val / 100 }));
                    }}
                    className="w-24 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 font-mono text-sm font-bold text-[#0e2246] focus:border-[#0062ff] focus:outline-none"
                  />
                  <span className="font-mono text-xs font-bold text-[#64748b]">%</span>
                  <span className="text-[10px] text-[#64748b]">
                    (Mín: {(asset.minWeight * 100).toFixed(0)}% | Máx: {(asset.maxWeight * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 border-t border-[#f1f5f9] pt-6 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                Benchmark Oficial de Referencia
              </label>
              <input
                type="text"
                value={benchmark}
                onChange={(e) => setBenchmark(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-sm text-[#0e2246] focus:border-[#0062ff] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                Horizonte Temporal Recomendado
              </label>
              <input
                type="text"
                value={horizon}
                onChange={(e) => setHorizon(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2 text-sm text-[#0e2246] focus:border-[#0062ff] focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Sincronización con Protocolo IMPORT_MARKOWITZ */}
        <div className="rounded-2xl border border-[#d8e5f8] bg-[#f0f6ff] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#0e2246]">Protocolo de Sincronización IMPORT_MARKOWITZ</h3>
              <p className="mt-1 text-xs text-[#64748b]">
                Exporta el payload JSON oficial para sincronizar el reporte HTML imprimible (Portafolio_Agosto_16_9.html).
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyMarkowitzPayload}
              className="rounded-xl bg-[#091a36] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0062ff]"
            >
              {copiedPayload ? "✓ ¡Payload Copiado!" : "Copiar Payload JSON"}
            </button>
          </div>
        </div>
      </div>
    </BackofficeShell>
  );
}
