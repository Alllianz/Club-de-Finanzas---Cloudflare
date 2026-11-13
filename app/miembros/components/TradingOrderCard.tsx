"use client";

import React, { useState, useEffect, useRef } from "react";
import { POPULAR_TICKERS } from "../constants/groups";
import { useGroupTrading } from "../context/GroupTradingContext";
import { useLiveQuote } from "../hooks/useLiveQuote";
import { checkTournamentDateRange } from "../utils/tournament-dates";

export const TradingOrderCard: React.FC<{
  initialSymbol?: string;
  customTickers?: { symbol: string; label?: string; type?: string }[];
}> = ({
  initialSymbol = "",
  customTickers,
}) => {
  const { placeOrder, isActionLoading, portfolio, positions, pendingOrders, tournament } = useGroupTrading();

  const [symbol, setSymbol] = useState<string>(initialSymbol);

  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("0.1");
  const [sizingMode, setSizingMode] = useState<"UNITS" | "USD">("USD");
  const [amountUsd, setAmountUsd] = useState<string>("1000");
  const [investPct, setInvestPct] = useState<string>("");
  const [leverage, setLeverage] = useState<number>(1);
  const [marginMode, setMarginMode] = useState<"ISOLATED" | "CROSS">("ISOLATED");
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>("");
  const [stopLossPrice, setStopLossPrice] = useState<string>("");
  const [enableTpSl, setEnableTpSl] = useState<boolean>(false);

  const [orderFeedback, setOrderFeedback] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const {
    quote,
    isLoading: quoteLoading,
    isLiveStreaming,
    priceDirection,
    error: quoteError,
  } = useLiveQuote(symbol);

  const isSoloLong = tournament ? !tournament.allowShort : false;

  const currentLongPos = positions.find(
    (p) => p.symbol.toUpperCase() === symbol.toUpperCase() && p.side === "LONG"
  );
  const ownedQty = currentLongPos?.quantity || 0;

  const reservedSellQty =
    pendingOrders
      ?.filter(
        (o) =>
          o.symbol.toUpperCase() === symbol.toUpperCase() &&
          o.order_side === "SELL" &&
          (o.status === "PENDING" || o.status === "PENDING_OPEN" || o.status === "PARTIALLY_FILLED")
      )
      .reduce((acc, o) => acc + (o.quantity - o.filled_quantity), 0) || 0;

  const availableToSell = Math.max(0, ownedQty - reservedSellQty);

  useEffect(() => {
    if (tournament && tournament.maxLeverage && leverage > tournament.maxLeverage) {
      setLeverage(tournament.maxLeverage);
    }
  }, [tournament, leverage]);

  const currentPrice = quote?.price || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;
  const effectivePrice = orderType === "LIMIT" && limitPriceNum > 0 ? limitPriceNum : currentPrice;

  const committedPendingCash = (pendingOrders || [])
    .filter(
      (o) =>
        o.order_side === "BUY" &&
        (o.status === "PENDING" || o.status === "PENDING_OPEN" || o.status === "PARTIALLY_FILLED")
    )
    .reduce((acc, o) => {
      const remQty = Math.max(0, o.quantity - (o.filled_quantity || 0));
      const p = o.limit_price || quote?.price || 0;
      const lev = Math.max(1, o.leverage || 1);
      const notional = p * remQty;
      const margin = notional / lev;
      const fee =
        o.asset_type === "Crypto"
          ? notional * 0.0005
          : Math.max(1.0, Math.min(remQty * 0.005, notional * 0.01));
      return acc + margin + fee;
    }, 0);

  const rawCash = portfolio?.cash_balance ?? 10000;
  const realAvailableCash = Math.max(0, rawCash - committedPendingCash);

  const handleAmountUsdChange = (valStr: string) => {
    setAmountUsd(valStr);
    const valNum = parseFloat(valStr) || 0;
    if (realAvailableCash > 0 && valNum > 0) {
      const p = Math.min(100, Math.max(0, (valNum / realAvailableCash) * 100));
      setInvestPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
    } else if (!valStr) {
      setInvestPct("");
    }
    if (effectivePrice > 0 && valNum > 0) {
      const calculatedQty = valNum / effectivePrice;
      const precision = quote?.asset_type === "Crypto" ? 4 : 2;
      setQuantity(calculatedQty.toFixed(precision));
    } else if (!valStr) {
      setQuantity("");
    }
  };

  const handleInvestPctChange = (valStr: string) => {
    setInvestPct(valStr);
    const p = parseFloat(valStr);
    if (!isNaN(p) && realAvailableCash > 0) {
      const clamped = Math.max(0, Math.min(100, p));
      const calculatedUsd = (realAvailableCash * clamped) / 100;
      setAmountUsd(calculatedUsd.toFixed(2));
      if (effectivePrice > 0 && calculatedUsd > 0) {
        const precision = quote?.asset_type === "Crypto" ? 4 : 2;
        setQuantity((calculatedUsd / effectivePrice).toFixed(precision));
      } else if (calculatedUsd === 0) {
        setQuantity("0");
      }
    } else if (!valStr) {
      setAmountUsd("");
      setQuantity("");
    }
  };

  const handleQuantityChange = (valStr: string) => {
    setQuantity(valStr);
    const valNum = parseFloat(valStr) || 0;
    if (effectivePrice > 0 && valNum > 0) {
      const calculatedUsd = valNum * effectivePrice;
      setAmountUsd(calculatedUsd.toFixed(2));
      if (realAvailableCash > 0) {
        const p = Math.min(100, Math.max(0, (calculatedUsd / realAvailableCash) * 100));
        setInvestPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
      }
    } else if (!valStr) {
      setAmountUsd("");
      setInvestPct("");
    }
  };

  const handleSelectSizingMode = (mode: "UNITS" | "USD") => {
    setSizingMode(mode);
    if (mode === "USD") {
      const q = parseFloat(quantity) || 0;
      if (effectivePrice > 0 && q > 0) {
        setAmountUsd((q * effectivePrice).toFixed(2));
      } else if (!amountUsd) {
        setAmountUsd("1000");
        if (effectivePrice > 0) {
          const precision = quote?.asset_type === "Crypto" ? 4 : 2;
          setQuantity((1000 / effectivePrice).toFixed(precision));
        }
      }
    } else {
      const u = parseFloat(amountUsd) || 0;
      if (effectivePrice > 0 && u > 0) {
        const precision = quote?.asset_type === "Crypto" ? 4 : 2;
        setQuantity((u / effectivePrice).toFixed(precision));
      }
    }
  };

  useEffect(() => {
    if (sizingMode === "USD" && effectivePrice > 0) {
      const u = parseFloat(amountUsd) || 0;
      if (u > 0) {
        const precision = quote?.asset_type === "Crypto" ? 4 : 2;
        setQuantity((u / effectivePrice).toFixed(precision));
      }
    }
  }, [effectivePrice, sizingMode]);

  useEffect(() => {
    if (!investPct && amountUsd && realAvailableCash > 0) {
      const u = parseFloat(amountUsd) || 0;
      if (u > 0) {
        const p = Math.min(100, Math.max(0, (u / realAvailableCash) * 100));
        setInvestPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
      }
    }
  }, [realAvailableCash]);

  const currentTotalEquity = portfolio?.equity ?? 10000;
  const currentInvestedTotal = positions.reduce(
    (acc, p) => acc + p.quantity * (p.current_price || p.entry_price),
    0
  );
  const currentInvestedPct =
    currentTotalEquity > 1e-6
      ? Math.min(100, Math.max(0, (currentInvestedTotal / currentTotalEquity) * 100))
      : 0.0;

  const resetOrderForm = (preserveType = true) => {
    setLimitPrice("");
    setQuantity("");
    setAmountUsd("");
    setInvestPct("");
    setTakeProfitPrice("");
    setStopLossPrice("");
    if (!preserveType) {
      setOrderType("MARKET");
    }
  };

  const handleToggleOrderSide = (newSide: "BUY" | "SELL") => {
    if (newSide !== orderSide) {
      setOrderSide(newSide);
      setLimitPrice("");
      setTakeProfitPrice("");
      setStopLossPrice("");
    }
  };

  const lastNormalizedSymbol = useRef<string>("");
  useEffect(() => {
    if (quote && lastNormalizedSymbol.current !== quote.symbol) {
      lastNormalizedSymbol.current = quote.symbol;
      setLimitPrice("");
      setTakeProfitPrice("");
      setStopLossPrice("");

      if (sizingMode === "USD") {
        if (!amountUsd || parseFloat(amountUsd) <= 0) {
          setAmountUsd("1000");
          if (realAvailableCash > 0) {
            const p = Math.min(100, (1000 / realAvailableCash) * 100);
            setInvestPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
          }
        }
        if (quote.price > 0) {
          const u = parseFloat(amountUsd) || 1000;
          const precision = quote.asset_type === "Crypto" ? 4 : 2;
          setQuantity((u / quote.price).toFixed(precision));
        }
      } else {
        if (quote.asset_type === "Crypto") {
          if (quote.price > 10000) setQuantity("0.05");
          else setQuantity("1.0");
        } else {
          setQuantity("10");
        }
        if (quote.price > 0) {
          const q = parseFloat(quantity) || 1;
          const calculatedUsd = q * quote.price;
          setAmountUsd(calculatedUsd.toFixed(2));
          if (realAvailableCash > 0) {
            const p = Math.min(100, (calculatedUsd / realAvailableCash) * 100);
            setInvestPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
          }
        }
      }
    }
  }, [quote, sizingMode, realAvailableCash]);

  const qtyNum = parseFloat(quantity) || 0;
  const notional = effectivePrice * qtyNum;
  const initialMargin = leverage > 0 ? notional / leverage : notional;

  const isMarketableLimit =
    orderType === "LIMIT" &&
    limitPriceNum > 0 &&
    currentPrice > 0 &&
    ((orderSide === "BUY" && limitPriceNum >= currentPrice) ||
      (orderSide === "SELL" && limitPriceNum <= currentPrice));

  const projectedSellNotional = effectivePrice * qtyNum;
  const projectedInvestedTotal = Math.max(0, currentInvestedTotal - projectedSellNotional);
  const projectedInvestedPct =
    currentTotalEquity > 1e-6
      ? Math.min(100, Math.max(0, (projectedInvestedTotal / currentTotalEquity) * 100))
      : 0.0;
  const isSellUnderInvested =
    orderSide === "SELL" && qtyNum > 0 && projectedInvestedPct < 95.0;

  const estFee =
    quote?.asset_type === "Crypto"
      ? notional * 0.0005
      : Math.max(1.0, Math.min(qtyNum * 0.005, notional * 0.01));

  let estLiqPrice = 0;
  if (leverage > 1 && effectivePrice > 0) {
    const mmr = 0.005;
    if (orderSide === "BUY" || isSoloLong) {
      estLiqPrice = Math.max(0, effectivePrice * (1.0 - 1.0 / leverage + mmr));
    } else {
      estLiqPrice = effectivePrice * (1.0 + 1.0 / leverage - mmr);
    }
  }

  const dateStatus = checkTournamentDateRange(tournament);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderFeedback(null);

    const cleanSymbol = symbol.trim().toUpperCase();
    if (cleanSymbol.length < 2) {
      setOrderFeedback({
        type: "error",
        text: "Debés ingresar un ticker válido de al menos 2 caracteres.",
      });
      return;
    }

    if (!dateStatus.allowed) {
      setOrderFeedback({
        type: "error",
        text: dateStatus.reason || "Operación rechazada: el torneo no se encuentra en período operativo habilitado.",
      });
      return;
    }

    let finalQty = qtyNum;
    if (sizingMode === "USD") {
      const u = parseFloat(amountUsd) || 0;
      if (u <= 0) {
        setOrderFeedback({ type: "error", text: "El monto en dólares a invertir debe ser mayor a 0." });
        return;
      }
      if (effectivePrice <= 0) {
        setOrderFeedback({ type: "error", text: "Esperando cotización de mercado para calcular la cantidad." });
        return;
      }
      finalQty = u / effectivePrice;
    }

    if (finalQty <= 0) {
      setOrderFeedback({ type: "error", text: "La cantidad ingresada debe ser mayor a 0." });
      return;
    }

    if (orderType === "LIMIT" && (!limitPriceNum || limitPriceNum <= 0)) {
      setOrderFeedback({ type: "error", text: "Debés ingresar un precio límite válido mayor a 0." });
      return;
    }

    if (isSoloLong && orderSide === "SELL") {
      if (ownedQty <= 0) {
        setOrderFeedback({
          type: "error",
          text: `En modo Solo Long no podés vender ${symbol} porque tu tenencia actual es de 0 unidades. Debés comprar primero.`,
        });
        return;
      }

      if (finalQty > availableToSell + 1e-9) {
        setOrderFeedback({
          type: "error",
          text: `La cantidad a vender (${finalQty.toFixed(4)}) excede tu tenencia disponible (${availableToSell.toFixed(4)} ${symbol}${reservedSellQty > 0 ? ` [${reservedSellQty.toFixed(4)} reservadas en órdenes pendientes]` : ""}).`,
        });
        return;
      }
    }

    if (orderSide === "BUY") {
      if (initialMargin + estFee > realAvailableCash) {
        setOrderFeedback({
          type: "error",
          text: `Liquidez insuficiente: Requerís $${(initialMargin + estFee).toFixed(2)} ($${initialMargin.toFixed(2)} de margen + $${estFee.toFixed(2)} de comisión) y disponés de $${realAvailableCash.toFixed(2)} de efectivo libre real${committedPendingCash > 0 ? ` ($${committedPendingCash.toFixed(2)} reservado en órdenes pendientes)` : ""}.`,
        });
        return;
      }
    }

    const tpNum = parseFloat(takeProfitPrice) || 0;
    const slNum = parseFloat(stopLossPrice) || 0;
    const hasTpSl = enableTpSl && (tpNum > 0 || slNum > 0);

    if (hasTpSl) {
      const isShort = orderSide === "SELL" && !isSoloLong;
      if (isShort) {
        if (tpNum > 0 && tpNum >= effectivePrice) {
          setOrderFeedback({
            type: "error",
            text: `Para posiciones SHORT, el Take Profit ($${tpNum.toFixed(2)}) debe ser estrictamente menor al precio de entrada ($${effectivePrice.toFixed(2)}).`,
          });
          return;
        }
        if (slNum > 0 && slNum <= effectivePrice) {
          setOrderFeedback({
            type: "error",
            text: `Para posiciones SHORT, el Stop Loss ($${slNum.toFixed(2)}) debe ser estrictamente mayor al precio de entrada ($${effectivePrice.toFixed(2)}).`,
          });
          return;
        }
      } else {
        if (tpNum > 0 && tpNum <= effectivePrice) {
          setOrderFeedback({
            type: "error",
            text: `Para posiciones LONG, el Take Profit ($${tpNum.toFixed(2)}) debe ser estrictamente mayor al precio de entrada ($${effectivePrice.toFixed(2)}).`,
          });
          return;
        }
        if (slNum > 0 && slNum >= effectivePrice) {
          setOrderFeedback({
            type: "error",
            text: `Para posiciones LONG, el Stop Loss ($${slNum.toFixed(2)}) debe ser estrictamente menor al precio de entrada ($${effectivePrice.toFixed(2)}).`,
          });
          return;
        }
      }
    }

    setOrderFeedback({
      type: "info",
      text: "Orden enviada al motor...",
    });

    const tpArg = hasTpSl && tpNum > 0 ? tpNum : undefined;
    const slArg = hasTpSl && slNum > 0 ? slNum : undefined;

    const res = await placeOrder(
      symbol,
      orderSide,
      finalQty,
      leverage,
      marginMode,
      orderType,
      orderType === "LIMIT" ? limitPriceNum : undefined,
      tpArg,
      slArg
    );

    if (res.success) {
      setOrderFeedback({
        type: "success",
        text: res.message || `¡Orden ${orderType} ${orderSide} procesada con éxito para ${symbol}!`,
      });
      resetOrderForm(true);
    } else {
      setOrderFeedback({
        type: "error",
        text: res.error || "No se pudo procesar la orden.",
      });
    }
  };

  const maxAllowedLeverage = tournament?.maxLeverage || (customTickers ? 100 : 10);
  const isSellDisabledInSoloLong = isSoloLong && orderSide === "SELL" && availableToSell <= 0;

  return (
    <div className="w-full rounded-xl border border-[#e5e7eb] bg-white p-3 sm:p-4 shadow-xs">
      {(isSoloLong || (tournament && (tournament.rebalanceDay || (tournament.tradingStartTime && tournament.tradingEndTime)))) && (
        <div className="flex flex-wrap items-center gap-1.5 pb-2.5 mb-2.5 border-b border-[#f1f5f9]">
          {isSoloLong && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
              🔒 Modo Solo Long
            </span>
          )}
          {tournament && tournament.rebalanceDay && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-300">
              📅 Rebalanceo: {tournament.rebalanceDay === "WED" ? "Miércoles" : tournament.rebalanceDay === "MON" ? "Lunes" : tournament.rebalanceDay === "FRI" ? "Viernes" : tournament.rebalanceDay}
            </span>
          )}
          {tournament && tournament.tradingStartTime && tournament.tradingEndTime && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 border border-indigo-300">
              ⏰ {tournament.tradingStartTime} - {tournament.tradingEndTime} hs
            </span>
          )}
        </div>
      )}

      {!dateStatus.allowed && (
        <div
          className={`mb-3 rounded-lg border p-2.5 text-xs ${
            dateStatus.status === "SCHEDULED"
              ? "border-amber-300 bg-amber-50 text-amber-950"
              : "border-red-300 bg-red-50 text-red-950"
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            <span>{dateStatus.status === "SCHEDULED" ? "⏳" : "🛑"}</span>
            <span>{dateStatus.reason}</span>
          </div>
        </div>
      )}

      {orderFeedback && (
        <div
          className={`mb-3 rounded-lg border p-2.5 text-xs font-semibold ${
            orderFeedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : orderFeedback.type === "info"
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {orderFeedback.text}
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Columna Izquierda: Activo, Tipo, Sentido, Cotización, Precio Límite */}
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#0b1727]">
                  Activo / Ticker
                </label>
                {quote && (
                  <span className={`text-[10px] font-bold font-mono ${quote.change_24h_pct >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {quote.change_24h_pct >= 0 ? "+" : ""}{quote.change_24h_pct.toFixed(2)}%
                  </span>
                )}
              </div>
              <input
                type="text"
                value={symbol}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (val !== symbol) {
                    setLimitPrice("");
                  }
                  setSymbol(val);
                }}
                placeholder="Ticker (ej. NVDA, AAPL, BTC-USD)..."
                required
                className="w-full rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-[#0b1727] placeholder-[#94a3b8] focus:border-[#0b1727] focus:outline-none"
              />
            </div>

            {symbol.trim().length > 0 && symbol.trim().length < 2 ? (
              <div className="rounded border border-[#e5e7eb] bg-[#fafaf9] px-2 py-1 text-center text-[11px] text-[#64748b]">
                Ingresá al menos 2 caracteres...
              </div>
            ) : quoteLoading && !quote && symbol.trim().length >= 2 ? (
              <div className="rounded border border-[#e5e7eb] bg-[#fafaf9] px-2 py-1 text-center text-[11px] text-[#64748b]">
                Consultando cotización...
              </div>
            ) : quote ? (
              <div
                className={`rounded-lg border px-2.5 py-1.5 transition-all duration-200 ${
                  priceDirection === "up"
                    ? "border-emerald-400 bg-emerald-50/70"
                    : priceDirection === "down"
                    ? "border-red-400 bg-red-50/70"
                    : "border-[#e2e8f0] bg-[#f8fafc]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase text-[#64748b]">{quote.asset_type}</span>
                    <span
                      className={`font-mono text-sm font-extrabold ${
                        priceDirection === "up"
                          ? "text-emerald-700"
                          : priceDirection === "down"
                          ? "text-red-700"
                          : "text-[#0b1727]"
                      }`}
                    >
                      ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-[#64748b]">
                    {isLiveStreaming ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800">
                        <span className="h-1 w-1 rounded-full bg-emerald-600 animate-ping" />
                        Live
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-600">Cache</span>
                    )}
                    <span>{quote.is_market_open ? "● Abierto" : "○ Cerrado"}</span>
                  </div>
                </div>
                {quote.asset_type === "Stock" && !quote.is_market_open && (
                  <p className="mt-1 text-[10px] text-indigo-900 font-medium leading-tight">
                    🌙 Wall Street cerrado · Se ejecuta al abrir (09:30 ET)
                  </p>
                )}
              </div>
            ) : quoteError ? (
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
                {quoteError}
              </div>
            ) : null}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0b1727] mb-1">
                Tipo de Orden
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setOrderType("MARKET")}
                  className={`rounded-md py-1.5 px-2 text-xs font-bold transition flex items-center justify-center gap-1 ${
                    orderType === "MARKET"
                      ? "bg-[#0b1727] text-white shadow-2xs"
                      : "border border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
                  }`}
                >
                  <span>⚡ Mercado</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOrderType("LIMIT");
                    if (!limitPrice && quote) {
                      setLimitPrice(quote.price.toString());
                    }
                  }}
                  className={`rounded-md py-1.5 px-2 text-xs font-bold transition flex items-center justify-center gap-1 ${
                    orderType === "LIMIT"
                      ? "bg-[#1e3a8a] text-white shadow-2xs"
                      : "border border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
                  }`}
                >
                  <span>🎯 Límite</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0b1727] mb-1">
                Sentido
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleOrderSide("BUY")}
                  className={`rounded-md py-1.5 px-2 text-xs font-bold transition flex items-center justify-center gap-1 ${
                    orderSide === "BUY"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "border border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
                  }`}
                >
                  <span>▲ COMPRA {isSoloLong ? "(Long)" : ""}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleOrderSide("SELL")}
                  className={`rounded-md py-1.5 px-2 text-xs font-bold transition flex items-center justify-center gap-1 ${
                    orderSide === "SELL"
                      ? "bg-red-600 text-white shadow-2xs"
                      : "border border-[#e5e7eb] bg-[#fafaf9] text-[#475569] hover:bg-white"
                  }`}
                >
                  <span>{isSoloLong ? "▼ VENTA (Cierre)" : "▼ VENTA (Short)"}</span>
                </button>
              </div>
            </div>

            {orderType === "LIMIT" && (
              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0b1727]">
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
                  placeholder="Precio límite..."
                  required={orderType === "LIMIT"}
                  className="w-full rounded border border-[#93c5fd] bg-white px-2.5 py-1.5 font-mono text-xs text-[#0b1727] focus:border-[#1e3a8a] focus:outline-none"
                />
                <p className="text-[10px] font-medium text-[#1e3a8a]">
                  {orderSide === "BUY"
                    ? `📉 Se ejecuta al caer a $${limitPriceNum > 0 ? limitPriceNum.toFixed(2) : "..."}`
                    : `📈 Se ejecuta al subir a $${limitPriceNum > 0 ? limitPriceNum.toFixed(2) : "..."}`}
                </p>
                {isMarketableLimit && (
                  <div className="rounded border border-amber-300 bg-amber-50 p-1.5 text-[10px] text-amber-950 font-medium">
                    ⚠️ Límite Marketable: Cruza spot (${currentPrice.toFixed(2)}) y se ejecuta al instante.
                  </div>
                )}
              </div>
            )}

            {isSoloLong && orderSide === "SELL" && (
              <div
                className={`rounded-lg border p-2 text-[11px] ${
                  ownedQty <= 0
                    ? "border-amber-300 bg-amber-50 text-amber-950"
                    : "border-blue-200 bg-blue-50/70 text-blue-950"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px]">🔒 Regla Solo Long</span>
                  <span className="font-mono font-bold text-[10px]">Tenencia: {ownedQty.toFixed(2)}</span>
                </div>
                {ownedQty <= 0 ? (
                  <p className="mt-1 text-[10px] text-amber-800 leading-tight">
                    No tenés posiciones en {symbol}. En Solo Long solo podés vender tenencia previa.
                  </p>
                ) : (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#475569]">
                      <span>Disp. venta:</span>
                      <span className="font-mono font-bold text-[#0b1727]">
                        {availableToSell.toFixed(4)} {symbol}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0.25, 0.5, 0.75, 1.0].map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          disabled={availableToSell <= 0}
                          onClick={() => {
                            const val = availableToSell * ratio;
                            const formatted = val >= 1 ? val.toFixed(2) : val.toFixed(4);
                            setQuantity(formatted);
                            if (effectivePrice > 0) {
                              const u = val * effectivePrice;
                              setAmountUsd(u.toFixed(2));
                              if (realAvailableCash > 0) {
                                const p = Math.min(100, Math.max(0, (u / realAvailableCash) * 100));
                                setInvestPct(p % 1 === 0 ? p.toFixed(0) : p.toFixed(1));
                              }
                            }
                          }}
                          className="flex-1 rounded border border-blue-200 bg-white py-0.5 text-[9px] font-bold text-blue-900 hover:bg-blue-100 disabled:opacity-40"
                        >
                          {ratio === 1.0 ? "100%" : `${ratio * 100}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSellUnderInvested && (
              <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[10px] text-amber-950">
                ⚠️ Venta reduce cartera a <strong>{projectedInvestedPct.toFixed(1)}%</strong> (&lt; 95%). Reinvertí caja para evitar penalización.
              </div>
            )}
          </div>

          {/* Columna Central: Monto USD, % a Invertir, Apalancamiento, Margen */}
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#0b1727]">
                  Inversión
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSelectSizingMode("USD")}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                      sizingMode === "USD"
                        ? "bg-[#1e3a8a] text-white"
                        : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                    }`}
                  >
                    $ USD
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectSizingMode("UNITS")}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                      sizingMode === "UNITS"
                        ? "bg-[#0b1727] text-white"
                        : "bg-slate-100 text-[#475569] hover:bg-slate-200"
                    }`}
                  >
                    Unidades
                  </button>
                </div>
              </div>

              {sizingMode === "USD" ? (
                <div className="space-y-1.5">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-[#64748b] text-xs">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={amountUsd}
                      onChange={(e) => handleAmountUsdChange(e.target.value)}
                      placeholder="Monto USD..."
                      required={sizingMode === "USD"}
                      className="w-full rounded-md border border-[#93c5fd] bg-white pl-6 pr-2.5 py-1.5 font-mono text-xs font-bold text-[#0b1727] focus:border-[#1e3a8a] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#64748b]">
                    <span>Unidades calc:</span>
                    <span className="font-mono font-bold text-[#0b1727]">
                      {qtyNum.toFixed(quote?.asset_type === "Crypto" ? 4 : 2)} {customTickers ? "contratos" : "u."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <input
                    type="number"
                    step="any"
                    min="0.0001"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="Cantidad..."
                    required={sizingMode === "UNITS"}
                    className="w-full rounded-md border border-[#cbd5e1] bg-white px-2.5 py-1.5 font-mono text-xs font-bold text-[#0b1727] focus:border-[#0b1727] focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[#64748b]">
                    <span>Nocional equiv:</span>
                    <span className="font-mono font-bold text-[#0b1727]">
                      ${(qtyNum * effectivePrice).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#0b1727]">
                  % a Invertir
                </label>
                <span className="text-[10px] font-mono text-[#64748b]">
                  Caja libre: <strong className="text-[#0b1727]">${realAvailableCash.toFixed(2)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-28">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={investPct}
                    onChange={(e) => handleInvestPctChange(e.target.value)}
                    placeholder="0 - 100"
                    className="w-full rounded-md border border-[#cbd5e1] bg-white pl-2.5 pr-6 py-1.5 font-mono text-xs font-bold text-[#0b1727] focus:border-[#1e3a8a] focus:outline-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-[#64748b]">
                    %
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      disabled={realAvailableCash <= 0}
                      onClick={() => handleInvestPctChange(pct.toString())}
                      className="flex-1 rounded border border-blue-200 bg-white py-1 text-[10px] font-bold text-[#1e3a8a] hover:bg-blue-50 transition disabled:opacity-40"
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              {committedPendingCash > 0 && (
                <p className="mt-1 text-[9px] text-amber-700">
                  (${committedPendingCash.toFixed(2)} USD reservado en órdenes pendientes)
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#0b1727]">
                  Apalancamiento
                </label>
                <span className="text-[10px] font-mono font-bold text-[#1e3a8a] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  Máx: {maxAllowedLeverage}x
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-24">
                  <input
                    type="number"
                    min={1}
                    max={maxAllowedLeverage}
                    step={1}
                    value={leverage}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        setLeverage(Math.min(maxAllowedLeverage, Math.max(1, val)));
                      } else {
                        setLeverage(1);
                      }
                    }}
                    className="w-full rounded-md border border-[#cbd5e1] bg-white pl-2.5 pr-6 py-1.5 font-mono text-xs font-bold text-[#0b1727] focus:border-[#0b1727] focus:outline-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[11px] font-bold text-[#64748b]">
                    x
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  {[1, 5, 10, 20, 50, 100]
                    .filter((val) => val <= maxAllowedLeverage)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setLeverage(val)}
                        className={`flex-1 rounded py-1 text-[10px] font-bold transition ${
                          leverage === val
                            ? "bg-[#0b1727] text-white shadow-2xs"
                            : "border border-[#e2e8f0] bg-[#f8fafc] text-[#475569] hover:bg-white"
                        }`}
                      >
                        {val}x
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#0b1727] mb-1">
                Modo de Margen
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setMarginMode("ISOLATED")}
                  className={`rounded-md py-1.5 px-2 text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    marginMode === "ISOLATED"
                      ? "bg-[#0b1727] text-white shadow-2xs"
                      : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span>Aislado (ISOLATED)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarginMode("CROSS")}
                  className={`rounded-md py-1.5 px-2 text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    marginMode === "CROSS"
                      ? "bg-[#0b1727] text-white shadow-2xs"
                      : "border border-[#cbd5e1] bg-white text-[#475569] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span>Cruzado (CROSS)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: TP/SL, Resumen Cuantitativo, Botón de Envío */}
          <div className="space-y-2.5 md:col-span-2 lg:col-span-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-bold uppercase tracking-wider text-[#0b1727]">
                    <input
                      type="checkbox"
                      checked={enableTpSl}
                      onChange={(e) => setEnableTpSl(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-[#1e3a8a] accent-[#1e3a8a]"
                    />
                    <span>TP / SL</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setEnableTpSl(!enableTpSl)}
                    className="text-[10px] font-semibold text-[#1e3a8a] hover:underline"
                  >
                    {enableTpSl ? "Ocultar" : "Configurar"}
                  </button>
                </div>

                {enableTpSl && (
                  <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-[#e2e8f0]">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-emerald-700 mb-0.5">
                        TP ($ USD)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-[10px] font-bold text-[#64748b]">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder={
                            effectivePrice > 0
                              ? orderSide === "SELL" && !isSoloLong
                                ? (effectivePrice * 0.95).toFixed(2)
                                : (effectivePrice * 1.05).toFixed(2)
                              : "0.00"
                          }
                          value={takeProfitPrice}
                          onChange={(e) => setTakeProfitPrice(e.target.value)}
                          className="w-full rounded border border-[#cbd5e1] pl-5 pr-2 py-1 text-[11px] font-mono font-medium text-[#0b1727] focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-rose-700 mb-0.5">
                        SL ($ USD)
                      </label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-[10px] font-bold text-[#64748b]">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder={
                            effectivePrice > 0
                              ? orderSide === "SELL" && !isSoloLong
                                ? (effectivePrice * 1.05).toFixed(2)
                                : (effectivePrice * 0.95).toFixed(2)
                              : "0.00"
                          }
                          value={stopLossPrice}
                          onChange={(e) => setStopLossPrice(e.target.value)}
                          className="w-full rounded border border-[#cbd5e1] pl-5 pr-2 py-1 text-[11px] font-mono font-medium text-[#0b1727] focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-2.5 space-y-1 text-[11px]">
                <div className="flex justify-between text-[#64748b]">
                  <span>Precio Spot / Base:</span>
                  <span className="font-mono font-bold text-[#0b1727]">
                    ${effectivePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#64748b]">
                  <span>Nocional:</span>
                  <span className="font-mono font-bold text-[#0b1727]">
                    ${notional.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#64748b]">
                  <span>Margen ({leverage}x):</span>
                  <span className="font-mono font-bold text-[#0b1727]">
                    ${initialMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[#64748b]">
                  <span>Comisión Est.:</span>
                  <span className="font-mono font-bold text-[#0b1727]">
                    ${estFee.toFixed(2)}
                  </span>
                </div>
                {leverage > 1 && (
                  <div className="flex justify-between border-t border-[#e2e8f0] pt-1 text-red-600">
                    <span>Liq. Est. ({marginMode}):</span>
                    <span className="font-mono font-bold">
                      ${estLiqPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={
                  isActionLoading ||
                  quoteLoading ||
                  !quote ||
                  !dateStatus.allowed ||
                  isSellDisabledInSoloLong
                }
                className={`w-full rounded-md py-2.5 px-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs transition disabled:opacity-50 ${
                  !dateStatus.allowed || isSellDisabledInSoloLong
                    ? "bg-slate-400 cursor-not-allowed hover:bg-slate-400"
                    : orderSide === "BUY"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {!dateStatus.allowed
                  ? dateStatus.status === "SCHEDULED"
                    ? "⏳ Torneo No Iniciado"
                    : "🛑 Torneo Concluido"
                  : isSellDisabledInSoloLong
                  ? "🔒 Venta Bloqueada: Sin Tenencia"
                  : isActionLoading
                  ? "Enviando Orden..."
                  : quote?.asset_type === "Stock" && !quote.is_market_open
                  ? orderType === "LIMIT"
                    ? "Colocar Orden Límite (Fuera de Hora) →"
                    : "Programar para Apertura (09:30 ET) →"
                  : orderType === "LIMIT"
                  ? `Límite ${orderSide === "BUY" ? "Compra" : "Venta"} ($${limitPriceNum.toFixed(2)}) →`
                  : `Ejecutar Mercado (${orderSide === "BUY" ? "Compra" : "Venta"}) →`}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
