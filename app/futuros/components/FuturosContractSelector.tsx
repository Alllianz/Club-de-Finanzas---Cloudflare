"use client";

import React, { useState } from "react";
import { FUTURES_CONTRACTS, FutureContractDef } from "../constants/contracts";

interface FuturosContractSelectorProps {
  selectedSymbol: string;
  onSelectContract: (contract: FutureContractDef) => void;
}

export const FuturosContractSelector: React.FC<FuturosContractSelectorProps> = ({
  selectedSymbol,
  onSelectContract,
}) => {
  const [filterCategory, setFilterCategory] = useState<"ALL" | "FX" | "Commodity" | "Index" | "Crypto">("ALL");

  const filteredContracts = FUTURES_CONTRACTS.filter((c) =>
    filterCategory === "ALL" ? true : c.category === filterCategory
  );

  return (
    <div className="space-y-3 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f1f5f9] pb-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0062ff]">
            Universo de Derivados
          </span>
          <h3 className="font-serif text-base font-bold text-[#0b1727]">
            Contratos de Futuros Disponibles
          </h3>
        </div>

        {/* Filtros de Categoría */}
        <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-1 text-xs">
          {(["ALL", "FX", "Commodity", "Index", "Crypto"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                filterCategory === cat
                  ? "bg-[#0b1727] text-white shadow-2xs"
                  : "text-[#64748b] hover:text-[#0b1727]"
              }`}
            >
              {cat === "ALL" ? "Todos" : cat === "FX" ? "Dólar Rofex" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Contratos */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredContracts.map((contract) => {
          const isSelected = contract.symbol === selectedSymbol;
          return (
            <button
              key={contract.symbol}
              type="button"
              onClick={() => onSelectContract(contract)}
              className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                isSelected
                  ? "border-[#0062ff] bg-[#f0f6ff] shadow-xs ring-1 ring-[#0062ff]"
                  : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1] hover:bg-[#fafaf9]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-[#0b1727]">
                    {contract.symbol}
                  </span>
                  <div className="text-[11px] font-semibold text-[#475569]">
                    {contract.name}
                  </div>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    contract.category === "FX"
                      ? "bg-blue-100 text-blue-700"
                      : contract.category === "Commodity"
                      ? "bg-amber-100 text-amber-700"
                      : contract.category === "Index"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {contract.category}
                </span>
              </div>

              <div className="mt-2.5 flex items-center justify-between border-t border-[#e2e8f0]/60 pt-2 text-[10px] text-[#64748b]">
                <span>Apalancamiento: <strong className="text-[#0b1727]">hasta {contract.maxLeverage}x</strong></span>
                {contract.maturityDate && (
                  <span>Vto: <strong className="text-[#0b1727]">{contract.maturityDate}</strong></span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
