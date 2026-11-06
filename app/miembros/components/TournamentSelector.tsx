"use client";

import React from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { TournamentSettings } from "../types/paper-trading";

export const TournamentSelector: React.FC = () => {
  const {
    availableTournaments,
    selectedTournamentId,
    selectTournament,
    joinTournament,
    isActionLoading,
    currentGroup,
    marketType,
  } = useGroupTrading();

  if (!availableTournaments || availableTournaments.length === 0) {
    return null;
  }

  const getDayName = (dayCode?: string) => {
    switch (dayCode) {
      case "MON":
        return "Lunes";
      case "TUE":
        return "Martes";
      case "WED":
        return "Miércoles";
      case "THU":
        return "Jueves";
      case "FRI":
        return "Viernes";
      default:
        return "Todos los días";
    }
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#f1f5f9] pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Competencias Oficiales
            </span>
            <span className="rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">
              {availableTournaments.length} Disponibles ({marketType === "FUTURES" ? "Futuros & Derivados" : "Portafolio"})
            </span>
          </div>
          <h2 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
            Seleccioná el Torneo en el que Deseás Operar
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            Cada grupo puede consultar los torneos activos creados por Allianz, inscribirse y gestionar sus carteras de forma independiente.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableTournaments.map((t: TournamentSettings) => {
          const isSelected = selectedTournamentId === t.id;
          const isJoined = t.isJoined || currentGroup?.id === "allianz";

          return (
            <div
              key={t.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isSelected
                  ? "border-[#b89047] bg-[#fafaf9] shadow-sm ring-1 ring-[#b89047]"
                  : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1] hover:shadow-xs"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-[#0b1727] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                    {t.status === "ACTIVE" ? "Activo" : "Finalizado"}
                  </span>
                  {isSelected ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                      ● En Pantalla
                    </span>
                  ) : isJoined ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                      Inscrito
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      Abierto para unirse
                    </span>
                  )}
                </div>

                <h3 className="mt-3 font-serif text-base font-bold text-[#0b1727]">
                  {t.title}
                </h3>
                <p className="mt-1 text-xs text-[#64748b] line-clamp-2">
                  {t.description || "Torneo oficial de simulación cuantitativa de carteras."}
                </p>

                {/* Métricas y Reglas del Torneo */}
                <div className="mt-4 space-y-1.5 border-t border-[#f1f5f9] pt-3 text-[11px]">
                  <div className="flex items-center justify-between text-[#475569]">
                    <span>Capital Inicial:</span>
                    <strong className="font-mono text-[#0b1727]">
                      ${t.initialCapital.toLocaleString("en-US")} USD
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#475569]">
                    <span>Apalancamiento:</span>
                    <strong className="font-mono text-[#0b1727]">{t.maxLeverage}x</strong>
                  </div>
                  <div className="flex items-center justify-between text-[#475569]">
                    <span>Modo Operativo:</span>
                    <strong className={t.allowShort ? "text-emerald-700" : "text-amber-700"}>
                      {t.allowShort ? "Bidireccional (Short)" : "Solo Long"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[#475569]">
                    <span>Rebalanceo:</span>
                    <strong className="text-[#0b1727]">
                      {t.rebalanceDay ? getDayName(t.rebalanceDay) : "Mercado Libre 24/7"}
                      {t.tradingStartTime && t.tradingEndTime ? ` (${t.tradingStartTime}-${t.tradingEndTime})` : ""}
                    </strong>
                  </div>
                  {t.maxTradesPerWeek ? (
                    <div className="flex items-center justify-between text-[#475569]">
                      <span>Cupo Semanal:</span>
                      <strong className="text-purple-700">{t.maxTradesPerWeek} ops/semana</strong>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-5 pt-3 border-t border-[#f1f5f9]">
                {isSelected ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg bg-[#b89047]/15 py-2 text-center text-xs font-bold text-[#926922] cursor-default border border-[#b89047]/30"
                  >
                    ✓ Torneo Seleccionado
                  </button>
                ) : isJoined ? (
                  <button
                    type="button"
                    onClick={() => selectTournament(t.id)}
                    disabled={isActionLoading}
                    className="w-full rounded-lg border border-[#0b1727] bg-[#0b1727] py-2 text-xs font-bold text-white transition hover:bg-[#1a2d47] active:scale-[0.99] disabled:opacity-50"
                  >
                    Ver y Operar en este Torneo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => joinTournament(t.id)}
                    disabled={isActionLoading}
                    className="w-full rounded-lg bg-[#0062ff] py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#0051d4] active:scale-[0.99] disabled:opacity-50"
                  >
                    Unirse a este Torneo 🚀
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
