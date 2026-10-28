import type { StressScenario, PortfolioWeights } from "./portfolio-types";

export const STRESS_SCENARIOS: StressScenario[] = [
  {
    id: "ai_rally",
    title: "1. Rally de Capex en IA & Datacenters",
    description: "Aceleración en la demanda de energía para servidores y contratos PPA nuclear/gas. Expansión masiva de múltiplos y backlog en equipamiento eléctrico.",
    probability: "Alta (45%)",
    portfolioImpactPercent: 18.5,
    benchmarkImpactPercent: 8.2,
    primaryDrivers: ["VST (+30% EBITDA / PPA Amazon)", "ETN (Backlog 307 GW)", "WMB (Proyecto Sócrates)"],
    primaryDampeners: ["SO (Tarifa regulada sin exposición a precios spot)"],
  },
  {
    id: "risk_off",
    title: "2. Escenario Risk-Off / Ajuste de Mercado",
    description: "Corrección general en activos de riesgo, ampliación de spreads crediticios y compresión de múltiplos de crecimiento.",
    probability: "Media (25%)",
    portfolioImpactPercent: -6.4,
    benchmarkImpactPercent: -14.8,
    primaryDrivers: ["ETN (-12% compresión de múltiplo)", "VST (Volatilidad de corto plazo)"],
    primaryDampeners: ["SO (Renta regulada / activo refugio)", "WMB (Contratos take-or-pay)", "XOM (Dividend Yield 2,69%)"],
  },
  {
    id: "energy_shock",
    title: "3. Shock Energético / Alza de Crudo",
    description: "Tensiones geopolíticas y restricción de oferta global impulsando el barril de Brent por encima de USD 90.",
    probability: "Media-Baja (20%)",
    portfolioImpactPercent: 14.2,
    benchmarkImpactPercent: 11.5,
    primaryDrivers: ["XOM (Guyana Stabroek & Permian FCF)", "YPF (Lifting $4/bbl en Vaca Muerta + VMOS)"],
    primaryDampeners: ["SO / WMB (Estabilidad de flujos predecibles)"],
  },
  {
    id: "high_rates",
    title: "4. Tasas Altas / Curva Invertida (UST 10Y > 4.8%)",
    description: "Persistencia inflacionaria obligando a la Reserva Federal a mantener tasas elevadas, penalizando activos intensivos en capital.",
    probability: "Baja (10%)",
    portfolioImpactPercent: -4.2,
    benchmarkImpactPercent: -9.6,
    primaryDrivers: ["SO (Presión transitoria sobre costo de deuda para Capex)"],
    primaryDampeners: ["XOM (Desapalancamiento récord)", "WMB (Fondeo Blackstone al 6,35%)"],
  },
];

export function calculateScenarioImpact(weights: PortfolioWeights, scenarioId: string): number {
  const scenario = STRESS_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return 0;

  // Ponderaciones normalizadas
  const wXOM = weights["XOM"] || 0.25;
  const wSO = weights["SO"] || 0.25;
  const wWMB = weights["WMB"] || 0.20;
  const wETN = weights["ETN"] || 0.10;
  const wVST = weights["VST"] || 0.10;
  const wYPF = weights["YPF"] || 0.10;

  switch (scenarioId) {
    case "ai_rally":
      // Favorece fuertemente a VST (+45%), ETN (+35%), WMB (+18%), SO (+8%), XOM (+6%), YPF (+10%)
      return wVST * 0.45 + wETN * 0.35 + wWMB * 0.18 + wSO * 0.08 + wXOM * 0.06 + wYPF * 0.10;

    case "risk_off":
      // Amortiguadores: SO (-2%), WMB (-4%), XOM (-5%), ETN (-14%), VST (-18%), YPF (-15%)
      return -(wSO * 0.02 + wWMB * 0.04 + wXOM * 0.05 + wETN * 0.14 + wVST * 0.18 + wYPF * 0.15);

    case "energy_shock":
      // Foco en crudo: XOM (+28%), YPF (+32%), WMB (+12%), VST (+8%), SO (+2%), ETN (+4%)
      return wXOM * 0.28 + wYPF * 0.32 + wWMB * 0.12 + wVST * 0.08 + wSO * 0.02 + wETN * 0.04;

    case "high_rates":
      // Penaliza utilities reguladas SO (-8%), WMB (-5%), ETN (-6%), VST (-4%), XOM (+2%), YPF (-3%)
      return -(wSO * 0.08 + wWMB * 0.05 + wETN * 0.06 + wVST * 0.04 + wYPF * 0.03) + wXOM * 0.02;

    default:
      return scenario.portfolioImpactPercent / 100;
  }
}
