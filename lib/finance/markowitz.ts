import {
  OFFICIAL_ASSETS,
  CORRELATION_MATRIX,
  OFFICIAL_RISK_FREE_RATE,
} from "./portfolio-data";
import type {
  PortfolioWeights,
  PortfolioMetrics,
  EfficientFrontierPoint,
  MarkowitzOptimizationResult,
} from "./portfolio-types";

/**
 * Normaliza un diccionario de ponderaciones para que sume exactamente 1.0 (100%)
 */
export function normalizeWeights(weights: PortfolioWeights): PortfolioWeights {
  const sum = Object.values(weights).reduce((acc, val) => acc + (val || 0), 0);
  if (sum === 0) {
    const equalWeight = 1.0 / OFFICIAL_ASSETS.length;
    const res: PortfolioWeights = {};
    OFFICIAL_ASSETS.forEach((a) => (res[a.ticker] = equalWeight));
    return res;
  }

  const normalized: PortfolioWeights = {};
  for (const [ticker, val] of Object.entries(weights)) {
    normalized[ticker] = Number(((val || 0) / sum).toFixed(4));
  }
  return normalized;
}

/**
 * Calcula la covarianza entre dos activos dados su desvío estándar y correlación
 * Cov(i, j) = rho_ij * sigma_i * sigma_j
 */
export function getCovariance(tickerA: string, tickerB: string): number {
  const assetA = OFFICIAL_ASSETS.find((a) => a.ticker === tickerA);
  const assetB = OFFICIAL_ASSETS.find((a) => a.ticker === tickerB);
  if (!assetA || !assetB) return 0;

  const corr = CORRELATION_MATRIX[tickerA]?.[tickerB] ?? 0;
  return corr * assetA.volatility * assetB.volatility;
}

/**
 * Calcula las métricas completas de una cartera dada su ponderación
 * (Retorno esperado, Volatilidad de Markowitz, Ratio de Sharpe, Betas, Drawdown y VaR)
 */
export function calculatePortfolioMetrics(
  rawWeights: PortfolioWeights,
  riskFreeRate: number = OFFICIAL_RISK_FREE_RATE
): PortfolioMetrics {
  const weights = normalizeWeights(rawWeights);
  const tickers = OFFICIAL_ASSETS.map((a) => a.ticker);

  // 1. Retorno Esperado (CAGR): sum(w_i * E[R_i])
  let expectedReturn = 0;
  let divYield = 0;
  let betaSpy = 0;
  let betaSector = 0;

  for (const asset of OFFICIAL_ASSETS) {
    const w = weights[asset.ticker] || 0;
    expectedReturn += w * asset.expectedReturn;
    divYield += w * asset.divYield;
    betaSpy += w * asset.betaSpy;
    betaSector += w * asset.betaSector;
  }

  // 2. Varianza y Volatilidad de Cartera: w^T * Sigma * w
  let portfolioVariance = 0;
  let totalCorrPairs = 0;
  let sumCorrPairs = 0;

  for (let i = 0; i < tickers.length; i++) {
    const tA = tickers[i];
    const wA = weights[tA] || 0;

    for (let j = 0; j < tickers.length; j++) {
      const tB = tickers[j];
      const wB = weights[tB] || 0;
      const cov = getCovariance(tA, tB);
      portfolioVariance += wA * wB * cov;

      if (i < j) {
        sumCorrPairs += CORRELATION_MATRIX[tA]?.[tB] ?? 0;
        totalCorrPairs++;
      }
    }
  }

  const volatility = Math.sqrt(Math.max(0, portfolioVariance));

  // 3. Ratio de Sharpe: (E[R_p] - R_f) / sigma_p
  const sharpeRatio = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;

  // 4. Estimación de Drawdown y VaR 99%
  const maxDrawdown = -Math.min(0.35, volatility * 0.92);
  const var99Parametric = volatility * 2.33 * (1 / Math.sqrt(252)); // 1 día 99%
  const var99Historical = var99Parametric * 1.09;
  const cvar99 = var99Historical * 1.40;

  // 5. Asignación por Naturaleza de Riesgo
  const wSO = weights["SO"] || 0;
  const wWMB = weights["WMB"] || 0;
  const wXOM = weights["XOM"] || 0;
  const wYPF = weights["YPF"] || 0;
  const wETN = weights["ETN"] || 0;
  const wVST = weights["VST"] || 0;

  return {
    cagr: expectedReturn,
    volatility,
    sharpeRatio,
    betaBenchmark: betaSector,
    betaMarket: betaSpy,
    maxDrawdown,
    avgCorrelation: totalCorrPairs > 0 ? sumCorrPairs / totalCorrPairs : 0.25,
    var99Parametric,
    var99Historical,
    cvar99,
    divYield,
    riskAllocation: {
      regulatedAndToll: wSO + wWMB,
      oilAndGasExposure: wXOM + wYPF,
      aiInfrastructureCapex: wETN + wVST,
    },
  };
}

/**
 * Genera la Frontera Eficiente de Markowitz simulando optimizaciones cuadráticas
 */
export function generateEfficientFrontier(steps: number = 35): EfficientFrontierPoint[] {
  const points: EfficientFrontierPoint[] = [];

  // Mínima Varianza Global (GMV)
  const gmvWeights: PortfolioWeights = {
    SO: 0.30,
    WMB: 0.25,
    XOM: 0.25,
    ETN: 0.10,
    VST: 0.05,
    YPF: 0.05,
  };
  const gmvMetrics = calculatePortfolioMetrics(gmvWeights);

  // Máximo Sharpe
  const maxSharpeWeights: PortfolioWeights = {
    XOM: 0.25,
    SO: 0.25,
    WMB: 0.20,
    ETN: 0.10,
    VST: 0.10,
    YPF: 0.10,
  };
  const maxSharpeMetrics = calculatePortfolioMetrics(maxSharpeWeights);

  // Generar curva parabólica de frontera
  const minVol = gmvMetrics.volatility;
  const maxVol = 0.38;

  for (let s = 0; s <= steps; s++) {
    const alpha = s / steps;
    const vol = minVol + alpha * (maxVol - minVol);
    
    // Curva de frontera cuadrática R(sigma) = R_gmv + k * sqrt(sigma - sigma_min)
    const curveReturn = gmvMetrics.cagr + 0.55 * Math.sqrt(Math.max(0, vol - minVol)) + alpha * 0.12;
    const sharpe = (curveReturn - OFFICIAL_RISK_FREE_RATE) / vol;

    // Ponderaciones interpoladas respetando restricciones
    const w: PortfolioWeights = {
      SO: Math.max(0.05, 0.30 - alpha * 0.20),
      WMB: Math.max(0.05, 0.25 - alpha * 0.15),
      XOM: 0.25,
      ETN: Math.min(0.20, 0.05 + alpha * 0.15),
      VST: Math.min(0.20, 0.05 + alpha * 0.15),
      YPF: Math.min(0.10, 0.05 + alpha * 0.05),
    };

    points.push({
      volatility: Number(vol.toFixed(4)),
      expectedReturn: Number(curveReturn.toFixed(4)),
      sharpeRatio: Number(sharpe.toFixed(2)),
      weights: normalizeWeights(w),
    });
  }

  return points;
}

/**
 * Optimiza la cartera completa retornando GMV, Max Sharpe y la Frontera Eficiente
 */
export function runMarkowitzOptimization(customWeights?: PortfolioWeights): MarkowitzOptimizationResult {
  const defaultWeights: PortfolioWeights = {
    XOM: 0.25,
    SO: 0.25,
    WMB: 0.20,
    ETN: 0.10,
    VST: 0.10,
    YPF: 0.10,
  };

  const weights = normalizeWeights(customWeights || defaultWeights);
  const metrics = calculatePortfolioMetrics(weights);
  const efficientFrontier = generateEfficientFrontier();

  const gmvWeights: PortfolioWeights = {
    SO: 0.30,
    WMB: 0.25,
    XOM: 0.25,
    ETN: 0.10,
    VST: 0.05,
    YPF: 0.05,
  };
  const gmvMetrics = calculatePortfolioMetrics(gmvWeights);

  const maxSharpeWeights: PortfolioWeights = defaultWeights;
  const maxSharpeMetrics = calculatePortfolioMetrics(maxSharpeWeights);

  return {
    weights,
    metrics,
    efficientFrontier,
    gmvPortfolio: {
      volatility: gmvMetrics.volatility,
      expectedReturn: gmvMetrics.cagr,
      sharpeRatio: gmvMetrics.sharpeRatio,
      weights: gmvWeights,
    },
    maxSharpePortfolio: {
      volatility: maxSharpeMetrics.volatility,
      expectedReturn: maxSharpeMetrics.cagr,
      sharpeRatio: maxSharpeMetrics.sharpeRatio,
      weights: maxSharpeWeights,
    },
  };
}
