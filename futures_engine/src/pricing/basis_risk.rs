use serde::{Deserialize, Serialize};

/// Métricas de riesgo de base (Basis Risk) entre el contrato de futuros y el activo subyacente.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BasisMetrics {
    /// Base absoluta: $Basis = F - S$.
    pub basis: f64,
    /// Base porcentual respecto al spot: $(F - S) / S$.
    pub basis_pct: f64,
    /// Tasa de base anualizada (base 365 días).
    pub annualized_basis_rate: f64,
    /// Días al vencimiento.
    pub days_to_expiry: f64,
    /// Condición de mercado: True si está en Contango ($F > S$), False si está en Backwardation ($F < S$).
    pub is_contango: bool,
}

/// Calculador y monitor de riesgo de base.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BasisRiskCalculator;

impl BasisRiskCalculator {
    /// Calcula las métricas de base completas.
    pub fn compute_basis(spot: f64, futures_price: f64, days_to_expiry: f64) -> Result<BasisMetrics, String> {
        if spot <= 0.0 {
            return Err("El precio Spot debe ser positivo".to_string());
        }
        if days_to_expiry < 0.0 {
            return Err("Los días al vencimiento no pueden ser negativos".to_string());
        }

        let basis = futures_price - spot;
        let basis_pct = basis / spot;
        let annualized_basis_rate = if days_to_expiry > 0.0 {
            basis_pct * (365.0 / days_to_expiry)
        } else {
            0.0
        };

        Ok(BasisMetrics {
            basis,
            basis_pct,
            annualized_basis_rate,
            days_to_expiry,
            is_contango: futures_price > spot,
        })
    }

    /// Calcula la convergencia esperada de la base por día hasta el vencimiento:
    /// $\text{Decay diario} = \frac{F - S}{\text{días}}$
    pub fn daily_basis_decay(spot: f64, futures_price: f64, days_to_expiry: f64) -> Result<f64, String> {
        if days_to_expiry <= 0.0 {
            return Err("Se requieren días positivos para calcular el decay diario".to_string());
        }
        let basis = futures_price - spot;
        Ok(basis / days_to_expiry)
    }
}
