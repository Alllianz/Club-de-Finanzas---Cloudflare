"use client";

import React, { useState } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";

export const GroupLeaderboard: React.FC = () => {
  const { leaderboard, currentGroup, renameGroup, tournament } = useGroupTrading();
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Determinar si la competencia actual es de Futuros o de Portafolio
  const isFutures =
    tournament?.tournamentType === "FUTURES" ||
    leaderboard[0]?.rankingRule === "FUTURES" ||
    (tournament?.id || "").toLowerCase().includes("futur");

  const handleStartEdit = (groupId: string, currentName: string) => {
    setEditingGroupId(groupId);
    setEditNameValue(currentName);
    setErrorMsg(null);
  };

  const handleSaveRename = async (groupId: string) => {
    const trimmed = editNameValue.trim();
    if (!trimmed) {
      setErrorMsg("El nombre no puede estar vacío.");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    const res = await renameGroup(groupId, trimmed);
    setIsSaving(false);

    if (res.success) {
      setEditingGroupId(null);
    } else {
      setErrorMsg(res.error || "No se pudo actualizar el nombre.");
    }
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Ranking Oficial {isFutures ? "Futuros & Derivados" : "Portafolio"}
            </span>

            {isFutures ? (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                1° Puesto: Mayor Capital Total
              </span>
            ) : (
              <span className="rounded-full bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                1° Puesto: (Capital Total − Cap. Inicial) / Max DD
              </span>
            )}
          </div>
          <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
            Leaderboard de Grupos UBA
          </h3>
          <p className="mt-1 text-xs text-[#64748b]">
            {isFutures
              ? "Competencia de trading apalancado y cobertura. Gana el equipo con mayor Capital Total (Equity)."
              : "Competencia de asignación y gestión de riesgo. Gana el equipo con mayor retorno relativo al Máximo Drawdown."}
          </p>
        </div>

        {errorMsg && (
          <span className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">
            {errorMsg}
          </span>
        )}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
              <th className="py-3 px-3 text-center w-[50px]">Pos.</th>
              <th className="py-3 px-3 min-w-[280px] md:w-[320px]">Equipo / Grupo</th>
              <th className="py-3 px-3">
                Patrimonio (Equity) {isFutures && <span className="text-amber-600">★ Criterio 1°</span>}
              </th>
              {!isFutures && (
                <th className="py-3 px-3 bg-amber-50/50 text-[#1e3a8a]">
                  Score Retorno/DD <span className="text-amber-600">★ Criterio 1°</span>
                </th>
              )}
              <th className="py-3 px-3">Retorno (ROE)</th>
              <th className="py-3 px-3 text-center">Asignación (% Invertido)</th>
              <th className="py-3 px-3">Max DD (%)</th>
              <th className="py-3 px-3">Max DD Nominal</th>
              <th className="py-3 px-3">PnL Realizado</th>
              <th className="py-3 px-3">PnL Flotante</th>
              <th className="py-3 px-3 text-center w-[85px]">Posiciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {leaderboard.map((item) => {
              const isCurrent = currentGroup?.id === item.groupId;
              const isAllianz = currentGroup?.id === "allianz";
              const canEdit = isCurrent || isAllianz;
              const isEditing = editingGroupId === item.groupId;
              const isRoePositive = item.roePct >= 0;

              return (
                <tr
                  key={item.groupId}
                  className={`transition ${
                    isCurrent
                      ? "bg-blue-50/70 font-semibold"
                      : "hover:bg-[#fafaf9]"
                  }`}
                >
                  <td className="py-3.5 px-3 text-center w-[50px]">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs font-bold ${
                        item.rank === 1
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : item.rank === 2
                          ? "bg-slate-200 text-slate-800 border border-slate-300"
                          : item.rank === 3
                          ? "bg-amber-700/10 text-amber-900 border border-amber-600/30"
                          : "text-[#64748b]"
                      }`}
                    >
                      {item.rank}
                    </span>
                  </td>

                  {/* Columna Equipo / Grupo Más Ancha con Edición de Nombre */}
                  <td className="py-3.5 px-3 min-w-[280px] md:w-[320px]">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          placeholder="Nuevo nombre de equipo..."
                          autoFocus
                          disabled={isSaving}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(item.groupId);
                            if (e.key === "Escape") setEditingGroupId(null);
                          }}
                          className="w-full rounded-lg border border-[#0062ff] bg-white px-3 py-1 text-xs font-bold text-[#0b1727] outline-none shadow-xs focus:ring-1 focus:ring-[#0062ff]"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(item.groupId)}
                          disabled={isSaving}
                          title="Guardar nombre"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isSaving ? "..." : "✓"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          disabled={isSaving}
                          title="Cancelar"
                          className="rounded-lg bg-[#e2e8f0] px-2 py-1 text-xs font-bold text-[#475569] transition hover:bg-[#cbd5e1]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0b1727] text-sm">
                            {item.groupName}
                          </span>
                          {item.rank === 1 && (
                            <span className="rounded bg-amber-500/20 text-amber-900 border border-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              👑 1° Puesto
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded bg-[#0b1727] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                              Tu Grupo
                            </span>
                          )}
                          {(item.complianceStatus === "NON_COMPLIANT_CASH" || (item.investedPct !== undefined && item.investedPct < 95.0)) && (
                            <span
                              className="rounded bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                              title="El grupo posee más del 5% en efectivo ocioso (< 95% invertido). Score penalizado cuadráticamente."
                            >
                              ⚠️ Caja Ociosa
                            </span>
                          )}
                        </div>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item.groupId, item.groupName)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#e2e8f0] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#64748b] transition hover:border-[#0062ff] hover:text-[#0062ff] shadow-2xs"
                            title="Cambiar nombre del equipo"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-3 font-mono font-bold text-[#0b1727]">
                    ${item.equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Columna Score Retorno / Drawdown (Exclusivo Torneo de Portafolio) */}
                  {!isFutures && (
                    <td className="py-3.5 px-3 font-mono font-bold bg-amber-50/30">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${
                          (item.score ?? 0) > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : (item.score ?? 0) < 0
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                        title="Fórmula: ((Capital Total - Capital Inicial) / Max DD) * Factor Inversión"
                      >
                        {item.score !== undefined
                          ? item.score > 900
                            ? "∞ (Sin DD)"
                            : `${item.score >= 0 ? "+" : ""}${item.score.toFixed(2)}x`
                          : "0.00x"}
                      </span>
                    </td>
                  )}

                  <td className="py-3.5 px-3 font-mono font-bold">
                    <span className={isRoePositive ? "text-emerald-600" : "text-red-600"}>
                      {isRoePositive ? "+" : ""}
                      {item.roePct.toFixed(2)}%
                    </span>
                  </td>

                  {/* Asignación de Cartera (% Invertido con tolerancia 5%) */}
                  <td className="py-3.5 px-3 text-center font-mono">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold border ${
                        (item.investedPct ?? 0) >= 95.0
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : (item.investedPct ?? 0) >= 80.0
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-red-50 text-red-800 border-red-300"
                      }`}
                      title={
                        (item.investedPct ?? 0) >= 95.0
                          ? "Cartera 100% Invertida (Conforme >= 95%)"
                          : "Infra-invertido (< 95%): Penalización cuadrática en Score"
                      }
                    >
                      {(item.investedPct ?? 0).toFixed(1)}%
                    </span>
                  </td>

                  {/* Drawdown Porcentual Formal (Estándar Sylva / Astro EVO) */}
                  <td className="py-3.5 px-3 font-mono font-bold text-red-600">
                    -{(item.maxDrawdownPct ?? (item.peakEquity && item.peakEquity > 0 ? ((item.maxDrawdownNominal ?? 0) / item.peakEquity) * 100 : 0)).toFixed(2)}%
                  </td>

                  {/* Máximo Drawdown Nominal */}
                  <td className="py-3.5 px-3 font-mono font-bold text-red-600">
                    -${(item.maxDrawdownNominal ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  <td className="py-3.5 px-3 font-mono text-[#334155]">
                    <span className={item.realizedPnl >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {item.realizedPnl >= 0 ? "+" : ""}
                      ${item.realizedPnl.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[#334155]">
                    <span className={item.unrealizedPnl >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {item.unrealizedPnl >= 0 ? "+" : ""}
                      ${item.unrealizedPnl.toFixed(2)}
                    </span>
                  </td>

                  {/* Columna Posiciones Más Angosta */}
                  <td className="py-3.5 px-3 text-center w-[85px] font-mono font-bold text-[#64748b]">
                    {item.openPositionsCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
