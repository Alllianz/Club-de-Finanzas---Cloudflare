use serde::{Deserialize, Serialize};

/// Modelo cuantitativo de Cost-of-Carry para la valoración teórica de contratos de futuros.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CostOfCarry;

impl CostOfCarry {
    /// Calcula el precio teórico de un futuro mediante capitalización continua:
    /// $F = S \times e^{(r - q) \times t}$
    /// donde:
    /// - `spot`: Precio al contado del activo subyacente ($S$).
    /// - `risk_free_rate`: Tasa libre de riesgo anualizada continua ($r$, ej. 0.05 para 5%).
    /// - `convenience_or_dividend_yield`: Rendimiento por conveniencia o dividendos ($q$, ej. 0.02 para 2%).
    /// - `days_to_expiry`: Días remanentes hasta el vencimiento.
    pub fn continuous_price(
        spot: f64,
        risk_free_rate: f64,
        convenience_or_dividend_yield: f64,
        days_to_expiry: f64,
    ) -> Result<f64, String> {
        if spot <= 0.0 {
            return Err("El precio Spot debe ser positivo".to_string());
        }
        if days_to_expiry < 0.0 {
            return Err("Los días al vencimiento no pueden ser negativos".to_string());
        }
        let t = days_to_expiry / 365.0;
        let net_carry = (risk_free_rate - convenience_or_dividend_yield) * t;
        Ok(spot * net_carry.exp())
    }

    /// Calcula el precio teórico de un futuro mediante capitalización discreta:
    /// $F = S \times \frac{1 + r \times (d / 365)}{1 + q \times (d / 365)}$
    pub fn discrete_price(
        spot: f64,
        risk_free_rate: f64,
        convenience_or_dividend_yield: f64,
        days_to_expiry: f64,
    ) -> Result<f64, String> {
        if spot <= 0.0 {
            return Err("El precio Spot debe ser positivo".to_string());
        }
        if days_to_expiry < 0.0 {
            return Err("Los días al vencimiento no pueden ser negativos".to_string());
        }
        let t = days_to_expiry / 365.0;
        let denom = 1.0 + convenience_or_dividend_yield * t;
        if denom.abs() < 1e-9 {
            return Err("División por cero en el denominador de carry discreto".to_string());
        }
        let numer = 1.0 + risk_free_rate * t;
        Ok(spot * (numer / denom))
    }

    /// Resuelve el rendimiento implícito por conveniencia o almacenamiento ($q$) dados Spot y Futuro de mercado:
    /// $q = r - \frac{1}{t} \ln\left(\frac{F}{S}\right)$
    pub fn implied_convenience_yield(
        spot: f64,
        futures_price: f64,
        risk_free_rate: f64,
        days_to_expiry: f64,
    ) -> Result<f64, String> {
        if spot <= 0.0 || futures_price <= 0.0 {
            return Err("Precios Spot y Futuro deben ser positivos".to_string());
        }
        if days_to_expiry <= 0.0 {
            return Err("Se requieren días positivos al vencimiento para tasa implícita".to_string());
        }
        let t = days_to_expiry / 365.0;
        let carry_log = (futures_price / spot).ln() / t;
        Ok(risk_free_rate - carry_log)
    }

    /// Base teórica de Cost-of-Carry: $F_{teorico} - S$
    pub fn theoretical_basis(
        spot: f64,
        risk_free_rate: f64,
        convenience_or_dividend_yield: f64,
        days_to_expiry: f64,
    ) -> Result<f64, String> {
        let f = Self::continuous_price(spot, risk_free_rate, convenience_or_dividend_yield, days_to_expiry)?;
        Ok(f - spot)
    }
}
