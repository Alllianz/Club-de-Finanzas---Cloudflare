"use client";

import React, { useEffect, useState } from "react";
import { fetchQuote } from "@/app/miembros/services/paperApi";
import { LiveMarketQuote } from "@/app/miembros/types/paper-trading";
import { FUTURES_CONTRACTS, FutureContractDef } from "../constants/contracts";

interface FuturosMarketBarProps {
  selectedSymbol: string;
  onSelectContract: (contract: FutureContractDef) => void;
}

export const FuturosMarketBar: React.FC<FuturosMarketBarProps> = ({
  selectedSymbol,
  onSelectContract,
}) => {
  const [quotes, setQuotes] = useState<Record<string, LiveMarketQuote>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadQuotes = async () => {
      const results: Record<string, LiveMarketQuote> = {};
      await Promise.allSettled(
        FUTURES_CONTRACTS.map(async (c) => {
          try {
            const q = await fetchQuote(c.symbol);
            if (isMounted) results[c.symbol] = q;
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

    loadQuotes();
    const interval = setInterval(loadQuotes, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-white p-3 shadow-2xs">
      <div className="flex items-center gap-3 min-w-max">
        <div className="flex items-center gap-2 border-r border-[#e5e7eb] pr-3">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b1727]">
            Citas de Derivados en Vivo
          </span>
        </div>

        {FUTURES_CONTRACTS.map((contract) => {
          const q = quotes[contract.symbol];
          const isSelected = contract.symbol === selectedSymbol;

          return (
            <button
              key={contract.symbol}
              type="button"
              onClick={() => onSelectContract(contract)}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 text-left transition-all ${
                isSelected
                  ? "border-[#0062ff] bg-[#f0f6ff] shadow-xs"
                  : "border-[#f1f5f9] bg-[#fafaf9] hover:border-[#cbd5e1] hover:bg-white"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-[#0b1727]">
                    {contract.symbol}
                  </span>
                  <span className="text-[9px] text-[#64748b]">{contract.name.split(" ")[0]}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-[#64748b]">
                  {contract.category}
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-xs font-bold text-[#0b1727]">
                  {q ? `$${q.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "..."}
                </div>
                {q && (
                  <div
                    className={`font-mono text-[10px] font-bold ${
                      q.change_24h_pct >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {q.change_24h_pct >= 0 ? "+" : ""}
                    {q.change_24h_pct.toFixed(2)}%
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
