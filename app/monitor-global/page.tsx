import { MonitorGlobalDashboard } from "../components/monitor-global-dashboard";
import { PageHero, SectionLabel, SiteFooter, SiteHeader } from "../components/site-shell";
import { CedearsTable } from "../ratios-cedears/cedears-table";

export default function MonitorGlobalPage() {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#334155]">
      <SiteHeader currentPath="/monitor-global" />
      <PageHero
        eyebrow="Mercados Globales"
        title="Monitor Financiero & Macro Internacional"
        description="Seguimiento de índices de Wall Street, curvas de rendimiento del Tesoro de EE.UU., commodities de energía y riesgo país argentino."
      />

      <main className="mx-auto w-[min(1240px,92vw)] space-y-12 py-12 md:space-y-16 md:py-16">
        <MonitorGlobalDashboard />

        <section className="space-y-6">
          <SectionLabel
            eyebrow="Renta Variable Local"
            title="Ratios de CEDEARs BYMA"
            description="Consulta de paridades y factores de conversión de certificados de acciones extranjeras operables en Argentina."
          />
          <CedearsTable />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
