"use client";

import React, { useState } from "react";
import { PortfolioEngineViewer } from "./PortfolioEngineViewer";

interface PortfolioPageTabsProps {
  children: React.ReactNode;
}

export const PortfolioPageTabs: React.FC<PortfolioPageTabsProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<"engine" | "content">("engine");

  return (
    <div className="space-y-8">
      {/* Selector Superior Elegante */}
      <div className="flex justify-center border-b border-[#e5e7eb] pb-6">
        <div className="inline-flex rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("engine")}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
              activeTab === "engine"
                ? "bg-[#0b1727] text-white shadow-xs"
                : "text-[#64748b] hover:text-[#0b1727]"
            }`}
          >
            <span>⚡ Motor Cuantitativo & Simulador</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
              activeTab === "content"
                ? "bg-[#0b1727] text-white shadow-xs"
                : "text-[#64748b] hover:text-[#0b1727]"
            }`}
          >
            <span>📑 Filosofía & Publicaciones</span>
          </button>
        </div>
      </div>

      {/* Contenido Dinámico */}
      {activeTab === "engine" ? (
        <PortfolioEngineViewer />
      ) : (
        <div className="space-y-16 md:space-y-20">{children}</div>
      )}
    </div>
  );
};
