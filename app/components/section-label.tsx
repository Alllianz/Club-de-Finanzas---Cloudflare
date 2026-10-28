export function SectionLabel({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[#e5e7eb] pb-5">
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-4 bg-[#b89047]" />
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1e3a8a]">
          {eyebrow}
        </p>
      </div>
      <h2 className="mt-2 font-serif text-2xl font-bold text-[#0b1727] sm:text-3xl md:text-[2.25rem] tracking-tight">
        {title}
      </h2>
      <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-[#64748b] sm:text-base">
        {description}
      </p>
    </div>
  );
}
