use serde::{Deserialize, Serialize};

/// Métricas de Drawdown calculadas estrictamente sin Look-Ahead Bias.
/// Fórmula portada directamente del estándar institucional de Sylva y Astro EVO.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct DrawdownMetrics {
    /// Nivel de equidad máximo alcanzado (High-Water Mark).
    pub peak_equity: f64,
    /// Máximo Drawdown en unidades monetarias nominales absolutas ($ USD):
    /// $$\text{MaxDD}_{nominal} = \max_{0 \le t \le T} (\text{Peak}_t - \text{Equity}_t)$$
    pub max_drawdown_nominal: f64,
    /// Máximo Drawdown porcentual relativo al pico alcanzado:
    /// $$\text{MaxDD}_{\% Peak} = \frac{\text{MaxDD}_{nominal}}{\text{Peak}} \times 100\%$$
    pub max_drawdown_pct_peak: f64,
    /// Máximo Drawdown porcentual relativo al capital inicial:
    /// $$\text{MaxDD}_{\% Capital} = \frac{\text{MaxDD}_{nominal}}{\text{Initial Capital}} \times 100\%$$
    pub max_drawdown_pct_capital: f64,
    /// Drawdown nominal en el instante actual:
    /// $$\text{DD}_{actual} = \max(0, \text{Peak} - \text{Equity}_{actual})$$
    pub current_drawdown_nominal: f64,
}

/// Calculadora de Máximo Drawdown Nominal y Relativo.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct DrawdownCalculator;

impl DrawdownCalculator {
    /// Calcula el Máximo Drawdown Nominal a lo largo de una trayectoria de equidad temporal $t \le T$.
    ///
    /// Algoritmo exacto de Sylva / Astro EVO:
    /// ```text
    /// let mut peak = initial_capital;
    /// let mut max_dd_amount = 0.0;
    /// for &(_, eq) in &equity_curve {
    ///     if eq > peak { peak = eq; }
    ///     let dd = peak - eq;
    ///     if dd > max_dd_amount { max_dd_amount = dd; }
    /// }
    /// ```
    pub fn calculate_nominal_drawdown(
        initial_capital: f64,
        equity_series: &[f64],
    ) -> DrawdownMetrics {
        let mut peak = initial_capital;
        let mut max_dd_nominal = 0.0;
        let mut max_dd_pct_peak = 0.0;

        for &equity in equity_series {
            if equity > peak {
                peak = equity;
            }
            let dd_nominal = (peak - equity).max(0.0);
            if dd_nominal > max_dd_nominal {
                max_dd_nominal = dd_nominal;
            }
            if peak > 0.0 {
                let dd_pct = (dd_nominal / peak) * 100.0;
                if dd_pct > max_dd_pct_peak {
                    max_dd_pct_peak = dd_pct;
                }
            }
        }

        let max_dd_pct_capital = if initial_capital > 0.0 {
            (max_dd_nominal / initial_capital) * 100.0
        } else {
            0.0
        };

        let current_equity = equity_series.last().copied().unwrap_or(initial_capital);
        let current_drawdown_nominal = (peak - current_equity).max(0.0);

        DrawdownMetrics {
            peak_equity: peak,
            max_drawdown_nominal: max_dd_nominal,
            max_drawdown_pct_peak: max_dd_pct_peak,
            max_drawdown_pct_capital: max_dd_pct_capital,
            current_drawdown_nominal,
        }
    }

    /// Actualiza de forma incremental en tiempo real el pico y el drawdown nominal con un nuevo valor de equidad.
    /// Retorna una tupla: (nuevo_pico, nuevo_max_dd_nominal, dd_nominal_actual).
    pub fn update_running_drawdown(
        current_peak: f64,
        current_max_dd: f64,
        new_equity: f64,
    ) -> (f64, f64, f64) {
        let peak = if new_equity > current_peak {
            new_equity
        } else {
            current_peak
        };

        let current_dd = (peak - new_equity).max(0.0);
        let max_dd = if current_dd > current_max_dd {
            current_dd
        } else {
            current_max_dd
        };

        (peak, max_dd, current_dd)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nominal_drawdown_sylva_formula() {
        let initial_cap = 10_000.0;
        // Simulación de curva de equidad:
        // 10000 -> 10500 (Peak: 10500) -> 9800 (DD: 700) -> 11000 (Peak: 11000) -> 10100 (DD: 900) -> 10800
        let equity_series = vec![10_000.0, 10_500.0, 9_800.0, 11_000.0, 10_100.0, 10_800.0];

        let metrics = DrawdownCalculator::calculate_nominal_drawdown(initial_cap, &equity_series);

        assert_eq!(metrics.peak_equity, 11_000.0);
        assert_eq!(metrics.max_drawdown_nominal, 900.0); // 11000 - 10100 = 900 USD nominal
        assert!((metrics.max_drawdown_pct_peak - (900.0 / 11000.0 * 100.0)).abs() < 1e-6);
        assert_eq!(metrics.max_drawdown_pct_capital, 9.0); // 900 / 10000 = 9%
        assert_eq!(metrics.current_drawdown_nominal, 200.0); // 11000 - 10800 = 200 USD
    }

    #[test]
    fn test_running_drawdown_incremental() {
        let mut peak = 10_000.0;
        let mut max_dd = 0.0;

        let points = [10_500.0, 9_500.0, 12_000.0, 10_000.0];
        let mut last_current_dd = 0.0;

        for &pt in &points {
            let (new_peak, new_max_dd, cur_dd) =
                DrawdownCalculator::update_running_drawdown(peak, max_dd, pt);
            peak = new_peak;
            max_dd = new_max_dd;
            last_current_dd = cur_dd;
        }

        assert_eq!(peak, 12_000.0);
        assert_eq!(max_dd, 2_000.0); // 12000 - 10000 = 2000
        assert_eq!(last_current_dd, 2_000.0);
    }
}
