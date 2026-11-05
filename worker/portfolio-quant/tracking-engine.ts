// Motor de Seguimiento Histórico de Cartera vs Benchmark SPY
// Cálculo de Stagnation Days, Drawdowns Máximos y Ratios de Desempeño

import { TrackingRequest, TrackingResponse } from "./types";
import { getAlignedPriceMatrix } from "./historical-data";
import {
  calcularRetornosDiarios,
  mean,
  stdDev,
  calcularDownsideVol,
} from "./math-stats";

const DIAS_ANUALIZACION = 252.0;

function computeStagnationStats(curve: number[]): { maxDays: number; avgDays: number } {
  let peak = -Infinity;
  let currentStagnation = 0;
  const stagnationPeriods: number[] = [];
  let maxDays = 0;

  for (const val of curve) {
    if (val >= peak) {
      if (currentStagnation > 0) {
        stagnationPeriods.push(currentStagnation);
      }
      peak = val;
      currentStagnation = 0;
    } else {
      currentStagnation++;
      if (currentStagnation > maxDays) maxDays = currentStagnation;
    }
  }

  if (currentStagnation > 0) stagnationPeriods.push(currentStagnation);
  const avgDays =
    stagnationPeriods.length > 0
      ? stagnationPeriods.reduce((a, b) => a + b, 0) / stagnationPeriods.length
      : 0;

  return { maxDays, avgDays: Number(avgDays.toFixed(1)) };
}

export async function ejecutarTracking(payload: TrackingRequest): Promise<TrackingResponse> {
  const userTickers = payload.tickers
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  if (userTickers.length === 0) {
    throw new Error("Debe ingresar al menos un ticker.");
  }

  // Normalizar pesos
  let rawPesos = payload.pesos || userTickers.map(() => 1.0 / userTickers.length);
  const sumPesos = rawPesos.reduce((a, b) => a + b, 0) || 1.0;
  const weights = rawPesos.map((w) => w / sumPesos);

  const rfRate = payload.rf_rate || 0.04;
  const cclRef = payload.ccl_ref || 1250.0;

  const tickersToFetch = [...userTickers];
  if (!tickersToFetch.includes("SPY")) tickersToFetch.unshift("SPY");

  const aligned = await getAlignedPriceMatrix(tickersToFetch, 2520);
  const dates = aligned.dates;

  // Filtrar a partir de fecha_inicio si está provista
  let startIndex = 0;
  if (payload.fecha_inicio) {
    const idx = dates.findIndex((d) => d >= payload.fecha_inicio!);
    if (idx !== -1) startIndex = idx;
  }

  const subDates = dates.slice(startIndex);
  if (subDates.length < 5) {
    throw new Error("El rango de fechas seleccionado es demasiado corto para realizar seguimiento.");
  }

  // Series recortadas
  const subSeriesMap: Record<string, number[]> = {};
  for (const t of aligned.tickers) {
    subSeriesMap[t] = aligned.seriesMap[t].slice(startIndex);
  }

  // Retornos
  const returnsMap: Record<string, number[]> = {};
  for (const t of aligned.tickers) {
    returnsMap[t] = calcularRetornosDiarios(subSeriesMap[t]);
  }

  const numDays = subDates.length - 1;
  const spyReturns = returnsMap["SPY"] || returnsMap[userTickers[0]];

  // Construir curvas base 100
  const portCurve: number[] = [100.0];
  const spyCurve: number[] = [100.0];
  let curPortVal = 100.0;
  let curSpyVal = 100.0;
  const portDailyReturns: number[] = [];

  for (let t = 0; t < numDays; t++) {
    let dayRet = 0;
    for (let i = 0; i < userTickers.length; i++) {
      dayRet += weights[i] * returnsMap[userTickers[i]][t];
    }
    portDailyReturns.push(dayRet);
    curPortVal *= 1 + dayRet;
    curSpyVal *= 1 + spyReturns[t];

    portCurve.push(Number(curPortVal.toFixed(3)));
    spyCurve.push(Number(curSpyVal.toFixed(3)));
  }

  // Métricas
  const totalGainPct = Number(((curPortVal - 100.0)).toFixed(2));
  const annRet = Number((mean(portDailyReturns) * DIAS_ANUALIZACION * 100).toFixed(2));
  const volAnual = Number((stdDev(portDailyReturns) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2));
  const sharpe = volAnual > 0 ? Number(((annRet - rfRate * 100) / volAnual).toFixed(2)) : 0;

  const rfDiaria = rfRate / DIAS_ANUALIZACION;
  const downsideVol = calcularDownsideVol(portDailyReturns, rfDiaria) * Math.sqrt(DIAS_ANUALIZACION);
  const sortino = downsideVol > 0 ? Number(((annRet - rfRate * 100) / (downsideVol * 100)).toFixed(2)) : 0;

  // Max Drawdown
  let peak = -Infinity;
  let maxDd = 0;
  for (const v of portCurve) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDd) maxDd = dd;
  }
  const maxDdPct = Number((maxDd * 100).toFixed(2));

  // Stagnation
  const { maxDays, avgDays } = computeStagnationStats(portCurve);

  // Estadísticas individuales
  const esperados = userTickers.map((t) => Number((mean(returnsMap[t]) * DIAS_ANUALIZACION * 100).toFixed(2)));
  const vols = userTickers.map((t) => Number((stdDev(returnsMap[t]) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2)));
  const downs = userTickers.map((t) =>
    Number((calcularDownsideVol(returnsMap[t], rfDiaria) * Math.sqrt(DIAS_ANUALIZACION) * 100).toFixed(2))
  );

  return {
    success: true,
    message: "Seguimiento de cartera ejecutado con éxito.",
    tickers: userTickers,
    pesos: weights.map((w) => Number(w.toFixed(4))),
    fecha_inicio: payload.fecha_inicio || subDates[0],
    actual_start_date: subDates[0],
    n_velas: numDays,
    tracking_gain_pct: totalGainPct,
    tracking_max_dd_pct: maxDdPct,
    tracking_sharpe: sharpe,
    tracking_sortino: sortino,
    tracking_avg_stagnation_days: avgDays,
    tracking_max_stagnation_days: maxDays,
    ann_ret: annRet,
    vol_anual: volAnual,
    tc_cartera_ponderado: cclRef,
    spread_ccl: 0.0,
    port_equity_curve: portCurve,
    spy_equity_curve: spyCurve,
    time_labels: subDates,
    series_map: subSeriesMap,
    retornos_map: returnsMap,
    esperados,
    vols,
    downside_vols: downs,
  };
}
