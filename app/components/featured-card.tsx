import Link from "next/link";
import type { FeedEntry } from "../site-data";

type FeaturedCardProps = {
  story: FeedEntry;
};

export function FeaturedCard({ story }: FeaturedCardProps) {
  const isExternal = story.href.startsWith("http");

  return (
    <article className="group grid grid-cols-1 overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-xs transition-all duration-200 hover:shadow-md lg:grid-cols-[0.9fr_1.1fr]">
      {/* Columna Izquierda: Feature-Cover con estética institucional */}
      <div className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-[#0b1727] via-[#102a43] to-[#1e3a8a] p-8 text-white sm:min-h-[300px]">
        {/* Órbitas concéntricas decorativas */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full border border-white/15"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full border border-white/10"
          aria-hidden="true"
        />

        {story.imageUrl ? (
          <img
            src={story.imageUrl}
            alt={story.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="relative z-10 flex h-full flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b89047]">
              {story.category}
            </span>
            <div className="my-auto py-6">
              <strong className="block font-serif text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                {story.category.toUpperCase()}
              </strong>
              <small className="mt-1 block text-xs tracking-[0.16em] text-white/70">
                CLUB DE FINANZAS · UBA
              </small>
            </div>
            <span className="text-[11px] text-white/60">
              {story.date || "Publicación destacada"}
            </span>
          </div>
        )}
      </div>

      {/* Columna Derecha: Feature-Info */}
      <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
        <div className="flex items-center gap-2.5 text-xs font-semibold tracking-wider text-[#64748b]">
          <span className="font-bold uppercase tracking-[0.16em] text-[#1e3a8a]">
            {story.category}
          </span>
          {story.date && (
            <>
              <span>·</span>
              <span className="uppercase">{story.date}</span>
            </>
          )}
        </div>

        <h3 className="mt-4 font-serif text-2xl font-bold leading-tight text-[#0b1727] transition-colors group-hover:text-[#1e3a8a] sm:text-3xl">
          {story.title}
        </h3>

        <p className="mt-4 text-sm leading-relaxed text-[#475569] sm:text-base">
          {story.excerpt}
        </p>

        <div className="mt-8 pt-2">
          {isExternal ? (
            <a
              href={story.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1e3a8a] transition-colors hover:text-[#0b1727]"
            >
              <span>{story.cta || "Leer publicación"}</span>
              <span>→</span>
            </a>
          ) : (
            <Link
              href={story.href}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#1e3a8a] transition-colors hover:text-[#0b1727]"
            >
              <span>{story.cta || "Leer publicación"}</span>
              <span>→</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
