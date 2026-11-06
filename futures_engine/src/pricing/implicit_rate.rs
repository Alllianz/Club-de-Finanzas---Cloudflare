use serde::{Deserialize, Serialize};

/// Resultado del cálculo de tasas implícitas de un contrato de futuros.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct ImplicitRateResult {
    /// Tasa Nominal Anualizada (TNA, base 365 días).
    pub tna: f64,
    /// Tasa Efectiva Anual (TEA, capitalización compuesta).
    pub tea: f64,
    /// Tasa Efectiva Mensual aproximada (TEM, 30 días).
    pub tem: f64,
    /// Spread absoluto de precios (F - S).
    pub spread: f64,
    /// Spread porcentual directo (F - S) / S.
    pub direct_percentage: f64,
    /// Días remanentes al vencimiento utilizados.
    pub days_to_expiry: f64,
}

/// Calculadora de tasas implícitas (TNA / TEA / TEM) estilo Matba Rofex Dólar Futuro y derivados.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ImplicitRateCalculator;

impl ImplicitRateCalculator {
    /// Calcula la Tasa Nominal Anual (TNA), Tasa Efectiva Anual (TEA) y Tasa Efectiva Mensual (TEM).
    /// Fórmulas oficiales de mercado de futuros:
    /// - $TNA = \frac{F - S}{S} \times \frac{365}{días}$
    /// - $TEA = \left(\frac{F}{S}\right)^{\frac{365}{días}} - 1$
    /// - $TEM = \left(\frac{F}{S}\right)^{\frac{30}{días}} - 1$
    pub fn calculate(spot: f64, futures_price: f64, days_to_expiry: f64) -> Result<ImplicitRateResult, String> {
        if spot <= 0.0 {
            return Err("El precio Spot debe ser estrictamente positivo".to_string());
        }
        if futures_price <= 0.0 {
            return Err("El precio del Futuro debe ser estrictamente positivo".to_string());
        }
        if days_to_expiry <= 0.0 {
            return Err("Los días al vencimiento deben ser mayores que cero".to_string());
        }

        let spread = futures_price - spot;
        let direct_percentage = spread / spot;
        let tna = direct_percentage * (365.0 / days_to_expiry);

        let ratio = futures_price / spot;
        let tea = ratio.powf(365.0 / days_to_expiry) - 1.0;
        let tem = ratio.powf(30.0 / days_to_expiry) - 1.0;

        Ok(ImplicitRateResult {
            tna,
            tea,
            tem,
            spread,
            direct_percentage,
            days_to_expiry,
        })
    }

    /// Calcula el precio teórico del futuro dado un precio spot y una TNA objetivo:
    /// $F = S \times \left(1 + TNA \times \frac{días}{365}\right)$
    pub fn future_price_from_tna(spot: f64, tna: f64, days_to_expiry: f64) -> Result<f64, String> {
        if spot <= 0.0 {
            return Err("El precio Spot debe ser positivo".to_string());
        }
        if days_to_expiry < 0.0 {
            return Err("Los días al vencimiento no pueden ser negativos".to_string());
        }
        let forward = spot * (1.0 + tna * (days_to_expiry / 365.0));
        Ok(forward)
    }

    /// Calcula el precio teórico del futuro dado un precio spot y una TEA objetivo:
    /// $F = S \times (1 + TEA)^{\frac{días}{365}}$
    pub fn future_price_from_tea(spot: f64, tea: f64, days_to_expiry: f64) -> Result<f64, String> {
        if spot <= 0.0 {
            return Err("El precio Spot debe ser positivo".to_string());
        }
        if days_to_expiry < 0.0 {
            return Err("Los días al vencimiento no pueden ser negativos".to_string());
        }
        let factor = (1.0 + tea).powf(days_to_expiry / 365.0);
        Ok(spot * factor)
    }
}
