use serde::{Deserialize, Serialize};

/// Resultado del análisis de Paridad Cubierta de Tasas de Interés (Covered Interest Parity - CIP).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CipAnalysis {
    /// Precio Forward teórico determinado por CIP.
    pub theoretical_forward: f64,
    /// Desviación absoluta respecto al forward de mercado: $F_{mercado} - F_{teorico}$.
    pub deviation_absolute: f64,
    /// Desviación anualizada en puntos porcentuales (arbitrage basis).
    pub deviation_annualized_pct: f64,
    /// Tasa doméstica implícita deducida del precio del forward de mercado y la tasa foránea.
    pub implied_domestic_rate: f64,
}

/// Evaluador cuantitativo de Paridad Cubierta de Tasas de Interés (CIP).
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CoveredInterestParity;

impl CoveredInterestParity {
    /// Calcula el tipo de cambio Forward teórico según la fórmula de CIP:
    /// $F = S \times \frac{1 + r_{doméstica} \times \frac{d}{365}}{1 + r_{foránea} \times \frac{d}{365}}$
    pub fn theoretical_forward(
        spot: f64,
        domestic_rate: f64,
        foreign_rate: f64,
        days_to_expiry: f64,
    ) -> Result<f64, String> {
        if spot <= 0.0 {
            return Err("El tipo de cambio Spot debe ser positivo".to_string());
        }
        if days_to_expiry < 0.0 {
            return Err("Los días al vencimiento no pueden ser negativos".to_string());
        }
        let t = days_to_expiry / 365.0;
        let denom = 1.0 + foreign_rate * t;
        if denom.abs() < 1e-9 {
            return Err("División por cero en factor de tasa foránea".to_string());
        }
        let numer = 1.0 + domestic_rate * t;
        Ok(spot * (numer / denom))
    }

    /// Analiza la desviación de mercado frente a CIP y calcula la tasa doméstica implícita:
    /// $r_{d, implícita} = \left[ \frac{F_{mercado}}{S} \times \left(1 + r_f \times \frac{d}{365}\right) - 1 \right] \times \frac{365}{d}$
    pub fn analyze(
        spot: f64,
        market_forward: f64,
        domestic_rate: f64,
        foreign_rate: f64,
        days_to_expiry: f64,
    ) -> Result<CipAnalysis, String> {
        if days_to_expiry <= 0.0 {
            return Err("Se requieren días positivos al vencimiento".to_string());
        }
        let theoretical = Self::theoretical_forward(spot, domestic_rate, foreign_rate, days_to_expiry)?;
        let deviation_absolute = market_forward - theoretical;
        let deviation_annualized_pct = (deviation_absolute / spot) * (365.0 / days_to_expiry) * 100.0;

        let t = days_to_expiry / 365.0;
        let factor_foreign = 1.0 + foreign_rate * t;
        let implied_domestic_rate = ((market_forward / spot) * factor_foreign - 1.0) / t;

        Ok(CipAnalysis {
            theoretical_forward: theoretical,
            deviation_absolute,
            deviation_annualized_pct,
            implied_domestic_rate,
        })
    }
}
