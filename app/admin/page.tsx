"use client";

import Link from "next/link";
import { BackofficeShell } from "../components/backoffice-shell";
import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <BackofficeShell
      title="Panel de Control"
      subtitle="Centro de gestión editorial y administración institucional del Club de Finanzas UBA."
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Gestión de Publicaciones */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#091a36] text-lg text-white">
              📝
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#0e2246]">Publicaciones & Informes</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Crear, redactar, subir PDFs y publicar análisis de Portfolio, Research y Newsletter.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
            <Link
              href="/admin/posts"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#091a36] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#0062ff]"
            >
              <span>Gestionar Posts</span>
              <span>→</span>
            </Link>
          </div>
        </article>

        {/* Gestión de Integrantes */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0062ff] text-lg text-white">
              👥
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#0e2246]">Equipo e Integrantes</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Administrar miembros del Consejo Directivo, Portfolio, Research y Relaciones Institucionales.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
            <Link
              href="/admin/team"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#091a36] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#0062ff]"
            >
              <span>Gestionar Equipo</span>
              <span>→</span>
            </Link>
          </div>
        </article>

        {/* Gestión de Usuarios */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0284c7] text-lg text-white">
              🔐
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#0e2246]">Usuarios y Permisos</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Control de acceso para editores y administradores que ingresan vía código OTP.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
            {user?.role === "ADMIN" ? (
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#091a36] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#0062ff]"
              >
                <span>Gestionar Usuarios</span>
                <span>→</span>
              </Link>
            ) : (
              <span className="text-xs font-semibold text-amber-600">Requiere permisos de ADMIN</span>
            )}
          </div>
        </article>

        {/* Canales y Redes */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00a8a8] text-lg text-white">
              🔗
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#0e2246]">Enlaces de Contacto</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Gestionar links de WhatsApp, LinkedIn, Instagram, X y formularios de CV.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
            <Link
              href="/admin/links"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0e2246] transition hover:border-[#0062ff] hover:text-[#0062ff]"
            >
              <span>Configurar Links</span>
              <span>→</span>
            </Link>
          </div>
        </article>

        {/* Sponsors */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d4ed8] text-lg text-white">
              ⭐
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#0e2246]">Sponsors y Aliados</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Gestionar logotipos y nombres de las instituciones aliadas del Club.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
            <Link
              href="/admin/sponsors"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0e2246] transition hover:border-[#0062ff] hover:text-[#0062ff]"
            >
              <span>Configurar Sponsors</span>
              <span>→</span>
            </Link>
          </div>
        </article>

        {/* Biblioteca de Recursos */}
        <article className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#64748b] text-lg text-white">
              📂
            </div>
            <h2 className="mt-4 font-serif text-xl font-bold text-[#0e2246]">Recursos y Enlaces Útiles</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
              Listado de bibliografía, planillas de cálculo y herramientas descargables.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[#f1f5f9]">
            <Link
              href="/admin/resources"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e2e8f0] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0e2246] transition hover:border-[#0062ff] hover:text-[#0062ff]"
            >
              <span>Configurar Recursos</span>
              <span>→</span>
            </Link>
          </div>
        </article>
      </div>

      {/* Guía y recomendaciones operativas */}
      <article className="mt-8 rounded-2xl border border-[#d8e5f8] bg-[#f0f6ff] p-6">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0062ff] text-xs font-bold text-white">
            i
          </span>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#091a36]">
            Flujo de Publicación Recomendado
          </p>
        </div>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-[#475569]">
          <li>Crear el borrador en la sección correspondiente (Portfolio, Research o Newsletter).</li>
          <li>Subir el PDF del informe o flyer del evento y adjuntarlo a la publicación.</li>
          <li>Revisar la vista previa en el sitio público antes de marcar como <strong>PUBLISHED</strong>.</li>
        </ol>
      </article>
    </BackofficeShell>
  );
}
