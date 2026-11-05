// Optimizador Determinista de Markowitz y Frontera Eficiente
// Portado del algoritmo de Gradiente Proyectado de Rust

import {
  calcularRetornosDiarios,
  mean,
  stdDev,
  calcularMatrizCovarianza,
  calcularMatrizCorrelacion,
  calcularDownsideVol,
  calcularBetasCAPM,
} from "./math-stats";
import { getAlignedPriceMatrix, fetchHistoricalCandles } from "./historical-data";
import { OptimizarRequest, OptimizarResponse } from "./types";

const DIAS_ANUALIZACION = 252.0;

/**
 * Proyecta un vector de pesos al simplex sum(w_i) = 1.0 respetando los límites individuales
 */
export function proyectarSimplexConLimites(v: number[], limites: number[]): number[] {
  const n = v.length;
  let low = -10.0;
  let high = 10.0;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2.0;
    let suma = 0.0;
    for (let i = 0; i < n; i++) {
      const val = Math.max(limites[i], Math.min(1.0, v[i] - mid));
      suma += val;
    }
    if (suma > 1.0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const lambda = (low + high) / 2.0;
  return v.map((val, i) => Math.max(limites[i], Math.min(1.0, val - lambda)));
}

/**
 * Optimiza determinísticamente la cartera de Máximo Sharpe
 */
export function optimizarMaximoSharpe(
  esperados: number[],
  covMatrix: number[][],
  rfDiaria: number,
  limites: number[]
): { pesos: number[]; expectedReturn: number; volatility: number; sharpe: number } {
  const n = esperados.length;
  let pesos = proyectarSimplexConLimites(Array(n).fill(1.0 / n), limites);

  const costFn = (w: number[]) => {
    let ret = 0;
    let varP = 0;
    for (let i = 0; i < n; i++) {
      ret += w[i] * esperados[i];
      for (let j = 0; j < n; j++) {
        varP += w[i] * covMatrix[i][j] * w[j];
      }
    }
    const vol = Math.sqrt(Math.max(1e-12, varP));
    const sharpe = (ret - rfDiaria) / vol;
    return -sharpe; // Minimizar el negativo
  };

  let lr = 0.02;
  for (let iter = 0; iter < 2500; iter++) {
    // Gradiente numérico
    const grad: number[] = [];
    const eps = 1e-6;
    const baseCost = costFn(pesos);
    for (let i = 0; i < n; i++) {
      const wPlus = [...pesos];
      wPlus[i] += eps;
      const cPlus = costFn(wPlus);
      grad.push((cPlus - baseCost) / eps);
    }

    const paso = pesos.map((w, i) => w - grad[i] * lr);
    const nuevo = proyectarSimplexConLimites(paso, limites);

    if (costFn(nuevo) < baseCost) {
      pesos = nuevo;
      lr *= 1.02;
    } else {
      lr *= 0.6;
    }
  }

  let ret = 0;
  let varP = 0;
  for (let i = 0; i < n; i++) {
    ret += pesos[i] * esperados[i];
    for (let j = 0; j < n; j++) {
      varP += pesos[i] * covMatrix[i][j] * pesos[j];
    }
  }
  const vol = Math.sqrt(varP);
  const sharpe = vol > 0 ? (ret - rfDiaria) / vol : 0;

  return { pesos, expectedReturn: ret, volatility: vol, sharpe };
}

/**
 * Optimiza determinísticamente la cartera de Máximo Sortino
 */
export function optimizarMaximoSortino(
  esperados: number[],
  returnsMap: Record<string, number[]>,
  tickers: string[],
  rfDiaria: number,
  limites: number[]
): { pesos: number[]; sortino: number } {
  const n = tickers.length;
  let pesos = proyectarSimplexConLimites(Array(n).fill(1.0 / n), limites);
  const numObs = returnsMap[tickers[0]].length;

  const costFn = (w: number[]) => {
    let ret = 0;
    for (let i = 0; i < n; i++) ret += w[i] * esperados[i];

    // Serie histórica del portafolio
    let sumDownsideSq = 0;
    for (let t = 0; t < numObs; t++) {
      let portRet = 0;
      for (let i = 0; i < n; i++) portRet += w[i] * returnsMap[tickers[i]][t];
      if (portRet < rfDiaria) {
        sumDownsideSq += (portRet - rfDiaria) ** 2;
      }
    }
    const downsideVol = Math.sqrt(sumDownsideSq / (numObs || 1));
    const sortino = downsideVol > 0 ? (ret - rfDiaria) / downsideVol : 0;
    return -sortino;
  };

  let lr = 0.02;
  for (let iter = 0; iter < 1500; iter++) {
    const grad: number[] = [];
    const eps = 1e-6;
    const baseCost = costFn(pesos);
    for (let i = 0; i < n; i++) {
      const wPlus = [...pesos];
      wPlus[i] += eps;
      grad.push((costFn(wPlus) - baseCost) / eps);
    }
    const paso = pesos.map((w, i) => w - grad[i] * lr);
    const nuevo = proyectarSimplexConLimites(paso, limites);
    if (costFn(nuevo) < baseCost) {
      pesos = nuevo;
      lr *= 1.02;
    } else {
      lr *= 0.6;
    }
  }

  const sortino = -costFn(pesos);
  return { pesos, sortino };
}

/**
 * Genera puntos de la Frontera Eficiente de Markowitz
 */
export function generarFronteraEficiente(
  esperados: number[],
  covMatrix: number[][],
  limites: number[],
  puntosTotales = 35
): Array<[number, number]> {
  const n = esperados.length;
  const puntos: Array<[number, number]> = [];

  // Mínima varianza global
  let pesosMv = proyectarSimplexConLimites(Array(n).fill(1.0 / n), limites);
  let lrMv = 0.05;
  for (let iter = 0; iter < 1000; iter++) {
    const grad: number[] = [];
    for (let i = 0; i < n; i++) {
      let g = 0;
      for (let j = 0; j < n; j++) g += 2 * covMatrix[i][j] * pesosMv[j];
      grad.push(g);
    }
    const paso = pesosMv.map((w, i) => w - grad[i] * lrMv);
    const nuevo = proyectarSimplexConLimites(paso, limites);

    let varOld = 0;
    let varNew = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        varOld += pesosMv[i] * covMatrix[i][j] * pesosMv[j];
        varNew += nuevo[i] * covMatrix[i][j] * nuevo[j];
      }
    }
    if (varNew < varOld) {
      pesosMv = nuevo;
      lrMv *= 1.02;
    } else {
      lrMv *= 0.5;
    }
  }

  let minRet = 0;
  let minVar = 0;
  for (let i = 0; i < n; i++) {
    minRet += pesosMv[i] * esperados[i];
    for (let j = 0; j < n; j++) minVar += pesosMv[i] * covMatrix[i][j] * pesosMv[j];
  }
  const minVolAnual = Math.sqrt(minVar) * Math.sqrt(DIAS_ANUALIZACION);
  const minRetAnual = minRet * DIAS_ANUALIZACION;
  puntos.push([Number((minVolAnual * 100).toFixed(2)), Number((minRetAnual * 100).toFixed(2))]);

  // Máximo retorno
  const maxRetAnualTarget = Math.max(...esperados) * DIAS_ANUALIZACION;
  const step = (maxRetAnualTarget - minRetAnual) / puntosTotales;

  for (let stepIdx = 1; stepIdx <= puntosTotales; stepIdx++) {
    const targetRet = minRetAnual + step * stepIdx;
    const targetDaily = targetRet / DIAS_ANUALIZACION;

    // Minimizar Varianza sujeto a retorno >= targetDaily
    let w = [...pesosMv];
    let lambdaPen = 100.0;
    for (let iter = 0; iter < 400; iter++) {
      let rP = 0;
      for (let i = 0; i < n; i++) rP += w[i] * esperados[i];
      const pen = Math.max(0, targetDaily - rP);

      const grad: number[] = [];
      for (let i = 0; i < n; i++) {
        let g = 0;
        for (let j = 0; j < n; j++) g += 2 * covMatrix[i][j] * w[j];
        if (pen > 0) g -= 2 * lambdaPen * pen * esperados[i];
        grad.push(g);
      }
      const paso = w.map((val, i) => val - grad[i] * 0.01);
      w = proyectarSimplexConLimites(paso, limites);
    }

    let varP = 0;
    let retP = 0;
    for (let i = 0; i < n; i++) {
      retP += w[i] * esperados[i];
      for (let j = 0; j < n; j++) varP += w[i] * covMatrix[i][j] * w[j];
    }
    const volAnual = Math.sqrt(varP) * Math.sqrt(DIAS_ANUALIZACION);
    const retAnual = retP * DIAS_ANUALIZACION;
    puntos.push([Number((volAnual * 100).toFixed(2)), Number((retAnual * 100).toFixed(2))]);
  }

  puntos.sort((a, b) => a[0] - b[0]);
  return puntos;
}

/**
 * Orquestador principal de Optimización
 */
export async function ejecutarOptimizacionCartera(payload: OptimizarRequest): Promise<OptimizarResponse> {
  const userTickers = payload.tickers
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  if (userTickers.length === 0) {
    throw new Error("Debe ingresar al menos un ticker.");
  }

  const nVelas = payload.n_velas || 2520;
  const cclRef = payload.ccl_ref || 1250.0;
  const rfRate = payload.rf_rate || 0.04;
  const minBound = payload.min_bound || 0.05;

  // Asegurar SPY para calcular Betas CAPM
  const tickersToFetch = [...userTickers];
  if (!tickersToFetch.includes("SPY")) tickersToFetch.unshift("SPY");

  const aligned = await getAlignedPriceMatrix(tickersToFetch, nVelas + 1);

  // Retornos diarios
  const returnsMap: Record<string, number[]> = {};
  for (const t of aligned.tickers) {
    returnsMap[t] = calcularRetornosDiarios(aligned.seriesMap[t]);
  }

  // Filtrar sólo los tickers pedidos por el usuario
  const tickers = userTickers;
  const esperadosDiarios = tickers.map((t) => mean(returnsMap[t]));
  const esperadosAnualizados = esperadosDiarios.map((e) => Number((e * DIAS_ANUALIZACION * 100).toFixed(2)));
  const volsDiarias = tickers.map((t) => stdDev(returnsMap[t]));
  const volsAnualizadas = volsDiarias.map((v) => Number((v * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2)));
  const downsideVols = tickers.map((t) =>
    Number((calcularDownsideVol(returnsMap[t]) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2))
  );

  // Matriz de covarianza y correlación
  const covMatrix = calcularMatrizCovarianza(returnsMap, tickers);
  const corrMatrix = calcularMatrizCorrelacion(covMatrix, volsDiarias);

  // Betas CAPM contra SPY
  const spyReturns = returnsMap["SPY"] || returnsMap[tickers[0]];
  const betas = calcularBetasCAPM(returnsMap, spyReturns, tickers);
  const capmReturns = betas.map((b) => {
    const rmAnual = mean(spyReturns) * DIAS_ANUALIZACION;
    return Number(((rfRate + b * (rmAnual - rfRate)) * 100).toFixed(2));
  });

  // Optimización Sharpe & Sortino
  const limites = tickers.map(() => minBound);
  const rfDiaria = rfRate / DIAS_ANUALIZACION;
  const optSharpe = optimizarMaximoSharpe(esperadosDiarios, covMatrix, rfDiaria, limites);
  const optSortino = optimizarMaximoSortino(esperadosDiarios, returnsMap, tickers, rfDiaria, limites);

  const portReturnSharpe = Number((optSharpe.expectedReturn * DIAS_ANUALIZACION * 100).toFixed(2));
  const portVolSharpe = Number((optSharpe.volatility * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2));
  const sharpeRatio = Number((optSharpe.sharpe * Math.sqrt(DIAS_ANUALIZACION)).toFixed(2));

  // Downside y Sortino
  const numObs = returnsMap[tickers[0]].length;
  let sumDownsideSq = 0;
  for (let t = 0; t < numObs; t++) {
    let portRet = 0;
    for (let i = 0; i < tickers.length; i++) {
      portRet += optSharpe.pesos[i] * returnsMap[tickers[i]][t];
    }
    if (portRet < rfDiaria) {
      sumDownsideSq += (portRet - rfDiaria) ** 2;
    }
  }
  const portDownsideVol = Number(
    (Math.sqrt(sumDownsideSq / (numObs || 1)) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2)
  );
  const sortinoRatio = portDownsideVol > 0 ? Number(((portReturnSharpe - rfRate * 100) / portDownsideVol).toFixed(2)) : 0;

  // VaR 95% Paramétrico
  const var95 = Number((-(optSharpe.expectedReturn - 1.645 * optSharpe.volatility) * 100).toFixed(2));

  // Frontera Eficiente
  const frontera = generarFronteraEficiente(esperadosDiarios, covMatrix, limites, 30);

  // Time labels y series normalizadas para los gráficos
  const timeLabels = aligned.dates.slice(1);
  const seriesMapUser: Record<string, number[]> = {};
  const retMapUser: Record<string, number[]> = {};
  for (const t of tickers) {
    seriesMapUser[t] = aligned.seriesMap[t].slice(1);
    retMapUser[t] = returnsMap[t];
  }

  return {
    success: true,
    message: "Optimización cuantitativa ejecutada exitosamente.",
    tickers,
    n_velas: aligned.numVelas - 1,
    pesos_sharpe: optSharpe.pesos.map((w) => Number(w.toFixed(4))),
    pesos_sortino: optSortino.pesos.map((w) => Number(w.toFixed(4))),
    esperados: esperadosAnualizados,
    vols: volsAnualizadas,
    downside_vols: downsideVols,
    betas,
    capm_returns: capmReturns,
    port_return_sharpe: portReturnSharpe,
    port_vol_sharpe: portVolSharpe,
    port_downside_vol: portDownsideVol,
    sharpe_ratio: sharpeRatio,
    sortino_ratio: sortinoRatio,
    var_95: var95,
    tc_cartera_ponderado: cclRef,
    spread_ccl: 0.0,
    ccl_ref: cclRef,
    rf_rate: rfRate,
    retornos_map: retMapUser,
    series_map: seriesMapUser,
    time_labels: timeLabels,
    frontera_puntos: frontera,
    corr_tickers: tickers,
    matriz_correlacion: corrMatrix.map((row) => row.map((v) => Number(v.toFixed(3)))),
  };
}
