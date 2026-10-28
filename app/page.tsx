import {
  ClubResources,
  ClubStats,
  FeaturedCard,
  HomeHero,
  PurposePillars,
  PublicationsGrid,
  SiteFooter,
  SiteHeader,
  SponsorsStrip,
} from "./components/site-shell";
import { getHomeContent } from "./lib/public-content";

export default async function HomePage() {
  const { featured, feed } = await getHomeContent();

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      {/* 1. Header con Topline y Navegación Institucional */}
      <SiteHeader currentPath="/" />

      <main>
        {/* 2. Hero con Formato Split 2 Columnas (Copy + Visual Showcase) */}
        <HomeHero />

        {/* 3. Métricas y Alcance Institucional (El Club en Números) */}
        <ClubStats />

        {/* 4. Novedades / Publicación Destacada Principal (Formato .featured horizontal) */}
        <section className="py-16 md:py-20">
          <div className="mx-auto w-[min(1320px,92vw)]">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-[2px] w-5 bg-[#b89047]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                    Lo que está pasando
                  </span>
                </div>
                <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#0b1727] sm:text-3xl">
                  Novedades
                </h2>
              </div>
            </div>

            <FeaturedCard story={featured} />
          </div>
        </section>

        {/* 5. Recursos del Club (Formato .resources en 3 Columnas) */}
        <ClubResources />

        {/* 6. Propósito y Actividades Anuales (Formato .purpose-layout) */}
        <PurposePillars />

        {/* 7. Archivo y Últimas Publicaciones (Formato .cards en 3 Columnas) */}
        {feed.length > 0 && (
          <PublicationsGrid
            items={feed.slice(0, 6)}
            title="Últimas publicaciones"
            eyebrow="Análisis e ideas"
            viewAllHref="/research"
          />
        )}

        {/* 8. Sponsors e Instituciones Aliadas (Formato .sponsors) */}
        <SponsorsStrip />
      </main>

      {/* 9. Pie de Página Institucional */}
      <SiteFooter />
    </div>
  );
}
