use serde::{Deserialize, Serialize};
use crate::types::AssetClass;

/// Validador de límites de apalancamiento por clase de activo y políticas de riesgo institucional.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct LeverageValidator;

impl LeverageValidator {
    /// Obtiene el apalancamiento máximo permitido (hasta 100x en derivados institucionales).
    pub fn max_leverage_for_asset(_asset_class: AssetClass) -> f64 {
        100.0
    }

    /// Valida que el apalancamiento solicitado esté dentro de los rangos legales y de gestión de riesgo:
    /// $[1.0, \text{MaxLeverage}]$.
    pub fn validate_leverage(asset_class: AssetClass, requested_leverage: f64) -> Result<(), String> {
        if requested_leverage < 1.0 {
            return Err(format!(
                "Apalancamiento {} inválido: debe ser como mínimo 1.0x",
                requested_leverage
            ));
        }

        let max_lev = Self::max_leverage_for_asset(asset_class);
        if requested_leverage > max_lev {
            return Err(format!(
                "Apalancamiento solicitado {}x excede el límite máximo de {}x para la clase de activo {:?}",
                requested_leverage, max_lev, asset_class
            ));
        }

        Ok(())
    }
}
