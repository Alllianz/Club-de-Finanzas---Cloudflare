"use client";

import React, { useState, useEffect } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import {
  parseTournamentDateBoundary,
  formatTournamentDate,
  toDateTimeLocalString,
  checkTournamentDateRange,
} from "../utils/tournament-dates";

export const TournamentManagementPanel: React.FC = () => {
  const {
    currentGroup,
    tournament,
    availableTournaments,
    saveTournamentConfig,
    deleteTournament,
    isActionLoading,
    refreshTournament,
    marketType,
  } = useGroupTrading();

  const [title, setTitle] = useState<string>(
    marketType === "FUTURES"
      ? "Torneo Oficial de Futuros & Derivados - Club de Finanzas UBA"
      : "Torneo Oficial - Club de Finanzas UBA"
  );
  const [description, setDescription] = useState<string>(
    marketType === "FUTURES"
      ? "Competencia de trading cuantitativo en derivados, futuros de dólar Rofex, commodities e índices."
      : "Competencia de simulación de portafolios y gestión de riesgo para los grupos de finanzas."
  );
  const [allowShort, setAllowShort] = useState<boolean>(true);
  const [maxLeverage, setMaxLeverage] = useState<number>(marketType === "FUTURES" ? 100 : 10);
  const [initialCapitalInput, setInitialCapitalInput] = useState<string>("10000");
  const [rebalanceDay, setRebalanceDay] = useState<string>("");
  const [tradingStartTime, setTradingStartTime] = useState<string>("");
  const [tradingEndTime, setTradingEndTime] = useState<string>("");
  const [maxTradesPerWeek, setMaxTradesPerWeek] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [resetBalances, setResetBalances] = useState<boolean>(false);
  const [createNew, setCreateNew] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Inicializar formulario con los datos del torneo activo
  useEffect(() => {
    if (tournament) {
      setTitle(
        tournament.title ||
          (marketType === "FUTURES"
            ? "Torneo Oficial de Futuros & Derivados - Club de Finanzas UBA"
            : "Torneo Oficial - Club de Finanzas UBA")
      );
      setDescription(tournament.description || "");
      setAllowShort(tournament.allowShort);
      setMaxLeverage(tournament.maxLeverage || (marketType === "FUTURES" ? 100 : 10));
      setInitialCapitalInput(String(tournament.initialCapital || 10000));
      setRebalanceDay(tournament.rebalanceDay || "");
      setTradingStartTime(tournament.tradingStartTime || "");
      setTradingEndTime(tournament.tradingEndTime || "");
      setMaxTradesPerWeek(tournament.maxTradesPerWeek || 0);
      setStartDate(toDateTimeLocalString(tournament.startDate));
      setEndDate(toDateTimeLocalString(tournament.endDate));
    }
  }, [tournament, marketType]);

  const handleDeleteTournament = async (tId: string, tTitle: string) => {
    if (currentGroup?.id !== "allianz") return;
    setFeedback(null);
    const res = await deleteTournament(tId);
    if (res.success) {
      setFeedback({
        type: "success",
        text: `El torneo "${tTitle}" (${tId}) fue eliminado exitosamente junto con todas sus posiciones y balances.`,
      });
      setDeleteConfirmId(null);
      await refreshTournament();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "No se pudo eliminar el torneo.",
      });
    }
  };

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (currentGroup?.id !== "allianz") {
      setFeedback({
        type: "error",
        text: "Acceso denegado: solo el usuario Allianz puede guardar o configurar torneos.",
      });
      return;
    }

    const parsedCapital = Math.max(1, parseFloat(initialCapitalInput) || 10000);

    // Validación de coherencia temporal (Zero Look-Ahead Bias)
    if (startDate && endDate) {
      const sMs = parseTournamentDateBoundary(startDate, false);
      const eMs = parseTournamentDateBoundary(endDate, true);
      if (sMs && eMs && eMs < sMs) {
        setFeedback({
          type: "error",
          text: "Inconsistencia de fechas: La fecha de finalización no puede ser cronológicamente anterior a la de inicio.",
        });
        return;
      }
    }

    const res = await saveTournamentConfig({
      title: title.trim(),
      description: description.trim(),
      allowShort,
      allowedSymbols: [], // Sin restricciones: pueden operar todo
      maxLeverage,
      initialCapital: parsedCapital,
      rebalanceDay,
      tradingStartTime,
      tradingEndTime,
      maxTradesPerWeek,
      startDate,
      endDate,
      resetBalances,
      createNew,
    });

    if (res.success) {
      setFeedback({
        type: "success",
        text: "¡Torneo actualizado con éxito! Las reglas y ventanas de rebalanceo ya están activas en el motor.",
      });
      setResetBalances(false);
      setCreateNew(false);
      await refreshTournament();
    } else {
      setFeedback({
        type: "error",
        text: res.error || "Ocurrió un error al guardar la configuración del torneo.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Panel de Control */}
      <div className="rounded-2xl border border-[#b89047]/30 bg-gradient-to-r from-[#0b1727] via-[#0f233d] to-[#0b1727] p-6 text-white shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-5 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#b89047]">
                Gobernanza Institucional
              </span>
              <span className="inline-flex rounded-full bg-[#b89047]/20 px-2.5 py-0.5 text-[10px] font-bold text-[#facc15] border border-[#b89047]/40">
                Rol: Allianz (Director)
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight text-white">
              Administración de Torneos & Ventanas de Rebalanceo
            </h2>
            <p className="mt-1 text-xs text-[#94a3b8]">
              Definí las reglas operativas, ventana semanal de rebalanceo, cupo de operaciones y apalancamiento para los grupos de inversión.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshTournament}
              disabled={isActionLoading}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/20"
            >
              🔄 Recargar Datos
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs font-bold ${
            feedback.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* SECCIÓN EXCLUSIVA ALLIANZ: LISTA Y ELIMINACIÓN DE TORNEOS */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-1 border-b border-[#f1f5f9] pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-600">
                Control y Depuración
              </span>
              <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-700">
                {availableTournaments.length} Torneos en {marketType === "FUTURES" ? "Futuros" : "Portafolio"}
              </span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#0b1727]">
              Eliminar Torneos ({marketType === "FUTURES" ? "Base de Futuros" : "Base de Portafolio"})
            </h3>
            <p className="text-xs text-[#64748b]">
              Como Allianz, podés purgar torneos finalizados, de prueba o que ya no deban estar visibles. Esta acción eliminará en cascada todas las posiciones y trades vinculados al torneo seleccionado.
            </p>
          </div>
        </div>

        {availableTournaments.length === 0 ? (
          <p className="text-xs text-[#94a3b8] py-2">No hay torneos registrados en este mercado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableTournaments.map((t) => (
              <div
                key={t.id}
                className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4 text-xs transition hover:border-[#cbd5e1]"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold text-[#1e3a8a] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 truncate max-w-[140px]">
                      {t.id}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        t.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <h4 className="mt-2 font-serif text-sm font-bold text-[#0b1727] line-clamp-1">
                    {t.title}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-[#64748b] line-clamp-2">
                    {t.description || "Sin descripción adicional."}
                  </p>

                  {(t.startDate || t.endDate) && (
                    <div className="mt-2 rounded bg-white px-2 py-1 text-[10px] text-[#475569] border border-[#e2e8f0]">
                      {t.startDate && (
                        <div>
                          <span className="font-semibold text-[#0b1727]">Inicio:</span>{" "}
                          {formatTournamentDate(t.startDate)}
                        </div>
                      )}
                      {t.endDate && (
                        <div>
                          <span className="font-semibold text-[#0b1727]">Fin:</span>{" "}
                          {formatTournamentDate(t.endDate)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#475569] border-t border-[#e2e8f0] pt-2 font-mono">
                    <span>Cap: ${t.initialCapital}</span>
                    <span>Lev: {t.maxLeverage}x</span>
                    <span>Short: {t.allowShort ? "Sí" : "No"}</span>
                  </div>
                </div>

                <div className="mt-3 border-t border-[#e2e8f0] pt-2.5">
                  {deleteConfirmId === t.id ? (
                    <div className="space-y-1.5 rounded-lg bg-red-50 p-2 border border-red-200">
                      <p className="text-[10px] font-bold text-red-700">
                        ¿Confirmás eliminar permanentemente este torneo?
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteTournament(t.id, t.title)}
                          disabled={isActionLoading}
                          className="flex-1 rounded bg-red-600 py-1 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="flex-1 rounded border border-[#cbd5e1] bg-white py-1 text-[10px] font-bold text-[#475569] hover:bg-[#f8fafc]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(t.id)}
                      disabled={isActionLoading}
                      className="w-full rounded-lg border border-red-200 bg-white py-1.5 text-[11px] font-bold text-red-600 transition hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                    >
                      🗑️ Eliminar Torneo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FORMULARIO DE GOBERNANZA */}
      <form onSubmit={handleSaveTournament} className="space-y-6">
        {/* VIGENCIA TEMPORAL Y CALENDARIO DEL TORNEO (ZERO LOOK-AHEAD BIAS) - UBICACIÓN PRIMARIA */}
        <div className="rounded-2xl border-2 border-[#b89047] bg-gradient-to-br from-amber-50/50 via-white to-white p-6 shadow-md space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-[#f1f5f9] pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-4 bg-[#b89047]" />
                <h3 className="font-serif text-lg font-bold text-[#0b1727]">
                  📅 Fechas Oficiales de Inicio y Finalización del Torneo
                </h3>
                <span className="rounded-full bg-[#b89047]/20 px-2 py-0.5 text-[10px] font-bold text-[#8c6729] border border-[#b89047]/40">
                  Control Temporal de Apertura y Cierre
                </span>
              </div>
              <p className="mt-1 text-xs text-[#64748b]">
                Determiná la ventana exacta del torneo. Fuera de estas fechas, el motor de ejecución y las terminales de los participantes rechazarán de forma absoluta cualquier orden.
              </p>
            </div>

            {/* Chip de Estado Dinámico de Fechas */}
            {(() => {
              const dateStatus = checkTournamentDateRange({ startDate, endDate });
              if (dateStatus.status === "SCHEDULED") {
                return (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                    ⏳ Programado (Apertura Próxima)
                  </span>
                );
              }
              if (dateStatus.status === "CONCLUDED") {
                return (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 border border-red-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    🛑 Concluido (Trading Inhabilitado)
                  </span>
                );
              }
              if (startDate || endDate) {
                return (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    🟢 En Curso (Período Operativo Hábil)
                  </span>
                );
              }
              return (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-300">
                  🌐 Continuo (Sin Restricción de Fechas)
                </span>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fecha de Inicio */}
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/30 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0b1727] flex items-center gap-1.5">
                <span>🟢</span> Fecha y Hora de Inicio
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] shadow-2xs"
              />
              <p className="mt-1 text-[11px] text-[#64748b]">
                {startDate
                  ? `Las operaciones comenzarán el ${formatTournamentDate(startDate) || startDate}.`
                  : "Si se deja vacío, el torneo estará activo de inmediato."}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, "0");
                    const day = String(now.getDate()).padStart(2, "0");
                    setStartDate(`${year}-${month}-${day}T00:00`);
                  }}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                >
                  Hoy (00:00 hs)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, "0");
                    const day = String(now.getDate()).padStart(2, "0");
                    const hours = String(now.getHours()).padStart(2, "0");
                    const minutes = String(now.getMinutes()).padStart(2, "0");
                    setStartDate(`${year}-${month}-${day}T${hours}:${minutes}`);
                  }}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                >
                  Ahora Mismo
                </button>
                <button
                  type="button"
                  onClick={() => setStartDate("")}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#64748b] hover:bg-[#f1f5f9]"
                >
                  Sin Inicio Fijo
                </button>
              </div>
            </div>

            {/* Fecha de Finalización */}
            <div className="rounded-xl border border-red-200/70 bg-red-50/20 p-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0b1727] flex items-center gap-1.5">
                <span>🛑</span> Fecha y Hora de Finalización
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] shadow-2xs"
              />
              <p className="mt-1 text-[11px] text-[#64748b]">
                {endDate
                  ? `El torneo cerrará operaciones el ${formatTournamentDate(endDate) || endDate}.`
                  : "Si se deja vacío, el torneo continuará sin fecha límite de cierre."}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const base = startDate ? new Date(startDate) : new Date();
                    const target = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const year = target.getFullYear();
                    const month = String(target.getMonth() + 1).padStart(2, "0");
                    const day = String(target.getDate()).padStart(2, "0");
                    setEndDate(`${year}-${month}-${day}T23:59`);
                  }}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                >
                  +1 Semana (23:59)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = startDate ? new Date(startDate) : new Date();
                    const target = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000);
                    const year = target.getFullYear();
                    const month = String(target.getMonth() + 1).padStart(2, "0");
                    const day = String(target.getDate()).padStart(2, "0");
                    setEndDate(`${year}-${month}-${day}T23:59`);
                  }}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                >
                  +2 Semanas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const base = startDate ? new Date(startDate) : new Date();
                    const target = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
                    const year = target.getFullYear();
                    const month = String(target.getMonth() + 1).padStart(2, "0");
                    const day = String(target.getDate()).padStart(2, "0");
                    setEndDate(`${year}-${month}-${day}T23:59`);
                  }}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#f1f5f9]"
                >
                  +1 Mes
                </button>
                <button
                  type="button"
                  onClick={() => setEndDate("")}
                  className="rounded border border-[#cbd5e1] bg-white px-2 py-0.5 text-[9px] font-semibold text-[#64748b] hover:bg-[#f1f5f9]"
                >
                  Sin Cierre Fijo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* INFORMACIÓN BÁSICA DEL TORNEO */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
              <h3 className="font-serif text-base font-bold text-[#0b1727]">
                Parámetros Generales de la Competencia
              </h3>
              <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-bold text-[#64748b]">
                {tournament?.status === "ACTIVE" ? "Torneo Activo" : "Borrador"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                Nombre / Título Oficial
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Ej: Torneo Cuantitativo de Primavera 2026"
                className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 text-sm text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                Descripción & Pautas
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Reglas adicionales o directrices para los grupos..."
                className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 text-xs text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Capital Inicial (USD)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={initialCapitalInput}
                  onChange={(e) => setInitialCapitalInput(e.target.value)}
                  required
                  placeholder="10000"
                  className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 font-mono text-sm text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {[1000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setInitialCapitalInput(String(amt))}
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold transition border ${
                        Number(initialCapitalInput) === amt
                          ? "border-[#0b1727] bg-[#0b1727] text-white"
                          : "border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f1f5f9]"
                      }`}
                    >
                      ${amt.toLocaleString("en-US")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Apalancamiento Máx.
                </label>
                <select
                  value={maxLeverage}
                  onChange={(e) => setMaxLeverage(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 text-xs font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
                >
                  <option value={1}>1x (Solo Spot / Sin Deuda)</option>
                  <option value={2}>2x</option>
                  <option value={3}>3x</option>
                  <option value={5}>5x</option>
                  <option value={10}>10x (Apalancamiento Estándar)</option>
                  {marketType === "FUTURES" && (
                    <>
                      <option value={20}>20x (Futuros Rofex / CME)</option>
                      <option value={50}>50x (Alto Apalancamiento)</option>
                      <option value={100}>100x (Máximo Institucional Derivados)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* REGLA DE SHORT vs SOLO LONG */}
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-[#0b1727]">
                  Regla de Operaciones en Corto (SHORT)
                </h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    allowShort
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}
                >
                  {allowShort ? "Short Habilitado" : "Solo Long"}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#64748b]">
                Determiná si los grupos pueden vender activos en corto o si el torneo exige únicamente compras al alza.
              </p>

              {/* Toggle switch visual */}
              <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowShort}
                    onChange={(e) => setAllowShort(e.target.checked)}
                    className="h-5 w-5 rounded border-[#cbd5e1] text-[#0b1727] accent-[#0b1727] focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-[#0b1727]">
                      Permitir posiciones en corto (SHORT)
                    </span>
                    <p className="text-[11px] text-[#64748b]">
                      Si se desmarca, el torneo operará estrictamente en modalidad Solo Long.
                    </p>
                  </div>
                </label>
              </div>

              {/* Mensaje de confirmación del estado */}
              <div
                className={`mt-4 rounded-xl p-4 text-xs font-medium ${
                  allowShort
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border border-amber-300 bg-amber-50 text-amber-900"
                }`}
              >
                {allowShort ? (
                  <div className="flex items-start gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <strong className="block font-bold">Modo Bidireccional Activo</strong>
                      Los grupos podrán abrir posiciones LONG (compra al alza) y posiciones SHORT (venta en corto con beneficio a la baja) sobre cualquier activo.
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <span className="text-base">🔒</span>
                    <div>
                      <strong className="block font-bold">Modo Exclusivo Solo Long Activo</strong>
                      Las posiciones SHORT quedarán bloqueadas tanto en la terminal de órdenes como en el motor de ejecución del backend. Cualquier intento de enviar una orden en corto será rechazado inmediatamente.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Opciones de Reinicio */}
            <div className="mt-6 border-t border-[#f1f5f9] pt-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0b1727]">
                <input
                  type="checkbox"
                  checked={resetBalances}
                  onChange={(e) => setResetBalances(e.target.checked)}
                  className="rounded border-[#cbd5e1] accent-red-600"
                />
                <span className="text-red-700">
                  Reiniciar balances de todos los grupos a ${parseFloat(initialCapitalInput) || 10000} USD y purgar operaciones
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#64748b]">
                <input
                  type="checkbox"
                  checked={createNew}
                  onChange={(e) => setCreateNew(e.target.checked)}
                  className="rounded border-[#cbd5e1] accent-[#0b1727]"
                />
                <span>Crear como nuevo torneo independiente (nuevo ID de competencia)</span>
              </label>
            </div>
          </div>
        </div>

        {/* REGLAS DE REBALANCEO TEMPORAL Y LÍMITES SEMANALES */}
        <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-[#f1f5f9] pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-4 bg-[#b89047]" />
                <h3 className="font-serif text-base font-bold text-[#0b1727]">
                  Ventana de Rebalanceo & Límite Semanal de Operaciones
                </h3>
              </div>
              <p className="mt-1 text-xs text-[#64748b]">
                Restringí los días y horarios en los que los grupos pueden operar para obligar a un rebalanceo semanal ordenado y evitar el overtrading.
              </p>
            </div>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200">
              Control Cuantitativo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Día de Rebalanceo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                Día de Rebalanceo Semanal
              </label>
              <select
                value={rebalanceDay}
                onChange={(e) => setRebalanceDay(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2.5 text-xs font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
              >
                <option value="">Todos los días (Mercado Libre 24/7)</option>
                <option value="MON">Solo Lunes</option>
                <option value="TUE">Solo Martes</option>
                <option value="WED">Solo Miércoles (Día Oficial de Rebalanceo)</option>
                <option value="THU">Solo Jueves</option>
                <option value="FRI">Solo Viernes</option>
              </select>
              <p className="mt-1 text-[11px] text-[#64748b]">
                {rebalanceDay
                  ? "Las órdenes de los grupos se bloquearán todos los demás días de la semana."
                  : "Los alumnos pueden operar en cualquier día de la semana."}
              </p>
            </div>

            {/* Franja Horaria */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                Franja Horaria (Hora Buenos Aires)
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="time"
                  value={tradingStartTime}
                  onChange={(e) => setTradingStartTime(e.target.value)}
                  className="w-1/2 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-xs font-mono font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
                />
                <span className="text-xs font-bold text-[#64748b]">a</span>
                <input
                  type="time"
                  value={tradingEndTime}
                  onChange={(e) => setTradingEndTime(e.target.value)}
                  className="w-1/2 rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 text-xs font-mono font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
                />
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTradingStartTime("14:00");
                    setTradingEndTime("18:00");
                  }}
                  className="rounded bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#e2e8f0]"
                >
                  14:00 a 18:00 hs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTradingStartTime("09:30");
                    setTradingEndTime("16:00");
                  }}
                  className="rounded bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-semibold text-[#0062ff] hover:bg-[#e2e8f0]"
                >
                  Wall St (09:30 - 16:00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTradingStartTime("");
                    setTradingEndTime("");
                  }}
                  className="rounded bg-[#f1f5f9] px-2 py-0.5 text-[9px] font-semibold text-[#64748b] hover:bg-[#e2e8f0]"
                >
                  Todo el día
                </button>
              </div>
            </div>

            {/* Cupo de Trades por Semana */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                Límite de Operaciones / Semana
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={maxTradesPerWeek}
                onChange={(e) => setMaxTradesPerWeek(Math.max(0, parseInt(e.target.value) || 0))}
                className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-3.5 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0b1727] focus:bg-white"
              />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[0, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setMaxTradesPerWeek(num)}
                    className={`rounded px-2 py-0.5 text-[9px] font-bold border transition ${
                      maxTradesPerWeek === num
                        ? "border-[#0b1727] bg-[#0b1727] text-white"
                        : "border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f1f5f9]"
                    }`}
                  >
                    {num === 0 ? "Ilimitado" : `${num} trades`}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-[#64748b]">
                {maxTradesPerWeek > 0
                  ? `Cada grupo solo podrá abrir/cerrar ${maxTradesPerWeek} órdenes por semana.`
                  : "Sin límite semanal de órdenes."}
              </p>
            </div>
          </div>
        </div>

        {/* Botón de Guardado */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-[#b89047] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition hover:bg-[#a67c33] active:scale-[0.99] disabled:opacity-50"
          >
            {isActionLoading
              ? "Guardando en D1..."
              : "Guardar y Aplicar Reglas al Torneo 🚀"}
          </button>
        </div>
      </form>
    </div>
  );
};
