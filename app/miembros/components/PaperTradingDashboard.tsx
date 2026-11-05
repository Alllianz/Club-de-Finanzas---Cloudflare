"use client";

import React, { useState } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { MarketTickerBar } from "./MarketTickerBar";
import { PortfolioOverviewCard } from "./PortfolioOverviewCard";
import { TradingOrderCard } from "./TradingOrderCard";
import { PositionsTable } from "./PositionsTable";
import { TradesHistoryTable } from "./TradesHistoryTable";
import { GroupLeaderboard } from "./GroupLeaderboard";

export const PaperTradingDashboard: React.FC = () => {
  const { currentGroup, logout, refreshTradingData, isActionLoading } = useGroupTrading();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(
    currentGroup?.assignedAsset || "BTC-USD"
  );

  return (
    <div className="space-y-8">
      {/* Barra Superior del Grupo Autenticado */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#0b1727] bg-[#0b1727] p-6 text-white shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
              Terminal de Operaciones Activo
            </span>
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {currentGroup?.name} · Asignación y Paper Trading
          </h1>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Sesión institucional autenticada · Activo asignado:{" "}
            <span className="font-mono font-bold text-white">{currentGroup?.assignedAsset}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refreshTradingData()}
            disabled={isActionLoading}
            className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            {isActionLoading ? "Actualizando..." : "↻ Actualizar Precios"}
          </button>

          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-red-600 hover:border-red-600"
          >
            Cerrar Grupo
          </button>
        </div>
      </div>

      {/* Barra de Tickers en Vivo */}
      <MarketTickerBar onSelectSymbol={(s) => setSelectedSymbol(s)} />

      {/* Tarjeta de Resumen Patrimonial */}
      <PortfolioOverviewCard />

      {/* Cuadrícula Operativa: Terminal de Órdenes + Posiciones */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <TradingOrderCard initialSymbol={selectedSymbol} />
        </div>
        <div className="space-y-8 lg:col-span-7">
          <PositionsTable />
          <TradesHistoryTable />
        </div>
      </div>

      {/* Leaderboard Oficial de los 6 Grupos */}
      <GroupLeaderboard />
    </div>
  );
};
