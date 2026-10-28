export type AssetHolding = {
  ticker: string;
  name: string;
  category: "O&G Integrada" | "Utility Regulada" | "Midstream Gas" | "Equipamiento Eléctrico" | "Generación Merchant" | "Upstream Argentina";
  role: string;
  defaultWeight: number; // e.g. 0.25 (25%)
  minWeight: number;     // e.g. 0.05 (5%)
  maxWeight: number;     // e.g. 0.30 (30%)
  expectedReturn: number; // e.g. 0.33 (33% CAGR)
  volatility: number;    // e.g. 0.184 (18.4%)
  betaSpy: number;       // Beta vs SPY
  betaSector: number;    // Beta vs Sector (XLE/XLU)
  divYield: number;      // Dividend Yield %
  thesisSummary: string;
  keyCatalyst: string;
};

export type PortfolioWeights = {
  [ticker: string]: number; // weight 0.00 to 1.00
};

export type PortfolioMetrics = {
  cagr: number;
  volatility: number;
  sharpeRatio: number;
  betaBenchmark: number;
  betaMarket: number;
  maxDrawdown: number;
  avgCorrelation: number;
  var99Parametric: number;
  var99Historical: number;
  cvar99: number;
  divYield: number;
  riskAllocation: {
    regulatedAndToll: number; // % SO + WMB
    oilAndGasExposure: number; // % XOM + YPF
    aiInfrastructureCapex: number; // % ETN + VST
  };
};

export type EfficientFrontierPoint = {
  volatility: number;
  expectedReturn: number;
  sharpeRatio: number;
  weights: PortfolioWeights;
};

export type StressScenario = {
  id: string;
  title: string;
  description: string;
  probability: string;
  portfolioImpactPercent: number;
  benchmarkImpactPercent: number;
  primaryDampeners: string[];
  primaryDrivers: string[];
};

export type MarkowitzOptimizationResult = {
  weights: PortfolioWeights;
  metrics: PortfolioMetrics;
  efficientFrontier: EfficientFrontierPoint[];
  gmvPortfolio: EfficientFrontierPoint;
  maxSharpePortfolio: EfficientFrontierPoint;
};
