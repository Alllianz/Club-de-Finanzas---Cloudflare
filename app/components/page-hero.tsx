import type { ReactNode } from "react";

type HeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

export function PageHero({ eyebrow, title, description }: HeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#e2e8f0] bg-gradient-to-b from-[#f0f6ff]/80 via-[#ffffff] to-[#ffffff] py-12 md:py-16">
      <div className="mx-auto w-[min(1280px,92vw)]">
        <div className="max-w-4xl animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#0062ff]">
            {eyebrow}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-[1.12] tracking-tight text-[#0e2246] sm:text-4xl md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#475569] sm:text-lg md:text-xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
