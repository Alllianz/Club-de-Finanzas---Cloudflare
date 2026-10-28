const skeletonSections = [
  { key: "indices", title: "Índices" },
  { key: "rates", title: "Tasas" },
  { key: "energy", title: "Energía" },
] as const;

export function MonitorGlobalSkeleton() {
  return (
    <>
      {skeletonSections.map((section) => (
        <section key={section.key} className="overflow-hidden border-t border-[var(--color-line)] first:border-t-0">
          <h2 className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.32em] text-[var(--color-blue)]">
            {section.title}
          </h2>
          <div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`${section.key}-skeleton-${index}`}
                className={`grid grid-cols-[minmax(0,1fr)_40px_auto] items-center gap-2 border-t border-[var(--color-line)] px-5 py-4 ${
                  index % 2 === 0 ? "bg-[rgba(18,63,137,0.03)]" : "bg-white"
                }`}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--color-bg-soft)]" />
                  <div className="min-w-0 space-y-2">
                    <div className="h-4 w-28 animate-pulse rounded bg-[var(--color-bg-soft)]" />
                    <div className="h-8 w-36 animate-pulse rounded bg-[var(--color-bg-soft)]" />
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--color-bg-soft)]" />
                </div>

                <div className="flex justify-end">
                  <div className="h-6 w-24 animate-pulse rounded bg-[var(--color-bg-soft)]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
