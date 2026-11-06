"use client";

import React from "react";
import { useGroupTrading } from "../context/GroupTradingContext";

export const TradesHistoryTable: React.FC = () => {
  const { trades } = useGroupTrading();

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Bitácora de Órdenes
            </span>
          </div>
          <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
            Historial de Ejecuciones ({trades.length})
          </h3>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-xs text-[#64748b]">No hay trades ejecutados en esta sesión todavía.</p>
        </div>
      ) : (
        <div className="mt-4 max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-[#e5e7eb] text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
                <th className="py-2.5 px-3">Fecha y Hora</th>
                <th className="py-2.5 px-3">Activo</th>
                <th className="py-2.5 px-3">Operación</th>
                <th className="py-2.5 px-3">Cantidad</th>
                <th className="py-2.5 px-3">Precio Ejecución</th>
                <th className="py-2.5 px-3">Comisión</th>
                <th className="py-2.5 px-3 text-right">PnL Realizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {trades.map((tr) => {
                const dateStr = new Date(tr.timestamp).toLocaleString("es-AR", {
                  dateStyle: "short",
                  timeStyle: "medium",
                });
                const isPnlPositive = tr.realized_pnl >= 0;

                return (
                  <tr key={tr.id} className="hover:bg-[#fafaf9]">
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#64748b]">
                      {dateStr}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#0b1727]">
                      <div className="flex items-center gap-1.5">
                        <span>{tr.symbol}</span>
                        {tr.leverage ? (
                          <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-mono text-[#64748b]">
                            {tr.leverage}x
                          </span>
                        ) : null}
                        {tr.margin_mode ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[8px] font-mono font-bold ${
                              tr.margin_mode === "CROSS"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {tr.margin_mode}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold ${
                          tr.order_side === "BUY"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {tr.order_side} {tr.position_side}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#334155]">
                      {tr.quantity}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#334155]">
                      ${tr.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#64748b]">
                      ${tr.fee.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {tr.realized_pnl !== 0 ? (
                        <span className={isPnlPositive ? "text-emerald-600" : "text-red-600"}>
                          {isPnlPositive ? "+" : ""}
                          ${tr.realized_pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[#94a3b8]">—</span>
                      )}
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
