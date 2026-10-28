"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { navigation } from "../site-data";

type NavProps = {
  currentPath: string;
};

function isNavItemActive(currentPath: string, href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export function SiteHeader({ currentPath }: NavProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-[#ffffff]/98 backdrop-blur-md transition-all">
      <div className="mx-auto flex w-[min(1380px,94vw)] items-center justify-between py-1.5 md:py-2">
        {/* Logo optimizado con Image nativo para evitar CLS */}
        <Link href="/" className="flex items-center">
          <div className="relative flex h-14 w-[280px] sm:h-16 sm:w-[360px] md:h-20 md:w-[480px] lg:h-22 lg:w-[560px] items-center justify-start overflow-hidden">
            <Image
              src="/clubdefinanzasubalogohorizontal.png"
              alt="Club de Finanzas UBA"
              width={560}
              height={90}
              priority
              className="h-full w-full object-contain object-left"
            />
          </div>
        </Link>

        {/* Navegación Desktop */}
        <nav className="hidden items-center gap-1.5 lg:flex">
          {navigation.map((item) => {
            const active = isNavItemActive(currentPath, item.href);
            const isUnite = item.href === "/unite";

            if (isUnite) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`ml-3 inline-flex items-center rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-[0.08em] shadow-sm transition ${
                    active
                      ? "bg-[#091a36] text-white"
                      : "bg-[#0062ff] text-white hover:bg-[#091a36]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex items-center rounded-lg px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.08em] transition ${
                  active
                    ? "bg-[#091a36] text-white shadow-sm"
                    : "text-[#334155] hover:bg-[#f0f6ff] hover:text-[#0062ff]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Botón menú móvil */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/unite"
            className="rounded-full bg-[#0062ff] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm"
          >
            Unite
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e2e8f0] bg-[#ffffff] text-[#091a36] transition hover:bg-[#f8fafc]"
            aria-expanded={open}
            aria-label="Abrir menú"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="flex flex-col gap-1">
              <span className={`h-[2px] w-4 bg-current transition-all ${open ? "translate-y-1.5 rotate-45" : ""}`} />
              <span className={`h-[2px] w-4 bg-current transition-all ${open ? "opacity-0" : ""}`} />
              <span className={`h-[2px] w-4 bg-current transition-all ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Menú desplegable Mobile */}
      {open && (
        <nav className="border-t border-[#e2e8f0] bg-[#ffffff] px-6 py-4 shadow-lg lg:hidden animate-fade-up">
          <ul className="flex flex-col gap-1.5">
            {navigation.map((item) => {
              const active = isNavItemActive(currentPath, item.href);
              const isUnite = item.href === "/unite";

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition ${
                      isUnite
                        ? "bg-[#0062ff] text-white"
                        : active
                        ? "bg-[#091a36] text-white"
                        : "text-[#334155] hover:bg-[#f0f6ff] hover:text-[#0062ff]"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <span>{item.label}</span>
                    <span>→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
