import {
  FeaturedStory,
  FeedGrid,
  PageHero,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "../components/site-shell";
import { getPortfolioContent } from "../lib/public-content";

export default async function FuturosPage() {
  const { featured, feed } = await getPortfolioContent();

  const futurosPillars = [
    {
      title: "Curva de Tasas Implícitas",
      badge: "Matba Rofex",
      desc: "Modelado de la estructura temporal de tasas implícitas de devaluación en contratos de futuros de dólar frente al spot oficial y financiero, analizando spreads y expectativas del mercado.",
    },
    {
      title: "Estrategias de Cobertura (Hedging)",
      badge: "Gestión de Riesgo",
      desc: "Diseño cuantitativo de coberturas cambiarias y de tasa para mitigar descalces de balance, minimizando el riesgo de base (basis risk) y optimizando el costo financiero total.",
    },
    {
      title: "Arbitraje Cash & Carry",
      badge: "Arbitraje Sintético",
      desc: "Monitoreo permanente del costo de acarreo (carry) entre activos de renta fija soberana/corporativa y contratos de futuros para capturar primas de arbitraje libre de riesgo direccional.",
    },
    {
      title: "Paridad Cubierta de Tasas (CIP)",
      badge: "Macro & Tasas",
      desc: "Evaluación empírica de desvíos en la paridad de tasas de interés cubiertas, diferenciales entre tasas locales e internacionales y dinámica de márgenes y garantías.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/futuros" />

      <PageHero
        eyebrow="Área de Futuros & Derivados"
        title="Mercado de Derivados, Coberturas y Tasas Implícitas"
        description="Investigación cuantitativa en futuros financieros, modelado de curvas de tasas implícitas, estrategias de cobertura cambiaria y análisis de arbitraje en los mercados locales e internacionales."
      />

      <main className="mx-auto w-[min(1320px,92vw)] space-y-16 py-14 md:space-y-20 md:py-20">
        {/* Pilares Metodológicos de Futuros */}
        <section className="space-y-8">
          <SectionLabel
            eyebrow="Marco Técnico"
            title="Pilares del Área de Futuros y Derivados"
            description="Enfoque analítico para el estudio de contratos de futuros, primas por riesgo cambiario y estructuración de coberturas."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {futurosPillars.map((p) => (
              <article
                key={p.title}
                className="flex flex-col justify-between rounded-xl border border-[#e5e7eb] bg-[#ffffff] p-6 shadow-xs transition hover:border-[#0b1727]"
              >
                <div>
                  <span className="rounded-md border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#1e3a8a]">
                    {p.badge}
                  </span>
                  <h3 className="mt-4 font-serif text-lg font-bold text-[#0b1727]">
                    {p.title}
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-[#64748b]">
                    {p.desc}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Publicación Destacada */}
        <section className="space-y-6">
          <SectionLabel
            eyebrow="Informe Central"
            title="Publicación Destacada en Derivados"
            description="Tesis y notas técnicas publicadas por el equipo de análisis de futuros."
          />
          <FeaturedStory story={featured} />
        </section>

        {/* Informes del Área */}
        {feed.length > 0 && (
          <section className="space-y-8">
            <SectionLabel
              eyebrow="Archivo Técnico"
              title="Notas de Coyuntura y Reportes"
              description="Seguimiento de curvas de devaluación implícita, posiciones abiertas y tasas efectivas."
            />
            <FeedGrid items={feed} />
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
