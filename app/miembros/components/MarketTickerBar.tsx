"use client";

import React, { useEffect, useState, useRef } from "react";
import { POPULAR_TICKERS } from "../constants/groups";
import { fetchQuote } from "../services/paperApi";
import { LiveMarketQuote } from "../types/paper-trading";
import { realtimePriceStream, RealtimePriceTick } from "../services/realtimePriceStream";

export const MarketTickerBar: React.FC<{
  onSelectSymbol?: (symbol: string) => void;
  customTickers?: { symbol: string; label?: string; type?: string }[];
}> = ({
  onSelectSymbol,
  customTickers,
}) => {
  const activeTickers = customTickers || POPULAR_TICKERS;
  const [quotes, setQuotes] = useState<Record<string, LiveMarketQuote>>({});
  const [flashStates, setFlashStates] = useState<Record<string, "up" | "down">>({});
  const [loading, setLoading] = useState<boolean>(true);
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
    let isMounted = true;

    // 1. Cargar estado inicial de todos los tickers
    const loadTickerQuotes = async () => {
      const results: Record<string, LiveMarketQuote> = {};
      const symbols = activeTickers.map((t) => t.symbol);

      await Promise.allSettled(
        symbols.map(async (s) => {
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

    // 2. Suscribir tickers Cripto al WebSocket de ultra-baja latencia (1 segundo)
    const unsubscribers: (() => void)[] = [];
    const cryptoTickers = activeTickers.filter(
      (t) =>
        t.symbol.endsWith("-USD") ||
        t.symbol.endsWith("USDT") ||
        t.symbol.includes("BTC") ||
        t.symbol.includes("ETH") ||
        t.symbol.includes("SOL")
    );

    cryptoTickers.forEach((t) => {
      const unsub = realtimePriceStream.subscribe(t.symbol, (tick: RealtimePriceTick) => {
        if (!isMounted) return;
        setQuotes((prev) => {
          const old = prev[t.symbol];
          if (old && old.price !== tick.price) {
            triggerFlash(t.symbol, tick.price > old.price ? "up" : "down");
          }
          return {
            ...prev,
            [t.symbol]: {
              symbol: t.symbol,
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

    // 3. Intervalo de actualización para acciones (aprovecha la caché Edge del Worker a 10s)
    const interval = setInterval(loadTickerQuotes, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      unsubscribers.forEach((u) => u());
      Object.values(flashTimers.current).forEach((tm) => clearTimeout(tm));
    };
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-2xs">
      <div className="flex items-center gap-4 min-w-max">
        <div className="flex items-center gap-2 border-r border-[#e5e7eb] pr-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0b1727]">
            En Vivo 1s
          </span>
        </div>

        {activeTickers.map((t) => {
          const q = quotes[t.symbol];
          const isUp = q ? q.change_24h_pct >= 0 : true;
          const flash = flashStates[t.symbol];

          let flashClasses = "border-[#f1f5f9] bg-[#fafaf9]";
          if (flash === "up") {
            flashClasses = "border-emerald-500 bg-emerald-50 text-emerald-900";
          } else if (flash === "down") {
            flashClasses = "border-red-500 bg-red-50 text-red-900";
          }

          return (
            <button
              key={t.symbol}
              type="button"
              onClick={() => onSelectSymbol && onSelectSymbol(t.symbol)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition duration-200 hover:border-[#0b1727] hover:bg-white ${flashClasses}`}
            >
              <span className="font-bold text-[#0b1727]">{t.symbol}</span>
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
