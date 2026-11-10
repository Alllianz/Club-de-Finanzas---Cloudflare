import { PageHero, SectionLabel, SiteFooter, SiteHeader } from "../components/site-shell";
import { CedearsTable } from "./cedears-table";

export default function RatiosCedearsPage() {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#334155]">
      <SiteHeader currentPath="/ratios-cedears" />
      <PageHero
        eyebrow="Herramientas & Mercado"
        title="Ratios Oficiales de CEDEARs BYMA"
        description="Buscador en tiempo real de ratios de conversión y mercados de cotización para más de 400 certificados de depósito argentinos."
      />

      <main className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10 space-y-8 py-12 md:py-16">
        <SectionLabel
          eyebrow="Base Oficial BYMA"
          title="Tabla de Ratios de Conversión"
          description="Consultá rápidamente la relación entre el CEDEAR local y su acción subyacente en Wall Street."
        />
        <CedearsTable />
      </main>

      <SiteFooter />
    </div>
  );
}
