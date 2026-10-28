"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/site-shell";
import { useMemberAuth } from "@/context/MemberAuthContext";

export default function MiembrosPage() {
  const { member, isLoading, register, requestOtp, verifyOtp, logout } = useMemberAuth();

  // Estados de vista y formularios
  const [tab, setTab] = useState<"register" | "login">("register");

  // Formulario Registro
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Formulario Login
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
      ) : !member ? (
        /* VISTA NO AUTENTICADA: REGISTRO Y LOGIN EDITORIAL */
        <main className="py-14 md:py-20 bg-[#fafaf9] border-b border-[#e5e7eb]">
          <div className="mx-auto w-[min(1280px,92vw)]">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="font-serif text-3xl font-bold tracking-tight text-[#0b1727] sm:text-4xl md:text-5xl">
                Portal de Miembros
              </h1>

              {/* Selector de Pestañas Elegante */}
              <div className="mt-8 flex justify-center">
                <div className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#ffffff] p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("register");
                      setRegError("");
                    }}
                    className={`rounded-md px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                      tab === "register"
                        ? "bg-[#0b1727] text-white shadow-xs"
                        : "text-[#64748b] hover:text-[#0b1727]"
                    }`}
                  >
                    Registrarme
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("login");
                      setLoginError("");
                    }}
                    className={`rounded-md px-6 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition-all ${
                      tab === "login"
                        ? "bg-[#0b1727] text-white shadow-xs"
                        : "text-[#64748b] hover:text-[#0b1727]"
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </div>
            </div>

            {/* Contenedor del Formulario */}
            <div className="mx-auto mt-10 max-w-lg">
              <div className="rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-8 md:p-10 shadow-xs">
                {tab === "register" ? (
                  /* FORMULARIO DE REGISTRO */
                  <div>
                    <div className="mb-6 border-b border-[#f1f5f9] pb-4">
                      <h2 className="font-serif text-xl font-bold text-[#0b1727]">
                        Formulario de Registro
                      </h2>
                      <p className="mt-1 text-xs text-[#64748b]">
                        Completá tus datos para dar de alta tu acceso a la plataforma.
                      </p>
                    </div>

                    {regError && (
                      <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                        {regError}
                      </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4.5">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                          Nombre y Apellido <span className="text-[#b89047]">*</span>
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ej. Mateo Yastor"
                          required
                          className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] transition-colors focus:border-[#0b1727] focus:outline-none focus:ring-1 focus:ring-[#0b1727]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                          Correo Electrónico <span className="text-[#b89047]">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tuemail@ejemplo.com"
                          required
                          className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] transition-colors focus:border-[#0b1727] focus:outline-none focus:ring-1 focus:ring-[#0b1727]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                          Número de Teléfono (WhatsApp) <span className="text-[#b89047]">*</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. +54 9 11 1234-5678"
                          required
                          className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] transition-colors focus:border-[#0b1727] focus:outline-none focus:ring-1 focus:ring-[#0b1727]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={regLoading}
                        className="mt-6 w-full rounded-md bg-[#0b1727] py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a] disabled:opacity-60"
                      >
                        {regLoading ? "Procesando registro..." : "Completar Registro e Ingresar →"}
                      </button>
                    </form>

                    <div className="mt-7 border-t border-[#f1f5f9] pt-4 text-center">
                      <p className="text-xs text-[#64748b]">
                        ¿Ya tenés cuenta creada?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("login")}
                          className="font-bold text-[#0b1727] hover:underline"
                        >
                          Iniciá sesión aquí
                        </button>
                      </p>
                    </div>
                  </div>
                ) : (
                  /* FORMULARIO DE LOGIN CON OTP */
                  <div>
                    <div className="mb-6 border-b border-[#f1f5f9] pb-4">
                      <h2 className="font-serif text-xl font-bold text-[#0b1727]">
                        Ingreso de Miembros
                      </h2>
                      <p className="mt-1 text-xs text-[#64748b]">
                        Ingresá tu correo para recibir un código de seguridad temporal.
                      </p>
                    </div>

                    {loginError && (
                      <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                        {loginError}
                      </div>
                    )}

                    {!otpSent ? (
                      <form onSubmit={handleRequestOtp} className="space-y-4.5">
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
                            className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] transition-colors focus:border-[#0b1727] focus:outline-none focus:ring-1 focus:ring-[#0b1727]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loginLoading}
                          className="mt-6 w-full rounded-md bg-[#0b1727] py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a] disabled:opacity-60"
                        >
                          {loginLoading ? "Enviando..." : "Solicitar Código de Acceso →"}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4.5">
                        <div className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] p-3 text-xs text-[#0b1727]">
                          Código enviado a: <strong>{loginEmail}</strong>
                          {debugCode && (
                            <div className="mt-1.5 font-mono text-xs font-bold text-[#1e3a8a]">
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
                            className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-[#0b1727] focus:border-[#0b1727] focus:outline-none focus:ring-1 focus:ring-[#0b1727]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loginLoading}
                          className="mt-6 w-full rounded-md bg-[#0b1727] py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a] disabled:opacity-60"
                        >
                          {loginLoading ? "Validando..." : "Acceder al Portal →"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="w-full text-center text-xs font-semibold text-[#64748b] hover:text-[#0b1727]"
                        >
                          ← Utilizar otro correo
                        </button>
                      </form>
                    )}

                    <div className="mt-7 border-t border-[#f1f5f9] pt-4 text-center">
                      <p className="text-xs text-[#64748b]">
                        ¿Aún no tenés cuenta?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("register")}
                          className="font-bold text-[#0b1727] hover:underline"
                        >
                          Registrate aquí
                        </button>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* VISTA AUTENTICADA: PORTAL EXCLUSIVO DE MIEMBROS */
        <main className="py-14 md:py-20">
          <div className="mx-auto w-[min(1320px,92vw)] space-y-12">
            {/* Cabecera Institucional del Miembro */}
            <div className="flex flex-col justify-between gap-6 rounded-xl border border-[#e5e7eb] bg-[#0b1727] p-8 text-white shadow-sm md:flex-row md:items-center md:p-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-4 bg-[#b89047]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
                    Miembro Oficial
                  </span>
                </div>
                <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                  {member.fullName}
                </h1>
                <p className="mt-2 text-sm text-[#94a3b8]">
                  {member.email} {member.phone && member.phone !== "No especificado" ? `· ${member.phone}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center rounded-md border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#0b1727]"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>

            {/* Cuadrícula de Contenido Reservado */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Tarjeta 1: Informes y Modelos en PDF */}
              <article className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-7 shadow-xs transition hover:border-[#0b1727]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a] bg-[#f8fafc] border border-[#e5e7eb] px-2.5 py-1 rounded">
                    Research & Portfolio
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-bold text-[#0b1727]">
                    Tesis e Informes Cuantitativos
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                    Acceso a modelos financieros, reportes de asignación de activos y documentos elaborados por los comités del Club.
                  </p>

                  <ul className="mt-5 space-y-3">
                    <li className="flex flex-col justify-between gap-2.5 rounded-lg border border-[#e5e7eb] bg-[#fafaf9] p-4">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#1e3a8a] bg-white border border-[#e5e7eb] px-1.5 py-0.5 rounded">
                          Aplicación
                        </span>
                        <p className="mt-1 text-xs font-bold text-[#0b1727]">
                          Optimizador Cuantitativo Markowitz
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#64748b]">
                          Frontera eficiente y simulación de carteras en vivo
                        </p>
                      </div>
                      <Link
                        href="/miembros/portafolio"
                        className="inline-flex items-center justify-center rounded-md bg-[#0b1727] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#1e3a8a]"
                      >
                        Abrir Simulador →
                      </Link>
                    </li>

                    <li className="flex flex-col justify-between gap-2 rounded-lg border border-[#f1f5f9] bg-[#ffffff] p-3">
                      <div>
                        <p className="text-xs font-bold text-[#0b1727]">Estrategia y Portafolio 2026</p>
                        <p className="text-[11px] text-[#64748b]">Asignación macro y análisis de riesgo</p>
                      </div>
                      <a
                        href="/Portafolio.pdf"
                        download="Portfolio_Club_de_Finanzas_UBA.pdf"
                        className="inline-flex items-center justify-center rounded-md border border-[#0b1727] px-3 py-1.5 text-xs font-bold text-[#0b1727] transition hover:bg-[#0b1727] hover:text-white"
                      >
                        Descargar PDF ↓
                      </a>
                    </li>

                    <li className="flex flex-col justify-between gap-2 rounded-lg border border-[#f1f5f9] bg-[#ffffff] p-3">
                      <div>
                        <p className="text-xs font-bold text-[#0b1727]">Tesis de Research: MercadoLibre (MELI)</p>
                        <p className="text-[11px] text-[#64748b]">DCF fundamental y múltiplos sectoriales</p>
                      </div>
                      <a
                        href="/Research.pdf"
                        download="Research_MELI_Club_de_Finanzas_UBA.pdf"
                        className="inline-flex items-center justify-center rounded-md border border-[#0b1727] px-3 py-1.5 text-xs font-bold text-[#0b1727] transition hover:bg-[#0b1727] hover:text-white"
                      >
                        Descargar PDF ↓
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 border-t border-[#f1f5f9] pt-4">
                  <span className="text-[11px] font-bold text-[#1e3a8a]">Descargas Oficiales Habilitadas</span>
                </div>
              </article>

              {/* Tarjeta 2: Red y Canales Oficiales */}
              <article className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-7 shadow-xs transition hover:border-[#0b1727]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a] bg-[#f8fafc] border border-[#e5e7eb] px-2.5 py-1 rounded">
                    Comunidad
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-bold text-[#0b1727]">
                    Canal Privado de Miembros
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                    Espacio de intercambio exclusivo para debatir tesis de inversión, coyuntura macro y oportunidades de mercado junto al equipo del Club.
                  </p>
                </div>
                <div className="mt-6 border-t border-[#f1f5f9] pt-4">
                  <a
                    href="https://whatsapp.com/channel/clubdefinanzasuba"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-md bg-[#0b1727] py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-xs transition hover:bg-[#1e3a8a]"
                  >
                    Ingresar al Canal →
                  </a>
                </div>
              </article>

              {/* Tarjeta 3: Formación y Talleres */}
              <article className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-7 shadow-xs transition hover:border-[#0b1727]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a] bg-[#f8fafc] border border-[#e5e7eb] px-2.5 py-1 rounded">
                    Académico
                  </span>
                  <h3 className="mt-4 font-serif text-xl font-bold text-[#0b1727]">
                    Talleres y Sesiones Formativas
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
                    Clases magistrales con referentes del mercado financiero, graduados y talleres cuantitativos presenciales y virtuales.
                  </p>

                  <div className="mt-5 rounded-lg border border-[#e5e7eb] bg-[#fafaf9] p-3.5 text-xs text-[#0b1727]">
                    <span className="font-bold">Ciclo Académico 2026:</span> Valuación por Flujos Descontados y Renta Fija Argentina.
                  </div>
                </div>
                <div className="mt-6 border-t border-[#f1f5f9] pt-4">
                  <span className="text-[11px] font-bold text-[#1e3a8a]">Acceso Habilitado</span>
                </div>
              </article>
            </div>
          </div>
        </main>
      )}

      <SiteFooter />
    </div>
  );
}
