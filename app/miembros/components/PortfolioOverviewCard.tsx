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

  // Métricas institucionales de Drawdown porcentual y Cartera 100% Invertida
  const maxDdPct =
    portfolio?.max_drawdown_pct ??
    (peakEquity > 1e-6 ? (maxDdNominal / peakEquity) * 100 : 0.0);

  const investedValue =
    portfolio?.invested_value ??
    positions.reduce(
      (acc, p) => acc + p.quantity * (p.current_price || p.entry_price),
      0
    );
  const investedPct =
    portfolio?.invested_pct ??
    (equity > 1e-6 ? Math.min(100, Math.max(0, (investedValue / equity) * 100)) : 0.0);
  const isFullyInvested = investedPct >= 95.0;
  const remainingToInvest = Math.max(0, equity * 0.95 - investedValue);

  const investmentFactor = isFullyInvested ? 1.0 : Math.pow(Math.max(0, investedPct) / 95.0, 2);
  const dailyNominalPnl =
    portfolio?.dailyNominalPnl ??
    portfolio?.daily_nominal_pnl ??
    (equity - baseCapital);
  const hasZeroDrawdown = Boolean(
    portfolio?.hasZeroDrawdown ??
    portfolio?.has_zero_drawdown ??
    (maxDdNominal <= 0 && dailyNominalPnl > 0)
  );
  const calculatedScore =
    maxDdNominal > 0
      ? (dailyNominalPnl / maxDdNominal) * investmentFactor
      : dailyNominalPnl > 0
      ? dailyNominalPnl * investmentFactor
      : 0.0;
  const portfolioScore =
    portfolio?.score !== undefined && Number.isFinite(portfolio.score)
      ? portfolio.score
      : calculatedScore;

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
                title="Fórmula oficial: PNL Nominal Diario / Máx Drawdown Nominal"
              >
                Score Torneo: {hasZeroDrawdown ? "∞ (Sin DD)" : `${portfolioScore >= 0 ? "+" : ""}${portfolioScore.toFixed(2)}x`} (Retorno / DD)
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

      {/* Banner Institucional de Cartera 100% Invertida (Tolerancia 5%) */}
      <div className="mt-5 rounded-xl border p-4 bg-[#f8fafc] border-[#e2e8f0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <span className="text-xl leading-none">
              {isFullyInvested ? "🟢" : "⚠️"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0b1727]">
                  {isFullyInvested
                    ? "Cartera 100% Invertida (Conforme)"
                    : "Asignación Insuficiente: Efectivo Ocioso"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border ${
                    isFullyInvested
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}
                >
                  {investedPct.toFixed(1)}% Invertido
                </span>
              </div>
              <p className="text-[11px] text-[#64748b] mt-0.5">
                {isFullyInvested
                  ? `Cumple el criterio institucional de inversión (≥ 95.0%). Efectivo libre residual en caja: $${cash.toFixed(2)} USD.`
                  : `Se exige mantener ≥ 95.0% invertido. Restan invertir $${remainingToInvest.toFixed(2)} USD para alcanzar el umbral y evitar penalizaciones.`}
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right font-mono text-xs font-bold">
            <span className="text-[#64748b]">Max DD: </span>
            <span className="text-red-600">-{maxDdPct.toFixed(2)}%</span>
            <span className="text-[#94a3b8] ml-1 text-[11px]">(-${maxDdNominal.toFixed(2)})</span>
          </div>
        </div>

        {/* Barra de progreso de inversión */}
        <div className="mt-3 w-full bg-[#e2e8f0] rounded-full h-2 overflow-hidden relative">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFullyInvested ? "bg-emerald-500" : investedPct >= 80 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${Math.min(100, investedPct)}%` }}
          />
          {/* Indicador de marca mínima 95% */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[#0b1727] z-10"
            style={{ left: "95%" }}
            title="Umbral reglamentario mínimo: 95.0%"
          />
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

        {/* Máximo Drawdown Nominal y Porcentual (Fórmula Sylva / Astro EVO) */}
        <div className="rounded-xl border border-red-200/90 bg-red-50/40 p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
              Max DD
            </span>
            <span className="rounded bg-red-100 px-1 py-0.5 text-[8px] font-mono font-bold text-red-800">
              -{maxDdPct.toFixed(2)}%
            </span>
          </div>
          <p className="mt-1 font-mono text-xl font-extrabold text-red-600">
            -${maxDdNominal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-[#64748b]">
            <span>Pico: ${peakEquity.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            {!isFutures && (
              <span className="font-semibold text-indigo-700 font-mono">
                Ratio: {hasZeroDrawdown ? "∞ (Sin DD)" : `${portfolioScore >= 0 ? "+" : ""}${portfolioScore.toFixed(2)}x`}
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
