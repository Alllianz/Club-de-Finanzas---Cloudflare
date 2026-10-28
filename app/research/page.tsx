import {
  FeaturedStory,
  FeedGrid,
  PageHero,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "../components/site-shell";
import { getResearchContent } from "../lib/public-content";

export default async function ResearchPage() {
  const { featured, feed } = await getResearchContent();

  const researchPillars = [
    {
      title: "Modelos DCF & Flujos de Caja",
      badge: "Valuación Fundamental",
      desc: "Proyección explícita de flujos de fondos libres ajustados, modelado de costos de capital (WACC) y estimación de valor terminal anclado a fundamentales económicos.",
    },
    {
      title: "Análisis Exhaustivo de Estados Contables",
      badge: "Balances & Dupont",
      desc: "Desglose minucioso de estados de resultados, flujos de efectivo y balance patrimonial. Evaluación de calidad de deuda, solvencia, márgenes y retorno sobre capital (ROIC).",
    },
    {
      title: "Simulación de Monte Carlo",
      badge: "Incertidumbre Estocástica",
      desc: "Incorporación de distribuciones de probabilidad sobre variables críticas de crecimiento y descuento para obtener rangos estadísticos de valor intrínseco.",
    },
    {
      title: "Múltiplos Relativos & Comps",
      badge: "EV/EBITDA & P/E",
      desc: "Valuación relativa frente a competidores sectoriales globales, neutralizando diferencias de apalancamiento financiero y estructura de capital.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/research" />
      
      <PageHero
        eyebrow="Área de Research"
        title="Investigación Macroeconómica, Renta Fija y Valuación"
        description="Elaboración de tesis de inversión fundamental, análisis contable y financiero de compañías, modelos de flujos descontados y estudios macroeconómicos de coyuntura."
      />

      <main className="mx-auto w-[min(1280px,92vw)] space-y-16 py-12 md:space-y-20 md:py-16">
        {/* Pilares Metodológicos de Research */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Marco Analítico"
            title="Metodología de Valuación y Research"
            description="Herramientas técnicas y marcos conceptuales aplicados en la elaboración de cada informe de inversión."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {researchPillars.map((p) => (
              <article
                key={p.title}
                className="flex flex-col justify-between rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm transition hover:border-[#0062ff]"
              >
                <div>
                  <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0062ff]">
                    {p.badge}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-[#0e2246]">{p.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#64748b]">{p.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Publicación Destacada */}
        <section className="space-y-4">
          <SectionLabel
            eyebrow="Informe Destacado"
            title="Publicación de Research de la Semana"
            description="Marco teórico y análisis profundo de coyuntura y valuación de compañías."
          />
          <FeaturedStory story={featured} />
        </section>

        {/* Feed de Informes */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Biblioteca de Informes"
            title="Publicaciones del Equipo de Research"
            description="Marcos teóricos rigurosos, seguimiento macroeconómico de Argentina y valuación sectorial internacional."
          />
          <FeedGrid items={feed} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
