"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { contactLinks as fallbackLinks, navigation } from "../site-data";
import type { ContactLink } from "../lib/types";

const defaultHeading =
  "Iniciativa académica y profesional creada y gestionada por estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.";

const defaultDisclaimer =
  "El Club de Finanzas UBA es una iniciativa independiente y sin fines de lucro, integrada por miembros autoconvocados pertenecientes a la Universidad de Buenos Aires. No constituye una unidad oficial ni representa institucionalmente a la UBA. El contenido publicado en este portal es de carácter estrictamente educativo, analítico y formativo; no constituye asesoramiento financiero ni recomendación de inversión.";

export function SiteFooter() {
  const [channels, setChannels] = useState<ContactLink[]>(
    fallbackLinks.map((l, i) => ({
      id: `link_${i}`,
      kind: l.label.toUpperCase(),
      label: l.label,
      value: l.value,
      href: l.href,
      sortOrder: i,
      isActive: true,
    }))
  );
  const [footerHeading, setFooterHeading] = useState(defaultHeading);
  const [disclaimer, setDisclaimer] = useState(defaultDisclaimer);

  useEffect(() => {
    fetch("/api/public/v2/site-content")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then((data: any) => {
        if (data.officialChannels && data.officialChannels.length > 0) {
          setChannels(data.officialChannels.filter((c: any) => c.isActive !== false));
        }
        if (data.footerDisclaimer?.heading) {
          setFooterHeading(data.footerDisclaimer.heading);
        }
        if (data.footerDisclaimer?.subtext) {
          setDisclaimer(data.footerDisclaimer.subtext);
        }
      })
      .catch(() => {
        // Fallback activo
      });
  }, []);

  return (
    <footer className="relative border-t border-[#e5e7eb] bg-[#fafaf9] pt-12 sm:pt-14 pb-10 text-[#475569] overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Fila Principal (Formato .footer-main) */}
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.2fr_1.4fr_1fr] lg:items-center">
          {/* Logo y Misión Institucional Editable */}
          <div>
            <div className="flex h-14 sm:h-16 w-full max-w-[240px] sm:max-w-[300px] items-center justify-start">
              <Image
                src="/clubdefinanzasubalogohorizontal.png"
                alt="Club de Finanzas UBA"
                width={420}
                height={84}
                className="h-full w-auto object-contain object-left"
              />
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#64748b]">
              {footerHeading}
            </p>
          </div>

          {/* Enlaces de Navegación */}
          <nav
            className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold tracking-wider uppercase text-[#0b1727]"
            aria-label="Enlaces del pie"
          >
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-[#1e3a8a]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/unite"
              className="text-[#1e3a8a] font-bold transition-colors hover:text-[#0b1727]"
            >
              Sumate ↗
            </Link>
          </nav>

          {/* Canales Oficiales Editables */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0b1727]">
              Canales Oficiales
            </span>
            <div className="flex flex-col gap-1.5">
              {channels.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-2 text-xs text-[#475569] transition-colors hover:text-[#1e3a8a]"
                >
                  <span className="font-bold text-[#0b1727]">{item.label}:</span>
                  <span className="text-[#64748b] truncate max-w-[190px]">{item.value || item.href}</span>
                  <span className="text-[10px]">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Fila Inferior: Copyright y Disclaimer Institucional */}
        <div className="grid grid-cols-1 gap-6 border-t border-[#e5e7eb] pt-6 lg:grid-cols-[auto_1fr] lg:gap-12">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748b]">
            <span>© {new Date().getFullYear()} Club de Finanzas UBA</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#64748b]">
            {disclaimer}
          </p>
        </div>
      </div>

      {/* Línea inferior distintiva en azul marino institucional */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0b1727]" />
    </footer>
  );
}
