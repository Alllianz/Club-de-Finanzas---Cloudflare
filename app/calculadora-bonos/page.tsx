import { PageHero, SectionLabel, SiteFooter, SiteHeader } from "../components/site-shell";
import { LetrasCurveDashboard } from "../components/letras-curve-dashboard";

export default function CalculadoraBonosPage() {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#334155]">
      <SiteHeader currentPath="/calculadora-bonos" />
      <PageHero
        eyebrow="Renta Fija & Curvas"
        title="Curva de Letras del Tesoro (LECAPs)"
        description="Modelo cuantitativo de tasas efectivas anuales (TEA) versus días al vencimiento (DTM) con ajuste por regresión cuadrática y cotizaciones en tiempo real."
      />

      <main className="mx-auto w-full max-w-[min(1440px,94vw)] px-4 sm:px-6 lg:px-8 xl:px-10 space-y-10 py-12 md:py-16">
        <SectionLabel
          eyebrow="Análisis Cuantitativo"
          title="Instrumentos Capitalizables en Pesos"
          description="Estructura temporal de tasas de interés de deuda soberana de corto plazo en Argentina."
        />
        <LetrasCurveDashboard />
      </main>

      <SiteFooter />
    </div>
  );
}
