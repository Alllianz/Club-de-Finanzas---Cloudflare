"use client";

import React from "react";
import { useGroupTrading } from "../context/GroupTradingContext";

export const GroupLeaderboard: React.FC = () => {
  const { leaderboard, currentGroup } = useGroupTrading();

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Ranking Oficial
            </span>
          </div>
          <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
            Leaderboard de Grupos UBA
          </h3>
          <p className="mt-1 text-xs text-[#64748b]">
            Competencia de asignación táctica y trading cuantitativo en tiempo real.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#e5e7eb] text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
              <th className="py-3 px-3 text-center">Pos.</th>
              <th className="py-3 px-3">Equipo / Grupo</th>
              <th className="py-3 px-3">Patrimonio (Equity)</th>
              <th className="py-3 px-3">Retorno (ROE)</th>
              <th className="py-3 px-3">PnL Realizado</th>
              <th className="py-3 px-3">PnL Flotante</th>
              <th className="py-3 px-3 text-center">Posiciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {leaderboard.map((item) => {
              const isCurrent = currentGroup?.id === item.groupId;
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
                  <td className="py-3.5 px-3 text-center">
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
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0b1727]">{item.groupName}</span>
                      {isCurrent && (
                        <span className="rounded bg-[#0b1727] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          Tu Grupo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold text-[#0b1727]">
                    ${item.equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold">
                    <span className={isRoePositive ? "text-emerald-600" : "text-red-600"}>
                      {isRoePositive ? "+" : ""}
                      {item.roePct.toFixed(2)}%
                    </span>
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
                  <td className="py-3.5 px-3 text-center font-mono text-[#64748b]">
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
