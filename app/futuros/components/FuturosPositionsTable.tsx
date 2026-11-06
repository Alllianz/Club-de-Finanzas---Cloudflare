"use client";

import React from "react";
import { useGroupTrading } from "@/app/miembros/context/GroupTradingContext";

export const FuturosPositionsTable: React.FC = () => {
  const { positions, closePosition, isActionLoading } = useGroupTrading();

  // Posiciones registradas en este torneo de derivados
  const futuresPositions = positions;

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0062ff]">
            Posiciones Abiertas
          </span>
          <h2 className="font-serif text-xl font-bold text-[#0b1727]">
            Libro de Posiciones en Derivados ({futuresPositions.length})
          </h2>
        </div>
      </div>

      {futuresPositions.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8fafc] text-xl text-[#94a3b8]">
            📊
          </div>
          <h3 className="mt-3 text-sm font-bold text-[#0b1727]">
            Sin posiciones activas en futuros
          </h3>
          <p className="mt-1 text-xs text-[#64748b]">
            Seleccioná un contrato en el panel izquierdo y abrí una posición Long o Short para comenzar a operar.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[10px] uppercase tracking-wider text-[#64748b]">
                <th className="pb-3 font-bold">Contrato</th>
                <th className="pb-3 font-bold">Lado</th>
                <th className="pb-3 font-bold text-right">Contratos</th>
                <th className="pb-3 font-bold text-right">Precio Entrada</th>
                <th className="pb-3 font-bold text-right">Precio Mark</th>
                <th className="pb-3 font-bold text-right">Margen (USD)</th>
                <th className="pb-3 font-bold text-right">Precio Liq.</th>
                <th className="pb-3 font-bold text-right">PnL Flotante</th>
                <th className="pb-3 text-center font-bold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {futuresPositions.map((pos) => {
                const isProfitable = pos.unrealized_pnl >= 0;
                const roePct =
                  pos.initial_margin > 0
                    ? (pos.unrealized_pnl / pos.initial_margin) * 100
                    : 0;

                return (
                  <tr key={pos.id} className="transition hover:bg-[#fafaf9]">
                    <td className="py-3.5 font-bold text-[#0b1727]">
                      <div className="font-mono">{pos.symbol}</div>
                      <span className="text-[10px] text-[#64748b]">{pos.leverage}x Apalancado</span>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          pos.side === "LONG"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono font-semibold text-[#0b1727]">
                      {pos.quantity}
                    </td>
                    <td className="py-3.5 text-right font-mono text-[#475569]">
                      ${pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold text-[#0b1727]">
                      ${pos.current_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 text-right font-mono text-[#0062ff] font-semibold">
                      ${pos.initial_margin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 text-right font-mono text-rose-600 font-bold">
                      ${pos.liquidation_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 text-right font-mono font-bold">
                      <span className={isProfitable ? "text-emerald-600" : "text-rose-600"}>
                        {isProfitable ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                      </span>
                      <div
                        className={`text-[10px] ${
                          isProfitable ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isProfitable ? "+" : ""}{roePct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => closePosition(pos.id)}
                        disabled={isActionLoading}
                        className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-[11px] font-bold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Cerrar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
