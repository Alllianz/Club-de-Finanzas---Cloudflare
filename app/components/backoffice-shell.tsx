"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/types";

type BackofficeShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

const navItems = [
  { href: "/admin", label: "Resumen", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/portfolio", label: "Portafolio", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/members", label: "Miembros", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/posts", label: "Publicaciones", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/articles", label: "Artículos", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/team", label: "Integrantes", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/links", label: "Links", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/sponsors", label: "Sponsors", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/resources", label: "Recursos", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/users", label: "Usuarios", roles: ["ADMIN"] as Role[] },
];

export function BackofficeShell({ title, subtitle, children }: BackofficeShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, loginAdmin, logout } = useAuth();

  // Estados del formulario de login de administración
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmitting(true);

    const res = await loginAdmin(adminUser, adminPass);
    setIsSubmitting(false);

    if (!res.success) {
      setLoginError(res.error || "Credenciales de administración incorrectas.");
    }
  };

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-[min(1100px,92vw)] items-center justify-center py-14 text-[#0e2246]">
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#0062ff]">Club de Finanzas UBA</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Validando credenciales...</h1>
        </div>
      </main>
    );
  }

  // SI NO HAY USUARIO AUTENTICADO: BLOQUEO ESTRICTO Y LOGIN INSTITUCIONAL
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#334155] flex flex-col justify-between">
        <header className="border-b border-[#e2e8f0] bg-[#ffffff] py-4">
          <div className="mx-auto flex w-[min(1240px,94vw)] items-center justify-between">
            <Link href="/" className="flex items-center">
              <div className="flex h-10 w-[180px] items-center justify-start overflow-hidden">
                <Image
                  src="/clubdefinanzasubalogohorizontal.png"
                  alt="Club de Finanzas UBA"
                  width={480}
                  height={110}
                  className="h-full w-full object-contain object-left"
                />
              </div>
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-[#64748b] hover:text-[#0b1727] transition"
            >
              ← Volver a la Web Pública
            </Link>
          </div>
        </header>

        <main className="py-14">
          <div className="mx-auto max-w-md rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
            <div className="border-b border-[#f1f5f9] pb-4">
              <div className="flex items-center gap-2">
                <span className="h-[2px] w-4 bg-[#b89047]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                  Seguridad Backoffice
                </span>
              </div>
              <h1 className="mt-1 font-serif text-2xl font-bold tracking-tight text-[#0b1727]">
                Gestión y Edición de Publicaciones
              </h1>
              <p className="mt-1 text-xs text-[#64748b]">
                Para crear, modificar o eliminar publicaciones e informes institucionales debés identificarte con las credenciales de administración.
              </p>
            </div>

            {loginError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                  Usuario de Gestión
                </label>
                <input
                  type="text"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="Ingresá el usuario..."
                  required
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] focus:border-[#0b1727] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
                  Contraseña de Gestión
                </label>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Ingresá la contraseña..."
                  required
                  className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] focus:border-[#0b1727] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-md bg-[#0b1727] py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition hover:bg-[#1e3a8a] disabled:opacity-60"
              >
                {isSubmitting ? "Validando credenciales..." : "Acceder a Gestión →"}
              </button>
            </form>
          </div>
        </main>

        <footer className="border-t border-[#e2e8f0] py-4 text-center text-xs text-[#94a3b8]">
          Club de Finanzas UBA · Panel de Control Restringido
        </footer>
      </div>
    );
  }

  // USUARIO AUTENTICADO: RENDERIZA EL PANEL COMPLETO
  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#334155]">
      {/* Barra superior de administración */}
      <header className="border-b border-[#e2e8f0] bg-[#ffffff]">
        <div className="mx-auto flex w-[min(1240px,94vw)] flex-wrap items-center justify-between gap-4 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <div className="flex h-10 w-[180px] items-center justify-start overflow-hidden">
                <Image
                  src="/clubdefinanzasubalogohorizontal.png"
                  alt="Club de Finanzas UBA"
                  width={480}
                  height={110}
                  className="h-full w-full object-contain object-left"
                />
              </div>
            </Link>
            <div className="h-5 w-[1.5px] bg-[#cbd5e1]" />
            <span className="rounded-md border border-[#d8e5f8] bg-[#f0f6ff] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#0062ff]">
              Panel Backoffice
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-[#0e2246]">{user?.fullName || user?.email || "Allianz"}</span>
              <span className="rounded bg-[#091a36] px-1.5 py-0.2 text-[10px] font-bold uppercase text-white">
                {user?.role || "ADMIN"}
              </span>
            </div>

            <Link
              href="/"
              className="rounded-full border border-[#e2e8f0] bg-white px-3 py-1 text-xs font-semibold text-[#475569] transition hover:border-[#0062ff] hover:text-[#0062ff]"
            >
              Ver Web Pública
            </Link>

            <button
              onClick={async () => {
                await logout();
                router.push("/admin");
              }}
              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="mx-auto w-[min(1240px,94vw)] py-8">
        {/* Encabezado de la página */}
        <section className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0062ff]">Gestión de Contenidos</p>
              <h1 className="mt-1 font-serif text-3xl font-bold text-[#0e2246] md:text-4xl">{title}</h1>
              <p className="mt-2 text-sm text-[#64748b]">{subtitle}</p>
            </div>
          </div>

          {/* Navegación del Panel */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#f1f5f9] pt-5">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    active
                      ? "bg-[#091a36] text-white shadow-xs"
                      : "bg-[#f8fafc] text-[#64748b] hover:bg-[#e2e8f0] hover:text-[#0e2246]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Vistas Renderizadas */}
        <section className="mt-6">{children}</section>
      </main>
    </div>
  );
}
