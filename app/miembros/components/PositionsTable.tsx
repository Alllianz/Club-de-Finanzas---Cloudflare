"use client";

import React, { useState, useEffect } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { OpenPosition } from "../types/paper-trading";
import { realtimePriceStream, RealtimePriceTick } from "../services/realtimePriceStream";
import { checkTournamentDateRange } from "../utils/tournament-dates";

export const PositionsTable: React.FC = () => {
  const { positions, closePosition, updatePositionTpSl, isActionLoading, tournament } = useGroupTrading();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  const [tpSlModalPos, setTpSlModalPos] = useState<OpenPosition | null>(null);
  const [tpInput, setTpInput] = useState<string>("");
  const [slInput, setSlInput] = useState<string>("");
  const [tpSlError, setTpSlError] = useState<string | null>(null);
  const [isSavingTpSl, setIsSavingTpSl] = useState<boolean>(false);

  const dateStatus = checkTournamentDateRange(tournament);

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
    if (!dateStatus.allowed) {
      alert(dateStatus.reason || "Operación rechazada: el torneo no se encuentra en período operativo habilitado.");
      return;
    }
    if (!confirm(`¿Confirmás el cierre total a precio de mercado de la posición en ${symbol}?`)) {
      return;
    }
    setClosingId(posId);
    await closePosition(posId);
    setClosingId(null);
  };

  const handlePartialClose = async (posId: string, symbol: string, currentQty: number) => {
    if (!dateStatus.allowed) {
      alert(dateStatus.reason || "Operación rechazada: el torneo no se encuentra en período operativo habilitado.");
      return;
    }
    const defaultQty = (currentQty / 2);
    const formattedDefault = defaultQty >= 1 ? defaultQty.toFixed(2) : defaultQty.toFixed(4);
    const input = prompt(
      `Ingresá la cantidad a vender de ${symbol} (Tenencia actual: ${currentQty}):`,
      formattedDefault
    );
    if (!input) return;
    const qty = parseFloat(input);
    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad ingresada debe ser mayor a 0.");
      return;
    }
    if (qty > currentQty) {
      alert(`La cantidad a cerrar (${qty}) no puede superar tu tenencia actual (${currentQty}).`);
      return;
    }
    setClosingId(posId);
    await closePosition(posId, qty);
    setClosingId(null);
  };

  const handleOpenTpSlModal = (pos: OpenPosition) => {
    setTpSlModalPos(pos);
    setTpInput(pos.take_profit ? String(pos.take_profit) : "");
    setSlInput(pos.stop_loss ? String(pos.stop_loss) : "");
    setTpSlError(null);
  };

  const handleCloseTpSlModal = () => {
    setTpSlModalPos(null);
    setTpInput("");
    setSlInput("");
    setTpSlError(null);
  };

  const handleSaveTpSl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpSlModalPos) return;

    const currentPrice = livePrices[tpSlModalPos.symbol] ?? tpSlModalPos.current_price ?? tpSlModalPos.entry_price;
    const tpNum = tpInput.trim() !== "" ? parseFloat(tpInput) : null;
    const slNum = slInput.trim() !== "" ? parseFloat(slInput) : null;

    if (tpInput.trim() !== "" && (tpNum === null || isNaN(tpNum) || tpNum <= 0)) {
      setTpSlError("El precio de Take Profit debe ser un número válido mayor a 0.");
      return;
    }
    if (slInput.trim() !== "" && (slNum === null || isNaN(slNum) || slNum <= 0)) {
      setTpSlError("El precio de Stop Loss debe ser un número válido mayor a 0.");
      return;
    }

    if (tpSlModalPos.side === "LONG") {
      if (tpNum !== null && tpNum <= currentPrice) {
        setTpSlError(`Para posición LONG, el Take Profit ($${tpNum.toFixed(2)}) debe ser mayor al precio actual ($${currentPrice.toFixed(2)}).`);
        return;
      }
      if (slNum !== null && slNum >= currentPrice) {
        setTpSlError(`Para posición LONG, el Stop Loss ($${slNum.toFixed(2)}) debe ser menor al precio actual ($${currentPrice.toFixed(2)}).`);
        return;
      }
    } else {
      if (tpNum !== null && tpNum >= currentPrice) {
        setTpSlError(`Para posición SHORT, el Take Profit ($${tpNum.toFixed(2)}) debe ser menor al precio actual ($${currentPrice.toFixed(2)}).`);
        return;
      }
      if (slNum !== null && slNum <= currentPrice) {
        setTpSlError(`Para posición SHORT, el Stop Loss ($${slNum.toFixed(2)}) debe ser mayor al precio actual ($${currentPrice.toFixed(2)}).`);
        return;
      }
    }

    setIsSavingTpSl(true);
    setTpSlError(null);
    const res = await updatePositionTpSl(tpSlModalPos.id, tpNum, slNum);
    setIsSavingTpSl(false);

    if (res.success) {
      handleCloseTpSlModal();
    } else {
      setTpSlError(res.error || "Error al actualizar TP/SL.");
    }
  };

  const handleClearTpSl = async () => {
    if (!tpSlModalPos) return;
    setIsSavingTpSl(true);
    setTpSlError(null);
    const res = await updatePositionTpSl(tpSlModalPos.id, null, null);
    setIsSavingTpSl(false);

    if (res.success) {
      handleCloseTpSlModal();
    } else {
      setTpSlError(res.error || "Error al eliminar TP/SL.");
    }
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#0b1727]">
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
                <th className="py-3 px-3">TP / SL</th>
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
                        <span
                          className={`rounded px-1.5 py-0.5 text-[8px] font-mono font-bold ${
                            pos.margin_mode === "CROSS"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                        >
                          {pos.margin_mode || "ISOLATED"}
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
                    <td className="py-3.5 px-3 font-mono">
                      {pos.take_profit || pos.stop_loss ? (
                        <div className="flex flex-col gap-0.5">
                          {pos.take_profit ? (
                            <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                              <span className="text-[9px] uppercase px-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">TP</span>
                              ${pos.take_profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : null}
                          {pos.stop_loss ? (
                            <span className="text-rose-600 font-bold text-[11px] flex items-center gap-1">
                              <span className="text-[9px] uppercase px-1 rounded bg-rose-50 border border-rose-200 text-rose-700">SL</span>
                              ${pos.stop_loss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[#94a3b8] font-bold">--</span>
                      )}
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenTpSlModal(pos)}
                          disabled={isActionLoading || closingId === pos.id || !dateStatus.allowed}
                          title={!dateStatus.allowed ? dateStatus.reason : "Configurar / Editar Take Profit y Stop Loss"}
                          className={`rounded border px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                            !dateStatus.allowed
                              ? "border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
                              : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white"
                          }`}
                        >
                          TP/SL
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClose(pos.id, pos.symbol)}
                          disabled={isActionLoading || closingId === pos.id || !dateStatus.allowed}
                          title={!dateStatus.allowed ? dateStatus.reason : "Cerrar el 100% de la posición"}
                          className={`rounded border px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                            !dateStatus.allowed
                              ? "border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
                              : "border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white"
                          }`}
                        >
                          {!dateStatus.allowed
                            ? "Bloqueado"
                            : closingId === pos.id
                            ? "Cerrando..."
                            : "Cerrar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePartialClose(pos.id, pos.symbol, pos.quantity)}
                          disabled={isActionLoading || closingId === pos.id || !dateStatus.allowed}
                          title={!dateStatus.allowed ? dateStatus.reason : "Cerrar una porción de la tenencia comprada"}
                          className={`rounded border px-2 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                            !dateStatus.allowed
                              ? "border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed"
                              : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white"
                          }`}
                        >
                          Parcial
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Set / Edit / Clear TP & SL */}
      {tpSlModalPos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a]">
                  Gestión de Riesgo
                </span>
                <h4 className="font-serif text-lg font-bold text-[#0b1727]">
                  Configurar TP / SL ({tpSlModalPos.symbol})
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCloseTpSlModal}
                disabled={isSavingTpSl}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-2.5 text-xs grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[10px] text-[#64748b]">Sentido</span>
                <span className={`font-bold ${tpSlModalPos.side === "LONG" ? "text-emerald-700" : "text-red-700"}`}>
                  {tpSlModalPos.side}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#64748b]">Entrada</span>
                <span className="font-mono font-bold text-[#0b1727]">
                  ${tpSlModalPos.entry_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-[#64748b]">Precio Actual</span>
                <span className="font-mono font-bold text-[#0b1727]">
                  ${(livePrices[tpSlModalPos.symbol] ?? tpSlModalPos.current_price ?? tpSlModalPos.entry_price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {tpSlError && (
              <div className="mt-3 rounded-md bg-red-50 border border-red-200 p-2.5 text-xs text-red-700">
                {tpSlError}
              </div>
            )}

            <form onSubmit={handleSaveTpSl} className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    Take Profit (USD)
                  </label>
                  <span className="text-[10px] font-mono text-[#64748b]">
                    {tpSlModalPos.side === "LONG" ? "> Precio Actual" : "< Precio Actual"}
                  </span>
                </div>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-[#64748b]">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Dejar vacío para desactivar"
                    value={tpInput}
                    onChange={(e) => setTpInput(e.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] pl-7 pr-3 py-2 text-xs font-mono font-medium text-[#0b1727] focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#64748b]">
                  {tpSlModalPos.side === "LONG"
                    ? "Cierre automático al alcanzar este precio superior."
                    : "Cierre automático al alcanzar este precio inferior."}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-700">
                    Stop Loss (USD)
                  </label>
                  <span className="text-[10px] font-mono text-[#64748b]">
                    {tpSlModalPos.side === "LONG" ? "< Precio Actual" : "> Precio Actual"}
                  </span>
                </div>
                <div className="mt-1 relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-[#64748b]">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="Dejar vacío para desactivar"
                    value={slInput}
                    onChange={(e) => setSlInput(e.target.value)}
                    className="w-full rounded-lg border border-[#cbd5e1] pl-7 pr-3 py-2 text-xs font-mono font-medium text-[#0b1727] focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#64748b]">
                  {tpSlModalPos.side === "LONG"
                    ? "Corte de pérdidas automático si el precio cae a este nivel."
                    : "Corte de pérdidas automático si el precio sube a este nivel."}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-[#f1f5f9]">
                {tpSlModalPos.take_profit || tpSlModalPos.stop_loss ? (
                  <button
                    type="button"
                    onClick={handleClearTpSl}
                    disabled={isSavingTpSl}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                  >
                    {isSavingTpSl ? "Borrando..." : "Quitar TP / SL"}
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseTpSlModal}
                    disabled={isSavingTpSl}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingTpSl}
                    className="rounded-lg bg-[#0b1727] px-4 py-2 text-xs font-bold text-white hover:bg-[#1e3a8a] transition disabled:opacity-50"
                  >
                    {isSavingTpSl ? "Guardando..." : "Guardar TP / SL"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
