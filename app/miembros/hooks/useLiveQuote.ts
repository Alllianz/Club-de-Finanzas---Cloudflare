"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const normalizedSymbol = (rawSymbol || "").trim().toUpperCase();
  const [debouncedSymbol, setDebouncedSymbol] = useState<string>(normalizedSymbol);
  const [quote, setQuote] = useState<LiveMarketQuote | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "none">("none");
  const [error, setError] = useState<string | null>(null);

  const prevPriceRef = useRef<number | null>(null);
  const directionTimeoutRef = useRef<any>(null);

  // Debounce de 400ms sobre el ticker ingresado para evitar ráfagas HTTP por pulsación de tecla
  useEffect(() => {
    if (normalizedSymbol.length < 2) {
      setDebouncedSymbol(normalizedSymbol);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedSymbol(normalizedSymbol);
    }, 400);

    return () => clearTimeout(timer);
  }, [normalizedSymbol]);

  const isCrypto =
    debouncedSymbol.endsWith("-USD") ||
    debouncedSymbol.endsWith("-USDT") ||
    debouncedSymbol.endsWith("USDT") ||
    debouncedSymbol.includes("BTC") ||
    debouncedSymbol.includes("ETH") ||
    debouncedSymbol.includes("SOL") ||
    debouncedSymbol.includes("BNB");

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

  const loadInitialQuote = useCallback(async () => {
    // Guarda estricta: No disparar petición si el ticker tiene menos de 2 caracteres o si la pestaña está oculta
    if (debouncedSymbol.length < 2 || (typeof document !== "undefined" && document.hidden)) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetchQuote(debouncedSymbol);
      setQuote(res);
      triggerPriceDirection(res.price);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al obtener cotización.");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSymbol]);

  useEffect(() => {
    prevPriceRef.current = null;
    setError(null);
    setPriceDirection("none");

    // Guarda estricta: Si el input está vacío o tiene menos de 2 caracteres, no realizar petición ni suscripción
    if (debouncedSymbol.length < 2) {
      setQuote(null);
      setIsLoading(false);
      setIsLiveStreaming(false);
      return;
    }

    let isMounted = true;

    // 1. Cargar datos iniciales
    loadInitialQuote();

    // 2. Si es Cripto, conectar al WebSocket de precios en vivo
    let unsubscribeWs: (() => void) | null = null;
    if (isCrypto) {
      setIsLiveStreaming(true);
      unsubscribeWs = realtimePriceStream.subscribe(debouncedSymbol, (tick: RealtimePriceTick) => {
        if (!isMounted || (typeof document !== "undefined" && document.hidden)) return;
        triggerPriceDirection(tick.price);
        setQuote((prev) => {
          if (!prev) {
            return {
              symbol: debouncedSymbol,
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
      // Intervalo de 15s con verificación de pestaña visible
      const interval = setInterval(() => {
        if (typeof document !== "undefined" && !document.hidden) {
          loadInitialQuote();
        }
      }, 15000);

      const handleVisibilityChange = () => {
        if (typeof document !== "undefined" && !document.hidden && isMounted) {
          loadInitialQuote();
        }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      return () => {
        isMounted = false;
        clearInterval(interval);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (directionTimeoutRef.current) clearTimeout(directionTimeoutRef.current);
      };
    }

    return () => {
      isMounted = false;
      if (unsubscribeWs) unsubscribeWs();
      if (directionTimeoutRef.current) clearTimeout(directionTimeoutRef.current);
    };
  }, [debouncedSymbol, isCrypto, loadInitialQuote]);

  return {
    quote,
    isLoading,
    isLiveStreaming,
    priceDirection,
    error,
    refetch: loadInitialQuote,
  };
}
