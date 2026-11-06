use serde::{Deserialize, Serialize};

/// Resultado del cálculo del ratio óptimo de cobertura (Optimal Minimum-Variance Hedge Ratio).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct HedgeAnalysis {
    /// Ratio óptimo de cobertura de mínima varianza ($h^*$).
    pub optimal_hedge_ratio: f64,
    /// Número exacto de contratos de futuros necesarios ($N^*$).
    pub contracts_needed: f64,
    /// Número redondeado entero de contratos.
    pub contracts_rounded: i64,
    /// Coeficiente de correlación ($\rho$) entre variaciones del spot y el futuro.
    pub correlation: f64,
    /// Efectividad teórica de la cobertura ($R^2 = \rho^2$).
    pub hedging_effectiveness: f64,
}

/// Calculador cuantitativo del ratio óptimo de cobertura de mínima varianza.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct HedgeRatioCalculator;

impl HedgeRatioCalculator {
    /// Calcula el ratio óptimo de cobertura $h^*$ a partir de la covarianza y varianza:
    /// $h^* = \frac{\text{Cov}(\Delta S, \Delta F)}{\text{Var}(\Delta F)} = \rho \times \frac{\sigma_S}{\sigma_F}$
    pub fn calculate_from_stats(
        spot_std_dev: f64,
        futures_std_dev: f64,
        correlation: f64,
        spot_position_size: f64,
        contract_multiplier: f64,
    ) -> Result<HedgeAnalysis, String> {
        if futures_std_dev <= 0.0 {
            return Err("La desviación estándar del futuro debe ser estrictamente positiva".to_string());
        }
        if spot_std_dev < 0.0 {
            return Err("La desviación estándar del spot no puede ser negativa".to_string());
        }
        if correlation < -1.0 || correlation > 1.0 {
            return Err("La correlación debe encontrarse en el intervalo [-1.0, 1.0]".to_string());
        }
        if contract_multiplier <= 0.0 {
            return Err("El multiplicador del contrato de futuros debe ser positivo".to_string());
        }

        let h_star = correlation * (spot_std_dev / futures_std_dev);
        let n_star = h_star * (spot_position_size / contract_multiplier);
        let contracts_rounded = n_star.round() as i64;
        let hedging_effectiveness = correlation * correlation;

        Ok(HedgeAnalysis {
            optimal_hedge_ratio: h_star,
            contracts_needed: n_star,
            contracts_rounded,
            correlation,
            hedging_effectiveness,
        })
    }

    /// Calcula el ratio óptimo de cobertura a partir de series temporales de retornos o cambios de precios $\Delta S$ y $\Delta F$.
    /// Ambos vectores deben tener idéntica longitud y al menos 2 observaciones.
    pub fn calculate_from_series(
        delta_spot: &[f64],
        delta_futures: &[f64],
        spot_position_size: f64,
        contract_multiplier: f64,
    ) -> Result<HedgeAnalysis, String> {
        let n = delta_spot.len();
        if n < 2 {
            return Err("Se requieren al menos dos observaciones de serie temporal".to_string());
        }
        if delta_futures.len() != n {
            return Err("Las series de cambios de spot y futuro deben tener la misma longitud".to_string());
        }

        let mean_s = delta_spot.iter().sum::<f64>() / n as f64;
        let mean_f = delta_futures.iter().sum::<f64>() / n as f64;

        let mut cov = 0.0;
        let mut var_s = 0.0;
        let mut var_f = 0.0;

        for i in 0..n {
            let diff_s = delta_spot[i] - mean_s;
            let diff_f = delta_futures[i] - mean_f;
            cov += diff_s * diff_f;
            var_s += diff_s * diff_s;
            var_f += diff_f * diff_f;
        }

        let df = (n - 1) as f64;
        let cov = cov / df;
        let var_f = var_f / df;
        let var_s = var_s / df;

        if var_f <= 1e-12 {
            return Err("La varianza de la serie del futuro es prácticamente nula".to_string());
        }

        let std_s = var_s.sqrt();
        let std_f = var_f.sqrt();
        let correlation = if std_s * std_f > 1e-12 {
            (cov / (std_s * std_f)).clamp(-1.0, 1.0)
        } else {
            0.0
        };

        Self::calculate_from_stats(std_s, std_f, correlation, spot_position_size, contract_multiplier)
    }
}
