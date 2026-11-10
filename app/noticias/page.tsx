import {
  FeaturedStory,
  FeedGrid,
  PageHero,
  SectionLabel,
  SiteFooter,
  SiteHeader,
} from "../components/site-shell";
import { getNewsContent, newsIntro } from "../lib/public-content";

export default async function NoticiasPage() {
  const { featured, feed } = await getNewsContent();

  return (
    <div className="min-h-screen bg-[#ffffff] font-sans text-[#334155]">
      <SiteHeader currentPath="/newsletter" />
      
      <PageHero
        eyebrow="Newsletter Semanal"
        title="Novedades del Club, Eventos y Cobertura Semanal"
        description={newsIntro}
      />

      <main className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10 space-y-16 py-12 md:space-y-20 md:py-16">
        <section className="space-y-4">
          <SectionLabel
            eyebrow="Edición Principal"
            title="Última Edición del Newsletter"
            description="Resumen de actualidad, agenda de actividades y notas destacadas del mercado."
          />
          <FeaturedStory story={featured} />
        </section>

        <section className="space-y-6">
          <SectionLabel
            eyebrow="Feed de Novedades"
            title="Agenda, Charlas y Actividades"
            description="Seguí el pulso institucional del Club: convocatorias, eventos con referentes del mercado y artículos semanales."
          />
          <FeedGrid items={feed} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
