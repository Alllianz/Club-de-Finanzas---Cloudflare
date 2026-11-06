"use client";

import React, { useState, useEffect, useRef } from "react";
import { POPULAR_TICKERS } from "../constants/groups";
import { useGroupTrading } from "../context/GroupTradingContext";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { checkTournamentDateRange, formatTournamentDate } from "../utils/tournament-dates";

export const TradingOrderCard: React.FC<{
  initialSymbol?: string;
  customTickers?: { symbol: string; label?: string; type?: string }[];
}> = ({
  initialSymbol = "BTC-USD",
  customTickers,
}) => {
  const { placeOrder, isActionLoading, portfolio, positions, pendingOrders, tournament } = useGroupTrading();

  const [symbol, setSymbol] = useState<string>(initialSymbol);

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Tipos de orden y sentido de operación
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("0.1");
  const [leverage, setLeverage] = useState<number>(1);
  const [marginMode, setMarginMode] = useState<"ISOLATED" | "CROSS">("ISOLATED");

  const [orderFeedback, setOrderFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Cotización ultra-rápida y en vivo
  const {
    quote,
    isLoading: quoteLoading,
    isLiveStreaming,
    priceDirection,
    error: quoteError,
  } = useLiveQuote(symbol);

  const isSoloLong = tournament ? !tournament.allowShort : false;

  // Encontrar posición actual comprada para este símbolo
  const currentLongPos = positions.find(
    (p) => p.symbol.toUpperCase() === symbol.toUpperCase() && p.side === "LONG"
  );
  const ownedQty = currentLongPos?.quantity || 0;

  // Unidades comprometidas en órdenes límite de venta pendientes
  const reservedSellQty =
    pendingOrders
      ?.filter(
        (o) =>
          o.symbol.toUpperCase() === symbol.toUpperCase() &&
          o.order_side === "SELL" &&
          o.status === "PENDING"
      )
      .reduce((acc, o) => acc + (o.quantity - o.filled_quantity), 0) || 0;

  const availableToSell = Math.max(0, ownedQty - reservedSellQty);

  // Reglas del torneo sobre apalancamiento
  useEffect(() => {
    if (tournament) {
      if (tournament.maxLeverage && leverage > tournament.maxLeverage) {
        setLeverage(tournament.maxLeverage);
      }
    }
  }, [tournament, leverage]);

  // Si cambia el quote y limitPrice está vacío o el ticker cambió, auto-asignar cantidad inteligente
  const lastNormalizedSymbol = useRef<string>("");
  useEffect(() => {
    if (quote && lastNormalizedSymbol.current !== quote.symbol) {
      lastNormalizedSymbol.current = quote.symbol;
      if (quote.asset_type === "Crypto") {
        if (quote.price > 10000) setQuantity("0.05");
        else setQuantity("1.0");
      } else {
        setQuantity("10");
      }
      if (orderType === "LIMIT" && !limitPrice) {
        setLimitPrice(quote.price.toString());
      }
    }
  }, [quote, orderType, limitPrice]);

  // Cálculos en tiempo real
  const qtyNum = parseFloat(quantity) || 0;
  const currentPrice = quote?.price || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "LIMIT" && limitPriceNum > 0 ? limitPriceNum : currentPrice;
  const notional = effectivePrice * qtyNum;
  const initialMargin = leverage > 0 ? notional / leverage : notional;

  // Estimación de comisiones (5 bps Crypto, $0.005/acción Stock mín $1)
  const estFee =
    quote?.asset_type === "Crypto"
      ? notional * 0.0005
      : Math.max(1.0, Math.min(qtyNum * 0.005, notional * 0.01));

  // Estimación de precio de liquidación
  let estLiqPrice = 0;
  if (leverage > 1 && effectivePrice > 0) {
    const mmr = 0.005;
    if (orderSide === "BUY" || isSoloLong) {
      estLiqPrice = Math.max(0, effectivePrice * (1.0 - 1.0 / leverage + mmr));
    } else {
      estLiqPrice = effectivePrice * (1.0 + 1.0 / leverage - mmr);
    }
  }

  // Verificación de ventana temporal del torneo (Zero Look-Ahead Bias)
  const dateStatus = checkTournamentDateRange(tournament);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    if (!dateStatus.allowed) {
      setOrderFeedback({
        type: "error",
        text: dateStatus.reason || "Operación rechazada: el torneo no se encuentra en período operativo habilitado.",
      });
      return;
    }

    if (qtyNum <= 0) {
      setOrderFeedback({ type: "error", text: "La cantidad ingresada debe ser mayor a 0." });
      return;
    }

    if (orderType === "LIMIT" && (!limitPriceNum || limitPriceNum <= 0)) {
      setOrderFeedback({ type: "error", text: "Debés ingresar un precio límite válido mayor a 0." });
      return;
    }

    if (quote?.asset_type === "Stock" && !quote.is_market_open) {
      setOrderFeedback({
        type: "error",
        text: `Mercado bursátil cerrado para ${quote.symbol}. ${quote.status_message}`,
      });
      return;
    }

    // Regla Solo Long para órdenes de venta
    if (isSoloLong && orderSide === "SELL") {
      if (ownedQty <= 0) {
        setOrderFeedback({
          type: "error",
          text: `En modo Solo Long no podés vender ${symbol} porque tu tenencia actual es de 0 unidades. Debés comprar primero.`,
        });
        return;
      }

      if (qtyNum > availableToSell + 1e-9) {
        setOrderFeedback({
          type: "error",
          text: `La cantidad a vender (${qtyNum}) excede tu tenencia disponible (${availableToSell.toFixed(4)} ${symbol}${reservedSellQty > 0 ? ` [${reservedSellQty.toFixed(4)} reservadas en órdenes pendientes]` : ""}).`,
        });
        return;
      }
    }

    // Para compras: validar efectivo disponible
    if (orderSide === "BUY") {
      const availableCash = portfolio?.cash_balance ?? 10000;
      if (initialMargin + estFee > availableCash) {
        setOrderFeedback({
          type: "error",
          text: `Liquidez insuficiente: Requerís $${(initialMargin + estFee).toFixed(2)} y disponés de $${availableCash.toFixed(2)}.`,
        });
        return;
      }
    }

    const res = await placeOrder(
      symbol,
      orderSide,
      qtyNum,
      leverage,
      marginMode,
      orderType,
      orderType === "LIMIT" ? limitPriceNum : undefined
    );

    if (res.success) {
      setOrderFeedback({
        type: "success",
        text: res.message || `¡Orden ${orderType} ${orderSide} procesada con éxito para ${symbol}!`,
      });
    } else {
      setOrderFeedback({
        type: "error",
        text: res.error || "No se pudo procesar la orden.",
      });
    }
  };

  const maxAllowedLeverage = tournament?.maxLeverage || (customTickers ? 100 : 10);
  const availableTickers = customTickers || POPULAR_TICKERS;

  const isSellDisabledInSoloLong = isSoloLong && orderSide === "SELL" && availableToSell <= 0;

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
      <div className="border-b border-[#f1f5f9] pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-[2px] w-4 bg-[#b89047]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
            Terminal de Órdenes
          </span>
          {isSoloLong && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
              🔒 Modo Solo Long
            </span>
          )}
          {tournament && tournament.rebalanceDay && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300">
              📅 Rebalanceo: {tournament.rebalanceDay === "WED" ? "Miércoles" : tournament.rebalanceDay === "MON" ? "Lunes" : tournament.rebalanceDay === "FRI" ? "Viernes" : tournament.rebalanceDay}
            </span>
          )}
          {tournament && tournament.tradingStartTime && tournament.tradingEndTime && (
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-300">
              ⏰ {tournament.tradingStartTime} - {tournament.tradingEndTime} hs
            </span>
          )}
          {tournament && (tournament.startDate || tournament.endDate) && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                dateStatus.status === "SCHEDULED"
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : dateStatus.status === "CONCLUDED"
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
            >
              {dateStatus.status === "SCHEDULED"
                ? `⏳ Inicia: ${formatTournamentDate(tournament.startDate) || tournament.startDate}`
                : dateStatus.status === "CONCLUDED"
                ? `🛑 Concluido: ${formatTournamentDate(tournament.endDate) || tournament.endDate}`
                : `🟢 Vigencia: ${tournament.startDate ? formatTournamentDate(tournament.startDate) : "Inicio"} - ${tournament.endDate ? formatTournamentDate(tournament.endDate) : "Sin fin"}`}
            </span>
          )}
        </div>
        <h3 className="mt-1 font-serif text-xl font-bold text-[#0b1727]">
          Nueva Posición {orderType === "LIMIT" ? "Límite" : "de Mercado"}
        </h3>
        <p className="mt-1 text-xs text-[#64748b]">
          {orderType === "LIMIT"
            ? "Orden condicional con ejecución automática al tocar el precio objetivo sin Look-Ahead Bias."
            : "Ejecución instantánea al mejor precio disponible en el libro spot."}
        </p>
      </div>

      {/* Cartel de Bloqueo por Fechas Fuera de Rango */}
      {!dateStatus.allowed && (
        <div
          className={`my-4 rounded-xl border p-4 text-xs shadow-xs ${
            dateStatus.status === "SCHEDULED"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-red-300 bg-red-50 text-red-950"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {dateStatus.status === "SCHEDULED" ? "⏳" : "🛑"}
            </span>
            <div className="space-y-1">
              <h4 className="font-bold uppercase tracking-wide text-[11px]">
                {dateStatus.status === "SCHEDULED"
                  ? "Torneo Programado - Período Operativo No Iniciado"
                  : "Torneo Finalizado - Operaciones Inhabilitadas"}
              </h4>
              <p className="font-medium">{dateStatus.reason}</p>
              <p className="text-[10px] font-mono opacity-80">
                Gobernanza institucional: las órdenes de compra y venta se encuentran bloqueadas fuera de la ventana oficial.
              </p>
            </div>
          </div>
        </div>
      )}

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
        {/* Selector de Tipo de Orden: MERCADO vs LÍMITE */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Tipo de Orden
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderType("MARKET")}
              className={`rounded-lg py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                orderType === "MARKET"
                  ? "bg-[#0b1727] text-white shadow-xs ring-1 ring-[#0b1727]"
                  : "border border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
              }`}
            >
              <span>⚡ Mercado (Spot)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderType("LIMIT");
                if (!limitPrice && quote) {
                  setLimitPrice(quote.price.toString());
                }
              }}
              className={`rounded-lg py-2.5 px-3 text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                orderType === "LIMIT"
                  ? "bg-[#1e3a8a] text-white shadow-xs ring-1 ring-[#1e3a8a]"
                  : "border border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
              }`}
            >
              <span>🎯 Orden Límite</span>
            </button>
          </div>
        </div>

        {/* Selector de Símbolo Rápido */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Activo Financiero (Ticker)
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {availableTickers.map((t) => (
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
        {quoteLoading && !quote ? (
          <div className="rounded-lg border border-[#e5e7eb] bg-[#fafaf9] p-3 text-center text-xs text-[#64748b]">
            Consultando cotización de mercado...
          </div>
        ) : quote ? (
          <div
            className={`rounded-lg border p-3.5 transition-all duration-300 ${
              priceDirection === "up"
                ? "border-emerald-500 bg-emerald-50/80 shadow-xs"
                : priceDirection === "down"
                ? "border-red-500 bg-red-50/80 shadow-xs"
                : "border-[#e5e7eb] bg-[#fafaf9]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    {quote.asset_type} · Precio Spot Actual
                  </span>
                  {isLiveStreaming ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                      Stream 1s
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700 border border-slate-200">
                      Edge Cache
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p
                    className={`font-mono text-xl font-extrabold transition-colors duration-200 ${
                      priceDirection === "up"
                        ? "text-emerald-700 font-black"
                        : priceDirection === "down"
                        ? "text-red-700 font-black"
                        : "text-[#0b1727]"
                    }`}
                  >
                    ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </p>
                  {priceDirection === "up" && (
                    <span className="text-emerald-600 font-bold text-xs animate-bounce">▲</span>
                  )}
                  {priceDirection === "down" && (
                    <span className="text-red-600 font-bold text-xs animate-bounce">▼</span>
                  )}
                </div>
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

        {/* Sentido de la Operación: COMPRA vs VENTA */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Sentido de la Operación
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderSide("BUY")}
              className={`rounded-lg border py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                orderSide === "BUY"
                  ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                  : "border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
              }`}
            >
              <span>▲ COMPRA {isSoloLong ? "(Long)" : ""}</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderSide("SELL")}
              className={`rounded-lg border py-2.5 px-4 text-xs font-bold transition flex items-center justify-center gap-2 ${
                orderSide === "SELL"
                  ? "border-red-600 bg-red-600 text-white shadow-xs"
                  : "border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
              }`}
            >
              <span>
                {isSoloLong ? "▼ VENTA (Liquidación)" : "▼ VENTA (Short/Venta)"}
              </span>
            </button>
          </div>
        </div>

        {/* Cartel Informativo y Controles de Venta Parcial para Modo Solo Long */}
        {isSoloLong && orderSide === "SELL" && (
          <div
            className={`rounded-xl border p-3.5 text-xs ${
              ownedQty <= 0
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : "border-blue-200 bg-blue-50/70 text-blue-950"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">
                🔒 Regla Solo Long: Venta de Posición Comprada
              </span>
              <span className="font-mono font-bold">
                Tenencia: {ownedQty.toFixed(4)} {symbol}
              </span>
            </div>

            {ownedQty <= 0 ? (
              <p className="mt-1.5 text-[11px] text-amber-800 leading-relaxed">
                No tenés posiciones compradas en <strong>{symbol}</strong>. En modo Solo Long únicamente podés emitir órdenes de venta si poseés tenencia previa en este activo.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#475569]">
                  <span>Disponible para vender:</span>
                  <span className="font-mono font-bold text-[#0b1727]">
                    {availableToSell.toFixed(4)} {symbol}
                    {reservedSellQty > 0 && (
                      <span className="text-amber-700 ml-1 text-[10px]">
                        ({reservedSellQty.toFixed(4)} en órdenes pendientes)
                      </span>
                    )}
                  </span>
                </div>

                {/* Botones de venta parcial */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-[#64748b]">
                    Venta Parcial:
                  </span>
                  {[0.25, 0.5, 0.75, 1.0].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      disabled={availableToSell <= 0}
                      onClick={() => {
                        const val = availableToSell * ratio;
                        const formatted = val >= 1 ? val.toFixed(2) : val.toFixed(4);
                        setQuantity(formatted);
                      }}
                      className="flex-1 rounded border border-blue-200 bg-white py-1 text-[10px] font-bold text-blue-900 transition hover:bg-blue-100 disabled:opacity-40"
                    >
                      {ratio === 1.0 ? "100% (Total)" : `${ratio * 100}%`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input de Precio Límite (Visible solo si orderType === 'LIMIT') */}
        {orderType === "LIMIT" && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                Precio Límite ($ USD)
              </label>
              {quote && (
                <button
                  type="button"
                  onClick={() => setLimitPrice(quote.price.toString())}
                  className="text-[10px] font-bold text-[#1e3a8a] hover:underline"
                >
                  Usar Spot (${quote.price.toFixed(2)})
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              min="0.0001"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder="Ingresá el precio límite objetivo..."
              required={orderType === "LIMIT"}
              className="w-full rounded-md border border-[#93c5fd] bg-white px-3.5 py-2 font-mono text-sm text-[#0b1727] focus:border-[#1e3a8a] focus:outline-none"
            />
            <p className="text-[11px] font-medium text-[#1e3a8a]">
              {orderSide === "BUY"
                ? `📉 Compra Límite: Se ejecutará automáticamente cuando el mercado caiga a $${limitPriceNum.toFixed(2)} o menos.`
                : `📈 Venta Límite: Se ejecutará automáticamente cuando el mercado suba a $${limitPriceNum.toFixed(2)} o más.`}
            </p>
          </div>
        )}

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
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setMarginMode("ISOLATED")}
                className={`rounded-md py-1.5 px-2 text-[11px] font-bold transition-all flex flex-col items-center justify-center ${
                  marginMode === "ISOLATED"
                    ? "bg-[#0b1727] text-white shadow-sm ring-2 ring-[#1e3a8a]"
                    : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]"
                }`}
              >
                <span>Aislado</span>
                <span className="text-[9px] opacity-75 font-normal">ISOLATED</span>
              </button>
              <button
                type="button"
                onClick={() => setMarginMode("CROSS")}
                className={`rounded-md py-1.5 px-2 text-[11px] font-bold transition-all flex flex-col items-center justify-center ${
                  marginMode === "CROSS"
                    ? "bg-[#0b1727] text-white shadow-sm ring-2 ring-[#1e3a8a]"
                    : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]"
                }`}
              >
                <span>Cruzado</span>
                <span className="text-[9px] opacity-75 font-normal">CROSS</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selector de Apalancamiento (1x a maxAllowedLeverage, hasta 100x) */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
              Apalancamiento: <span className="font-mono text-[#1e3a8a]">{leverage}x</span>
            </label>
            <span className="font-mono text-xs font-bold text-[#1e3a8a] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {leverage >= 50 ? (
                <span className="text-amber-700 font-bold">100X Máx Institucional</span>
              ) : (
                `Límite: ${maxAllowedLeverage}x`
              )}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[1, 5, 10, 20, 50, 100]
              .filter((val) => val <= maxAllowedLeverage)
              .map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLeverage(val)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                    leverage === val
                      ? "bg-[#0b1727] text-white shadow-sm ring-1 ring-[#1e3a8a]"
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
            max={maxAllowedLeverage}
            step={1}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
            className="mt-2 w-full accent-[#0b1727]"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#64748b]">
            <span>1x (Spot)</span>
            {maxAllowedLeverage > 10 && <span>20x</span>}
            {maxAllowedLeverage > 50 && <span>50x</span>}
            <span>{maxAllowedLeverage}x (Máx)</span>
          </div>
        </div>

        {/* Desglose Cuantitativo de la Orden */}
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-3.5 space-y-2 text-xs">
          <div className="flex justify-between text-[#64748b]">
            <span>Precio Base Estimado:</span>
            <span className="font-mono font-bold text-[#0b1727]">
              ${effectivePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </span>
          </div>
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
              <span>Precio de Liquidación Est. ({marginMode}):</span>
              <span className="font-mono font-bold">
                ${estLiqPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {marginMode === "CROSS" && <span className="ml-1 text-[10px] text-[#64748b] font-normal">(Respaldo Global)</span>}
              </span>
            </div>
          )}
        </div>

        {/* Botón de Envío de Orden */}
        <button
          type="submit"
          disabled={
            isActionLoading ||
            quoteLoading ||
            !quote ||
            !dateStatus.allowed ||
            isSellDisabledInSoloLong
          }
          className={`w-full rounded-md py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition disabled:opacity-50 ${
            !dateStatus.allowed || isSellDisabledInSoloLong
              ? "bg-slate-400 cursor-not-allowed hover:bg-slate-400"
              : orderSide === "BUY"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {!dateStatus.allowed
            ? dateStatus.status === "SCHEDULED"
              ? "⏳ Torneo No Iniciado (Apertura Pendiente)"
              : "🛑 Torneo Concluido (Trading Inhabilitado)"
            : isSellDisabledInSoloLong
            ? "🔒 Venta Bloqueada: Sin Tenencia Comprada"
            : isActionLoading
            ? "Enviando Orden al Motor Cuantitativo..."
            : orderType === "LIMIT"
            ? `Colocar Orden Límite de ${orderSide === "BUY" ? "Compra" : "Venta"} a $${limitPriceNum.toFixed(2)} →`
            : `Ejecutar Orden de Mercado (${orderSide === "BUY" ? "Compra" : "Venta"}) →`}
        </button>
      </form>
    </div>
  );
};
