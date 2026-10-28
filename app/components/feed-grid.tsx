import Link from "next/link";
import type { FeedEntry } from "../site-data";

type FeedGridProps = {
  items: FeedEntry[];
};

export function FeedGrid({ items }: FeedGridProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={`${item.category}-${item.title}`}
          className="group flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#0062ff] hover:shadow-[0_8px_24px_rgba(0,98,255,0.08)]"
        >
          <div>
            {item.imageUrl ? (
              <div className="-mx-6 -mt-6 mb-5 overflow-hidden rounded-t-[14px] border-b border-[#e2e8f0] bg-[#f8fafc]">
                <div className="h-48 w-full">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#0062ff]">
                {item.category}
              </span>
              {item.date && (
                <span className="text-[11px] font-semibold text-[#64748b]">
                  {item.date}
                </span>
              )}
            </div>
            <h3 className="mt-4 text-lg font-bold leading-snug text-[#0e2246] transition group-hover:text-[#0062ff]">
              {item.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[#475569] line-clamp-3">
              {item.excerpt}
            </p>
          </div>

          <div className="mt-6 border-t border-[#f1f5f9] pt-4">
            {item.href.startsWith("http") ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0062ff] transition group-hover:underline"
              >
                <span>{item.cta}</span>
                <span>→</span>
              </a>
            ) : (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0062ff] transition group-hover:underline"
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
