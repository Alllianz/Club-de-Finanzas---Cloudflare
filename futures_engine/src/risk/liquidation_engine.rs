use serde::{Deserialize, Serialize};
use crate::models::{FutureContract, LiquidationEvent, Position};
use crate::types::{PositionStatus, Side, StrictTimestamp};

/// Resultado del cálculo de precios de liquidación y quiebra.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct LiquidationThresholds {
    /// Precio al cual la posición es liquidada forzosamente.
    pub liquidation_price: f64,
    /// Precio de quiebra (donde el margen asignado cae exactamente a cero).
    pub bankruptcy_price: f64,
}

/// Motor de liquidación forzosa y gestión de quiebra.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct LiquidationEngine;

impl LiquidationEngine {
    /// Calcula los precios de liquidación y quiebra para una posición:
    ///
    /// Para Long:
    /// $P_{liq} = P_{entry} \times \frac{1 - 1/L}{1 - MMR}$
    /// $P_{bank} = P_{entry} \times \left(1 - \frac{1}{L}\right)$
    ///
    /// Para Short:
    /// $P_{liq} = P_{entry} \times \frac{1 + 1/L}{1 + MMR}$
    /// $P_{bank} = P_{entry} \times \left(1 + \frac{1}{L}\right)$
    pub fn calculate_thresholds(
        side: Side,
        entry_price: f64,
        leverage: f64,
        maintenance_margin_rate: f64,
    ) -> Result<LiquidationThresholds, String> {
        if entry_price <= 0.0 {
            return Err("El precio de entrada debe ser positivo".to_string());
        }
        if leverage < 1.0 {
            return Err("El apalancamiento debe ser al menos 1.0x".to_string());
        }
        if maintenance_margin_rate < 0.0 || maintenance_margin_rate >= 1.0 {
            return Err("La tasa MMR debe estar en el rango [0.0, 1.0)".to_string());
        }

        let inv_lev = 1.0 / leverage;

        match side {
            Side::Long => {
                let denom = 1.0 - maintenance_margin_rate;
                if denom <= 0.0 {
                    return Err("Denominador de liquidación Long inválido".to_string());
                }
                let liq_price = entry_price * ((1.0 - inv_lev) / denom);
                let bank_price = entry_price * (1.0 - inv_lev);
                Ok(LiquidationThresholds {
                    liquidation_price: liq_price.max(0.0),
                    bankruptcy_price: bank_price.max(0.0),
                })
            }
            Side::Short => {
                let denom = 1.0 + maintenance_margin_rate;
                let liq_price = entry_price * ((1.0 + inv_lev) / denom);
                let bank_price = entry_price * (1.0 + inv_lev);
                Ok(LiquidationThresholds {
                    liquidation_price: liq_price,
                    bankruptcy_price: bank_price,
                })
            }
        }
    }

    /// Comprueba si el precio de mercado actual activa la liquidación forzosa.
    /// - Long se liquida si $P_{market} \le P_{liq}$.
    /// - Short se liquida si $P_{market} \ge P_{liq}$.
    pub fn is_liquidatable(side: Side, current_price: f64, liquidation_price: f64) -> bool {
        match side {
            Side::Long => current_price <= liquidation_price,
            Side::Short => current_price >= liquidation_price,
        }
    }

    /// Ejecuta la liquidación de una posición, calculando el margen recuperado o el déficit de quiebra.
    pub fn execute_liquidation(
        position: &mut Position,
        contract: &FutureContract,
        market_price: f64,
        event_id: impl Into<String>,
        timestamp: StrictTimestamp,
    ) -> Result<LiquidationEvent, String> {
        if !position.is_open() {
            return Err("No se puede liquidar una posición que no está abierta".to_string());
        }

        let notional_entry = position.quantity * position.entry_price * contract.multiplier;
        let notional_exit = position.quantity * market_price * contract.multiplier;

        let gross_pnl = match position.side {
            Side::Long => notional_exit - notional_entry,
            Side::Short => notional_entry - notional_exit,
        };

        // Colateral asignado + gross_pnl
        let remaining_collateral = position.isolated_margin + gross_pnl;

        let (margin_recovered, deficit_loss) = if remaining_collateral >= 0.0 {
            (remaining_collateral, 0.0)
        } else {
            (0.0, remaining_collateral.abs())
        };

        position.status = PositionStatus::Liquidated;
        position.current_price = market_price;
        position.unrealized_pnl = gross_pnl;
        position.updated_at = timestamp;

        let event = LiquidationEvent::new(
            event_id,
            &position.account_id,
            &position.id,
            &position.symbol,
            position.side,
            position.quantity,
            market_price,
            position.bankruptcy_price,
            margin_recovered,
            deficit_loss,
            timestamp,
        );

        Ok(event)
    }
}
