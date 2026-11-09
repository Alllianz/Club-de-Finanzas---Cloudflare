"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useGroupTrading } from "../context/GroupTradingContext";
import { fetchQuote, fetchQuotesBatch } from "../services/paperApi";
import { LiveMarketQuote } from "../types/paper-trading";
import { realtimePriceStream, RealtimePriceTick } from "../services/realtimePriceStream";

export const MarketTickerBar: React.FC<{
  onSelectSymbol?: (symbol: string) => void;
  customTickers?: { symbol: string; label?: string; type?: string }[];
}> = ({
  onSelectSymbol,
}) => {
  const { positions } = useGroupTrading();

  // Directiva de Allianz: SOLAMENTE cotizar los activos que el grupo tiene efectivamente en cartera
  const heldSymbols = useMemo(() => {
    if (!positions || positions.length === 0) return [];
    const list = positions
      .filter((p) => (p.quantity || 0) > 0)
      .map((p) => (p.symbol || "").trim().toUpperCase())
      .filter((s) => s.length >= 2);
    return Array.from(new Set(list));
  }, [positions]);

  const [quotes, setQuotes] = useState<Record<string, LiveMarketQuote>>({});
  const [flashStates, setFlashStates] = useState<Record<string, "up" | "down">>({});
  const [loading, setLoading] = useState<boolean>(false);
  const flashTimers = useRef<Record<string, any>>({});

  const triggerFlash = (symbol: string, dir: "up" | "down") => {
    setFlashStates((prev) => ({ ...prev, [symbol]: dir }));
    if (flashTimers.current[symbol]) clearTimeout(flashTimers.current[symbol]);
    flashTimers.current[symbol] = setTimeout(() => {
      setFlashStates((prev) => {
        const copy = { ...prev };
        delete copy[symbol];
        return copy;
      });
    }, 1000);
  };

  useEffect(() => {
    // Si no hay activos en cartera, omitir completamente peticiones de red y subscripciones
    if (heldSymbols.length === 0) {
      setQuotes({});
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const loadTickerQuotes = async () => {
      if (document.hidden || !isMounted || heldSymbols.length === 0) return;

      try {
        // 1. Intentar consulta batch (1 request para todos los activos en cartera)
        const batchResults = await fetchQuotesBatch(heldSymbols);
        if (isMounted && Object.keys(batchResults).length > 0) {
          setQuotes((prev) => ({ ...prev, ...batchResults }));
          setLoading(false);
          return;
        }
      } catch {
        // Fallback resiliente a peticiones individuales cacheadas en el Edge
      }

      const results: Record<string, LiveMarketQuote> = {};
      await Promise.allSettled(
        heldSymbols.map(async (s) => {
          try {
            const q = await fetchQuote(s);
            if (isMounted) results[s] = q;
          } catch {
            // Silencioso
          }
        })
      );

      if (isMounted) {
        setQuotes((prev) => ({ ...prev, ...results }));
        setLoading(false);
      }
    };

    loadTickerQuotes();

    // 2. Suscribir exclusivamente activos cripto que el grupo tenga en cartera
    const unsubscribers: (() => void)[] = [];
    const cryptoHeld = heldSymbols.filter(
      (s) =>
        s.endsWith("-USD") ||
        s.endsWith("USDT") ||
        s.includes("BTC") ||
        s.includes("ETH") ||
        s.includes("SOL")
    );

    cryptoHeld.forEach((sym) => {
      const unsub = realtimePriceStream.subscribe(sym, (tick: RealtimePriceTick) => {
        if (!isMounted || document.hidden) return;
        setQuotes((prev) => {
          const old = prev[sym];
          if (old && old.price !== tick.price) {
            triggerFlash(sym, tick.price > old.price ? "up" : "down");
          }
          return {
            ...prev,
            [sym]: {
              symbol: sym,
              asset_type: "Crypto",
              price: tick.price,
              change_24h_pct: tick.change24hPct,
              previous_close: old ? old.previous_close : tick.price,
              is_market_open: true,
              status_message: "Mercado Crypto 24/7 Abierto",
              timestamp_ms: tick.timestampMs,
            },
          };
        });
      });
      unsubscribers.push(unsub);
    });

    // 3. Polling cada 15s respetando Page Visibility API
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadTickerQuotes();
      }
    }, 15000);

    const handleVisibility = () => {
      if (!document.hidden && isMounted) {
        loadTickerQuotes();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubscribers.forEach((u) => u());
      Object.values(flashTimers.current).forEach((tm) => clearTimeout(tm));
    };
  }, [heldSymbols]);

  // Si no hay posiciones en cartera, mostrar banner limpio sin emitir ningún request
  if (heldSymbols.length === 0) {
    return (
      <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-r border-[#e5e7eb] pr-3">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0b1727]">
              Monitor de Cartera
            </span>
          </div>
          <span className="text-xs font-medium text-[#64748b]">
            Sin activos en cartera para cotizar. Abrí una posición o utilizá el buscador para consultar cotizaciones en vivo.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-2xs">
      <div className="flex items-center gap-4 min-w-max">
        <div className="flex items-center gap-2 border-r border-[#e5e7eb] pr-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0b1727]">
            Cartera en Vivo ({heldSymbols.length})
          </span>
        </div>

        {heldSymbols.map((sym) => {
          const q = quotes[sym];
          const isUp = q ? q.change_24h_pct >= 0 : true;
          const flash = flashStates[sym];

          let flashClasses = "border-[#f1f5f9] bg-[#fafaf9]";
          if (flash === "up") {
            flashClasses = "border-emerald-500 bg-emerald-50 text-emerald-900";
          } else if (flash === "down") {
            flashClasses = "border-red-500 bg-red-50 text-red-900";
          }

          return (
            <button
              key={sym}
              type="button"
              onClick={() => onSelectSymbol && onSelectSymbol(sym)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition duration-200 hover:border-[#0b1727] hover:bg-white ${flashClasses}`}
            >
              <span className="font-bold text-[#0b1727]">{sym}</span>
              {q ? (
                <>
                  <span className="font-mono font-semibold text-[#334155]">
                    ${q.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={`text-[10px] font-bold font-mono ${
                      isUp ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {isUp ? "+" : ""}
                    {q.change_24h_pct.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-[#94a3b8]">
                  {loading ? "..." : "N/D"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
