use serde::{Deserialize, Serialize};
use crate::models::FutureContract;

/// Calculadora de requerimientos de margen de futuros.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct MarginCalculator;

impl MarginCalculator {
    /// Calcula el margen inicial requerido para una orden o posición:
    /// $\text{Margen Inicial} = \frac{\text{Cantidad} \times \text{Precio} \times \text{Multiplicador}}{\text{Apalancamiento}}$
    pub fn calculate_initial_margin(
        contract: &FutureContract,
        quantity: f64,
        price: f64,
        leverage: f64,
    ) -> Result<f64, String> {
        if quantity <= 0.0 {
            return Err("La cantidad debe ser mayor que cero".to_string());
        }
        if price <= 0.0 {
            return Err("El precio debe ser positivo".to_string());
        }
        if leverage < 1.0 {
            return Err("El apalancamiento debe ser al menos 1.0x".to_string());
        }

        let notional = contract.calculate_notional(quantity, price);
        Ok(notional / leverage)
    }

    /// Calcula el margen de mantenimiento requerido para una posición abierta:
    /// $\text{Margen Mantenimiento} = \text{Cantidad} \times \text{Precio} \times \text{Multiplicador} \times \text{MMR}$
    pub fn calculate_maintenance_margin(
        contract: &FutureContract,
        quantity: f64,
        current_price: f64,
    ) -> Result<f64, String> {
        if quantity <= 0.0 {
            return Err("La cantidad debe ser mayor que cero".to_string());
        }
        if current_price <= 0.0 {
            return Err("El precio actual debe ser positivo".to_string());
        }

        let notional = contract.calculate_notional(quantity, current_price);
        Ok(notional * contract.maintenance_margin_rate)
    }
}
