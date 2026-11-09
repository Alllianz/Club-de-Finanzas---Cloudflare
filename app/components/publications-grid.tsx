import Link from "next/link";
import type { FeedEntry } from "../site-data";
import { PublicationCard } from "./publication-card";

type PublicationsGridProps = {
  items: FeedEntry[];
  title?: string;
  eyebrow?: string;
  viewAllHref?: string;
};

export function PublicationsGrid({
  items,
  title = "Últimas publicaciones",
  eyebrow = "Análisis e ideas",
  viewAllHref = "/research",
}: PublicationsGridProps) {
  return (
    <section className="py-14 sm:py-16 md:py-20 overflow-hidden">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-5 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                {eyebrow}
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
              {title}
            </h2>
          </div>

          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-xs font-bold uppercase tracking-[0.14em] text-[#1e3a8a] transition-colors hover:text-[#0b1727]"
            >
              Ver todas →
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <PublicationCard
              key={`${item.category}-${item.title}`}
              item={item}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
