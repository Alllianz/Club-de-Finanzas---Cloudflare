// Operaciones Matemáticas y Métricas Estadísticas Cuantitativas
// Portadas directamente de la arquitectura de Rust en Portafolio Engine

export function calcularRetornosDiarios(series: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    returns.push(prev > 0 ? (cur / prev) - 1.0 : 0);
  }
  return returns;
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((acc, v) => acc + v, 0) / arr.length;
}

export function variance(arr: number[], poblacional = false): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sumSq = arr.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  const div = poblacional ? arr.length : arr.length - 1;
  return sumSq / div;
}

export function stdDev(arr: number[], poblacional = false): number {
  return Math.sqrt(variance(arr, poblacional));
}

export function covariance(a: number[], b: number[], poblacional = false): number {
  if (a.length !== b.length || a.length < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - ma) * (b[i] - mb);
  }
  const div = poblacional ? a.length : a.length - 1;
  return sum / div;
}

export function calcularMatrizCovarianza(returnsMap: Record<string, number[]>, tickers: string[]): number[][] {
  const n = tickers.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const cov = covariance(returnsMap[tickers[i]], returnsMap[tickers[j]]);
      mat[i][j] = cov;
      mat[j][i] = cov;
    }
  }
  return mat;
}

export function calcularMatrizCorrelacion(covMatrix: number[][], vols: number[]): number[][] {
  const n = vols.length;
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const denom = (vols[i] * vols[j]) || 1e-12;
      mat[i][j] = Math.max(-1, Math.min(1, covMatrix[i][j] / denom));
    }
  }
  return mat;
}

export function calcularDownsideVol(returns: number[], target = 0): number {
  const diffs = returns.map((r) => (r < target ? (r - target) ** 2 : 0));
  const sum = diffs.reduce((a, b) => a + b, 0);
  return Math.sqrt(sum / (returns.length || 1));
}

export function calcularBetasCAPM(
  assetReturnsMap: Record<string, number[]>,
  benchmarkReturns: number[],
  tickers: string[]
): number[] {
  const varBm = variance(benchmarkReturns);
  if (varBm < 1e-12) return tickers.map(() => 1.0);

  return tickers.map((t) => {
    const cov = covariance(assetReturnsMap[t], benchmarkReturns);
    return Number((cov / varBm).toFixed(4));
  });
}
