"use client";

import { useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/site-shell";
import { useMemberAuth } from "@/context/MemberAuthContext";

export default function MiembrosPage() {
  const { member, isLoading, register, loginWithGoogle, requestOtp, verifyOtp, logout } = useMemberAuth();

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

  // Google Loading
  const [googleLoading, setGoogleLoading] = useState(false);

  // Manejador Google Sign-In
  const handleGoogleAuth = async () => {
    setRegError("");
    setLoginError("");
    setGoogleLoading(true);
    const res = await loginWithGoogle(phone);
    setGoogleLoading(false);
    if (!res.success) {
      if (tab === "register") {
        setRegError(res.error || "No se pudo completar el registro con Google.");
      } else {
        setLoginError(res.error || "No se pudo iniciar sesión con Google.");
      }
    }
  };

  // Manejador de Registro Manual
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setRegError("Por favor completá todos los campos.");
      setRegLoading(false);
      return;
    }

    const res = await register(fullName, email, phone);
    setRegLoading(false);
    if (!res.success) {
      setRegError(res.error || "Ocurrió un error al registrarte.");
    }
  };

  // Manejador de Solicitud de OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    if (!loginEmail.trim()) {
      setLoginError("Por favor ingresá tu correo electrónico.");
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
      setLoginError(res.error || "Error al solicitar código de acceso.");
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
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#0062ff] border-t-transparent" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Cargando Portal de Miembros...
            </p>
          </div>
        </div>
      ) : !member ? (
        /* VISTA NO AUTENTICADA: REGISTRO Y LOGIN */
        <main className="py-12 md:py-16">
          <div className="mx-auto w-[min(1280px,92vw)]">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#0062ff]">
                Comunidad Exclusiva
              </span>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0e2246] sm:text-4xl md:text-5xl">
                Área de Miembros
              </h1>
              <p className="mt-3 text-base text-[#64748b] sm:text-lg">
                Registrate para acceder a informes exclusivos, modelos de valuación en PDF, canales privados de debate y actividades del Club.
              </p>

              {/* Selector de Pestañas */}
              <div className="mt-8 flex justify-center">
                <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-1.5 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("register");
                      setRegError("");
                    }}
                    className={`rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                      tab === "register"
                        ? "bg-[#091a36] text-white shadow-sm"
                        : "text-[#64748b] hover:text-[#0e2246]"
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
                    className={`rounded-lg px-6 py-2.5 text-xs font-bold uppercase tracking-wider transition ${
                      tab === "login"
                        ? "bg-[#091a36] text-white shadow-sm"
                        : "text-[#64748b] hover:text-[#0e2246]"
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                </div>
              </div>
            </div>

            {/* Contenedor del Formulario */}
            <div className="mx-auto mt-10 max-w-xl">
              <div className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-8 shadow-[0_4px_24px_rgba(9,26,54,0.06)]">
                {/* Botón de Google Sign-In */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={googleLoading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#cbd5e1] bg-[#ffffff] py-3.5 px-4 text-xs font-bold text-[#0e2246] shadow-sm transition hover:bg-[#f8fafc] hover:border-[#0062ff] disabled:opacity-60"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>
                    {googleLoading ? "Conectando con Google..." : "Continuar con Google"}
                  </span>
                </button>

                {/* Divisor */}
                <div className="my-6 flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-[#e2e8f0]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                    o ingresá por formulario
                  </span>
                  <div className="h-[1px] flex-1 bg-[#e2e8f0]" />
                </div>

                {tab === "register" ? (
                  /* FORMULARIO DE REGISTRO MANUAL */
                  <div>
                    {regError && (
                      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                        {regError}
                      </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                          Nombre y Apellido
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ej. Fausto Crivelli"
                          required
                          className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 text-sm text-[#0e2246] placeholder-[#94a3b8] focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-[#0062ff]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                          Correo Electrónico
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tuemail@ejemplo.com"
                          required
                          className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 text-sm text-[#0e2246] placeholder-[#94a3b8] focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-[#0062ff]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                          Número de Teléfono (WhatsApp)
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Ej. +54 9 11 1234-5678"
                          required
                          className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 text-sm text-[#0e2246] placeholder-[#94a3b8] focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-[#0062ff]/20"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={regLoading}
                        className="mt-6 w-full rounded-xl bg-[#0062ff] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-60"
                      >
                        {regLoading ? "Registrando..." : "Registrarme e Ingresar →"}
                      </button>
                    </form>

                    <div className="mt-6 border-t border-[#f1f5f9] pt-4 text-center">
                      <p className="text-xs text-[#64748b]">
                        ¿Ya te registraste anteriormente?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("login")}
                          className="font-bold text-[#0062ff] hover:underline"
                        >
                          Iniciá sesión aquí
                        </button>
                      </p>
                    </div>
                  </div>
                ) : (
                  /* FORMULARIO DE LOGIN CON OTP */
                  <div>
                    {loginError && (
                      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                        {loginError}
                      </div>
                    )}

                    {!otpSent ? (
                      <form onSubmit={handleRequestOtp} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                            Correo Electrónico de Miembro
                          </label>
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            placeholder="tuemail@ejemplo.com"
                            required
                            className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 text-sm text-[#0e2246] placeholder-[#94a3b8] focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-[#0062ff]/20"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loginLoading}
                          className="mt-6 w-full rounded-xl bg-[#091a36] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#0062ff] disabled:opacity-60"
                        >
                          {loginLoading ? "Solicitando..." : "Solicitar Código de Acceso →"}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-3 text-xs text-[#0e2246]">
                          Código enviado a <strong>{loginEmail}</strong>
                          {debugCode && (
                            <div className="mt-1.5 font-mono font-bold text-[#0062ff]">
                              [DEV CODE]: {debugCode}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#0e2246]">
                            Código de 6 dígitos
                          </label>
                          <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="123456"
                            maxLength={6}
                            required
                            className="mt-1.5 w-full rounded-xl border border-[#cbd5e1] bg-[#ffffff] px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-[#0e2246] focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-[#0062ff]/20"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loginLoading}
                          className="mt-6 w-full rounded-xl bg-[#0062ff] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] disabled:opacity-60"
                        >
                          {loginLoading ? "Verificando..." : "Ingresar al Portal →"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setOtpSent(false)}
                          className="w-full text-center text-xs font-bold text-[#64748b] hover:text-[#0e2246]"
                        >
                          Cambiar correo
                        </button>
                      </form>
                    )}

                    <div className="mt-6 border-t border-[#f1f5f9] pt-4 text-center">
                      <p className="text-xs text-[#64748b]">
                        ¿Aún no sos miembro?{" "}
                        <button
                          type="button"
                          onClick={() => setTab("register")}
                          className="font-bold text-[#0062ff] hover:underline"
                        >
                          Registrate gratis
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
        <main className="py-12 md:py-16">
          <div className="mx-auto w-[min(1280px,92vw)] space-y-12">
            {/* Header de Bienvenida del Miembro */}
            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-[#e2e8f0] bg-gradient-to-r from-[#091a36] via-[#0e2246] to-[#091a36] p-8 text-white shadow-lg md:flex-row md:items-center md:p-10">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0062ff] text-xs font-bold text-white">
                    ✓
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#93c5fd]">
                    Miembro Oficial Verificado
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Hola, {member.fullName} 👋
                </h1>
                <p className="mt-2 text-sm text-[#94a3b8]">
                  {member.email} {member.phone && member.phone !== "No especificado" ? `· ${member.phone}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white hover:text-[#091a36]"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>

            {/* Cuadrícula de Contenido Exclusivo */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Tarjeta 1: Informes y Modelos en PDF */}
              <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-7 shadow-sm transition hover:border-[#0062ff]">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0062ff] text-xl text-white">
                    📄
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#0e2246]">
                    Reportes y Tesis Cuantitativas (PDF)
                  </h3>
                  <p className="mt-2 text-sm text-[#64748b]">
                    Accedé a los documentos completos de valuación, carteras de inversión y modelos financieros elaborados por el Club.
                  </p>
                  
                  <ul className="mt-4 space-y-3">
                    <li className="flex flex-col justify-between gap-2 rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-3.5 transition hover:bg-[#e6f0ff]">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl">🚀</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-[#0e2246]">Aplicación Interactiva de Portafolio</p>
                            <span className="rounded bg-[#0062ff] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">App</span>
                          </div>
                          <p className="text-[11px] text-[#475569]">Optimizador Markowitz, sliders de pesos y frontera eficiente en vivo</p>
                        </div>
                      </div>
                      <Link
                        href="/miembros/portafolio"
                        className="inline-flex items-center justify-center rounded-lg bg-[#091a36] px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0062ff]"
                      >
                        Abrir Simulador Cuantitativo →
                      </Link>
                    </li>

                    <li className="flex flex-col justify-between gap-2 rounded-xl bg-[#f8fafc] p-3 transition hover:bg-[#f0f6ff]">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base">📊</span>
                        <div>
                          <p className="text-xs font-bold text-[#0e2246]">Portfolio Renta Variable: Estrategia y Análisis</p>
                          <p className="text-[11px] text-[#64748b]">Energía e Infraestructura de IA · 6 págs</p>
                        </div>
                      </div>
                      <a
                        href="/Portafolio.pdf"
                        download="Portfolio_Club_de_Finanzas_UBA.pdf"
                        className="inline-flex items-center justify-center rounded-lg bg-[#0062ff] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#091a36]"
                      >
                        Descargar PDF Oficial ↓
                      </a>
                    </li>

                    <li className="flex flex-col justify-between gap-2 rounded-xl bg-[#f8fafc] p-3 transition hover:bg-[#f0f6ff]">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base">📈</span>
                        <div>
                          <p className="text-xs font-bold text-[#0e2246]">Research Report: MercadoLibre (MELI)</p>
                          <p className="text-[11px] text-[#64748b]">DCF, Monte Carlo y Múltiplos · 13 págs</p>
                        </div>
                      </div>
                      <a
                        href="/Research.pdf"
                        download="Research_MELI_Club_de_Finanzas_UBA.pdf"
                        className="inline-flex items-center justify-center rounded-lg bg-[#0062ff] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#091a36]"
                      >
                        Descargar PDF Oficial ↓
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
                  <span className="text-xs font-bold text-[#0062ff]">Descargas Habilitadas ✓</span>
                </div>
              </article>

              {/* Tarjeta 2: Canales VIP de WhatsApp */}
              <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-7 shadow-sm transition hover:border-[#0062ff]">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#091a36] text-xl text-white">
                    💬
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#0e2246]">
                    Canal Privado de Miembros
                  </h3>
                  <p className="mt-2 text-sm text-[#64748b]">
                    Sumate al grupo exclusivo de WhatsApp para debatir ideas de inversión en tiempo real con los analistas de Portfolio y Research.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
                  <a
                    href="https://whatsapp.com/channel/clubdefinanzasuba"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-[#091a36] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0062ff]"
                  >
                    Ingresar al Grupo VIP →
                  </a>
                </div>
              </article>

              {/* Tarjeta 3: Workshops y Grabaciones */}
              <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-7 shadow-sm transition hover:border-[#0062ff]">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00a8a8] text-xl text-white">
                    🎓
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#0e2246]">
                    Talleres & Masterclasses
                  </h3>
                  <p className="mt-2 text-sm text-[#64748b]">
                    Grabaciones de clases magistrales con referentes del mercado y convocatorias a comisiones de trabajo.
                  </p>
                  
                  <div className="mt-4 rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-3 text-xs text-[#0e2246]">
                    <strong>Próximo Encuentro:</strong> Análisis Macro y Finanzas Cuantitativas
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
                  <span className="text-xs font-bold text-[#0062ff]">Acceso Ilimitado ✓</span>
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
