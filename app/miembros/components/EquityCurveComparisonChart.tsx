"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useGroupTrading } from "../context/GroupTradingContext";
import { fetchEquityCurveApi } from "../services/paperApi";
import { EquityCurveSeriesResult, EquityCurvePoint } from "../types/paper-trading";
import { CLUB_GROUPS } from "../constants/groups";

const GROUP_COLORS: Record<string, string> = {
  grupo_1: "#d97706",
  grupo_2: "#4f46e5",
  grupo_3: "#0284c7",
  grupo_4: "#059669",
  grupo_5: "#7c3aed",
  grupo_6: "#db2777",
  allianz: "#1e3a8a",
};

const FALLBACK_PALETTE = [
  "#0d9488",
  "#ea580c",
  "#64748b",
  "#84cc16",
  "#e11d48",
  "#4338ca",
];

function getGroupColor(groupId: string, index: number): string {
  if (GROUP_COLORS[groupId]) return GROUP_COLORS[groupId];
  return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
}

interface TooltipPayloadEntry {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  unitMode: "NOMINAL" | "PERCENT";
  namesMap: Record<string, string>;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  unitMode,
  namesMap,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const sortedPayload = [...payload].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white/95 p-3.5 shadow-xl backdrop-blur-xs text-xs min-w-[210px] z-50">
      <div className="border-b border-[#f1f5f9] pb-2 mb-2 font-mono text-[11px] font-semibold text-[#64748b]">
        {label}
      </div>
      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        {sortedPayload.map((entry) => {
          const rawKey = String(entry.dataKey || "");
          const name = namesMap[rawKey] || entry.name || rawKey;
          const numVal = Number(entry.value) || 0;
          return (
            <div key={rawKey} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate font-semibold text-[#0b1727]">{name}</span>
              </div>
              <span className="font-mono font-bold text-[#0f172a] shrink-0">
                {unitMode === "NOMINAL"
                  ? `$${numVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${numVal >= 0 ? "+" : ""}${numVal.toFixed(2)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const EquityCurveComparisonChart: React.FC<{
  embedded?: boolean;
}> = ({ embedded = false }) => {
  const { tournament, marketType, leaderboard, currentGroup } = useGroupTrading();

  const [seriesResult, setSeriesResult] = useState<EquityCurveSeriesResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unitMode, setUnitMode] = useState<"NOMINAL" | "PERCENT">("NOMINAL");
  const [viewMode, setViewMode] = useState<"ALL" | "1V1">("ALL");
  const [groupA, setGroupA] = useState<string>("grupo_1");
  const [groupB, setGroupB] = useState<string>("grupo_2");
  const [hiddenGroups, setHiddenGroups] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isFutures =
    tournament?.tournamentType === "FUTURES" ||
    marketType === "FUTURES" ||
    (tournament?.id || "").toLowerCase().includes("futur");

  const baseCapital = tournament?.initialCapital && tournament.initialCapital > 0 ? tournament.initialCapital : 10000;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetchEquityCurveApi(tournament?.id, marketType);
      setSeriesResult(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error al cargar curvas de equity.");
    } finally {
      setIsLoading(false);
    }
  }, [tournament?.id, marketType]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const groupNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of CLUB_GROUPS) {
      map[g.id] = g.name;
    }
    for (const lb of leaderboard) {
      map[lb.groupId] = lb.groupName;
    }
    if (seriesResult?.series) {
      for (const s of seriesResult.series) {
        if (s.groupName) map[s.groupId] = s.groupName;
      }
    }
    return map;
  }, [leaderboard, seriesResult]);

  const allAvailableGroups = useMemo(() => {
    const ids = new Set<string>();
    if (seriesResult?.series) {
      for (const s of seriesResult.series) ids.add(s.groupId);
    }
    for (const lb of leaderboard) {
      ids.add(lb.groupId);
    }
    for (const g of CLUB_GROUPS) {
      ids.add(g.id);
    }
    return Array.from(ids).map((id, index) => ({
      id,
      name: groupNamesMap[id] || id,
      color: getGroupColor(id, index),
    }));
  }, [seriesResult, leaderboard, groupNamesMap]);

  useEffect(() => {
    if (allAvailableGroups.length >= 2) {
      const defaultA = currentGroup?.id && allAvailableGroups.some((g) => g.id === currentGroup.id)
        ? currentGroup.id
        : allAvailableGroups[0].id;
      const defaultB = allAvailableGroups.find((g) => g.id !== defaultA)?.id || allAvailableGroups[1].id;

      if (!groupA || !allAvailableGroups.some((g) => g.id === groupA)) {
        setGroupA(defaultA);
      }
      if (!groupB || !allAvailableGroups.some((g) => g.id === groupB) || groupB === defaultA) {
        setGroupB(defaultB);
      }
    }
  }, [allAvailableGroups, currentGroup, groupA, groupB]);

  const { chartData, activeSeriesList } = useMemo(() => {
    const activeSeriesList: { id: string; name: string; color: string }[] = [];

    const seriesByGroup: Record<string, EquityCurvePoint[]> = {};

    if (seriesResult?.series && seriesResult.series.length > 0) {
      for (const s of seriesResult.series) {
        seriesByGroup[s.groupId] = [...(s.points || [])].sort((a, b) => a.timestamp - b.timestamp);
      }
    }

    const startBaselineTs = tournament?.startDate
      ? new Date(tournament.startDate).getTime()
      : Date.now() - 3600000;

    for (const grp of allAvailableGroups) {
      const existing = seriesByGroup[grp.id];
      const lb = leaderboard.find((l) => l.groupId === grp.id);

      if (!existing || existing.length === 0) {
        const pts: EquityCurvePoint[] = [
          {
            timestamp: startBaselineTs,
            equity: baseCapital,
            peakEquity: baseCapital,
            drawdownPct: 0,
            maxDrawdownPct: 0,
          },
        ];
        if (lb && lb.equity !== undefined && lb.equity !== baseCapital) {
          pts.push({
            timestamp: Date.now(),
            equity: lb.equity,
            peakEquity: lb.peakEquity || Math.max(baseCapital, lb.equity),
            drawdownPct: lb.maxDrawdownPct || 0,
            maxDrawdownPct: lb.maxDrawdownPct || 0,
          });
        }
        seriesByGroup[grp.id] = pts;
      } else {
        if (lb && lb.equity !== undefined) {
          const lastPt = existing[existing.length - 1];
          if (Date.now() - lastPt.timestamp > 15 * 60 * 1000) {
            existing.push({
              timestamp: Date.now(),
              equity: lb.equity,
              peakEquity: lb.peakEquity || Math.max(lastPt.peakEquity, lb.equity),
              drawdownPct: lb.maxDrawdownPct || 0,
              maxDrawdownPct: lb.maxDrawdownPct || 0,
            });
          }
        }
      }
    }

    const targetGroups =
      viewMode === "1V1"
        ? allAvailableGroups.filter((g) => g.id === groupA || g.id === groupB)
        : allAvailableGroups.filter((g) => !hiddenGroups.has(g.id));

    for (const g of targetGroups) {
      activeSeriesList.push(g);
    }

    const timestampSet = new Set<number>();
    for (const g of targetGroups) {
      const pts = seriesByGroup[g.id] || [];
      for (const p of pts) {
        timestampSet.add(p.timestamp);
      }
    }

    const sortedTimestamps = Array.from(timestampSet).sort((a, b) => a - b);

    const latestValPerGroup: Record<string, number> = {};

    const chartData = sortedTimestamps.map((ts) => {
      const dateObj = new Date(ts);
      const formattedDate = isFutures
        ? dateObj.toLocaleDateString("es-AR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : dateObj.toLocaleDateString("es-AR", { month: "short", day: "numeric" });

      const pointObj: Record<string, string | number> = {
        timestamp: ts,
        formattedDate,
      };

      for (const g of targetGroups) {
        const pts = seriesByGroup[g.id] || [];
        const exactPt = pts.find((p) => p.timestamp === ts);

        let equityVal = latestValPerGroup[g.id] !== undefined ? latestValPerGroup[g.id] : baseCapital;

        if (exactPt) {
          equityVal = exactPt.equity;
          latestValPerGroup[g.id] = equityVal;
        }

        if (unitMode === "PERCENT") {
          const retPct = ((equityVal - baseCapital) / baseCapital) * 100;
          pointObj[g.id] = Number(retPct.toFixed(2));
        } else {
          pointObj[g.id] = Number(equityVal.toFixed(2));
        }
      }

      return pointObj;
    });

    return { chartData, activeSeriesList };
  }, [
    seriesResult,
    tournament,
    leaderboard,
    allAvailableGroups,
    viewMode,
    groupA,
    groupB,
    hiddenGroups,
    baseCapital,
    isFutures,
    unitMode,
  ]);

  const toggleGroupVisibility = (id: string) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= allAvailableGroups.length - 1) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const selectAllGroups = () => {
    setHiddenGroups(new Set());
  };

  const stats1v1 = useMemo(() => {
    if (viewMode !== "1V1") return null;
    const lbA = leaderboard.find((l) => l.groupId === groupA);
    const lbB = leaderboard.find((l) => l.groupId === groupB);
    const eqA = lbA?.equity ?? baseCapital;
    const eqB = lbB?.equity ?? baseCapital;
    const roeA = lbA?.roePct ?? (((eqA - baseCapital) / baseCapital) * 100);
    const roeB = lbB?.roePct ?? (((eqB - baseCapital) / baseCapital) * 100);
    const ddA = lbA?.maxDrawdownPct ?? 0;
    const ddB = lbB?.maxDrawdownPct ?? 0;

    const deltaNominal = eqA - eqB;
    const deltaRoe = roeA - roeB;

    return {
      nameA: groupNamesMap[groupA] || groupA,
      nameB: groupNamesMap[groupB] || groupB,
      eqA,
      eqB,
      roeA,
      roeB,
      ddA,
      ddB,
      deltaNominal,
      deltaRoe,
      leader: deltaNominal > 0 ? "A" : deltaNominal < 0 ? "B" : "TIE",
    };
  }, [viewMode, groupA, groupB, leaderboard, baseCapital, groupNamesMap]);

  return (
    <div className={`rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-xs ${embedded ? "mt-6" : ""}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f1f5f9] pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Trayectoria de Rendimiento
            </span>
            <span className="rounded-full bg-slate-100 border border-slate-300 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700">
              {isFutures ? "Snapshots 15m (Futuros)" : "Cierre Diario (Portafolio)"}
            </span>
          </div>
          <h3 className="mt-1 font-serif text-lg font-bold text-[#0b1727]">
            Curvas de Patrimonio (Equity Curves)
          </h3>
          <p className="mt-0.5 text-xs text-[#64748b]">
            Comparativa cronológica de la evolución de capital de los grupos participantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("ALL")}
              className={`rounded-md px-2.5 py-1 transition ${
                viewMode === "ALL"
                  ? "bg-[#0b1727] text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#0b1727]"
              }`}
            >
              Todos los Grupos
            </button>
            <button
              type="button"
              onClick={() => setViewMode("1V1")}
              className={`rounded-md px-2.5 py-1 transition ${
                viewMode === "1V1"
                  ? "bg-[#0b1727] text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#0b1727]"
              }`}
            >
              Duelo 1v1
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUnitMode("NOMINAL")}
              className={`rounded-md px-2.5 py-1 font-mono transition ${
                unitMode === "NOMINAL"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#0b1727]"
              }`}
              title="Mostrar en Dólares Nominales ($)"
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => setUnitMode("PERCENT")}
              className={`rounded-md px-2.5 py-1 font-mono transition ${
                unitMode === "PERCENT"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-[#64748b] hover:text-[#0b1727]"
              }`}
              title="Mostrar en Retorno Porcentual (%)"
            >
              % ROE
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-xs font-bold text-[#475569] transition hover:bg-[#f8fafc] hover:text-[#0b1727] disabled:opacity-50"
            title="Refrescar datos de curvas de equity"
          >
            {isLoading ? "..." : "↻"}
          </button>
        </div>
      </div>

      {viewMode === "1V1" && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider">Grupo A:</span>
                <select
                  value={groupA}
                  onChange={(e) => setGroupA(e.target.value)}
                  className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-bold text-[#0b1727] outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                >
                  {allAvailableGroups.map((g) => (
                    <option key={g.id} value={g.id} disabled={g.id === groupB}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-xs font-black text-[#94a3b8]">VS</span>

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-wider">Grupo B:</span>
                <select
                  value={groupB}
                  onChange={(e) => setGroupB(e.target.value)}
                  className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-bold text-[#0b1727] outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                >
                  {allAvailableGroups.map((g) => (
                    <option key={g.id} value={g.id} disabled={g.id === groupA}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {stats1v1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-[#64748b]">Diferencia de Capital:</span>
                <span
                  className={`rounded px-2 py-0.5 font-bold ${
                    stats1v1.deltaNominal >= 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {stats1v1.deltaNominal >= 0 ? "+" : ""}
                  ${stats1v1.deltaNominal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  {" "}({stats1v1.deltaRoe >= 0 ? "+" : ""}{stats1v1.deltaRoe.toFixed(2)}%)
                </span>
                <span className="text-[11px] font-sans font-bold text-[#0b1727]">
                  {stats1v1.leader === "A"
                    ? `🏆 Lidera ${stats1v1.nameA}`
                    : stats1v1.leader === "B"
                    ? `🏆 Lidera ${stats1v1.nameB}`
                    : "Empate Técnico"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode === "ALL" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mr-1">
              Filtro Rápido:
            </span>
            {allAvailableGroups.map((g) => {
              const isHidden = hiddenGroups.has(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroupVisibility(g.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition border ${
                    isHidden
                      ? "border-slate-200 bg-slate-50 text-slate-400 line-through opacity-60"
                      : "border-slate-200 bg-white text-[#0b1727] hover:border-slate-400"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: isHidden ? "#cbd5e1" : g.color }}
                  />
                  <span>{g.name}</span>
                </button>
              );
            })}
          </div>

          {hiddenGroups.size > 0 && (
            <button
              type="button"
              onClick={selectAllGroups}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              Restablecer todos
            </button>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 font-semibold border border-red-200">
          {errorMsg}
        </div>
      )}

      <div className="mt-4 w-full h-[360px] min-h-[360px]">
        {isMounted ? (
          chartData.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] text-center p-6">
              <div>
                <p className="font-serif text-sm font-bold text-[#0b1727]">
                  Curva en Espera de Snapshots
                </p>
                <p className="mt-1 text-xs text-[#64748b] max-w-md">
                  Los datos se actualizarán automáticamente con cada intervalo de 15 minutos en Futuros o en el cierre bursátil para Portafolios.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 18, left: 10, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="formattedDate"
                  tickLine={false}
                  stroke="#94a3b8"
                  fontSize={10}
                  tickMargin={6}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={6}
                  tickFormatter={(val) =>
                    unitMode === "NOMINAL"
                      ? `$${Number(val).toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 })}`
                      : `${val >= 0 ? "+" : ""}${Number(val).toFixed(1)}%`
                  }
                />
                <Tooltip
                  content={
                    <CustomChartTooltip
                      unitMode={unitMode}
                      namesMap={groupNamesMap}
                    />
                  }
                />
                {unitMode === "PERCENT" && (
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="3 3" />
                )}
                {unitMode === "NOMINAL" && (
                  <ReferenceLine y={baseCapital} stroke="#cbd5e1" strokeDasharray="3 3" />
                )}
                {activeSeriesList.map((g) => (
                  <Line
                    key={g.id}
                    type="monotone"
                    dataKey={g.id}
                    name={g.name}
                    stroke={g.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#f8fafc]">
            <span className="font-mono text-xs text-[#94a3b8]">Cargando gráfico...</span>
          </div>
        )}
      </div>
    </div>
  );
};
