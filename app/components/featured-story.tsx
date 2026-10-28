import Link from "next/link";
import type { FeedEntry } from "../site-data";

type FeaturedStoryProps = {
  story: FeedEntry;
};

export function FeaturedStory({ story }: FeaturedStoryProps) {
  const isExternal = story.href.startsWith("http");

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-7 md:p-10 shadow-[0_4px_24px_rgba(9,26,54,0.06)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#0062ff]">
          {story.category}
        </span>
        {story.date && (
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748b]">
            {story.date}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-2xl font-extrabold leading-tight text-[#0e2246] sm:text-3xl md:text-4xl lg:text-5xl">
        {story.title}
      </h2>

      {story.imageUrl ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#f8fafc]">
          <div className="h-[300px] w-full md:h-[440px]">
            <img
              src={story.imageUrl}
              alt={story.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      ) : null}

      <p className="mt-5 max-w-4xl text-base leading-relaxed text-[#475569] md:text-lg">
        {story.excerpt}
      </p>

      <div className="mt-7">
        {isExternal ? (
          <a
            href={story.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#091a36] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0062ff]"
          >
            <span>{story.cta}</span>
            <span>→</span>
          </a>
        ) : (
          <Link
            href={story.href}
            className="inline-flex items-center gap-2 rounded-full bg-[#091a36] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#0062ff]"
          >
            <span>{story.cta}</span>
            <span>→</span>
          </Link>
        )}
      </div>
    </article>
  );
}
