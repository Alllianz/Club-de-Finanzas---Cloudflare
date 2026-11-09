"use client";

import React, { useState } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { checkTournamentDateRange } from "../utils/tournament-dates";

export const PendingOrdersTable: React.FC = () => {
  const { pendingOrders, cancelOrder, isActionLoading, tournament } = useGroupTrading();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const activePendingOrders = pendingOrders.filter(
    (o) => o.status === "PENDING" || o.status === "PENDING_OPEN" || o.status === "PARTIALLY_FILLED"
  );
  const dateStatus = checkTournamentDateRange(tournament);

  const handleCancel = async (orderId: string, symbol: string) => {
    if (!dateStatus.allowed) {
      alert(dateStatus.reason || "Operación rechazada: el torneo no se encuentra en período operativo habilitado.");
      return;
    }
    if (!confirm(`¿Confirmás la cancelación de la orden en ${symbol}?`)) {
      return;
    }
    setCancellingId(orderId);
    await cancelOrder(orderId);
    setCancellingId(null);
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Libro de Órdenes
            </span>
          </div>
          <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
            Órdenes Pendientes y Programadas ({activePendingOrders.length})
          </h3>
        </div>
      </div>

      {activePendingOrders.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm font-semibold text-[#0b1727]">No tenés órdenes pendientes ni programadas.</p>
          <p className="mt-1 text-xs text-[#64748b]">
            Podés programar órdenes de mercado fuera de hora o colocar órdenes límite desde la terminal de trading.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Activo</th>
                <th className="py-3 px-3">Sentido</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Cantidad</th>
                <th className="py-3 px-3">Precio Límite / Ref.</th>
                <th className="py-3 px-3">Apalancamiento</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {activePendingOrders.map((ord) => {
                const dateStr = new Date(ord.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                const isBuy = ord.order_side === "BUY";

                return (
                  <tr key={ord.id} className="hover:bg-[#fafaf9] transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-[#64748b]">{dateStr}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#0b1727]">{ord.symbol}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                          isBuy
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {isBuy ? "▲ COMPRA" : "▼ VENTA"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-[#1e3a8a]">
                      {ord.status === "PENDING_OPEN" ? (
                        <span className="text-indigo-700">MKT (APERTURA)</span>
                      ) : (
                        ord.order_type || "LÍMITE"
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-medium">
                      {ord.status === "PARTIALLY_FILLED" && ord.filled_quantity > 0
                        ? `${(ord.quantity - ord.filled_quantity).toFixed(4)} / ${ord.quantity.toFixed(4)}`
                        : ord.quantity.toFixed(4)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#0b1727]">
                      {ord.status === "PENDING_OPEN" ? (
                        <span className="text-[11px] font-normal text-indigo-700 italic">
                          Apertura (09:30 ET)
                        </span>
                      ) : ord.limit_price ? (
                        `$${ord.limit_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[#64748b]">{ord.leverage}x</td>
                    <td className="py-3 px-3">
                      {ord.status === "PENDING_OPEN" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          ⏳ En Cola Apertura (09:30 ET)
                        </span>
                      ) : ord.status === "PARTIALLY_FILLED" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                          🟠 Parcialmente Ejecutada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          🟡 Límite Pendiente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleCancel(ord.id, ord.symbol)}
                        disabled={isActionLoading || cancellingId === ord.id}
                        className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                      >
                        {cancellingId === ord.id ? "Cancelando..." : "Cancelar"}
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
