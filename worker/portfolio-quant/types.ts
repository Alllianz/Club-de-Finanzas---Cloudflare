// Tipos e interfaces del Motor Cuantitativo de Portafolio - Club de Finanzas UBA

export interface OptimizarRequest {
  tickers: string[];
  n_velas?: number;
  ccl_ref?: number;
  rf_rate?: number;
  min_bound?: number;
  poblacional?: boolean;
}

export interface OptimizarResponse {
  success: boolean;
  message: string;
  tickers: string[];
  n_velas: number;
  pesos_sharpe: number[];
  pesos_sortino: number[];
  esperados: number[];
  vols: number[];
  downside_vols: number[];
  betas: number[];
  capm_returns: number[];
  port_return_sharpe: number;
  port_vol_sharpe: number;
  port_downside_vol: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  var_95: number;
  tc_cartera_ponderado: number;
  spread_ccl: number;
  ccl_ref: number;
  rf_rate: number;
  retornos_map: Record<string, number[]>;
  series_map: Record<string, number[]>;
  time_labels: string[];
  frontera_puntos: Array<[number, number]>; // [volatilidad, retorno]
  corr_tickers: string[];
  matriz_correlacion: number[][];
}

export interface IsOosRequest {
  tickers: string[];
  is_velas?: number;
  oos_velas?: number;
  rebalance_freq?: string;
  benchmark?: string;
  ccl_ref?: number;
  rf_rate?: number;
  min_bound?: number;
}

export interface IsOosResponse {
  success: boolean;
  message: string;
  tickers: string[];
  benchmark_nombre: string;
  rebalance_freq: string;
  is_return: number;
  is_vol: number;
  is_sharpe: number;
  is_max_dd: number;
  is_gain_pct: number;
  oos_return: number;
  oos_vol: number;
  oos_sharpe: number;
  oos_max_dd: number;
  oos_gain_pct: number;
  bm_is_return: number;
  bm_is_vol: number;
  bm_is_sharpe: number;
  bm_oos_return: number;
  bm_oos_vol: number;
  bm_oos_sharpe: number;
  bm_oos_gain_pct: number;
  pesos_sharpe: number[];
  pesos_sortino: number[];
  full_time_labels: string[];
  port_full_equity_curve: number[];
  bm_full_equity_curve: number[];
  split_index: usize;
  ccl_ref: number;
  rf_rate: number;
}

export type usize = number;

export interface TrackingRequest {
  tickers: string[];
  pesos: number[];
  fecha_inicio?: string;
  rebalance_freq?: string;
  ccl_ref?: number;
  rf_rate?: number;
}

export interface TrackingResponse {
  success: boolean;
  message: string;
  tickers: string[];
  pesos: number[];
  fecha_inicio: string;
  actual_start_date: string;
  n_velas: number;
  tracking_gain_pct: number;
  tracking_max_dd_pct: number;
  tracking_sharpe: number;
  tracking_sortino: number;
  tracking_avg_stagnation_days: number;
  tracking_max_stagnation_days: number;
  ann_ret: number;
  vol_anual: number;
  tc_cartera_ponderado: number;
  spread_ccl: number;
  port_equity_curve: number[];
  spy_equity_curve: number[];
  time_labels: string[];
  series_map: Record<string, number[]>;
  retornos_map: Record<string, number[]>;
  esperados: number[];
  vols: number[];
  downside_vols: number[];
}

export interface NeuralAllocationRequest {
  tickers?: string[];
  lookback_window?: number;
  rebalance_freq?: number;
  temperature?: number;
}
