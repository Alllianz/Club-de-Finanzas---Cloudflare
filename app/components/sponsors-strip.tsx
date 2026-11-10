"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { SponsorTrustSetting } from "../lib/types";

const defaultSponsors: SponsorTrustSetting[] = [
  {
    id: "sp_1",
    name: "Universidad de Buenos Aires",
    short: "UBA",
    url: "https://www.uba.ar",
    description: "Facultad de Ciencias Económicas",
  },
  {
    id: "sp_2",
    name: "Facultad de Ciencias Económicas",
    short: "FCE",
    url: "https://www.economicas.uba.ar",
    description: "Casa de formación académica",
  },
  {
    id: "sp_3",
    name: "Bolsas y Mercados Argentinos",
    short: "BYMA",
    url: "https://www.byma.com.ar",
    description: "Infraestructura de mercado",
  },
  {
    id: "sp_4",
    name: "Instituto Argentino de Mercado de Capitales",
    short: "IAMC",
    url: "https://www.iamc.com.ar",
    description: "Investigación y desarrollo bursátil",
  },
];

export function SponsorsStrip() {
  const [items, setItems] = useState<SponsorTrustSetting[]>(defaultSponsors);

  useEffect(() => {
    fetch("/api/public/v2/site-content")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data: any) => {
        if (data.sponsorsTrust && Array.isArray(data.sponsorsTrust) && data.sponsorsTrust.length > 0) {
          setItems(data.sponsorsTrust);
        }
      })
      .catch(() => {
        // Fallback activo
      });
  }, []);

  return (
    <section className="border-t border-[#e5e7eb] bg-white py-12 sm:py-14 text-center overflow-hidden">
      <div className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748b]">
          Gracias por confiar en nosotros
        </h3>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8">
          {items.map((sponsor) => (
            <a
              key={sponsor.id || sponsor.short || sponsor.name}
              href={sponsor.url || "#"}
              target={sponsor.url?.startsWith("http") ? "_blank" : undefined}
              rel={sponsor.url?.startsWith("http") ? "noopener noreferrer" : undefined}
              className="group flex w-full sm:w-[220px] min-w-0 flex-col items-center justify-center rounded-xl border border-[#e5e7eb] bg-[#fafaf9] p-4.5 sm:p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1e3a8a] hover:bg-white hover:shadow-sm"
            >
              {sponsor.logoUrl ? (
                <div className="relative h-10 w-32 mb-2 flex items-center justify-center overflow-hidden">
                  <Image
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    width={128}
                    height={40}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <span className="font-serif text-lg font-bold tracking-tight text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]">
                  {sponsor.short || sponsor.name}
                </span>
              )}

              {/* Breve texto descriptivo abajo del logo/nombre */}
              <span className="mt-1 text-[11px] leading-tight text-[#64748b] group-hover:text-[#475569]">
                {sponsor.description || sponsor.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
