import Image from "next/image";
import Link from "next/link";
import { contactLinks, navigation } from "../site-data";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-[#e5e7eb] bg-[#fafaf9] pt-14 pb-10 text-[#475569]">
      <div className="mx-auto w-[min(1380px,92vw)] space-y-10">
        {/* Fila Principal (Formato .footer-main de index.html) */}
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[1.2fr_1.4fr_1fr] lg:items-center">
          {/* Logo y Misión */}
          <div>
            <div className="flex h-16 w-[320px] items-center justify-start">
              <Image
                src="/clubdefinanzasubalogohorizontal.png"
                alt="Club de Finanzas UBA"
                width={420}
                height={84}
                className="h-full w-auto object-contain object-left"
              />
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-[#64748b]">
              Iniciativa académica y profesional creada y gestionada por estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.
            </p>
          </div>

          {/* Enlaces de Navegación (Formato .footlinks) */}
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold tracking-wider uppercase text-[#0b1727]" aria-label="Enlaces del pie">
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
              className="text-[#1e3a8a] transition-colors hover:text-[#0b1727]"
            >
              Sumate
            </Link>
            <Link
              href="/admin"
              className="text-[#64748b] transition-colors hover:text-[#0b1727]"
            >
              Gestión
            </Link>
          </nav>

          {/* Canales y Redes Oficiales (Formato .footer-socials) */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0b1727]">
              Canales Oficiales
            </span>
            <div className="flex flex-col gap-1.5">
              {contactLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-2 text-xs text-[#475569] transition-colors hover:text-[#1e3a8a]"
                >
                  <span className="font-bold text-[#0b1727]">{item.label}:</span>
                  <span className="text-[#64748b]">{item.value}</span>
                  <span className="text-[10px]">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Fila Inferior: Copyright y Disclaimer (Formato .footer-bottom de index.html) */}
        <div className="grid grid-cols-1 gap-6 border-t border-[#e5e7eb] pt-6 lg:grid-cols-[auto_1fr] lg:gap-12">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#64748b]">
            <span>© {new Date().getFullYear()} Club de Finanzas UBA</span>
            <span className="hidden sm:inline text-[#cbd5e1]">•</span>
            <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 text-[10px] font-semibold text-[#1e3a8a]">
              Plataforma Digital Oficial
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[#64748b]">
            El Club de Finanzas UBA es una iniciativa independiente y sin fines de lucro, integrada por miembros autoconvocados pertenecientes a la Universidad de Buenos Aires. No constituye una unidad oficial ni representa institucionalmente a la UBA. El contenido publicado en este portal es de carácter estrictamente educativo, analítico y formativo; no constituye asesoramiento financiero ni recomendación de inversión.
          </p>
        </div>
      </div>

      {/* Línea inferior distintiva en azul marino institucional */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0b1727]" />
    </footer>
  );
}
