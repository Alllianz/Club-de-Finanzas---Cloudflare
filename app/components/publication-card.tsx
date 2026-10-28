import Link from "next/link";
import type { FeedEntry } from "../site-data";

type PublicationCardProps = {
  item: FeedEntry;
};

export function PublicationCard({ item }: PublicationCardProps) {
  const isExternal = item.href.startsWith("http");

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#cbd5e1] hover:shadow-md">
      <div>
        {/* Cabecera / Miniatura (Formato .thumb de index.html) */}
        <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-[#0b1727] via-[#102a43] to-[#1e3a8a]">
          {/* Órbitas concéntricas decorativas de fondo */}
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full border border-white/15"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/10"
            aria-hidden="true"
          />

          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b89047]">
                {item.category}
              </span>
              <strong className="max-w-[85%] font-serif text-sm font-bold uppercase tracking-tight text-white/95 line-clamp-2">
                {item.title}
              </strong>
            </div>
          )}
        </div>

        {/* Cuerpo de la Tarjeta */}
        <div className="p-6">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1e3a8a]">
            <span>{item.category}</span>
            {item.date && (
              <>
                <span className="text-[#94a3b8]">·</span>
                <span className="text-[#64748b]">{item.date}</span>
              </>
            )}
          </div>

          <h3 className="mt-3 font-serif text-lg font-bold leading-snug text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]">
            {item.title}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-[#64748b] line-clamp-3">
            {item.excerpt}
          </p>
        </div>
      </div>

      <div className="border-t border-[#f1f5f9] px-6 py-4">
        {isExternal ? (
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1e3a8a] transition-colors group-hover:text-[#0b1727]"
          >
            <span>{item.cta || "Leer publicación"}</span>
            <span>→</span>
          </a>
        ) : (
          <Link
            href={item.href}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1e3a8a] transition-colors group-hover:text-[#0b1727]"
          >
            <span>{item.cta || "Leer publicación"}</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </article>
  );
}
