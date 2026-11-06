use serde::{Deserialize, Serialize};
use crate::models::FutureContract;
use crate::types::Side;

/// Calculadora de PnL no realizado (Mark-to-Market) y realizado para contratos de futuros.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PnlCalculator;

impl PnlCalculator {
    /// Calcula el PnL no realizado de una posición al precio actual de mercado:
    /// - Long: $(P_{mark} - P_{entry}) \times \text{Cantidad} \times \text{Multiplicador}$
    /// - Short: $(P_{entry} - P_{mark}) \times \text{Cantidad} \times \text{Multiplicador}$
    pub fn calculate_unrealized_pnl(
        side: Side,
        entry_price: f64,
        mark_price: f64,
        quantity: f64,
        multiplier: f64,
    ) -> f64 {
        let price_diff = match side {
            Side::Long => mark_price - entry_price,
            Side::Short => entry_price - mark_price,
        };
        price_diff * quantity * multiplier
    }

    /// Calcula el PnL realizado al cerrar o reducir una porción de la posición:
    /// $\text{PnL Realizado} = (\Delta P) \times \text{Cantidad Cerrada} \times \text{Multiplicador} - \text{Comisiones}$
    pub fn calculate_realized_pnl(
        side: Side,
        entry_price: f64,
        close_price: f64,
        closed_quantity: f64,
        multiplier: f64,
        commissions: f64,
    ) -> f64 {
        let gross_pnl = match side {
            Side::Long => (close_price - entry_price) * closed_quantity * multiplier,
            Side::Short => (entry_price - close_price) * closed_quantity * multiplier,
        };
        gross_pnl - commissions
    }

    /// Calcula el Retorno sobre el Capital (Return On Equity - ROE %):
    /// $\text{ROE} = \frac{\text{PnL no realizado}}{\text{Margen Inicial Aislado}} \times 100\%$
    pub fn calculate_roe_pct(unrealized_pnl: f64, isolated_margin: f64) -> f64 {
        if isolated_margin > 0.0 {
            (unrealized_pnl / isolated_margin) * 100.0
        } else {
            0.0
        }
    }

    /// Recalcula el precio de entrada promedio ponderado al incrementar tamaño de posición:
    /// $\bar{P} = \frac{Q_{actual} \times P_{actual} + Q_{nueva} \times P_{nueva}}{Q_{actual} + Q_{nueva}}$
    pub fn calculate_new_entry_price(
        current_quantity: f64,
        current_entry_price: f64,
        added_quantity: f64,
        added_price: f64,
    ) -> Result<f64, String> {
        let total_quantity = current_quantity + added_quantity;
        if total_quantity <= 0.0 {
            return Err("La cantidad total debe ser mayor que cero".to_string());
        }
        let total_cost = (current_quantity * current_entry_price) + (added_quantity * added_price);
        Ok(total_cost / total_quantity)
    }

    /// Calcula la comisión estándar de una operación (ej. tasa taker o maker en bps):
    /// $\text{Comisión} = \text{Nocional} \times \text{Fee Rate}$
    pub fn calculate_commission(
        contract: &FutureContract,
        quantity: f64,
        fill_price: f64,
        fee_rate: f64,
    ) -> f64 {
        let notional = contract.calculate_notional(quantity, fill_price);
        notional * fee_rate
    }
}
