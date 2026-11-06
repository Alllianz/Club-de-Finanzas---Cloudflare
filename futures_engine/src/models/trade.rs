use serde::{Deserialize, Serialize};
use crate::types::{Side, StrictTimestamp};

/// Registro inmutable de una transacción ejecutada (Trade fill).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
    /// Identificador único del trade.
    pub trade_id: String,
    /// Identificador de la orden que originó este trade.
    pub order_id: String,
    /// Cuenta a la que pertenece la transacción.
    pub account_id: String,
    /// Símbolo del contrato.
    pub symbol: String,
    /// Lado de la transacción (Long o Short).
    pub side: Side,
    /// Precio de ejecución efectivo.
    pub fill_price: f64,
    /// Cantidad de contratos ejecutados.
    pub quantity: f64,
    /// Comisión cobrada por la operación.
    pub commission: f64,
    /// PnL realizado generado por esta ejecución (si cerró o redujo una posición previa).
    pub realized_pnl: f64,
    /// Timestamp exacto de ejecución ($t \le T$).
    pub executed_at: StrictTimestamp,
}

impl Trade {
    /// Crea un nuevo registro de trade.
    pub fn new(
        trade_id: impl Into<String>,
        order_id: impl Into<String>,
        account_id: impl Into<String>,
        symbol: impl Into<String>,
        side: Side,
        fill_price: f64,
        quantity: f64,
        commission: f64,
        realized_pnl: f64,
        executed_at: StrictTimestamp,
    ) -> Self {
        Self {
            trade_id: trade_id.into(),
            order_id: order_id.into(),
            account_id: account_id.into(),
            symbol: symbol.into(),
            side,
            fill_price,
            quantity,
            commission,
            realized_pnl,
            executed_at,
        }
    }
}
