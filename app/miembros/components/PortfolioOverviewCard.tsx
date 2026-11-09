"use client";

import React from "react";
import { useGroupTrading } from "../context/GroupTradingContext";

export const PortfolioOverviewCard: React.FC = () => {
  const { currentGroup, portfolio, positions, tournament } = useGroupTrading();

  const isFutures =
    tournament?.tournamentType === "FUTURES" ||
    (tournament?.id || "").toLowerCase().includes("futur");

  const baseCapital = tournament?.initialCapital ?? 10000;
  const equity = portfolio?.equity ?? baseCapital;
  const cash = portfolio?.cash_balance ?? baseCapital;
  const usedMargin = portfolio?.used_margin ?? 0;
  const unrealized = portfolio?.unrealized_pnl ?? 0;
  const realized = portfolio?.realized_pnl ?? 0;
  const roePct = portfolio?.roe_pct ?? 0;
  const fees = portfolio?.total_fees ?? 0;
  const maxDdNominal = portfolio?.max_drawdown_nominal ?? 0;
  const peakEquity = portfolio?.peak_equity ?? Math.max(baseCapital, equity);

  const netProfit = equity - baseCapital;
  const portfolioScore =
    maxDdNominal > 1e-6
      ? netProfit / maxDdNominal
      : netProfit > 1e-6
      ? 999.0 + netProfit
      : 0.0;

  const isRoePositive = roePct >= 0;
  const isUnrealizedPositive = unrealized >= 0;

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 md:p-8 shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-[#f1f5f9] pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Portafolio Institucional · {isFutures ? "Futuros & Derivados" : "Portafolio"}
            </span>
            {!isFutures ? (
              <span
                className="rounded-md bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-900"
                title="Fórmula oficial de 1° puesto: (Capital Total - Capital Inicial) / Max Drawdown"
              >
                Score Torneo: {portfolioScore > 900 ? "∞ (Sin DD)" : `${portfolioScore >= 0 ? "+" : ""}${portfolioScore.toFixed(2)}x`} (Retorno / DD)
              </span>
            ) : (
              <span className="rounded-md bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-900">
                1° Puesto: Mayor Capital Total
              </span>
            )}
          </div>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
            {currentGroup?.name || "Grupo"} · Balance de Operaciones
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            Capital inicial de competencia:{" "}
            <span className="font-mono font-bold text-[#0b1727]">
              ${baseCapital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] px-4 py-2 text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#64748b]">
              Posiciones Abiertas
            </span>
            <p className="font-mono text-xl font-bold text-[#0b1727]">
              {positions.length}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {/* Patrimonio Total (Mark to market) */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            Patrimonio (Equity)
          </span>
          <p className="mt-1 font-mono text-xl font-extrabold text-[#0b1727]">
            ${equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[#64748b]">Mark-to-Market en vivo</span>
        </div>

        {/* Máximo Drawdown Nominal (Fórmula Sylva / Astro EVO) */}
        <div className="rounded-xl border border-red-200/90 bg-red-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
              Max DD Nominal
            </span>
            <span className="rounded bg-red-100 px-1 py-0.5 text-[8px] font-mono font-bold text-red-800">
              Sylva/Astro
            </span>
          </div>
          <p className="mt-1 font-mono text-xl font-extrabold text-red-600">
            -${maxDdNominal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-[#64748b]">
            <span>Pico: ${peakEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            {!isFutures && (
              <span className="font-semibold text-indigo-700 font-mono">
                Ratio: {portfolioScore > 900 ? "∞" : `${portfolioScore >= 0 ? "+" : ""}${portfolioScore.toFixed(2)}x`}
              </span>
            )}
          </div>
        </div>

        {/* Retorno Total (ROE %) */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            Retorno (ROE %)
          </span>
          <p
            className={`mt-1 font-mono text-xl font-extrabold ${
              isRoePositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isRoePositive ? "+" : ""}
            {roePct.toFixed(2)}%
          </p>
          <span className="text-[10px] text-[#64748b]">Sobre capital inicial</span>
        </div>

        {/* Liquidez Disponible */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            Caja Libre (Cash)
          </span>
          <p className="mt-1 font-mono text-xl font-extrabold text-[#0b1727]">
            ${cash.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[#64748b]">Poder de compra base</span>
        </div>

        {/* Margen Bloqueado */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            Margen Comprometido
          </span>
          <p className="mt-1 font-mono text-xl font-extrabold text-[#0b1727]">
            ${usedMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[#64748b]">Garantías colateralizadas</span>
        </div>

        {/* PnL No Realizado */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            PnL Flotante
          </span>
          <p
            className={`mt-1 font-mono text-xl font-extrabold ${
              isUnrealizedPositive ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {isUnrealizedPositive ? "+" : ""}
            ${unrealized.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-[#64748b]">No cerrado aún</span>
        </div>

        {/* PnL Realizado & Fees */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#64748b]">
            PnL Realizado / Fees
          </span>
          <p
            className={`mt-1 font-mono text-base font-bold ${
              realized >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {realized >= 0 ? "+" : ""}
            ${realized.toFixed(2)}
          </p>
          <span className="text-[10px] font-mono text-[#94a3b8]">
            Fees: -${fees.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
