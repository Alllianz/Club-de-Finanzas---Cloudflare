"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/site-shell";
import { useMemberAuth } from "@/context/MemberAuthContext";
import { GroupTradingProvider, useGroupTrading } from "./context/GroupTradingContext";
import { GroupLoginCard } from "./components/GroupLoginCard";
import { PaperTradingDashboard } from "./components/PaperTradingDashboard";

function MiembrosPageContent() {
  const { member, isLoading: isMemberLoading, register, requestOtp, verifyOtp, logout: memberLogout } =
    useMemberAuth();
  const { currentGroup, isLoading: isGroupLoading } = useGroupTrading();

  // Sección principal activa: "paper_trading" (Grupos) o "individual" (Miembros individuales)
  const [section, setSection] = useState<"paper_trading" | "individual">("paper_trading");

  // Estados de vista y formularios individuales
  const [tab, setTab] = useState<"register" | "login">("login");

  // Formulario Registro Individual
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Formulario Login Individual con OTP
  const [loginEmail, setLoginEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [debugCode, setDebugCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Manejador de Registro Manual
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setRegError("Por favor completá todos los campos requeridos.");
      setRegLoading(false);
      return;
    }

    const res = await register(fullName, email, phone);
    setRegLoading(false);
    if (!res.success) {
      setRegError(res.error || "Ocurrió un error al procesar tu solicitud.");
    }
  };

  // Manejador de Solicitud de OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    if (!loginEmail.trim()) {
      setLoginError("Por favor ingresá tu correo institucional o personal.");
      setLoginLoading(false);
      return;
    }

    const res = await requestOtp(loginEmail);
    setLoginLoading(false);
    if (res.success) {
      setOtpSent(true);
      if (res.debugCode) {
        setDebugCode(res.debugCode);
      }
    } else {
      setLoginError(res.error || "No se pudo emitir el código de acceso.");
    }
  };

  // Manejador de Verificación de OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    if (!otpCode.trim()) {
      setLoginError("Por favor ingresá el código de 6 dígitos.");
      setLoginLoading(false);
      return;
    }

    const res = await verifyOtp(loginEmail, otpCode);
    setLoginLoading(false);
    if (!res.success) {
      setLoginError(res.error || "Código incorrecto o expirado.");
    }
  };

  const isLoading = isMemberLoading || isGroupLoading;

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/miembros" />

      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0b1727] border-t-transparent" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">
              Cargando Portal de Miembros...
            </p>
          </div>
        </div>
      ) : (
        <main className="py-10 md:py-16">
          <div className="mx-auto w-[min(1320px,94vw)]">
            {/* Selector de Nivel Superior: Paper Trading (Grupos) vs Portal Individual */}
            <div className="mb-10 flex flex-col items-center justify-between gap-4 border-b border-[#e5e7eb] pb-6 sm:flex-row">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-4 bg-[#b89047]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                    Facultad de Ciencias Económicas · UBA
                  </span>
                </div>
                <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
                  Portal Exclusivo de Miembros
                </h1>
              </div>

              <div className="inline-flex rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-1 shadow-xs">
                <button
                  type="button"
                  onClick={() => setSection("paper_trading")}
                  className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                    section === "paper_trading"
                      ? "bg-[#0b1727] text-white shadow-xs"
                      : "text-[#64748b] hover:text-[#0b1727]"
                  }`}
                >
                  ⚡ Paper Trading (Grupos 1 - 6)
                </button>
                <button
                  type="button"
                  onClick={() => setSection("individual")}
                  className={`rounded-lg px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                    section === "individual"
                      ? "bg-[#0b1727] text-white shadow-xs"
                      : "text-[#64748b] hover:text-[#0b1727]"
                  }`}
                >
                  📚 Tesis & Research
                </button>
              </div>
            </div>

            {/* =========================================================================
                SECCIÓN A: PAPER TRADING INSTITUCIONAL PARA LOS 6 GRUPOS
               ========================================================================= */}
            {section === "paper_trading" && (
              <div>
                {currentGroup ? (
                  <PaperTradingDashboard />
                ) : (
                  <div className="py-8">
                    <GroupLoginCard />
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                SECCIÓN B: PORTAL INDIVIDUAL (TESIS, RESEARCH Y OPTIMIZADOR)
               ========================================================================= */}
            {section === "individual" && (
              <div>
                {!member ? (
                  <div className="mx-auto max-w-2xl py-6">
                    <div className="text-center">
                      <h2 className="font-serif text-3xl font-bold tracking-tight text-[#0b1727]">
                        Ingreso a Research & Descargas
                      </h2>
                      <p className="mt-2 text-xs text-[#64748b]">
                        Accedé a las publicaciones, carteras recomendadas y tesis del Club.
                      </p>

                      <div className="mt-6 flex justify-center">
                        <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#ffffff] p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setTab("login");
                              setLoginError("");
                            }}
                            className={`rounded-md px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                              tab === "login"
                                ? "bg-[#0b1727] text-white shadow-xs"
                                : "text-[#64748b] hover:text-[#0b1727]"
                            }`}
                          >
                            Ingresar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTab("register");
                              setRegError("");
                            }}
                            className={`rounded-md px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                              tab === "register"
                                ? "bg-[#0b1727] text-white shadow-xs"
                                : "text-[#64748b] hover:text-[#0b1727]"
                            }`}
                          >
                            Registrarme
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 rounded-2xl border border-[#e5e7eb] bg-[#ffffff] p-8 shadow-sm">
                      {tab === "register" ? (
                        <form onSubmit={handleRegister} className="space-y-4">
                          {regError && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                              {regError}
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                              Nombre y Apellido Completo
                            </label>
                            <input
                              type="text"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Ej. Martín González"
                              required
                              className="mt-1.5 w-full rounded-md border border-[#cbd5e1] px-4 py-2.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                              Correo Electrónico
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="tuemail@economicas.uba.ar"
                              required
                              className="mt-1.5 w-full rounded-md border border-[#cbd5e1] px-4 py-2.5 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                              Teléfono / WhatsApp
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+54 9 11 1234-5678"
                              required
                              className="mt-1.5 w-full rounded-md border border-[#cbd5e1] px-4 py-2.5 text-sm"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={regLoading}
                            className="w-full rounded-md bg-[#0b1727] py-3 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#1e3a8a] disabled:opacity-60"
                          >
                            {regLoading ? "Registrando..." : "Crear Cuenta de Miembro →"}
                          </button>
                        </form>
                      ) : (
                        <div>
                          {loginError && (
                            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                              {loginError}
                            </div>
                          )}
                          {!otpSent ? (
                            <form onSubmit={handleRequestOtp} className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                                  Correo Electrónico Registrado
                                </label>
                                <input
                                  type="email"
                                  value={loginEmail}
                                  onChange={(e) => setLoginEmail(e.target.value)}
                                  placeholder="tuemail@ejemplo.com"
                                  required
                                  className="mt-1.5 w-full rounded-md border border-[#cbd5e1] px-4 py-2.5 text-sm"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full rounded-md bg-[#0b1727] py-3 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#1e3a8a] disabled:opacity-60"
                              >
                                {loginLoading ? "Enviando..." : "Solicitar Código de Acceso →"}
                              </button>
                            </form>
                          ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                              <div className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-3 text-xs text-[#0b1727]">
                                Código enviado a: <strong>{loginEmail}</strong>
                                {debugCode && (
                                  <div className="mt-1 font-mono text-xs font-bold text-[#1e3a8a]">
                                    [MODO PRUEBA]: {debugCode}
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                                  Código de Verificación (6 dígitos)
                                </label>
                                <input
                                  type="text"
                                  value={otpCode}
                                  onChange={(e) => setOtpCode(e.target.value)}
                                  placeholder="123456"
                                  maxLength={6}
                                  required
                                  className="mt-1.5 w-full rounded-md border border-[#cbd5e1] px-4 py-2.5 text-center font-mono text-xl tracking-[0.2em]"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full rounded-md bg-[#0b1727] py-3 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#1e3a8a] disabled:opacity-60"
                              >
                                {loginLoading ? "Validando..." : "Acceder al Portal →"}
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Header Miembro Individual */}
                    <div className="flex flex-col justify-between gap-4 rounded-xl border border-[#0b1727] bg-[#0b1727] p-6 text-white md:flex-row md:items-center">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
                          Miembro Registrado
                        </span>
                        <h2 className="mt-1 font-serif text-2xl font-bold">{member.fullName}</h2>
                        <p className="text-xs text-[#94a3b8]">{member.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={memberLogout}
                        className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-white/20"
                      >
                        Cerrar Sesión Individual
                      </button>
                    </div>

                    {/* Contenido Reservado */}
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      <article className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-7 shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a] bg-[#f8fafc] border border-[#e5e7eb] px-2.5 py-1 rounded">
                            Simulador
                          </span>
                          <h3 className="mt-4 font-serif text-xl font-bold text-[#0b1727]">
                            Optimizador Cuantitativo Markowitz
                          </h3>
                          <p className="mt-2 text-xs text-[#64748b]">
                            Frontera eficiente y asignación óptima de carteras con matriz de covarianzas.
                          </p>
                        </div>
                        <div className="mt-6">
                          <Link
                            href="/miembros/portafolio"
                            className="inline-flex w-full items-center justify-center rounded-md bg-[#0b1727] py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-[#1e3a8a]"
                          >
                            Abrir Simulador →
                          </Link>
                        </div>
                      </article>

                      <article className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-7 shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a] bg-[#f8fafc] border border-[#e5e7eb] px-2.5 py-1 rounded">
                            Research
                          </span>
                          <h3 className="mt-4 font-serif text-xl font-bold text-[#0b1727]">
                            Estrategia & Portafolio 2026
                          </h3>
                          <p className="mt-2 text-xs text-[#64748b]">
                            Asignación macro y análisis de riesgo elaborado por los comités del Club.
                          </p>
                        </div>
                        <div className="mt-6">
                          <a
                            href="/Portafolio.pdf"
                            download="Portfolio_Club_de_Finanzas_UBA.pdf"
                            className="inline-flex w-full items-center justify-center rounded-md border border-[#0b1727] py-2.5 text-xs font-bold text-[#0b1727] hover:bg-[#0b1727] hover:text-white"
                          >
                            Descargar Portafolio PDF ↓
                          </a>
                        </div>
                      </article>

                      <article className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-7 shadow-xs">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a] bg-[#f8fafc] border border-[#e5e7eb] px-2.5 py-1 rounded">
                            Tesis Fundamental
                          </span>
                          <h3 className="mt-4 font-serif text-xl font-bold text-[#0b1727]">
                            Tesis MercadoLibre (MELI)
                          </h3>
                          <p className="mt-2 text-xs text-[#64748b]">
                            Valuación DCF por flujos descontados, ventajas competitivas y múltiplos.
                          </p>
                        </div>
                        <div className="mt-6">
                          <a
                            href="/Research.pdf"
                            download="Research_MELI_Club_de_Finanzas_UBA.pdf"
                            className="inline-flex w-full items-center justify-center rounded-md border border-[#0b1727] py-2.5 text-xs font-bold text-[#0b1727] hover:bg-[#0b1727] hover:text-white"
                          >
                            Descargar Research PDF ↓
                          </a>
                        </div>
                      </article>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      <SiteFooter />
    </div>
  );
}

export default function MiembrosPage() {
  return (
    <GroupTradingProvider>
      <MiembrosPageContent />
    </GroupTradingProvider>
  );
}
