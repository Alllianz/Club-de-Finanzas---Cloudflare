"use client";

import React, { useState } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { TournamentSettings } from "../types/paper-trading";
import {
  checkTournamentDateRange,
  formatTournamentDate,
  toDateTimeLocalString,
  parseTournamentDateBoundary,
} from "../utils/tournament-dates";

export const TournamentSelector: React.FC = () => {
  const {
    availableTournaments,
    selectedTournamentId,
    selectTournament,
    joinTournament,
    isActionLoading,
    currentGroup,
    marketType,
    saveTournamentConfig,
    refreshTournament,
    login,
  } = useGroupTrading();

  const [editingTournament, setEditingTournament] = useState<TournamentSettings | null>(null);
  const [modalStartDate, setModalStartDate] = useState<string>("");
  const [modalEndDate, setModalEndDate] = useState<string>("");
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  const openDateEditor = (t: TournamentSettings) => {
    setEditingTournament(t);
    setModalStartDate(toDateTimeLocalString(t.startDate));
    setModalEndDate(toDateTimeLocalString(t.endDate));
    setModalFeedback(null);
  };

  const handleSaveDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTournament) return;

    if (modalStartDate && modalEndDate) {
      const sMs = parseTournamentDateBoundary(modalStartDate, false);
      const eMs = parseTournamentDateBoundary(modalEndDate, true);
      if (sMs && eMs && eMs < sMs) {
        setModalFeedback({
          type: "error",
          text: "Inconsistencia temporal: La fecha de finalización no puede ser cronológicamente anterior a la de inicio.",
        });
        return;
      }
    }

    setModalLoading(true);
    setModalFeedback(null);

    const res = await saveTournamentConfig({
      id: editingTournament.id,
      tournamentId: editingTournament.id,
      title: editingTournament.title,
      description: editingTournament.description,
      allowShort: editingTournament.allowShort,
      allowedSymbols: editingTournament.allowedSymbols || [],
      maxLeverage: editingTournament.maxLeverage,
      initialCapital: editingTournament.initialCapital,
      rebalanceDay: editingTournament.rebalanceDay,
      tradingStartTime: editingTournament.tradingStartTime,
      tradingEndTime: editingTournament.tradingEndTime,
      maxTradesPerWeek: editingTournament.maxTradesPerWeek,
      tournamentType: editingTournament.tournamentType || marketType,
      startDate: modalStartDate,
      endDate: modalEndDate,
    });

    setModalLoading(false);
    if (res.success) {
      setModalFeedback({
        type: "success",
        text: "¡Fechas del torneo actualizadas con éxito en el motor institucional!",
      });
      await refreshTournament();
      setTimeout(() => {
        setEditingTournament(null);
      }, 1000);
    } else {
      setModalFeedback({
        type: "error",
        text: res.error || "Ocurrió un error al actualizar las fechas del torneo.",
      });
    }
  };

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

        <div className="flex items-center gap-2">
          {currentGroup?.id === "allianz" ? (
            <button
              type="button"
              onClick={() => {
                const target =
                  availableTournaments.find((t) => t.id === selectedTournamentId) ||
                  availableTournaments[0];
                if (target) openDateEditor(target);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#b89047] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#a67c33] active:scale-[0.99]"
            >
              <span>📅 Configurar Fechas del Torneo</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                await login("allianz", "LuciaSape");
                const target =
                  availableTournaments.find((t) => t.id === selectedTournamentId) ||
                  availableTournaments[0];
                if (target) openDateEditor(target);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#b89047] bg-[#b89047]/10 px-3.5 py-2 text-xs font-bold text-[#8c6729] hover:bg-[#b89047] hover:text-white transition shadow-2xs"
            >
              <span>👑 Acceso Allianz: Configurar Fechas</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {availableTournaments.map((t: TournamentSettings) => {
          const isSelected = selectedTournamentId === t.id;
          const isJoined = t.isJoined || currentGroup?.id === "allianz";
          const dateStatus = checkTournamentDateRange(t);

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
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-[#0b1727] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      {t.status === "ACTIVE" ? "Activo" : "Finalizado"}
                    </span>
                    {dateStatus.status === "SCHEDULED" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                        ⏳ Programado
                      </span>
                    ) : dateStatus.status === "CONCLUDED" ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-800 border border-red-300">
                        🛑 Concluido
                      </span>
                    ) : t.startDate || t.endDate ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                        🟢 En Curso
                      </span>
                    ) : null}
                  </div>
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
                  {(t.startDate || t.endDate) && (
                    <div className="flex items-start justify-between text-[#475569] gap-2">
                      <span className="shrink-0">Vigencia:</span>
                      <strong className="text-right text-[10px] text-[#0b1727] font-mono leading-tight">
                        {t.startDate ? formatTournamentDate(t.startDate) : "Apertura"}
                        {" → "}
                        {t.endDate ? formatTournamentDate(t.endDate) : "Sin fin"}
                      </strong>
                    </div>
                  )}
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

                {currentGroup?.id === "allianz" ? (
                  <button
                    type="button"
                    onClick={() => openDateEditor(t)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#b89047] bg-[#b89047]/10 py-1.5 text-xs font-bold text-[#8c6729] hover:bg-[#b89047] hover:text-white transition shadow-2xs"
                  >
                    <span>📅 Configurar Fechas (Inicio / Fin)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      await login("allianz", "LuciaSape");
                      openDateEditor(t);
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white py-1.5 text-[11px] font-bold text-[#64748b] hover:border-[#b89047] hover:text-[#b89047] transition"
                  >
                    <span>👑 Configurar Fechas (Allianz)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL INSTITUCIONAL PARA INTRODUCIR FECHA DE INICIO Y FINALIZACIÓN (ALLIANZ) */}
      {editingTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-[#b89047]/40 bg-white p-7 text-[#0b1727] shadow-2xl">
            <button
              type="button"
              onClick={() => setEditingTournament(null)}
              className="absolute right-5 top-5 rounded-full p-2 text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#0b1727]"
            >
              ✕
            </button>

            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 bg-[#b89047]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b89047]">
                Gobernanza Institucional
              </span>
              <span className="rounded-full bg-[#b89047]/20 px-2.5 py-0.5 text-[9px] font-bold text-[#8c6729] border border-[#b89047]/40">
                Rol: Allianz (Director)
              </span>
            </div>

            <h3 className="mt-2 font-serif text-xl font-bold tracking-tight text-[#0b1727]">
              Configurar Vigencia del Torneo
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Modificá las fechas de inicio y finalización para{" "}
              <strong className="text-[#0b1727]">{editingTournament.title}</strong> ({editingTournament.id}).
            </p>

            {modalFeedback && (
              <div
                className={`mt-4 rounded-xl border p-3 text-xs font-semibold ${
                  modalFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {modalFeedback.text}
              </div>
            )}

            <form onSubmit={handleSaveDates} className="mt-5 space-y-4">
              {/* Fecha de Inicio */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0b1727] flex items-center gap-1.5">
                  <span>🟢</span> Fecha y Hora de Inicio
                </label>
                <input
                  type="datetime-local"
                  value={modalStartDate}
                  onChange={(e) => setModalStartDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#0b1727] outline-none transition focus:border-[#b89047] shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-[#64748b]">
                  {modalStartDate
                    ? `Las operaciones comenzarán el ${formatTournamentDate(modalStartDate) || modalStartDate}.`
                    : "Si se deja vacío, el torneo estará activo de inmediato."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, "0");
                      const d = String(now.getDate()).padStart(2, "0");
                      setModalStartDate(`${y}-${m}-${d}T00:00`);
                    }}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                  >
                    Hoy (00:00)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const y = now.getFullYear();
                      const m = String(now.getMonth() + 1).padStart(2, "0");
                      const d = String(now.getDate()).padStart(2, "0");
                      const h = String(now.getHours()).padStart(2, "0");
                      const min = String(now.getMinutes()).padStart(2, "0");
                      setModalStartDate(`${y}-${m}-${d}T${h}:${min}`);
                    }}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                  >
                    Ahora Mismo
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStartDate("")}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#64748b] hover:bg-[#f1f5f9]"
                  >
                    Sin Inicio Fijo
                  </button>
                </div>
              </div>

              {/* Fecha de Finalización */}
              <div className="rounded-xl border border-red-200/80 bg-red-50/30 p-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#0b1727] flex items-center gap-1.5">
                  <span>🛑</span> Fecha y Hora de Finalización
                </label>
                <input
                  type="datetime-local"
                  value={modalEndDate}
                  onChange={(e) => setModalEndDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#0b1727] outline-none transition focus:border-[#b89047] shadow-2xs"
                />
                <p className="mt-1 text-[11px] text-[#64748b]">
                  {modalEndDate
                    ? `El torneo cerrará operaciones el ${formatTournamentDate(modalEndDate) || modalEndDate}.`
                    : "Si se deja vacío, continuará sin fecha límite de cierre."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const base = modalStartDate ? new Date(modalStartDate) : new Date();
                      const target = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
                      const y = target.getFullYear();
                      const m = String(target.getMonth() + 1).padStart(2, "0");
                      const d = String(target.getDate()).padStart(2, "0");
                      setModalEndDate(`${y}-${m}-${d}T23:59`);
                    }}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                  >
                    +1 Semana (23:59)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = modalStartDate ? new Date(modalStartDate) : new Date();
                      const target = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
                      const y = target.getFullYear();
                      const m = String(target.getMonth() + 1).padStart(2, "0");
                      const d = String(target.getDate()).padStart(2, "0");
                      setModalEndDate(`${y}-${m}-${d}T23:59`);
                    }}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                  >
                    +2 Semanas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const base = modalStartDate ? new Date(modalStartDate) : new Date();
                      const target = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const y = target.getFullYear();
                      const m = String(target.getMonth() + 1).padStart(2, "0");
                      const d = String(target.getDate()).padStart(2, "0");
                      setModalEndDate(`${y}-${m}-${d}T23:59`);
                    }}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                  >
                    +1 Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalEndDate("")}
                    className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#64748b] hover:bg-[#f1f5f9]"
                  >
                    Sin Cierre Fijo
                  </button>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f9]">
                <button
                  type="button"
                  onClick={() => setEditingTournament(null)}
                  className="rounded-xl border border-[#cbd5e1] px-5 py-2.5 text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="rounded-xl bg-[#b89047] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:bg-[#a67c33] transition disabled:opacity-50"
                >
                  {modalLoading ? "Guardando..." : "Guardar Fechas del Torneo 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
