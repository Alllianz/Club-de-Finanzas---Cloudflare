"use client";

import React, { useState, useEffect } from "react";
import { useGroupTrading } from "@/app/miembros/context/GroupTradingContext";
import { fetchQuote } from "@/app/miembros/services/paperApi";
import { LiveMarketQuote } from "@/app/miembros/types/paper-trading";
import { FUTURES_CONTRACTS, FutureContractDef } from "../constants/contracts";

interface FuturosOrderCardProps {
  selectedContract: FutureContractDef;
}

export const FuturosOrderCard: React.FC<FuturosOrderCardProps> = ({ selectedContract }) => {
  const { currentGroup, portfolio, placeOrder, isActionLoading, errorMessage } = useGroupTrading();

  const [quote, setQuote] = useState<LiveMarketQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(true);
  const [positionSide, setPositionSide] = useState<"LONG" | "SHORT">("LONG");
  const [leverage, setLeverage] = useState<number>(5);
  const [quantity, setQuantity] = useState<number>(1);
  const [sizingMode, setSizingMode] = useState<"CONTRACTS" | "USD">("USD");
  const [amountUsd, setAmountUsd] = useState<string>("1000");
  const [marginMode, setMarginMode] = useState<"ISOLATED" | "CROSS">("ISOLATED");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cargar cotización en vivo del contrato
  useEffect(() => {
    let isMounted = true;
    setQuoteLoading(true);

    const loadQuote = async () => {
      try {
        const q = await fetchQuote(selectedContract.symbol);
        if (isMounted) {
          setQuote(q);
          setQuoteLoading(false);
        }
      } catch {
        if (isMounted) setQuoteLoading(false);
      }
    };

    loadQuote();
    const interval = setInterval(loadQuote, 10000); // Consulta sincronizada a 10 segundos
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedContract.symbol]);

  // Asegurar que el apalancamiento no exceda el máximo del contrato
  useEffect(() => {
    if (leverage > selectedContract.maxLeverage) {
      setLeverage(selectedContract.maxLeverage);
    }
  }, [selectedContract, leverage]);

  // Cálculos Cuantitativos de Derivados (Sin Look-Ahead Bias)
  const currentPrice = quote?.price || 0;
  const multiplier = selectedContract.multiplier || 1;
  const contractUnitValue = currentPrice * multiplier;

  // Sincronización de cantidad y monto en dólares
  const handleAmountUsdChange = (valStr: string) => {
    setAmountUsd(valStr);
    const valNum = parseFloat(valStr) || 0;
    if (contractUnitValue > 0 && valNum > 0) {
      const calculatedQty = valNum / contractUnitValue;
      setQuantity(Number(calculatedQty.toFixed(4)));
    } else if (!valStr) {
      setQuantity(0);
    }
  };

  const handleQuantityChange = (val: number) => {
    setQuantity(val);
    if (contractUnitValue > 0 && val > 0) {
      setAmountUsd((val * contractUnitValue).toFixed(2));
    }
  };

  const effectiveQty = sizingMode === "USD" && contractUnitValue > 0 && parseFloat(amountUsd) > 0
    ? parseFloat(amountUsd) / contractUnitValue
    : quantity;

  const rawNotional = currentPrice * effectiveQty * multiplier;
  const initialMarginRequired = rawNotional > 0 ? rawNotional / leverage : 0;
  const feeEstimated = Math.max(1.25, (rawNotional * 0.0002)); // 2 bps con piso de $1.25
  const totalCashRequired = initialMarginRequired + feeEstimated;

  // Precio de liquidación estimado según margen de mantenimiento
  const mmr = selectedContract.maintenanceMarginPct || 0.05;
  const liquidationPrice =
    currentPrice > 0 && leverage > 1
      ? positionSide === "LONG"
        ? Math.max(0, currentPrice * (1.0 - 1.0 / leverage + mmr))
        : currentPrice * (1.0 + 1.0 / leverage - mmr)
      : positionSide === "LONG"
      ? 0
      : currentPrice * 2;

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (!currentGroup) {
      setFeedbackMsg({
        type: "error",
        text: "Debe iniciar sesión de grupo institucional para operar.",
      });
      return;
    }

    const finalQuantity = effectiveQty;

    if (finalQuantity <= 0) {
      setFeedbackMsg({
        type: "error",
        text: "La cantidad o el monto en dólares a invertir debe ser mayor a cero.",
      });
      return;
    }

    if (portfolio && portfolio.cash_balance < totalCashRequired) {
      setFeedbackMsg({
        type: "error",
        text: `Saldo insuficiente: se requieren $${totalCashRequired.toFixed(2)} USD y el grupo tiene $${portfolio.cash_balance.toFixed(2)} USD.`,
      });
      return;
    }

    const res = await placeOrder(
      selectedContract.symbol,
      positionSide,
      finalQuantity,
      leverage,
      marginMode
    );

    if (res.success) {
      setFeedbackMsg({
        type: "success",
        text: `Orden ${positionSide} de ${quantity} contrato(s) en ${selectedContract.symbol} ejecutada exitosamente.`,
      });
    } else {
      setFeedbackMsg({
        type: "error",
        text: res.error || errorMessage || "No se pudo ejecutar la orden.",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0062ff]">
            Terminal de Derivados
          </span>
          <h2 className="font-serif text-xl font-bold text-[#0b1727]">
            Nueva Orden de Futuros
          </h2>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-[#64748b]">Precio Mark</span>
          <div className="font-mono text-lg font-bold text-[#0b1727]">
            {quoteLoading ? (
              <span className="animate-pulse text-xs text-[#94a3b8]">Consultando...</span>
            ) : (
              `$${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            )}
          </div>
          {quote && (
            <span
              className={`text-[10px] font-bold ${
                quote.change_24h_pct >= 0 ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {quote.change_24h_pct >= 0 ? "+" : ""}
              {quote.change_24h_pct.toFixed(2)}% (24h)
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleOrderSubmit} className="mt-5 space-y-5">
        {/* Selector Dirección: LONG vs SHORT */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
            Dirección del Trade
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPositionSide("LONG")}
              className={`rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                positionSide === "LONG"
                  ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              ▲ Long / Compra
            </button>
            <button
              type="button"
              onClick={() => setPositionSide("SHORT")}
              className={`rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                positionSide === "SHORT"
                  ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-500"
                  : "border border-[#e2e8f0] bg-white text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              ▼ Short / Venta
            </button>
          </div>
        </div>

        {/* Selector de Modo de Margen (Aislado vs Cruzado) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Modo de Margen
            </label>
            <span className="text-[10px] font-mono text-[#64748b]">
              {marginMode === "ISOLATED" ? "Riesgo Acotado a Posición" : "Colateral Compartido de Cuenta"}
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMarginMode("ISOLATED")}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center ${
                marginMode === "ISOLATED"
                  ? "bg-[#0b1727] text-white shadow-sm ring-2 ring-[#0062ff]"
                  : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]"
              }`}
            >
              <span>Aislado (ISOLATED)</span>
              <span className="text-[9px] opacity-80 font-normal">Margen independiente</span>
            </button>
            <button
              type="button"
              onClick={() => setMarginMode("CROSS")}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition-all flex flex-col items-center justify-center ${
                marginMode === "CROSS"
                  ? "bg-[#0b1727] text-white shadow-sm ring-2 ring-[#0062ff]"
                  : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]"
              }`}
            >
              <span>Cruzado (CROSS)</span>
              <span className="text-[9px] opacity-80 font-normal">Respaldo saldo total</span>
            </button>
          </div>
        </div>

        {/* Modalidad de Inversión: Por Dólares ($ USD) vs Por Cantidad de Contratos */}
        <div className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Modalidad de Inversión
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white text-[#0062ff] border-blue-200">
              {sizingMode === "USD" ? "💵 Selección en Dólares ($ USD)" : "📊 Selección en Contratos"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSizingMode("USD");
                if (contractUnitValue > 0 && quantity > 0) {
                  setAmountUsd((quantity * contractUnitValue).toFixed(2));
                }
              }}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                sizingMode === "USD"
                  ? "bg-[#0062ff] text-white shadow-xs"
                  : "bg-white border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9]"
              }`}
            >
              <span>💵 Invertir en Dólares ($ USD)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSizingMode("CONTRACTS");
                if (contractUnitValue > 0 && parseFloat(amountUsd) > 0) {
                  setQuantity(Math.max(1, Math.round(parseFloat(amountUsd) / contractUnitValue)));
                }
              }}
              className={`rounded-xl py-2 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                sizingMode === "CONTRACTS"
                  ? "bg-[#0b1727] text-white shadow-xs"
                  : "bg-white border border-[#cbd5e1] text-[#475569] hover:bg-[#f1f5f9]"
              }`}
            >
              <span>📊 Contratos</span>
            </button>
          </div>

          {sizingMode === "USD" ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0b1727]">
                  Monto a Invertir en Futuros ($ USD)
                </label>
                {contractUnitValue > 0 && (
                  <span className="text-[10px] font-mono text-[#64748b]">
                    1 contrato = ${contractUnitValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[#64748b] text-base">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={amountUsd}
                  onChange={(e) => handleAmountUsdChange(e.target.value)}
                  placeholder="ej: 1000.00"
                  className="w-full rounded-xl border border-[#93c5fd] bg-white pl-8 pr-4 py-2.5 font-mono text-base font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff]"
                />
              </div>

              {/* Botones de Porcentaje del Saldo */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#64748b]">
                  Del Saldo:
                </span>
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => {
                      const avail = portfolio?.cash_balance ?? 10000;
                      const val = avail * ratio;
                      handleAmountUsdChange(val >= 1 ? val.toFixed(2) : val.toFixed(4));
                    }}
                    className="flex-1 rounded border border-blue-200 bg-white py-1 text-[10px] font-bold text-[#0062ff] hover:bg-blue-50 transition"
                  >
                    {ratio === 1.0 ? "100% Máx" : `${ratio * 100}%`}
                  </button>
                ))}
              </div>

              {/* Contratos equivalentes */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-xs text-[#0062ff] flex items-center justify-between">
                <span>Contratos Calculados:</span>
                <span className="font-mono font-bold">
                  {effectiveQty.toFixed(4)} contratos de {selectedContract.symbol}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#0b1727]">
                  Cantidad de Contratos
                </label>
                <span className="text-[10px] text-[#64748b]">
                  1 contrato = {selectedContract.multiplier} {selectedContract.category === "FX" ? "USD" : "unidades"}
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={100}
                step={1}
                value={quantity}
                onChange={(e) => handleQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 font-mono text-base font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff]"
              />

              <div className="rounded-lg bg-slate-100 border border-slate-200 p-2 text-xs text-[#475569] flex items-center justify-between">
                <span>Inversión Nocional Equivalente:</span>
                <span className="font-mono font-bold text-[#0b1727]">
                  ${rawNotional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Selector de Apalancamiento y Margen (hasta 100x) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Apalancamiento: <span className="font-mono text-[#0062ff] font-bold">{leverage}x</span>
            </label>
            <span className="text-[10px] text-[#94a3b8]">
              {leverage >= 50 ? (
                <span className="font-bold text-amber-600">Alto Apalancamiento</span>
              ) : (
                `Máx: ${selectedContract.maxLeverage}x`
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[1, 5, 10, 20, 50, 100]
              .filter((val) => val <= selectedContract.maxLeverage)
              .map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLeverage(val)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    leverage === val
                      ? "bg-[#0b1727] text-white shadow-sm ring-1 ring-[#0062ff]"
                      : "border border-[#e2e8f0] bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {val}x
                </button>
              ))}
          </div>
          <input
            type="range"
            min={1}
            max={selectedContract.maxLeverage}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-[#0062ff]"
          />
        </div>

        {/* Desglose Cuantitativo y Márgenes */}
        <div className="space-y-2 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-xs">
          <div className="flex justify-between text-[#64748b]">
            <span>Valor Nocional del Contrato:</span>
            <span className="font-mono font-bold text-[#0b1727]">
              ${rawNotional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>

          <div className="flex justify-between text-[#64748b]">
            <span>Margen Inicial Requerido ({leverage}x):</span>
            <span className="font-mono font-bold text-[#0062ff]">
              ${initialMarginRequired.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>

          <div className="flex justify-between text-[#64748b]">
            <span>Comisión de Derivados (2 bps):</span>
            <span className="font-mono text-[#475569]">
              ${feeEstimated.toFixed(2)} USD
            </span>
          </div>

          <div className="flex justify-between text-[#64748b] border-t border-[#e2e8f0] pt-2">
            <span>Precio de Liquidación Estimado:</span>
            <span className="font-mono font-bold text-rose-600">
              ${liquidationPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between text-[#0b1727] font-bold border-t border-[#e2e8f0] pt-2">
            <span>Total Débito de Liquidez:</span>
            <span className="font-mono">
              ${totalCashRequired.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </span>
          </div>
        </div>

        {/* Notificaciones de Feedback */}
        {feedbackMsg && (
          <div
            className={`rounded-xl p-3 text-xs font-semibold ${
              feedbackMsg.type === "success"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {feedbackMsg.text}
          </div>
        )}

        {/* Botón de Ejecución de Orden */}
        {!currentGroup ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-center">
            <span className="block text-xs font-bold text-amber-900">
              Mesa en Modo Observador
            </span>
            <p className="mt-1 text-[11px] text-amber-700">
              Para enviar órdenes y operar con saldo real de torneo, seleccioná tu cuenta en el panel superior (👑 Allianz o Grupos 1 al 6).
            </p>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isActionLoading || quoteLoading}
            className={`w-full rounded-xl py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition active:scale-[0.99] disabled:opacity-50 ${
              positionSide === "LONG"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {isActionLoading
              ? "Ejecutando en el Motor..."
              : `Confirmar Orden ${positionSide} (${selectedContract.symbol})`}
          </button>
        )}
      </form>
    </div>
  );
};
