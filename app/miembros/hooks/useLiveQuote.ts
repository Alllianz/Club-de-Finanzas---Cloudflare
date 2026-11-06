"use client";

import { useState, useEffect, useRef } from "react";
import { fetchQuote } from "../services/paperApi";
import { LiveMarketQuote } from "../types/paper-trading";
import { realtimePriceStream, RealtimePriceTick } from "../services/realtimePriceStream";

export interface UseLiveQuoteReturn {
  quote: LiveMarketQuote | null;
  isLoading: boolean;
  isLiveStreaming: boolean;
  priceDirection: "up" | "down" | "none";
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLiveQuote(rawSymbol: string): UseLiveQuoteReturn {
  const symbol = (rawSymbol || "").trim().toUpperCase();
  const [quote, setQuote] = useState<LiveMarketQuote | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "none">("none");
  const [error, setError] = useState<string | null>(null);

  const prevPriceRef = useRef<number | null>(null);
  const directionTimeoutRef = useRef<any>(null);

  const isCrypto =
    symbol.endsWith("-USD") ||
    symbol.endsWith("-USDT") ||
    symbol.endsWith("USDT") ||
    symbol.includes("BTC") ||
    symbol.includes("ETH") ||
    symbol.includes("SOL") ||
    symbol.includes("BNB");

  const triggerPriceDirection = (newPrice: number) => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== newPrice) {
      const dir = newPrice > prevPriceRef.current ? "up" : "down";
      setPriceDirection(dir);
      if (directionTimeoutRef.current) clearTimeout(directionTimeoutRef.current);
      directionTimeoutRef.current = setTimeout(() => {
        setPriceDirection("none");
      }, 1200);
    }
    prevPriceRef.current = newPrice;
  };

  const loadInitialQuote = async () => {
    if (!symbol) return;
    try {
      setError(null);
      const res = await fetchQuote(symbol);
      setQuote(res);
      triggerPriceDirection(res.price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener cotización.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    prevPriceRef.current = null;
    setIsLoading(true);
    setError(null);
    setPriceDirection("none");

    if (!symbol) {
      setQuote(null);
      setIsLoading(false);
      return;
    }

    // 1. Cargar datos iniciales del backend
    loadInitialQuote();

    // 2. Si es Cripto, conectar al WebSocket de ultra-baja latencia (1 segundo)
    let unsubscribeWs: (() => void) | null = null;
    if (isCrypto) {
      setIsLiveStreaming(true);
      unsubscribeWs = realtimePriceStream.subscribe(symbol, (tick: RealtimePriceTick) => {
        triggerPriceDirection(tick.price);
        setQuote((prev) => {
          if (!prev) {
            return {
              symbol,
              asset_type: "Crypto",
              price: tick.price,
              change_24h_pct: tick.change24hPct,
              previous_close: tick.price / (1 + tick.change24hPct / 100),
              is_market_open: true,
              status_message: "Mercado Crypto 24/7 Abierto",
              timestamp_ms: tick.timestampMs,
            };
          }
          return {
            ...prev,
            price: tick.price,
            change_24h_pct: tick.change24hPct,
            timestamp_ms: tick.timestampMs,
          };
        });
      });
    } else {
      setIsLiveStreaming(false);
      // Para acciones tradicionales, sondeo acelerado a la caché edge (cada 3.5 segundos)
      const interval = setInterval(() => {
        loadInitialQuote();
      }, 3500);

      return () => {
        clearInterval(interval);
        if (directionTimeoutRef.current) clearTimeout(directionTimeoutRef.current);
      };
    }

    return () => {
      if (unsubscribeWs) unsubscribeWs();
      if (directionTimeoutRef.current) clearTimeout(directionTimeoutRef.current);
    };
  }, [symbol, isCrypto]);

  return {
    quote,
    isLoading,
    isLiveStreaming,
    priceDirection,
    error,
    refetch: loadInitialQuote,
  };
}
