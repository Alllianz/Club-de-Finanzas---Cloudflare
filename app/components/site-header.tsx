"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { navigation } from "../site-data";
import { Topline } from "./topline";

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
      <Topline />
      <div className="mx-auto flex w-[min(1420px,94vw)] items-center justify-between py-3.5 sm:py-4 md:py-5 min-h-[76px] sm:min-h-[84px] md:min-h-[90px]">
        {/* Logo del Club de Finanzas UBA con margen y espacio dedicado */}
        <Link
          href="/"
          className="group flex items-center my-1 sm:my-1.5 md:my-2 transition-opacity hover:opacity-95"
          aria-label="Club de Finanzas UBA - Inicio"
        >
          <div className="relative flex h-11 sm:h-12 md:h-14 lg:h-15 w-[190px] sm:w-[230px] md:w-[270px] lg:w-[305px] items-center justify-start py-0.5">
            <Image
              src="/clubdefinanzasubalogohorizontal.png"
              alt="Club de Finanzas UBA"
              width={500}
              height={100}
              priority
              className="h-full w-auto object-contain object-left"
            />
          </div>
        </Link>

        {/* Navegación Desktop: Inicio, Portafolio, Futuros, Research, Nosotros + Botón Sumate */}
        <nav className="hidden items-center gap-1 xl:gap-2 lg:flex" aria-label="Navegación principal">
          {navigation.map((item) => {
            const active = isNavItemActive(currentPath, item.href);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`relative inline-flex items-center rounded-md px-3.5 py-2 text-xs font-semibold tracking-[0.1em] uppercase transition-colors duration-150 ${
                  active
                    ? "text-[#0b1727] font-bold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:bg-[#0b1727]"
                    : "text-[#475569] hover:text-[#0b1727] hover:bg-[#f8fafc]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/unite"
            className="ml-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0b1727] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a]"
          >
            <span>Sumate</span>
            <span>↗</span>
          </Link>
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
            <li className="pt-2 border-t border-[#f1f5f9]">
              <Link
                href="/unite"
                className="flex items-center justify-center gap-2 rounded-lg bg-[#0b1727] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-xs hover:bg-[#1e3a8a]"
                onClick={() => setOpen(false)}
              >
                <span>Sumate al Club</span>
                <span>↗</span>
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
