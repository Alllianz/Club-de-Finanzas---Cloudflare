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
    const interval = setInterval(loadQuote, 5000);
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
  const rawNotional = currentPrice * quantity;
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

    if (quantity <= 0) {
      setFeedbackMsg({
        type: "error",
        text: "La cantidad de contratos debe ser mayor a cero.",
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
      quantity,
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

        {/* Cantidad de Contratos */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Cantidad de Contratos
            </label>
            <span className="text-[10px] text-[#64748b]">
              Multiplicador: 1 contrato = {selectedContract.multiplier} {selectedContract.category === "FX" ? "USD" : "unidades"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
            />
          </div>
        </div>

        {/* Selector de Apalancamiento y Margen */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#475569]">
              Apalancamiento: <span className="font-mono text-[#0062ff]">{leverage}x</span>
            </label>
            <span className="text-[10px] text-[#94a3b8]">
              Máx: {selectedContract.maxLeverage}x
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[1, 2, 5, 10, selectedContract.maxLeverage]
              .filter((val, idx, arr) => arr.indexOf(val) === idx && val <= selectedContract.maxLeverage)
              .map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLeverage(val)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    leverage === val
                      ? "bg-[#0b1727] text-white"
                      : "border border-[#e2e8f0] bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]"
                  }`}
                >
                  {val}x
                </button>
              ))}
          </div>
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
