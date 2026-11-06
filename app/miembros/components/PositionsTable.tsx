"use client";

import React, { useState, useEffect } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { realtimePriceStream, RealtimePriceTick } from "../services/realtimePriceStream";

export const PositionsTable: React.FC = () => {
  const { positions, closePosition, isActionLoading } = useGroupTrading();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    positions.forEach((p) => {
      const isCrypto =
        p.symbol.endsWith("-USD") ||
        p.symbol.endsWith("USDT") ||
        p.symbol.includes("BTC") ||
        p.symbol.includes("ETH") ||
        p.symbol.includes("SOL");

      if (isCrypto) {
        const unsub = realtimePriceStream.subscribe(p.symbol, (tick: RealtimePriceTick) => {
          setLivePrices((prev) => ({ ...prev, [p.symbol]: tick.price }));
        });
        unsubscribers.push(unsub);
      }
    });

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [positions]);

  const handleClose = async (posId: string, symbol: string) => {
    if (!confirm(`¿Confirmás el cierre a precio de mercado de la posición en ${symbol}?`)) {
      return;
    }
    setClosingId(posId);
    await closePosition(posId);
    setClosingId(null);
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
              Cartera Abierta
            </span>
          </div>
          <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
            Posiciones en Curso ({positions.length})
          </h3>
        </div>
      </div>

      {positions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm font-semibold text-[#0b1727]">No tenés posiciones abiertas actualmente.</p>
          <p className="mt-1 text-xs text-[#64748b]">
            Utilizá el terminal de órdenes para ingresar al mercado.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb] text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b]">
                <th className="py-3 px-3">Activo</th>
                <th className="py-3 px-3">Lado</th>
                <th className="py-3 px-3">Cantidad</th>
                <th className="py-3 px-3">Precio Entrada</th>
                <th className="py-3 px-3">Precio Actual</th>
                <th className="py-3 px-3">Liq. Estimada</th>
                <th className="py-3 px-3">Margen</th>
                <th className="py-3 px-3 text-right">PnL Flotante</th>
                <th className="py-3 px-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {positions.map((pos) => {
                const currentPrice = livePrices[pos.symbol] ?? pos.current_price;
                const priceDiff =
                  pos.side === "LONG"
                    ? currentPrice - pos.entry_price
                    : pos.entry_price - currentPrice;
                const unrealizedPnl =
                  livePrices[pos.symbol] !== undefined
                    ? priceDiff * pos.quantity
                    : pos.unrealized_pnl;
                const isProfitable = unrealizedPnl >= 0;
                const pnlPct =
                  pos.initial_margin > 0
                    ? (unrealizedPnl / pos.initial_margin) * 100
                    : 0;

                return (
                  <tr key={pos.id} className="hover:bg-[#fafaf9] transition">
                    <td className="py-3.5 px-3 font-bold text-[#0b1727]">
                      <div className="flex items-center gap-1.5">
                        <span>{pos.symbol}</span>
                        <span className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[9px] font-mono text-[#64748b]">
                          {pos.leverage}x
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          pos.side === "LONG"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#334155]">
                      {pos.quantity}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#334155]">
                      ${pos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0b1727]">
                      <div className="flex items-center gap-1">
                        <span>${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        {livePrices[pos.symbol] !== undefined && (
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" title="Precio en vivo 1s" />
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-red-600">
                      {pos.liquidation_price > 0
                        ? `$${pos.liquidation_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : "N/A"}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[#64748b]">
                      ${pos.initial_margin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div
                        className={`font-mono font-bold ${
                          isProfitable ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {isProfitable ? "+" : ""}
                        ${unrealizedPnl.toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] font-mono ${
                          isProfitable ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        ({isProfitable ? "+" : ""}
                        {pnlPct.toFixed(2)}%)
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleClose(pos.id, pos.symbol)}
                        disabled={isActionLoading || closingId === pos.id}
                        className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-600 hover:text-white transition disabled:opacity-50"
                      >
                        {closingId === pos.id ? "Cerrando..." : "Cerrar Mercado"}
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
