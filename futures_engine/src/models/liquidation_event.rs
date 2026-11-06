use serde::{Deserialize, Serialize};
use crate::types::{Side, StrictTimestamp};

/// Evento formal de liquidación forzosa por incumplimiento del margen de mantenimiento.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LiquidationEvent {
    /// Identificador único del evento de liquidación.
    pub event_id: String,
    /// Cuenta a la que pertenecía la posición liquidada.
    pub account_id: String,
    /// Identificador de la posición liquidada.
    pub position_id: String,
    /// Símbolo del contrato.
    pub symbol: String,
    /// Lado de la posición liquidada (Long o Short).
    pub side: Side,
    /// Cantidad forzosamente cerrada.
    pub liquidated_quantity: f64,
    /// Precio de ejecución de la liquidación.
    pub liquidation_price: f64,
    /// Precio de quiebra (donde el margen asignado se agota al 100%).
    pub bankruptcy_price: f64,
    /// Margen residual recuperado que vuelve a la cuenta (si el cierre fue por encima de quiebra).
    pub margin_recovered: f64,
    /// Déficit o pérdida que supera el colateral (si el cierre fue peor que el precio de quiebra).
    pub deficit_loss: f64,
    /// Timestamp estricto en el que ocurrió la liquidación.
    pub timestamp: StrictTimestamp,
}

impl LiquidationEvent {
    /// Crea un nuevo evento formal de liquidación.
    pub fn new(
        event_id: impl Into<String>,
        account_id: impl Into<String>,
        position_id: impl Into<String>,
        symbol: impl Into<String>,
        side: Side,
        liquidated_quantity: f64,
        liquidation_price: f64,
        bankruptcy_price: f64,
        margin_recovered: f64,
        deficit_loss: f64,
        timestamp: StrictTimestamp,
    ) -> Self {
        Self {
            event_id: event_id.into(),
            account_id: account_id.into(),
            position_id: position_id.into(),
            symbol: symbol.into(),
            side,
            liquidated_quantity,
            liquidation_price,
            bankruptcy_price,
            margin_recovered,
            deficit_loss,
            timestamp,
        }
    }
}
