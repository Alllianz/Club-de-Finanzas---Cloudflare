import Image from "next/image";
import Link from "next/link";
import { contactLinks } from "../site-data";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-[#e5e7eb] bg-[#fafaf9] pt-14 pb-8">
      <div className="mx-auto grid w-[min(1380px,92vw)] gap-12 md:grid-cols-[1.4fr_0.8fr_0.9fr]">
        <div>
          <div className="flex h-16 w-[340px] items-center justify-start">
            <Image
              src="/clubdefinanzasubalogohorizontal.png"
              alt="Club de Finanzas UBA"
              width={420}
              height={84}
              className="h-full w-auto object-contain object-left"
            />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-[#475569]">
            Organización académica y profesional de estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#1e3a8a]" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0b1727]">
              Buenos Aires, Argentina
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b1727]">
            Canales Oficiales
          </p>
          <div className="mt-5 space-y-3">
            {contactLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between text-sm text-[#475569] transition-colors hover:text-[#1e3a8a]"
              >
                <span className="font-semibold text-[#0b1727]">{item.label}</span>
                <span className="text-xs text-[#64748b]">{item.value}</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b1727]">
            Nota Institucional
          </p>
          <p className="mt-4 text-xs leading-relaxed text-[#64748b]">
            El contenido publicado en este portal tiene propósitos estrictamente académicos, educativos y de divulgación. No constituye asesoramiento financiero ni recomendación de inversión.
          </p>
          <div className="mt-8 flex items-center justify-between border-t border-[#e5e7eb] pt-4 text-xs text-[#64748b]">
            <span>© {new Date().getFullYear()} Club de Finanzas UBA</span>
            <Link href="/admin" className="font-semibold text-[#0b1727] transition-colors hover:text-[#1e3a8a]">
              Acceso Staff
            </Link>
          </div>
        </div>
      </div>

      {/* Línea inferior distintiva en azul marino institucional */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0b1727]" />
    </footer>
  );
}
