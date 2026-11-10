import {
  AreaPresidentsTimeline,
  FeaturedStory,
  FeedGrid,
  PageHero,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "../components/site-shell";
import { getPortfolioContent } from "../lib/public-content";
import { FuturosEngineViewer } from "./components/FuturosEngineViewer";

export default async function FuturosPage() {
  const { featured, feed } = await getPortfolioContent();

  const futurosPillars = [
    {
      title: "Apalancamiento de hasta 100X",
      badge: "Margen Institucional",
      desc: "Gestión avanzada de colateral en modos Aislado (ISOLATED) y Cruzado (CROSS), permitiendo optimizar el capital operativo con ratios de apalancamiento de hasta 100x.",
    },
    {
      title: "Arbitraje Cash & Carry",
      badge: "Arbitraje Sintético",
      desc: "Monitoreo permanente del costo de acarreo (carry) entre activos de renta fija soberana/corporativa y contratos de futuros para capturar primas de arbitraje libre de riesgo direccional.",
    },
    {
      title: "Contratos Perpetuos & Rofex",
      badge: "Multi-Activo",
      desc: "Negociación de contratos estandarizados de futuros de dólar financiero, commodities agrícolas y energéticos, índices bursátiles CME y perpetuos cripto.",
    },
    {
      title: "Paper Trading Competitivo",
      badge: "Torneos Segregados",
      desc: "Plataforma de simulación bursátil y rankings de desempeño cuantitativo para evaluar estrategias de inversión en derivados sin Look-Ahead Bias.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/futuros" />

      <PageHero
        eyebrow="Área de Futuros & Derivados"
        title="Mercado de Futuros & Derivados Financieros"
        description="Investigación cuantitativa y plataforma de paper trading en futuros financieros, derivados con apalancamiento de hasta 100x y torneos competitivos."
        aside={
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="#terminal-futuros"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b1727] px-4 sm:px-6 py-3.5 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-md transition hover:bg-[#1e3a8a] active:scale-[0.99] max-w-full text-center text-wrap break-words"
            >
              <span>⚡ Acceder al Terminal de Paper Trading de Futuros</span>
              <span>↓</span>
            </a>
            <span className="text-xs font-medium text-[#64748b]">
              Simulador institucional en vivo · Dólar Matba Rofex, Commodities, Índices y Cripto Perpetuos
            </span>
          </div>
        }
      />

      <main className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10 space-y-16 py-12 md:space-y-20 md:py-16">
        {/* Pilares Metodológicos de Futuros */}
        <section className="space-y-8">
          <SectionLabel
            eyebrow="Marco Técnico"
            title="Pilares del Área de Futuros y Derivados"
            description="Enfoque analítico para la valuación de contratos de futuros, dinámicas de bases y gestión de margen apalancado."
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
              description="Seguimiento de contratos de futuros, volumen operado, posiciones abiertas y análisis de mercado."
            />
            <FeedGrid items={feed} />
          </section>
        )}

        {/* Línea de Tiempo de Presidentes de Futuros */}
        <section className="pt-6 border-t border-[#e2e8f0]">
          <AreaPresidentsTimeline
            initialArea="FUTUROS"
            showTabs={false}
            title="Presidentes y Liderazgo de Futuros & Derivados"
            eyebrow="Historia & Mandatos"
            description="Trazabilidad histórica de las presidencias del área de futuros, modelos de arbitraje e hitos de paper trading."
          />
        </section>

        {/* Terminal Cuantitativo Oficial de Futuros & Paper Trading */}
        <section id="terminal-futuros" className="pt-10 border-t border-[#e2e8f0] scroll-mt-24">
          <FuturosEngineViewer />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
