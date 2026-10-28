import Link from "next/link";
import type { FeedEntry } from "../site-data";

type FeaturedStoryProps = {
  story: FeedEntry;
};

export function FeaturedStory({ story }: FeaturedStoryProps) {
  const isExternal = story.href.startsWith("http");

  return (
    <article className="group relative overflow-hidden rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-8 md:p-12 shadow-xs transition-shadow duration-200 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a]">
          {story.category}
        </span>
        {story.date && (
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
            {story.date}
          </span>
        )}
      </div>

      <h2 className="mt-5 font-serif text-2xl font-bold leading-tight text-[#0b1727] sm:text-3xl md:text-4xl lg:text-[2.75rem]">
        {story.title}
      </h2>

      {story.imageUrl ? (
        <div className="mt-8 overflow-hidden rounded-lg border border-[#e2e8f0] bg-[#f8fafc]">
          <div className="h-[320px] w-full md:h-[460px]">
            <img
              src={story.imageUrl}
              alt={story.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.01]"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      <p className="mt-6 max-w-4xl text-base leading-relaxed text-[#475569] md:text-lg">
        {story.excerpt}
      </p>

      <div className="mt-8">
        {isExternal ? (
          <a
            href={story.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-[#0b1727] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a]"
          >
            <span>{story.cta}</span>
            <span>→</span>
          </a>
        ) : (
          <Link
            href={story.href}
            className="inline-flex items-center gap-2 rounded-md bg-[#0b1727] px-6 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition-colors hover:bg-[#1e3a8a]"
          >
            <span>{story.cta}</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </article>
  );
}
