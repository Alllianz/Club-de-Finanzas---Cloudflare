"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { SiteHeader, SiteFooter } from "@/app/components/site-shell";
import { useMemberAuth } from "@/context/MemberAuthContext";

// Carga dinámica del simulador interactivo para optimizar el bundle
const PortfolioSimulator = dynamic(
  () => import("@/components/portfolio-simulator").then((mod) => mod.PortfolioSimulator),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#0062ff] border-t-transparent" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
            Cargando Laboratorio Cuantitativo...
          </p>
        </div>
      </div>
    ),
  }
);

export default function MiembrosPortafolioPage() {
  const { member, isLoading } = useMemberAuth();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#334155]">
      <SiteHeader currentPath="/miembros" />

      {isLoading ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#0062ff] border-t-transparent" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Verificando credenciales de alumno...
            </p>
          </div>
        </div>
      ) : !member ? (
        /* VISTA NO AUTENTICADA: ACCESO DENEGADO */
        <main className="py-20">
          <div className="mx-auto w-[min(1280px,92vw)] text-center">
            <div className="mx-auto max-w-lg rounded-3xl border border-[#e2e8f0] bg-white p-10 shadow-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
                🔒
              </div>
              <h1 className="mt-4 text-2xl font-extrabold text-[#0e2246]">
                Área Exclusiva para Alumnos
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
                El simulador de portafolio y los modelos de optimización de Markowitz están reservados para miembros y alumnos registrados del Club de Finanzas UBA.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/miembros"
                  className="rounded-xl bg-[#0062ff] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36]"
                >
                  Iniciar Sesión o Registrarme →
                </Link>
                <Link
                  href="/portfolio"
                  className="text-xs font-bold text-[#64748b] hover:text-[#0e2246]"
                >
                  Ver notas públicas de Portafolio
                </Link>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* VISTA AUTENTICADA: APLICACIÓN DE PORTAFOLIO */
        <main className="py-10 md:py-14">
          <div className="mx-auto w-[min(1380px,94vw)] space-y-8">
            {/* Header del Laboratorio */}
            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-[#e2e8f0] bg-gradient-to-r from-[#091a36] via-[#0e2246] to-[#091a36] p-8 text-white shadow-lg md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#0062ff] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    Plataforma Cuantitativa
                  </span>
                  <span className="text-xs text-[#94a3b8]">
                    Sesión activa como <strong className="text-white">{member.fullName}</strong>
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                  Laboratorio de Portafolio & Optimización
                </h1>
                <p className="mt-1 text-xs text-[#94a3b8] sm:text-sm">
                  Modelado de mínima varianza de Markowitz, frontera eficiente y análisis de sensibilidad de 6 activos.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/miembros"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md transition hover:bg-white hover:text-[#091a36]"
                >
                  ← Volver al Portal
                </Link>
                <a
                  href="/Portafolio.pdf"
                  download="Portfolio_Club_de_Finanzas_UBA.pdf"
                  className="rounded-xl bg-[#0062ff] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-white hover:text-[#091a36]"
                >
                  Descargar PDF Oficial ↓
                </a>
              </div>
            </div>

            {/* Simulador Interactivo */}
            <PortfolioSimulator />
          </div>
        </main>
      )}

      <SiteFooter />
    </div>
  );
}
