"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { defaultPresidentsHistory } from "../data/presidents-history";
import type { AreaPresident } from "../lib/types";

type AreaKey = "PORTFOLIO" | "FUTUROS" | "RESEARCH";

interface AreaPresidentsTimelineProps {
  initialArea?: AreaKey;
  showTabs?: boolean;
  title?: string;
  eyebrow?: string;
  description?: string;
  presidents?: AreaPresident[];
}

const areaDetails: Record<
  AreaKey,
  { label: string; badge: string; color: string; desc: string }
> = {
  PORTFOLIO: {
    label: "Portafolio",
    badge: "Gestión Cuantitativa",
    color: "#1e3a8a",
    desc: "Liderazgo histórico y actual a cargo de la cartera modelo, frontera eficiente y optimización de activos.",
  },
  FUTUROS: {
    label: "Futuros",
    badge: "Derivados & Apalancamiento",
    color: "#00a8a8",
    desc: "Comisión directiva enfocada en simulación de futuros Matba Rofex, curvas de tasas forward y paper trading.",
  },
  RESEARCH: {
    label: "Research",
    badge: "Análisis Fundamental",
    color: "#0284c7",
    desc: "Mandatos directivos al frente de la investigación macrofinanciera, modelos DCF y seguimiento de deuda soberana.",
  },
};

export function AreaPresidentsTimeline({
  initialArea = "PORTFOLIO",
  showTabs = true,
  title,
  eyebrow = "Línea de Tiempo Institucional",
  description,
  presidents: initialPresidents,
}: AreaPresidentsTimelineProps) {
  const [activeArea, setActiveArea] = useState<AreaKey>(initialArea);
  const [list, setList] = useState<AreaPresident[]>(
    initialPresidents || defaultPresidentsHistory
  );

  useEffect(() => {
    if (!initialPresidents) {
      fetch("/api/public/v2/presidents")
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error();
        })
        .then((data: { items?: AreaPresident[] }) => {
          if (data.items && data.items.length > 0) {
            setList(data.items);
          }
        })
        .catch(() => {
          // Usa defaultPresidentsHistory
        });
    }
  }, [initialPresidents]);

  const currentAreaInfo = areaDetails[activeArea];
  const filtered = list
    .filter((p) => p.area === activeArea)
    .sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      if (a.displayOrder !== undefined && b.displayOrder !== undefined && a.displayOrder !== b.displayOrder) {
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      }
      return (b.startYear || 0) - (a.startYear || 0);
    });

  return (
    <section className="w-full max-w-full overflow-hidden py-12 md:py-16">
      <div className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10">
        {/* Cabecera de la sección */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-5 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                {eyebrow}
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
              {title || `Presidentes y Liderazgo de ${currentAreaInfo.label}`}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#64748b] sm:text-sm">
              {description || currentAreaInfo.desc}
            </p>
          </div>

          {/* Selector interactivo de área (Tabs) */}
          {showTabs && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-1.5 shadow-xs">
              {(["PORTFOLIO", "FUTUROS", "RESEARCH"] as AreaKey[]).map(
                (areaKey) => {
                  const active = activeArea === areaKey;
                  return (
                    <button
                      key={areaKey}
                      type="button"
                      onClick={() => setActiveArea(areaKey)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                        active
                          ? "bg-[#0b1727] text-white shadow-xs"
                          : "text-[#64748b] hover:bg-white hover:text-[#0b1727]"
                      }`}
                    >
                      {areaDetails[areaKey].label}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* Línea de tiempo cronológica */}
        <div className="relative border-l-2 border-[#b89047]/40 pl-6 sm:pl-8 ml-2 sm:ml-4 space-y-8">
          {filtered.map((president) => {
            const achievementsList = Array.isArray(president.achievements)
              ? president.achievements
              : typeof president.achievements === "string"
              ? JSON.parse(president.achievements || "[]")
              : [];

            return (
              <div
                key={president.id}
                className="relative group transition-all duration-200"
              >
                {/* Punto / Nodo en la línea */}
                <span
                  className={`absolute -left-[31px] sm:-left-[39px] top-4.5 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white transition-transform duration-200 group-hover:scale-125 ${
                    president.isCurrent
                      ? "border-[#b89047] ring-4 ring-[#b89047]/20"
                      : "border-[#64748b]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      president.isCurrent ? "bg-[#b89047]" : "bg-[#64748b]"
                    }`}
                  />
                </span>

                {/* Tarjeta del Presidente */}
                <article className="rounded-2xl border border-[#e2e8f0] bg-white p-5 sm:p-7 shadow-xs transition-all hover:border-[#1e3a8a] hover:shadow-md">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      {/* Avatar o Foto */}
                      <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-full border border-[#cbd5e1] bg-[#f1f5f9]">
                        {president.photoUrl ? (
                          <Image
                            src={president.photoUrl}
                            alt={president.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center font-serif text-lg font-bold text-[#1e3a8a]">
                            {president.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                        )}
                      </div>

                      {/* Nombre y Cargo */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#0b1727]">
                            {president.name}
                          </h3>
                          {president.isCurrent ? (
                            <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#92400e]">
                              Mandato Actual
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-semibold text-[#64748b]">
                              Histórico
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[#1e3a8a] sm:text-sm">
                          {president.roleTitle}
                        </p>
                        <p className="mt-0.5 font-mono text-[11px] font-medium text-[#64748b]">
                          Período: {president.period}
                        </p>
                      </div>
                    </div>

                    {/* Enlace de LinkedIn si existe */}
                    {president.linkedinUrl && (
                      <a
                        href={president.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-semibold text-[#0b1727] transition hover:border-[#0062ff] hover:text-[#0062ff]"
                      >
                        <span>LinkedIn</span>
                        <span className="text-[10px]">↗</span>
                      </a>
                    )}
                  </div>

                  {/* Reseña / Biografía */}
                  <p className="mt-4 text-xs leading-relaxed text-[#475569] sm:text-sm">
                    {president.bio}
                  </p>

                  {/* Logros destacados */}
                  {achievementsList.length > 0 && (
                    <div className="mt-4 border-t border-[#f1f5f9] pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0b1727]">
                        Hitos de Gestión & Logros Técnicos:
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {achievementsList.map((ach: string, idx: number) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 text-xs text-[#64748b]"
                          >
                            <span className="text-[#b89047] font-bold">✓</span>
                            <span>{ach}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
