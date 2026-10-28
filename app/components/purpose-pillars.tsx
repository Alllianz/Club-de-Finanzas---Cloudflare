type PurposeRow = {
  tag: string;
  title: string;
  description: string;
};

const defaultPillars: PurposeRow[] = [
  {
    tag: "RESEARCH",
    title: "Analizamos mercados y activos",
    description:
      "Preparamos informes exhaustivos sobre empresas, bonos y coyuntura macroeconómica, explicitando supuestos y metodología de valuación.",
  },
  {
    tag: "PORTFOLIO",
    title: "Seguimos una cartera modelo",
    description:
      "Evaluamos riesgo, diversificación y horizonte temporal para discutir y ejecutar decisiones de asignación con rigor analítico.",
  },
  {
    tag: "RELACIONES INSTITUCIONALES",
    title: "Acercamos al Club al sector financiero",
    description:
      "Construimos vínculos sólidos con firmas, docentes y entidades del mercado de capitales, coordinando conferencias y actividades formativas.",
  },
];

export function PurposePillars() {
  return (
    <section className="border-b border-[#e5e7eb] bg-white py-16 md:py-20">
      <div className="mx-auto w-[min(1320px,92vw)]">
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
          {/* Columna Izquierda Fija / Sticky */}
          <div className="lg:sticky lg:top-28">
            <div className="flex items-center gap-2">
              <span className="h-[2px] w-5 bg-[#b89047]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                En la práctica
              </span>
            </div>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight tracking-tight text-[#0b1727] sm:text-4xl">
              Qué hacemos durante el año
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#64748b] sm:text-base">
              Reuniones de trabajo semanales, análisis y publicaciones: así llevamos las finanzas del plano teórico a la práctica profesional.
            </p>
          </div>

          {/* Columna Derecha: Filas de Propósito */}
          <div className="divide-y divide-[#e5e7eb] border-t border-[#e5e7eb]">
            {defaultPillars.map((pillar) => (
              <article
                key={pillar.tag}
                className="grid grid-cols-1 gap-4 py-8 sm:grid-cols-[180px_1fr] sm:gap-6"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1e3a8a]">
                    {pillar.tag}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-[#0b1727]">
                    {pillar.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
                    {pillar.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
