import Link from "next/link";
import type { FeedEntry } from "../site-data";

type FeedGridProps = {
  items: FeedEntry[];
};

export function FeedGrid({ items }: FeedGridProps) {
  return (
    <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={`${item.category}-${item.title}`}
          className="group flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#cbd5e1] hover:shadow-md"
        >
          <div>
            {item.imageUrl ? (
              <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-[11px] border-b border-[#e5e7eb] bg-[#f8fafc]">
                <div className="h-48 w-full">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    loading="lazy"
                  />
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1e3a8a]">
                {item.category}
              </span>
              {item.date && (
                <span className="text-[11px] font-medium text-[#64748b]">
                  {item.date}
                </span>
              )}
            </div>
            <h3 className="mt-3.5 font-serif text-lg font-bold leading-snug text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]">
              {item.title}
            </h3>
            <p className="mt-2.5 text-sm leading-relaxed text-[#475569] line-clamp-3">
              {item.excerpt}
            </p>
          </div>

          <div className="mt-6 border-t border-[#f1f5f9] pt-4">
            {item.href.startsWith("http") ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]"
              >
                <span>{item.cta}</span>
                <span>→</span>
              </a>
            ) : (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727] transition-colors group-hover:text-[#1e3a8a]"
              >
                <span>{item.cta}</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
