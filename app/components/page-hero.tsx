import type { ReactNode } from "react";

type HeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

export function PageHero({ eyebrow, title, description, aside }: HeroProps) {
  return (
    <section className="relative border-b border-[#e5e7eb] bg-[#fafaf9] py-14 md:py-20">
      <div className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="max-w-4xl animate-fade-up">
          <div className="flex items-center gap-2.5">
            <span className="h-[2px] w-6 bg-[#b89047]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1e3a8a]">
              {eyebrow}
            </span>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-bold leading-[1.15] tracking-tight text-[#0b1727] sm:text-4xl md:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>

          <p className="mt-5 max-w-3xl text-base font-normal leading-relaxed text-[#475569] sm:text-lg md:text-xl">
            {description}
          </p>

          {aside ? <div className="mt-8">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
