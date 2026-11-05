"use client";

import React, { useState } from "react";
import Link from "next/link";

export const PortfolioEngineViewer: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Barra de Controles del Motor */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e5e7eb] bg-[#0b1727] p-5 text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-[2px] w-4 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
              Motor Cuantitativo Oficial
            </span>
          </div>
          <h2 className="mt-1 font-serif text-xl font-bold tracking-tight text-white sm:text-2xl">
            Laboratorio de Portafolio & Modelado de Inversión
          </h2>
          <p className="mt-0.5 text-xs text-[#94a3b8]">
            Optimización determinista de Markowitz, validación IS/OOS, tracking vs SPY y red neuronal de atención transversal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/motor-portafolio.html"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-[#0b1727]"
          >
            🖥️ Abrir en Ventana Completa ↗
          </a>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg bg-[#b89047] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#a67c33]"
          >
            {isFullscreen ? "Reducir Tamaño" : "Maximizar Pantalla"}
          </button>
        </div>
      </div>

      {/* Visor Integrado de la Aplicación */}
      <div
        className={`w-full overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm transition-all ${
          isFullscreen
            ? "fixed inset-0 z-50 h-screen w-screen rounded-none border-none p-0"
            : "h-[850px] min-h-[700px]"
        }`}
      >
        {isFullscreen && (
          <div className="flex items-center justify-between bg-[#0b1727] px-6 py-2.5 text-white">
            <span className="text-xs font-bold uppercase tracking-wider text-[#93c5fd]">
              Modo Pantalla Completa · Club de Finanzas UBA
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
            >
              ✕ Cerrar Pantalla Completa
            </button>
          </div>
        )}
        <iframe
          src="/motor-portafolio.html"
          title="Motor Analítico de Portafolio - Club de Finanzas UBA"
          className="h-full w-full border-none"
          allow="clipboard-write; fullscreen"
        />
      </div>
    </div>
  );
};
