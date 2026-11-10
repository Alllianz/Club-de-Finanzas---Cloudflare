"use client";

import { useEffect, useState } from "react";
import type { ClubStatSetting } from "../lib/types";

const defaultStats: ClubStatSetting[] = [
  {
    id: "stat_1",
    value: "25+",
    label: "Colaboradores activos",
    description: "Estudiantes en Portfolio, Research y Relaciones Institucionales.",
  },
  {
    id: "stat_2",
    value: "+9.000",
    label: "Son parte de esto",
    description: "Seguidores aproximados en LinkedIn e Instagram.",
  },
  {
    id: "stat_3",
    value: "200+",
    label: "Miembros registrados",
    description: "En la comunidad oficial de WhatsApp del Club.",
  },
  {
    id: "stat_4",
    value: "8",
    label: "Años de trayectoria",
    description: "Formando e impulsando talento universitario desde 2018.",
  },
];

export function ClubStats() {
  const [stats, setStats] = useState<ClubStatSetting[]>(defaultStats);

  useEffect(() => {
    fetch("/api/public/v2/site-content")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data: any) => {
        if (data.clubStats && Array.isArray(data.clubStats) && data.clubStats.length > 0) {
          setStats(data.clubStats);
        }
      })
      .catch(() => {
        // Fallback activo
      });
  }, []);

  return (
    <section className="border-b border-[#e5e7eb] bg-[#fafaf9] py-12 sm:py-14 overflow-hidden">
      <div className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-5 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                Nuestra comunidad
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
              El Club en números
            </h2>
          </div>
          <p className="max-w-md text-xs sm:text-sm text-[#64748b]">
            Métricas de participación, producción técnica y alcance institucional en la comunidad universitaria.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <article
              key={stat.id || stat.label}
              className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-white p-5 sm:p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:shadow-md"
            >
              <div>
                <strong className="block font-serif text-3xl font-bold tracking-tight text-[#0b1727] sm:text-4xl">
                  {stat.value}
                </strong>
                <h3 className="mt-3 text-sm font-bold text-[#0b1727]">
                  {stat.label}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">
                  {stat.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
