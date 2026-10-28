import {
  FeaturedStory,
  FeedGrid,
  PageHero,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "./components/site-shell";
import { getHomeContent } from "./lib/public-content";

export default async function HomePage() {
  const { featured, feed, novedades } = await getHomeContent();

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/" />
      
      <PageHero
        eyebrow="Portal Institucional"
        title="Club de Finanzas UBA"
        description="Investigación cuantitativa, modelos de valuación, carteras de inversión y educación financiera de excelencia impulsada por estudiantes de la UBA."
      />

      <main className="mx-auto w-[min(1280px,92vw)] space-y-16 py-12 md:space-y-20 md:py-16">
        {/* Publicación Destacada Principal */}
        <section className="space-y-4">
          <SectionLabel
            eyebrow="Destacada"
            title="Publicación Principal de la Semana"
            description="El contenido más relevante elaborado por nuestros equipos de investigación y portfolio."
          />
          <FeaturedStory story={featured} />
        </section>

        {/* Novedades y Eventos */}
        {novedades.length > 0 && (
          <section className="space-y-6">
            <SectionLabel
              eyebrow="Agenda & Eventos"
              title="Próximas Actividades y Charlas"
              description="Conferencias con profesionales del mercado financiero y talleres formativos."
            />
            <FeedGrid items={novedades} />
          </section>
        )}

        {/* Informes y Archivo Reciente */}
        {feed.length > 0 && (
          <section className="space-y-6">
            <SectionLabel
              eyebrow="Publicaciones Recientes"
              title="Informes, Tesis y Análisis"
              description="Explorá los últimos artículos y documentos elaborados por los miembros del Club."
            />
            <FeedGrid items={feed} />
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
