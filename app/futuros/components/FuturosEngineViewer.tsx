"use client";

import React, { useState } from "react";
import { GroupTradingProvider, useGroupTrading } from "@/app/miembros/context/GroupTradingContext";
import { FuturosPaperTradingDashboard } from "./FuturosPaperTradingDashboard";
import { FuturosImplicitRateCard } from "./FuturosImplicitRateCard";
import { TournamentManagementPanel } from "@/app/miembros/components/TournamentManagementPanel";

function FuturosEngineViewerInner() {
  const { currentGroup, login, logout, isActionLoading } = useGroupTrading();
  const [isOpen, setIsOpen] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"paper" | "rates" | "tournament">("paper");

  // Formulario login modal
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Calculadora de Cobertura de Mínima Varianza
  const [spotVol, setSpotVol] = useState<number>(28.5);
  const [futureVol, setFutureVol] = useState<number>(31.0);
  const [correlation, setCorrelation] = useState<number>(0.92);
  const [portfolioValue, setPortfolioValue] = useState<number>(50000);

  const optimalHedgeRatio = futureVol > 0 ? correlation * (spotVol / futureVol) : 0;
  const hedgedValue = portfolioValue * optimalHedgeRatio;

  const handleOpenClick = () => {
    if (currentGroup) {
      setIsOpen(!isOpen);
    } else {
      setErrorMsg("");
      setShowLoginModal(true);
    }
  };

  const handleQuickLogin = async (user: string, pass: string) => {
    setErrorMsg("");
    const res = await login(user, pass);
    if (res.success) {
      setShowLoginModal(false);
      setIsOpen(true);
    } else {
      setErrorMsg(res.error || "No se pudo iniciar sesión.");
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
  };

  return (
    <div id="terminal-futuros" className="space-y-6">
      {/* Header Institucional de Futuros al fondo (idéntico al de Portafolio) */}
      <div className="flex flex-col gap-6 rounded-3xl border border-[#e5e7eb] bg-[#0b1727] p-6 text-white shadow-md md:flex-row md:items-center md:justify-between lg:p-8">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-[2px] w-5 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
              Motor Cuantitativo Oficial & Paper Trading de Futuros
            </span>
            {currentGroup && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {currentGroup.name} · {currentGroup.assignedAsset}
              </span>
            )}
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Laboratorio de Futuros & Paper Trading Aegis
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#94a3b8] sm:text-sm">
            Terminal de simulación de trading en vivo de contratos de futuros (Dólar Matba Rofex, Commodities, Índices y Cripto Perpetuos) para los Grupos 1 al 6 y Allianz, gestión de márgenes, monitoreo de curvas implícitas y torneos independientes.
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("allianz", "LuciaSape")}
                disabled={isActionLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#b89047] to-[#d4af37] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
              >
                <span>👑 Ingresar como Allianz</span>
                <span>→</span>
              </button>
              <button
                type="button"
                onClick={handleOpenClick}
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-white/20"
              >
                Ingresar Grupo
              </button>
            </div>
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
                Acceso Exclusivo de Grupo
              </span>
            </div>

            <h3 className="mt-2 text-xl font-bold tracking-tight text-[#0e2246]">
              Paper Trading en Futuros & Derivados
            </h3>
            <p className="mt-1 text-xs text-[#64748b]">
              Ingrese las credenciales oficiales de su grupo para acceder a la mesa de operaciones de derivados.
            </p>

            {/* Accesos directos rápidos */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5">
              <span className="w-full text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                Acceso rápido:
              </span>
              <button
                type="button"
                onClick={() => handleQuickLogin("allianz", "LuciaSape")}
                className="rounded-md bg-[#b89047] px-2.5 py-1 text-[10px] font-bold text-white transition hover:bg-[#a67c33]"
              >
                👑 Allianz
              </button>
              {[
                { name: "G1", pass: "Bitcoin" },
                { name: "G2", pass: "Ethereum" },
                { name: "G3", pass: "GGAL" },
                { name: "G4", pass: "YPF" },
                { name: "G5", pass: "AAPL" },
                { name: "G6", pass: "GOOG" },
              ].map((g, idx) => (
                <button
                  key={g.name}
                  type="button"
                  onClick={() => handleQuickLogin(`Grupo ${idx + 1}`, g.pass)}
                  className="rounded-md border border-[#cbd5e1] bg-white px-2 py-1 text-[10px] font-medium text-[#0b1727] transition hover:bg-[#f1f5f9]"
                >
                  {g.name}
                </button>
              ))}
            </div>

            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Usuario de Grupo
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Grupo 1 o Allianz"
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
                  {isActionLoading ? "Verificando..." : "Acceder al Terminal"}
                </button>
              </div>

              <div className="border-t border-[#f1f5f9] pt-3 text-center">
                <p className="text-[11px] text-[#94a3b8]">
                  Grupos autorizados: Grupo 1 al 6 · Allianz · Capital de torneo: $10,000 USD
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ÁREA EXPANDIDA: Paper Trading Dashboard + Motor Cuantitativo (Exactamente como en Portafolio) */}
      {isOpen && currentGroup && (
        <div className="space-y-6 rounded-3xl border border-[#e5e7eb] bg-[#fafaf9] p-6 shadow-sm">
          {/* Selector de Pestaña Operativa Interna (Exactamente como en Portafolio) */}
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
                <span>⚡ Paper Trading Aegis (Terminal de Futuros en Vivo)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rates")}
                className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                  activeTab === "rates"
                    ? "bg-[#0b1727] text-white shadow-xs"
                    : "text-[#64748b] hover:text-[#0b1727]"
                }`}
              >
                <span>📈 Curva de Tasas & Coberturas (CIP / h*)</span>
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
                  <span>🏆 Administrar Torneo de Futuros (Allianz)</span>
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-[#64748b]">
              Operando como: <strong className="text-[#0b1727]">{currentGroup.name}</strong> ({currentGroup.assignedAsset})
            </span>
          </div>

          {/* VISTA 1: PAPER TRADING DASHBOARD DE DERIVADOS (IDÉNTICO A PORTAFOLIO) */}
          {activeTab === "paper" && (
            <div className="pt-2">
              <FuturosPaperTradingDashboard />
            </div>
          )}

          {/* VISTA 2: HERRAMIENTAS CUANTITATIVAS (TASAS IMPLÍCITAS & COBERTURA DE MÍNIMA VARIANZA) */}
          {activeTab === "rates" && (
            <div className="space-y-6 pt-2">
              <FuturosImplicitRateCard />

              <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                <div className="border-b border-[#f1f5f9] pb-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0062ff]">
                    Gestión de Riesgo Cuantitativo
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#0b1727]">
                    Calculadora de Cobertura de Mínima Varianza (Minimum Variance Hedge Ratio)
                  </h3>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Determinación del ratio óptimo h* = ρ · (σ_S / σ_F) para inmunizar una cartera contra fluctuaciones de mercado.
                  </p>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-12">
                  <div className="space-y-4 lg:col-span-5">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Valor del Portafolio a Cubrir ($ USD)
                      </label>
                      <input
                        type="number"
                        value={portfolioValue}
                        onChange={(e) => setPortfolioValue(parseFloat(e.target.value) || 0)}
                        className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Volatilidad Anualizada del Spot σ_S (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={spotVol}
                        onChange={(e) => setSpotVol(parseFloat(e.target.value) || 0)}
                        className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Volatilidad Anualizada del Futuro σ_F (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={futureVol}
                        onChange={(e) => setFutureVol(parseFloat(e.target.value) || 0)}
                        className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-[#475569]">
                        Correlación Cruzada Spot-Futuro ρ (-1 a 1)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="-1"
                        max="1"
                        value={correlation}
                        onChange={(e) => setCorrelation(parseFloat(e.target.value) || 0)}
                        className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2 font-mono text-sm font-bold text-[#0b1727] outline-none transition focus:border-[#0062ff] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
                    <div className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#f0f6ff] p-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0062ff]">
                        Ratio Óptimo de Cobertura h*
                      </span>
                      <div className="my-2 font-mono text-3xl font-bold text-[#0e2246]">
                        {optimalHedgeRatio.toFixed(4)}
                      </div>
                      <p className="text-[10px] text-[#64748b]">
                        Por cada $1.00 de exposición spot se requieren ${optimalHedgeRatio.toFixed(2)} nocionales en futuros cortos.
                      </p>
                    </div>

                    <div className="flex flex-col justify-between rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1e3a8a]">
                        Posición Corta Nocional Requerida
                      </span>
                      <div className="my-2 font-mono text-2xl font-bold text-[#0e2246]">
                        ${hedgedValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </div>
                      <p className="text-[10px] text-[#64748b]">
                        Monto total a vender en contratos cortos de futuros para inmunizar la cartera.
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                        Efectividad de la Cobertura (R²)
                      </span>
                      <div className="my-1 font-mono text-xl font-bold text-emerald-600">
                        {((correlation * correlation) * 100).toFixed(1)}% de varianza explicada y reducida
                      </div>
                      <p className="text-[11px] text-[#64748b]">
                        El coeficiente de determinación indica la fracción de volatilidad eliminada mediante la posición corta en futuros.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 3: ADMINISTRACIÓN DE TORNEO DE FUTUROS (EXCLUSIVO ALLIANZ) */}
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

export const FuturosEngineViewer: React.FC = () => {
  return (
    <GroupTradingProvider marketType="FUTURES">
      <FuturosEngineViewerInner />
    </GroupTradingProvider>
  );
};
