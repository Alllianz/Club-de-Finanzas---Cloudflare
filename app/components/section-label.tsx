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
    <div className="max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#0062ff]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[#0e2246] sm:text-3xl md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-[#64748b] sm:text-base">{description}</p>
    </div>
  );
}
