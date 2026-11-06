"use client";

import React from "react";
import { useGroupTrading } from "@/app/miembros/context/GroupTradingContext";

export const FuturosTradesHistoryTable: React.FC = () => {
  const { trades } = useGroupTrading();

  // Operaciones registradas en este torneo de derivados
  const futuresTrades = trades;

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0062ff]">
            Auditoría Operativa
          </span>
          <h2 className="font-serif text-xl font-bold text-[#0b1727]">
            Historial de Ejecuciones en Derivados ({futuresTrades.length})
          </h2>
        </div>
      </div>

      {futuresTrades.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#64748b]">
          Aún no se han ejecutado operaciones de futuros en esta sesión.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[10px] uppercase tracking-wider text-[#64748b]">
                <th className="pb-3 font-bold">Fecha / Hora</th>
                <th className="pb-3 font-bold">Contrato</th>
                <th className="pb-3 font-bold">Operación</th>
                <th className="pb-3 font-bold text-right">Cantidad</th>
                <th className="pb-3 font-bold text-right">Precio Fill</th>
                <th className="pb-3 font-bold text-right">Comisión</th>
                <th className="pb-3 font-bold text-right">PnL Realizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {futuresTrades.slice(0, 15).map((tr) => {
                const dateStr = new Date(tr.timestamp).toLocaleString("es-AR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <tr key={tr.id} className="transition hover:bg-[#fafaf9]">
                    <td className="py-3 font-mono text-[11px] text-[#64748b]">
                      {dateStr}
                    </td>
                    <td className="py-3 font-bold font-mono text-[#0b1727]">
                      {tr.symbol}
                    </td>
                    <td className="py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          tr.position_side === "LONG"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {tr.order_side} {tr.position_side} {tr.leverage}x
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-[#0b1727]">
                      {tr.quantity}
                    </td>
                    <td className="py-3 text-right font-mono text-[#0b1727]">
                      ${tr.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right font-mono text-[#64748b]">
                      ${tr.fee.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      {tr.realized_pnl !== 0 ? (
                        <span
                          className={tr.realized_pnl > 0 ? "text-emerald-600" : "text-rose-600"}
                        >
                          {tr.realized_pnl > 0 ? "+" : ""}${tr.realized_pnl.toFixed(2)}
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
