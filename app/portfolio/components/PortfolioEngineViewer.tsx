"use client";

import React, { useState } from "react";
import { GroupTradingProvider, useGroupTrading } from "@/app/miembros/context/GroupTradingContext";
import { PaperTradingDashboard } from "@/app/miembros/components/PaperTradingDashboard";
import { TournamentManagementPanel } from "@/app/miembros/components/TournamentManagementPanel";

function PortfolioEngineViewerInner() {
  const { currentGroup, login, logout, isActionLoading } = useGroupTrading();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"paper" | "markowitz" | "tournament">("paper");

  // Formulario modal de login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpenClick = () => {
    if (currentGroup) {
      setIsOpen(!isOpen);
    } else {
      setErrorMsg("");
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const res = await login(username, password);
    if (res.success) {
      setShowLoginModal(false);
      setIsOpen(true);
      setUsername("");
      setPassword("");
    } else {
      setErrorMsg(res.error || "Usuario o contraseña incorrectos. Verifique sus credenciales.");
    }
  };

  const handleLogout = () => {
    logout();
    setIsOpen(false);
    setIsFullscreen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Institucional al fondo de Portafolio */}
      <div className="flex flex-col gap-6 rounded-3xl border border-[#e5e7eb] bg-[#0b1727] p-6 text-white shadow-md md:flex-row md:items-center md:justify-between lg:p-8">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-[2px] w-5 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
              Motor Cuantitativo Oficial & Paper Trading Aegis
            </span>
            {currentGroup && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentGroup.name} · {currentGroup.assignedAsset}
              </span>
            )}
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Laboratorio de Portafolio & Paper Trading Aegis
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#94a3b8] sm:text-sm">
            Terminal de simulación de trading en vivo para los Grupos 1 al 6, modelado de Markowitz, análisis IS/OOS y gestión de riesgo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {currentGroup ? (
            <>
              <button
                type="button"
                onClick={handleOpenClick}
                className="inline-flex items-center gap-2 rounded-xl bg-[#b89047] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-sm transition hover:bg-[#a67c33] active:scale-[0.99]"
              >
                <span>{isOpen ? "Ocultar Terminal" : "Abrir"}</span>
                <span>{isOpen ? "↑" : "↓"}</span>
              </button>
              {isOpen && activeTab === "markowitz" && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white hover:text-[#0b1727]"
                >
                  {isFullscreen ? "Reducir Tamaño" : "Maximizar Pantalla"}
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-white/10 bg-transparent px-3 py-3 text-xs font-semibold text-[#94a3b8] transition hover:text-white"
                title="Cerrar sesión de grupo"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleOpenClick}
              disabled={isActionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b89047] to-[#d4af37] px-7 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            >
              <span>Ingresar</span>
              <span>→</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Institucional de Inicio de Sesión de Grupos */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-[#e5e7eb] bg-white p-8 text-[#0b1727] shadow-2xl">
            <button
              type="button"
              onClick={() => setShowLoginModal(false)}
              className="absolute right-5 top-5 rounded-full p-2 text-[#64748b] transition hover:bg-[#f1f5f9] hover:text-[#0b1727]"
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            <div className="flex items-center gap-2">
              <span className="h-[2px] w-4 bg-[#b89047]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0062ff]">
                Acceso al Terminal Institucional
              </span>
            </div>

            <h3 className="mt-2 text-xl font-bold tracking-tight text-[#0e2246]">
              Paper Trading & Motor Cuantitativo
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Ingresá con tu usuario y contraseña (Allianz o Grupo) para operar en el terminal de simulación.
            </p>

            {/* Selección rápida de usuario (requiere ingresar contraseña manualmente) */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
              <span className="w-full text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                Seleccionar usuario:
              </span>
              <button
                type="button"
                onClick={() => {
                  setUsername("Allianz");
                  setPassword("");
                  setErrorMsg("");
                }}
                className="rounded-md bg-[#b89047] px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-[#a67c33]"
              >
                👑 Allianz
              </button>
              {[
                { name: "G1", user: "Grupo 1" },
                { name: "G2", user: "Grupo 2" },
                { name: "G3", user: "Grupo 3" },
                { name: "G4", user: "Grupo 4" },
                { name: "G5", user: "Grupo 5" },
                { name: "G6", user: "Grupo 6" },
              ].map((g) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => {
                    setUsername(g.user);
                    setPassword("");
                    setErrorMsg("");
                  }}
                  className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-[10px] font-mono font-bold text-[#475569] transition hover:bg-[#0062ff] hover:text-white hover:border-[#0062ff]"
                >
                  {g.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Usuario
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Allianz o Grupo 1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5 text-sm text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5 text-sm text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
                />
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="w-full rounded-xl bg-[#0b1727] py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-md transition hover:bg-[#1e3a8a] disabled:opacity-50"
                >
                  {isActionLoading ? "Verificando..." : "Ingresar"}
                </button>
              </div>

              <div className="border-t border-[#f1f5f9] pt-3 text-center">
                <p className="text-[11px] text-[#94a3b8]">
                  Usuarios autorizados: Allianz · Grupo 1 al 6 · Capital inicial: $10,000 USD
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÁREA EXPANDIDA: Paper Trading Dashboard + Motor Cuantitativo */}
      {isOpen && currentGroup && (
        <div className="space-y-6 rounded-3xl border border-[#e5e7eb] bg-[#fafaf9] p-6 shadow-sm">
          {/* Selector de Herramienta Interna */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e7eb] pb-4">
            <div className="inline-flex rounded-xl border border-[#e5e7eb] bg-white p-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab("paper")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                  activeTab === "paper"
                    ? "bg-[#0b1727] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0b1727]"
                }`}
              >
                <span>⚡ Paper Trading Aegis (Terminal en Vivo)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("markowitz")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                  activeTab === "markowitz"
                    ? "bg-[#0b1727] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0b1727]"
                }`}
              >
                <span>📈 Motor Cuantitativo (Markowitz & IS/OOS)</span>
              </button>
              {currentGroup.id === "allianz" && (
                <button
                  type="button"
                  onClick={() => setActiveTab("tournament")}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                    activeTab === "tournament"
                      ? "bg-[#b89047] text-white shadow-xs"
                      : "text-[#b89047] hover:text-[#8c6729]"
                  }`}
                >
                  <span>🏆 Administrar Torneo (Allianz)</span>
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-[#64748b]">
              Operando como: <strong className="text-[#0b1727]">{currentGroup.name}</strong> ({currentGroup.assignedAsset})
            </span>
          </div>

          {/* VISTA 1: PAPER TRADING DASHBOARD (AEGIS) */}
          {activeTab === "paper" && (
            <div className="pt-2">
              <PaperTradingDashboard />
            </div>
          )}

          {/* VISTA 2: MOTOR CUANTITATIVO DE PORTAFOLIO */}
          {activeTab === "markowitz" && (
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
                    Modo Pantalla Completa · Club de Finanzas UBA · {currentGroup.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-red-700"
                  >
                    ✕ Salir de Pantalla Completa
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
          )}

          {/* VISTA 3: ADMINISTRACIÓN DE TORNEO (EXCLUSIVO ALLIANZ) */}
          {activeTab === "tournament" && currentGroup.id === "allianz" && (
            <div className="pt-2">
              <TournamentManagementPanel />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const PortfolioEngineViewer: React.FC = () => {
  return (
    <GroupTradingProvider marketType="PORTFOLIO">
      <PortfolioEngineViewerInner />
    </GroupTradingProvider>
  );
};
