"use client";

import React, { useState } from "react";

export const FuturosImplicitRateCard: React.FC = () => {
  const [spotPrice, setSpotPrice] = useState<number>(1545.0);
  const [futurePrice, setFuturePrice] = useState<number>(1585.5);
  const [daysToMaturity, setDaysToMaturity] = useState<number>(25);

  // Cálculos Cuantitativos de Derivados (Sin Look-Ahead Bias)
  const basisSpread = futurePrice - spotPrice;
  const basisPct = spotPrice > 0 ? (basisSpread / spotPrice) * 100 : 0;

  const tna =
    spotPrice > 0 && daysToMaturity > 0
      ? ((futurePrice / spotPrice - 1) * (365 / daysToMaturity)) * 100
      : 0;

  const tea =
    spotPrice > 0 && daysToMaturity > 0
      ? (Math.pow(1 + (tna / 100) * (daysToMaturity / 365), 365 / daysToMaturity) - 1) * 100
      : 0;

  const isContango = futurePrice > spotPrice; // Normal en FX con inflación
  const isBackwardation = futurePrice < spotPrice;

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0062ff]">
            Métrica Cuantitativa
          </span>
          <h2 className="font-serif text-xl font-bold text-[#0b1727]">
            Monitor de Tasas Implícitas & Base Risk (CIP)
          </h2>
        </div>
        <span className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a]">
          Estructura Temporal Matba Rofex
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-12">
        {/* Parámetros de Entrada */}
        <div className="space-y-4 lg:col-span-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Precio Spot Subyacente $S(t)$
            </label>
            <input
              type="number"
              step="0.1"
              value={spotPrice}
              onChange={(e) => setSpotPrice(parseFloat(e.target.value) || 0)}
              className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Precio de Futuro $F(t, T)$
            </label>
            <input
              type="number"
              step="0.1"
              value={futurePrice}
              onChange={(e) => setFuturePrice(parseFloat(e.target.value) || 0)}
              className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Días al Vencimiento ($T - t$)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={daysToMaturity}
              onChange={(e) => setDaysToMaturity(parseInt(e.target.value) || 1)}
              className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
            />
          </div>

          <div className="flex gap-2 pt-1">
            {[
              { label: "Abril (25d)", days: 25, price: 1585.5 },
              { label: "Mayo (56d)", days: 56, price: 1637.2 },
              { label: "Junio (86d)", days: 86, price: 1690.0 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setDaysToMaturity(preset.days);
                  setFuturePrice(preset.price);
                }}
                className="flex-1 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-1.5 text-[10px] font-bold text-[#475569] transition hover:bg-[#e2e8f0]"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resultados Cuantitativos */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <div className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#f0f6ff] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0062ff]">
              TNA Implícita de Devaluación
            </span>
            <div className="my-2 font-mono text-2xl font-bold text-[#0e2246]">
              {tna.toFixed(2)}%
            </div>
            <p className="text-[10px] text-[#64748b]">
              Tasa Nominal Anual linealizada con base 365 días.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a]">
              TEA Compuesta Implícita
            </span>
            <div className="my-2 font-mono text-2xl font-bold text-[#0e2246]">
              {tea.toFixed(2)}%
            </div>
            <p className="text-[10px] text-[#64748b]">
              Tasa Efectiva Anual con reinversión al vencimiento.
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-white p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
              Base Spread ($F - S$)
            </span>
            <div className="my-2 font-mono text-2xl font-bold text-[#0b1727]">
              {basisSpread >= 0 ? "+" : ""}${basisSpread.toFixed(2)}
            </div>
            <p className="text-[10px] text-[#64748b]">
              Diferencia nominal entre el futuro y el spot ({basisPct.toFixed(2)}%).
            </p>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-white p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
              Estructura de Mercado
            </span>
            <div className="my-2">
              <span
                className={`rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                  isContango
                    ? "bg-blue-100 text-blue-700"
                    : isBackwardation
                    ? "bg-purple-100 text-purple-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {isContango ? "Contango (Normal)" : isBackwardation ? "Backwardation" : "Paridad Flat"}
              </span>
            </div>
            <p className="text-[10px] text-[#64748b]">
              {isContango
                ? "El contrato cotiza con prima sobre el spot por costo de acarreo (carry)."
                : "El contrato cotiza con descuento sobre el spot."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
