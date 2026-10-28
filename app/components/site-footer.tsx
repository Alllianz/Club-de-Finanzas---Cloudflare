import Image from "next/image";
import Link from "next/link";
import { contactLinks } from "../site-data";

export function SiteFooter() {
  return (
    <footer className="relative border-t border-[#e2e8f0] bg-[#ffffff] pt-12 pb-6">
      <div className="mx-auto grid w-[min(1280px,92vw)] gap-10 md:grid-cols-[1.3fr_0.8fr_0.9fr]">
        <div>
          <div className="flex h-16 w-[320px] items-center justify-start overflow-hidden">
            <Image
              src="/clubdefinanzasubalogohorizontal.png"
              alt="Club de Finanzas UBA"
              width={320}
              height={64}
              className="h-full w-full object-contain object-left"
            />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#475569]">
            Organización académica y profesional de estudiantes de la Facultad de Ciencias Económicas de la Universidad de Buenos Aires.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#0062ff]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#091a36]">
              Buenos Aires, Argentina
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#091a36]">
            Canales y Redes
          </p>
          <div className="mt-4 space-y-2.5">
            {contactLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between text-sm text-[#475569] transition hover:text-[#0062ff]"
              >
                <span className="font-semibold text-[#0e2246]">{item.label}</span>
                <span className="text-xs text-[#64748b]">{item.value}</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#091a36] text-[11px] font-bold text-white">
              i
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#091a36]">
              Descargo de Responsabilidad
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[#64748b]">
            El contenido publicado en este sitio web tiene propósitos estrictamente educativos e informativos. No constituye asesoramiento financiero ni recomendación de inversión.
          </p>
          <div className="mt-6 flex items-center justify-between border-t border-[#f1f5f9] pt-4 text-xs text-[#64748b]">
            <span>© {new Date().getFullYear()} Club de Finanzas UBA</span>
            <Link href="/admin" className="font-semibold text-[#091a36] hover:text-[#0062ff]">
              Acceso Staff
            </Link>
          </div>
        </div>
      </div>

      {/* Línea inferior distintiva azul marino */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#091a36]" />
    </footer>
  );
}
