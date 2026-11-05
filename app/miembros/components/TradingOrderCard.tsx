"use client";

import React, { useState, useEffect } from "react";
import { POPULAR_TICKERS } from "../constants/groups";
import { fetchQuote } from "../services/paperApi";
import { LiveMarketQuote } from "../types/paper-trading";
import { useGroupTrading } from "../context/GroupTradingContext";

export const TradingOrderCard: React.FC<{ initialSymbol?: string }> = ({
  initialSymbol = "BTC-USD",
}) => {
  const { placeOrder, isActionLoading, portfolio } = useGroupTrading();

  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [positionSide, setPositionSide] = useState<"LONG" | "SHORT">("LONG");
  const [quantity, setQuantity] = useState<string>("0.1");
  const [leverage, setLeverage] = useState<number>(1);
  const [marginMode, setMarginMode] = useState<"ISOLATED" | "CROSS">("ISOLATED");

  const [quote, setQuote] = useState<LiveMarketQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Cargar cotización cuando cambia el símbolo
  useEffect(() => {
    let active = true;
    const loadQuote = async () => {
      if (!symbol.trim()) return;
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const q = await fetchQuote(symbol.trim().toUpperCase());
        if (active) {
          setQuote(q);
          // Ajustar cantidad default inteligente según activo
          if (q.asset_type === "Crypto") {
            if (q.price > 10000) setQuantity("0.05");
            else setQuantity("1.0");
          } else {
            setQuantity("10");
          }
        }
      } catch (err) {
        if (active) {
          setQuoteError(err instanceof Error ? err.message : "Error al obtener cotización.");
          setQuote(null);
        }
      } finally {
        if (active) setQuoteLoading(false);
      }
    };

    loadQuote();
    const interval = setInterval(loadQuote, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [symbol]);

  // Cálculos en tiempo real
  const qtyNum = parseFloat(quantity) || 0;
  const currentPrice = quote?.price || 0;
  const notional = currentPrice * qtyNum;
  const initialMargin = leverage > 0 ? notional / leverage : notional;
  
  // Estimación de comisiones (5 bps Crypto, $0.005/acción Stock mín $1)
  const estFee =
    quote?.asset_type === "Crypto"
      ? (notional * 0.0005)
      : Math.max(1.0, Math.min(qtyNum * 0.005, notional * 0.01));

  // Estimación de precio de liquidación
  let estLiqPrice = 0;
  if (leverage > 1 && currentPrice > 0) {
    const mmr = 0.005;
    if (positionSide === "LONG") {
      estLiqPrice = Math.max(0, currentPrice * (1.0 - 1.0 / leverage + mmr));
    } else {
      estLiqPrice = currentPrice * (1.0 + 1.0 / leverage - mmr);
    }
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (qtyNum <= 0) {
      setOrderFeedback({ type: "error", text: "La cantidad ingresada debe ser mayor a 0." });
      return;
    }

    if (quote?.asset_type === "Stock" && !quote.is_market_open) {
      setOrderFeedback({
        type: "error",
        text: `Mercado bursátil cerrado para ${quote.symbol}. ${quote.status_message}`,
      });
      return;
    }

    const availableCash = portfolio?.cash_balance ?? 10000;
    if (initialMargin + estFee > availableCash) {
      setOrderFeedback({
        type: "error",
        text: `Liquidez insuficiente: Requerís $${(initialMargin + estFee).toFixed(2)} y disponés de $${availableCash.toFixed(2)}.`,
      });
      return;
    }

    const res = await placeOrder(symbol, positionSide, qtyNum, leverage, marginMode);
    if (res.success) {
      setOrderFeedback({
        type: "success",
        text: `¡Orden ejecutada con éxito! Posición ${positionSide} en ${symbol} registrada a $${currentPrice.toFixed(2)}.`,
      });
    } else {
      setOrderFeedback({
        type: "error",
        text: res.error || "No se pudo procesar la orden.",
      });
    }
  };

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="border-b border-[#f1f5f9] pb-4">
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-4 bg-[#b89047]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
            Terminal de Órdenes
          </span>
        </div>
        <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
          Nueva Posición Apalancada
        </h3>
        <p className="mt-1 text-xs text-[#64748b]">
          Operaciones de mercado a precio spot real sin Look-Ahead Bias.
        </p>
      </div>

      {orderFeedback && (
        <div
          className={`my-4 rounded-lg border p-3.5 text-xs font-semibold ${
            orderFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {orderFeedback.text}
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="mt-4 space-y-4">
        {/* Selector de Símbolo Rápido */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Activo Financiero (Ticker)
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {POPULAR_TICKERS.map((t) => (
              <button
                key={t.symbol}
                type="button"
                onClick={() => setSymbol(t.symbol)}
                className={`rounded-md border px-2.5 py-1 text-xs font-mono font-bold transition ${
                  symbol.toUpperCase() === t.symbol
                    ? "border-[#0b1727] bg-[#0b1727] text-white"
                    : "border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
                }`}
              >
                {t.symbol}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="O ingresá un ticker personalizado (ej. NVDA, TSLA, MSFT)..."
            required
            className="mt-2 w-full rounded-md border border-[#cbd5e1] bg-white px-3.5 py-2 font-mono text-sm text-[#0b1727] placeholder-[#94a3b8] focus:border-[#0b1727] focus:outline-none"
          />
        </div>

        {/* Resumen de Cotización en Vivo */}
        {quoteLoading ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-[#fafaf9] p-3 text-center text-xs text-[#64748b]">
            Consultando cotización de mercado...
          </div>
        ) : quote ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-[#fafaf9] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  {quote.asset_type} · Precio Spot Actual
                </span>
                <p className="font-mono text-xl font-extrabold text-[#0b1727]">
                  ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold ${
                    quote.change_24h_pct >= 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {quote.change_24h_pct >= 0 ? "+" : ""}
                  {quote.change_24h_pct.toFixed(2)}%
                </span>
                <p className="mt-1 text-[10px] text-[#64748b]">
                  {quote.is_market_open ? "● Mercado Abierto" : "○ Mercado Cerrado"}
                </p>
              </div>
            </div>
          </div>
        ) : quoteError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
            {quoteError}
          </div>
        ) : null}

        {/* Lado de la Posición: LONG vs SHORT */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Dirección de la Operación
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPositionSide("LONG")}
              className={`rounded-lg border py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                positionSide === "LONG"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                  : "border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
              }`}
            >
              <span>▲ LONG (Alza / Compra)</span>
            </button>
            <button
              type="button"
              onClick={() => setPositionSide("SHORT")}
              className={`rounded-lg border py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                positionSide === "SHORT"
                  ? "border-red-600 bg-red-600 text-white shadow-xs"
                  : "border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
              }`}
            >
              <span>▼ SHORT (Baja / Venta en Corto)</span>
            </button>
          </div>
        </div>

        {/* Cantidad & Modo de Margen */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
              Cantidad (Unidades)
            </label>
            <input
              type="number"
              step="any"
              min="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-white px-3.5 py-2 font-mono text-sm text-[#0b1727] focus:border-[#0b1727] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
              Modo de Margen
            </label>
            <select
              value={marginMode}
              onChange={(e) => setMarginMode(e.target.value as "ISOLATED" | "CROSS")}
              className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#0b1727] focus:border-[#0b1727] focus:outline-none"
            >
              <option value="ISOLATED">ISOLATED (Aislado)</option>
              <option value="CROSS">CROSS (Cruzado)</option>
            </select>
          </div>
        </div>

        {/* Selector de Apalancamiento (1x a 10x) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
              Apalancamiento Regulado
            </label>
            <span className="font-mono text-xs font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {leverage}x
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-[#0b1727]"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#64748b]">
            <span>1x (Spot)</span>
            <span>2x</span>
            <span>5x</span>
            <span>10x (Máx)</span>
          </div>
        </div>

        {/* Desglose Cuantitativo de la Orden */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-[#64748b]">
            <span>Valor Nocional Total:</span>
            <span className="font-mono font-bold text-[#0b1727]">
              ${notional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>Margen Requerido ({leverage}x):</span>
            <span className="font-mono font-bold text-[#0b1727]">
              ${initialMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>Comisión Estimada:</span>
            <span className="font-mono font-bold text-[#0b1727]">
              ${estFee.toFixed(2)}
            </span>
          </div>
          {leverage > 1 && (
            <div className="flex justify-between border-t border-[#e2e8f0] pt-2 text-red-600">
              <span>Precio de Liquidación Est.:</span>
              <span className="font-mono font-bold">
                ${estLiqPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>

        {/* Botón de Envío de Orden */}
        <button
          type="submit"
          disabled={isActionLoading || quoteLoading || !quote}
          className={`w-full rounded-md py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition disabled:opacity-50 ${
            positionSide === "LONG"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isActionLoading
            ? "Ejecutando en el Mercado..."
            : `Abrir Posición ${positionSide} (${leverage}x) →`}
        </button>
      </form>
    </div>
  );
};
