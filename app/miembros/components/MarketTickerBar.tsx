"use client";

import React, { useEffect, useState } from "react";
import { POPULAR_TICKERS } from "../constants/groups";
import { fetchQuote } from "../services/paperApi";
import { LiveMarketQuote } from "../types/paper-trading";

export const MarketTickerBar: React.FC<{ onSelectSymbol?: (symbol: string) => void }> = ({
  onSelectSymbol,
}) => {
  const [quotes, setQuotes] = useState<Record<string, LiveMarketQuote>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadTickerQuotes = async () => {
      const results: Record<string, LiveMarketQuote> = {};
      const symbols = POPULAR_TICKERS.map((t) => t.symbol);
      
      await Promise.allSettled(
        symbols.map(async (s) => {
          try {
            const q = await fetchQuote(s);
            if (isMounted) results[s] = q;
          } catch {
            // Manejar silenciosamente cotizaciones individuales
          }
        })
      );

      if (isMounted) {
        setQuotes(results);
        setLoading(false);
      }
    };

    loadTickerQuotes();
    const interval = setInterval(loadTickerQuotes, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-2xs">
      <div className="flex items-center gap-4 min-w-max">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748b] border-r border-[#e5e7eb] pr-3">
          Cotizaciones en Vivo
        </span>
        {POPULAR_TICKERS.map((t) => {
          const q = quotes[t.symbol];
          const isUp = q ? q.change_24h_pct >= 0 : true;
          return (
            <button
              key={t.symbol}
              type="button"
              onClick={() => onSelectSymbol && onSelectSymbol(t.symbol)}
              className="flex items-center gap-2 rounded-lg border border-[#f1f5f9] bg-[#fafaf9] px-3 py-1.5 text-xs transition hover:border-[#0b1727] hover:bg-white"
            >
              <span className="font-bold text-[#0b1727]">{t.symbol}</span>
              {q ? (
                <>
                  <span className="font-mono text-[#334155]">
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
