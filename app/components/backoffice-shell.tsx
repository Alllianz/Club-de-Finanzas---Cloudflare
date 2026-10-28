"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
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
  { href: "/admin/team", label: "Integrantes", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/links", label: "Links", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/sponsors", label: "Sponsors", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/resources", label: "Recursos", roles: ["ADMIN", "EDITOR"] as Role[] },
  { href: "/admin/users", label: "Usuarios", roles: ["ADMIN"] as Role[] },
];

export function BackofficeShell({ title, subtitle, children }: BackofficeShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-[min(1100px,92vw)] items-center justify-center py-14 text-[#0e2246]">
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#0062ff]">Club de Finanzas UBA</p>
          <h1 className="mt-2 font-serif text-3xl font-bold">Validando sesión...</h1>
        </div>
      </main>
    );
  }

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
              <span className="font-semibold text-[#0e2246]">{user?.fullName || user?.email || "Usuario"}</span>
              <span className="rounded bg-[#091a36] px-1.5 py-0.2 text-[10px] font-bold uppercase text-white">
                {user?.role || "STAFF"}
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
                router.push("/");
              }}
              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
            >
              Salir
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
            {navItems
              .filter((item) => (user ? item.roles.includes(user.role) : false))
              .map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                      active
                        ? "bg-[#091a36] text-white shadow-sm"
                        : "border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#0062ff] hover:text-[#0062ff]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        </section>

        {/* Sección Hija */}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
