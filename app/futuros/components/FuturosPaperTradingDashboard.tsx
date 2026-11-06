"use client";

import React, { useState } from "react";
import { useGroupTrading } from "@/app/miembros/context/GroupTradingContext";
import { MarketTickerBar } from "@/app/miembros/components/MarketTickerBar";
import { PortfolioOverviewCard } from "@/app/miembros/components/PortfolioOverviewCard";
import { TradingOrderCard } from "@/app/miembros/components/TradingOrderCard";
import { PositionsTable } from "@/app/miembros/components/PositionsTable";
import { TradesHistoryTable } from "@/app/miembros/components/TradesHistoryTable";
import { GroupLeaderboard } from "@/app/miembros/components/GroupLeaderboard";
import { TournamentSelector } from "@/app/miembros/components/TournamentSelector";
import { FUTURES_TICKERS } from "../constants/contracts";

export const FuturosPaperTradingDashboard: React.FC = () => {
  const { currentGroup, tournament, logout, refreshTradingData, isActionLoading } = useGroupTrading();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("DLR-ABR26");

  return (
    <div className="space-y-8">
      {/* Selector de Torneos Disponibles y Cambio de Competencia */}
      <TournamentSelector />

      {/* Barra Superior del Grupo Autenticado */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#0b1727] bg-[#0b1727] p-6 text-white shadow-sm md:flex-row md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
              Terminal de Derivados Activo
            </span>
            {currentGroup?.id === "allianz" && (
              <span className="rounded-full bg-[#b89047]/20 border border-[#b89047]/50 px-2 py-0.5 text-[10px] font-bold text-[#facc15]">
                👑 Administrador de Torneo (Allianz)
              </span>
            )}
            {tournament?.maxLeverage && (
              <span className="rounded-full bg-blue-500/20 border border-blue-400/40 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                Apalancamiento Máx: {tournament.maxLeverage}x
              </span>
            )}
            {tournament && !tournament.allowShort && (
              <span className="rounded-full bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                🔒 Regla de Torneo: Solo Long
              </span>
            )}
          </div>
          <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight sm:text-3xl">
            {currentGroup?.name} · Asignación y Paper Trading de Futuros
          </h1>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Sesión institucional autenticada · Margen en derivados y contratos de futuros
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

      {/* Barra de Tickers en Vivo con Contratos de Futuros */}
      <MarketTickerBar
        customTickers={FUTURES_TICKERS}
        onSelectSymbol={(s) => setSelectedSymbol(s)}
      />

      {/* Tarjeta de Resumen Patrimonial (Idéntica a Portafolio) */}
      <PortfolioOverviewCard />

      {/* Cuadrícula Operativa: Terminal de Órdenes + Posiciones */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <TradingOrderCard
            initialSymbol={selectedSymbol}
            customTickers={FUTURES_TICKERS}
          />
        </div>
        <div className="space-y-8 lg:col-span-7">
          <PositionsTable />
          <TradesHistoryTable />
        </div>
      </div>

      {/* Leaderboard Oficial de los 6 Grupos en el Torneo de Futuros */}
      <GroupLeaderboard />
    </div>
  );
};
