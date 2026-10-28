import {
  FeaturedStory,
  FeedGrid,
  PageHero,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "../components/site-shell";
import { getPortfolioContent } from "../lib/public-content";

export default async function PortfolioPage() {
  const { featured, feed } = await getPortfolioContent();

  const portfolioPillars = [
    {
      title: "Optimización Media-Varianza",
      badge: "Markowitz",
      desc: "Construcción cuantitativa basada en matrices de covarianzas sobre series históricas de retornos. Priorizamos carteras de mínima varianza para reducir errores de estimación.",
    },
    {
      title: "Asignación por Naturaleza de Riesgo",
      badge: "Asset Allocation",
      desc: "Distribución estratégica entre flujos regulados y contractuales, exposición a materias primas y ciclos de inversión de capital con asimetría de retorno.",
    },
    {
      title: "Gestión de Riesgo y Sensibilidad",
      badge: "Control de Riesgo",
      desc: "Monitoreo permanente de betas sectoriales, correlaciones cruzadas, máxima caída pico-a-valle (drawdown) y validación de modelos fuera de muestra (OOS).",
    },
    {
      title: "Disciplina de Rebalanceo",
      badge: "Horizonte 2-3 Años",
      desc: "Seguimiento periódico y recalibración sistemática ante desvíos en las ponderaciones objetivo o cambios estructurales en el escenario macroeconómico.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/portfolio" />
      
      <PageHero
        eyebrow="Área de Portafolio"
        title="Estrategia, Asignación de Activos y Modelos Cuantitativos"
        description="Construcción cuantitativa de carteras multiactivo, optimización de media-varianza de Markowitz, asset allocation estratégico y gestión integral del riesgo financiero."
      />

      <main className="mx-auto w-[min(1280px,92vw)] space-y-16 py-12 md:space-y-20 md:py-16">
        {/* Pilares Metodológicos de Portfolio */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Filosofía de Inversión"
            title="Enfoque y Criterios del Área de Portafolio"
            description="Metodología cuantitativa para la selección y ponderación de carteras con horizonte de mediano y largo plazo."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {portfolioPillars.map((p) => (
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

        {/* Publicación Destacada de Portfolio */}
        <section className="space-y-4">
          <SectionLabel
            eyebrow="Publicación Destacada"
            title="Estrategia y Posicionamiento de Cartera"
            description="Visión de inversión macroeconómica y asignación estratégica del equipo de Portfolio."
          />
          <FeaturedStory story={featured} />
        </section>

        {/* Feed de Publicaciones de Portfolio */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Archivo del Área"
            title="Publicaciones del Equipo de Portafolio"
            description="Estrategias de inversión, seguimiento de carteras modelo y notas metodológicas de asignación de activos."
          />
          <FeedGrid items={feed} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
