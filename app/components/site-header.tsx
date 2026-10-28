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
    <header className="sticky top-0 z-50 border-b border-[#e5e7eb] bg-[#ffffff]/98 backdrop-blur-md transition-all shadow-xs">
      <div className="mx-auto flex w-[min(1420px,94vw)] items-center justify-between py-2 md:py-2.5">
        {/* Logo ampliado, nítido y con jerarquía institucional */}
        <Link href="/" className="group flex items-center transition-opacity hover:opacity-95" aria-label="Club de Finanzas UBA - Inicio">
          <div className="relative flex h-16 sm:h-20 md:h-24 lg:h-26 w-[260px] sm:w-[360px] md:w-[460px] lg:w-[560px] items-center justify-start">
            <Image
              src="/clubdefinanzasubalogohorizontal.png"
              alt="Club de Finanzas UBA"
              width={640}
              height={120}
              priority
              className="h-full w-auto object-contain object-left"
            />
          </div>
        </Link>

        {/* Navegación Desktop: Inicio, Portafolio, Futuros, Research, Nosotros */}
        <nav className="hidden items-center gap-1 xl:gap-2 lg:flex" aria-label="Navegación principal">
          {navigation.map((item) => {
            const active = isNavItemActive(currentPath, item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative inline-flex items-center rounded-md px-4 py-2 text-xs font-semibold tracking-[0.1em] uppercase transition-colors duration-150 ${
                  active
                    ? "text-[#0b1727] font-bold after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[2px] after:bg-[#0b1727]"
                    : "text-[#475569] hover:text-[#0b1727] hover:bg-[#f8fafc]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Botón menú móvil */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-[#e2e8f0] bg-[#ffffff] text-[#0b1727] transition hover:bg-[#f8fafc]"
            aria-expanded={open}
            aria-label="Alternar navegación móvil"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span className="flex flex-col gap-1.5">
              <span className={`h-[2px] w-5 bg-current transition-all ${open ? "translate-y-2 rotate-45" : ""}`} />
              <span className={`h-[2px] w-5 bg-current transition-all ${open ? "opacity-0" : ""}`} />
              <span className={`h-[2px] w-5 bg-current transition-all ${open ? "-translate-y-2 -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Menú desplegable Mobile */}
      {open && (
        <nav className="border-t border-[#e2e8f0] bg-[#ffffff] px-6 py-5 shadow-lg lg:hidden animate-fade-up">
          <ul className="flex flex-col gap-2">
            {navigation.map((item) => {
              const active = isNavItemActive(currentPath, item.href);

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                      active
                        ? "bg-[#f1f5f9] text-[#0b1727] font-extrabold"
                        : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#0b1727]"
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
