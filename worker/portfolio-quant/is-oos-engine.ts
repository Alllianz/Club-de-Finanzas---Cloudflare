// Motor de Validación In-Sample (IS) vs Out-of-Sample (OOS)
// Walk-Forward Evaluation con Rebalanceo Periódico y Zero Look-Ahead Bias

import { IsOosRequest, IsOosResponse } from "./types";
import { getAlignedPriceMatrix } from "./historical-data";
import { calcularRetornosDiarios, mean, stdDev, calcularMatrizCovarianza } from "./math-stats";
import { optimizarMaximoSharpe, optimizarMaximoSortino } from "./markowitz-optimizer";

const DIAS_ANUALIZACION = 252.0;

function computeMaxDrawdown(equityCurve: number[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const val of equityCurve) {
    if (val > peak) peak = val;
    const dd = peak > 0 ? (peak - val) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  return Number((maxDd * 100).toFixed(2));
}

export async function ejecutarIsOos(payload: IsOosRequest): Promise<IsOosResponse> {
  const userTickers = payload.tickers
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  if (userTickers.length === 0) {
    throw new Error("Debe ingresar al menos un ticker.");
  }

  const isVelas = payload.is_velas || 252;
  const oosVelas = payload.oos_velas || 252;
  const totalReq = isVelas + oosVelas + 1;
  const benchmarkName = (payload.benchmark || "SPY").trim().toUpperCase();
  const rebalanceFreq = payload.rebalance_freq || "mensual";
  const rfRate = payload.rf_rate || 0.04;
  const minBound = payload.min_bound || 0.05;

  const tickersToFetch = [...userTickers];
  if (!tickersToFetch.includes(benchmarkName)) tickersToFetch.unshift(benchmarkName);

  const aligned = await getAlignedPriceMatrix(tickersToFetch, totalReq);
  const totalObs = aligned.numVelas - 1;

  // Determinar split de corte exacto
  const splitIndex = Math.max(20, totalObs - oosVelas);

  // Retornos de activos y benchmark
  const returnsMap: Record<string, number[]> = {};
  for (const t of aligned.tickers) {
    returnsMap[t] = calcularRetornosDiarios(aligned.seriesMap[t]);
  }

  const bmReturns = returnsMap[benchmarkName] || returnsMap[userTickers[0]];

  // 1. CALIBRACIÓN EN EL PERÍODO IN-SAMPLE (Strict Zero Look-Ahead Bias)
  const isReturnsMap: Record<string, number[]> = {};
  for (const t of userTickers) {
    isReturnsMap[t] = returnsMap[t].slice(0, splitIndex);
  }
  const isBmReturns = bmReturns.slice(0, splitIndex);

  const isEsperados = userTickers.map((t) => mean(isReturnsMap[t]));
  const isCovMatrix = calcularMatrizCovarianza(isReturnsMap, userTickers);
  const rfDiaria = rfRate / DIAS_ANUALIZACION;
  const limites = userTickers.map(() => minBound);

  const optSharpe = optimizarMaximoSharpe(isEsperados, isCovMatrix, rfDiaria, limites);
  const optSortino = optimizarMaximoSortino(isEsperados, isReturnsMap, userTickers, rfDiaria, limites);

  const weights = optSharpe.pesos;

  // 2. SIMULACIÓN CONTINUA DE LA CURVA (Base 100) A TRAVÉS DE IS Y OOS
  let rebalStep = 21; // mensual por defecto
  if (rebalanceFreq === "diario") rebalStep = 1;
  else if (rebalanceFreq === "semanal") rebalStep = 5;
  else if (rebalanceFreq === "sin_rebalanceo") rebalStep = 999999;

  const portFullCurve: number[] = [100.0];
  const bmFullCurve: number[] = [100.0];

  let currentPortVal = 100.0;
  let currentBmVal = 100.0;
  let currentWeights = [...weights];

  const isPortDailyReturns: number[] = [];
  const oosPortDailyReturns: number[] = [];

  for (let t = 0; t < totalObs; t++) {
    // Rebalanceo periódico a las ponderaciones objetivo
    if (t > 0 && t % rebalStep === 0) {
      currentWeights = [...weights];
    }

    // Retorno ponderado de la cartera en el día t
    let dayRet = 0;
    for (let i = 0; i < userTickers.length; i++) {
      dayRet += currentWeights[i] * returnsMap[userTickers[i]][t];
    }

    // Actualizar ponderaciones flotantes si no hay rebalanceo
    if (rebalanceFreq === "sin_rebalanceo") {
      const grossValues = currentWeights.map((w, i) => w * (1 + returnsMap[userTickers[i]][t]));
      const sumVals = grossValues.reduce((a, b) => a + b, 0);
      currentWeights = grossValues.map((v) => v / (sumVals || 1));
    }

    currentPortVal *= 1 + dayRet;
    currentBmVal *= 1 + bmReturns[t];

    portFullCurve.push(Number(currentPortVal.toFixed(3)));
    bmFullCurve.push(Number(currentBmVal.toFixed(3)));

    if (t < splitIndex) {
      isPortDailyReturns.push(dayRet);
    } else {
      oosPortDailyReturns.push(dayRet);
    }
  }

  // 3. MÉTRICAS COMPARATIVAS
  const isRetAnual = Number((mean(isPortDailyReturns) * DIAS_ANUALIZACION * 100).toFixed(2));
  const isVolAnual = Number((stdDev(isPortDailyReturns) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2));
  const isSharpe = isVolAnual > 0 ? Number(((isRetAnual - rfRate * 100) / isVolAnual).toFixed(2)) : 0;
  const isMaxDd = computeMaxDrawdown(portFullCurve.slice(0, splitIndex + 1));
  const isGainPct = Number(((portFullCurve[splitIndex] - 100.0)).toFixed(2));

  const oosBmReturns = bmReturns.slice(splitIndex);
  const oosRetAnual = Number((mean(oosPortDailyReturns) * DIAS_ANUALIZACION * 100).toFixed(2));
  const oosVolAnual = Number((stdDev(oosPortDailyReturns) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2));
  const oosSharpe = oosVolAnual > 0 ? Number(((oosRetAnual - rfRate * 100) / oosVolAnual).toFixed(2)) : 0;
  const oosMaxDd = computeMaxDrawdown(portFullCurve.slice(splitIndex));
  const oosGainPct = Number((((portFullCurve[portFullCurve.length - 1] / portFullCurve[splitIndex]) - 1.0) * 100).toFixed(2));

  const bmIsRet = Number((mean(isBmReturns) * DIAS_ANUALIZACION * 100).toFixed(2));
  const bmIsVol = Number((stdDev(isBmReturns) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2));
  const bmIsSharpe = bmIsVol > 0 ? Number(((bmIsRet - rfRate * 100) / bmIsVol).toFixed(2)) : 0;

  const bmOosRet = Number((mean(oosBmReturns) * DIAS_ANUALIZACION * 100).toFixed(2));
  const bmOosVol = Number((stdDev(oosBmReturns) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2));
  const bmOosSharpe = bmOosVol > 0 ? Number(((bmOosRet - rfRate * 100) / bmOosVol).toFixed(2)) : 0;
  const bmOosGainPct = Number((((bmFullCurve[bmFullCurve.length - 1] / bmFullCurve[splitIndex]) - 1.0) * 100).toFixed(2));

  return {
    success: true,
    message: "Validación IS / OOS completada exitosamente.",
    tickers: userTickers,
    benchmark_nombre: benchmarkName,
    rebalance_freq: rebalanceFreq,
    is_return: isRetAnual,
    is_vol: isVolAnual,
    is_sharpe: isSharpe,
    is_max_dd: isMaxDd,
    is_gain_pct: isGainPct,
    oos_return: oosRetAnual,
    oos_vol: oosVolAnual,
    oos_sharpe: oosSharpe,
    oos_max_dd: oosMaxDd,
    oos_gain_pct: oosGainPct,
    bm_is_return: bmIsRet,
    bm_is_vol: bmIsVol,
    bm_is_sharpe: bmIsSharpe,
    bm_oos_return: bmOosRet,
    bm_oos_vol: bmOosVol,
    bm_oos_sharpe: bmOosSharpe,
    bm_oos_gain_pct: bmOosGainPct,
    pesos_sharpe: weights.map((w) => Number(w.toFixed(4))),
    pesos_sortino: optSortino.pesos.map((w) => Number(w.toFixed(4))),
    full_time_labels: aligned.dates,
    port_full_equity_curve: portFullCurve,
    bm_full_equity_curve: bmFullCurve,
    split_index: splitIndex,
    ccl_ref: payload.ccl_ref || 1250.0,
    rf_rate: rfRate,
  };
}
