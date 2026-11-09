use serde::{Deserialize, Serialize};
use crate::types::{MarginMode, PositionStatus, Side, StrictTimestamp};

/// Posición abierta de futuros en el portafolio.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    /// Identificador único de la posición.
    pub id: String,
    /// Cuenta a la que pertenece la posición.
    pub account_id: String,
    /// Símbolo del contrato.
    pub symbol: String,
    /// Lado de la posición (Long o Short).
    pub side: Side,
    /// Cantidad de contratos abiertos.
    pub quantity: f64,
    /// Precio medio ponderado de entrada.
    pub entry_price: f64,
    /// Último precio de mercado Mark-to-Market registrado.
    pub current_price: f64,
    /// Apalancamiento asignado.
    pub leverage: f64,
    /// Modalidad de margen (Isolated o Cross).
    pub margin_mode: MarginMode,
    /// Margen colateral asignado (para margen aislado).
    pub isolated_margin: f64,
    /// PnL no realizado al precio actual.
    pub unrealized_pnl: f64,
    /// PnL acumulado realizado en reducciones parciales.
    pub realized_pnl: f64,
    /// Precio exacto de liquidación.
    pub liquidation_price: f64,
    /// Precio de quiebra (donde el colateral cae a cero).
    pub bankruptcy_price: f64,
    /// Multiplicador del contrato (tamaño de punto o unidades por contrato).
    pub multiplier: f64,
    /// Tasa de margen de mantenimiento requerida (MMR).
    pub maintenance_margin_rate: f64,
    /// Estado de la posición (Open, Closed, Liquidated).
    pub status: PositionStatus,
    /// Timestamp de apertura de la posición.
    pub opened_at: StrictTimestamp,
    /// Timestamp de última actualización de mercado.
    pub updated_at: StrictTimestamp,
}

impl Position {
    /// Construye una nueva posición abierta.
    pub fn new(
        id: impl Into<String>,
        account_id: impl Into<String>,
        symbol: impl Into<String>,
        side: Side,
        quantity: f64,
        entry_price: f64,
        leverage: f64,
        margin_mode: MarginMode,
        isolated_margin: f64,
        liquidation_price: f64,
        bankruptcy_price: f64,
        multiplier: f64,
        maintenance_margin_rate: f64,
        timestamp: StrictTimestamp,
    ) -> Self {
        Self {
            id: id.into(),
            account_id: account_id.into(),
            symbol: symbol.into(),
            side,
            quantity,
            entry_price,
            current_price: entry_price,
            leverage,
            margin_mode,
            isolated_margin,
            unrealized_pnl: 0.0,
            realized_pnl: 0.0,
            liquidation_price,
            bankruptcy_price,
            multiplier,
            maintenance_margin_rate,
            status: PositionStatus::Open,
            opened_at: timestamp,
            updated_at: timestamp,
        }
    }

    /// Calcula el margen de mantenimiento requerido para esta posición según sus propios parámetros.
    pub fn calculate_maintenance_margin(&self) -> f64 {
        if self.quantity > 0.0 && self.current_price > 0.0 {
            self.quantity * self.current_price * self.multiplier * self.maintenance_margin_rate
        } else {
            0.0
        }
    }

    /// Retorna el Return On Equity (ROE) porcentual de la posición.
    pub fn roe_pct(&self) -> f64 {
        if self.isolated_margin > 0.0 {
            (self.unrealized_pnl / self.isolated_margin) * 100.0
        } else {
            0.0
        }
    }

    /// Comprueba si la posición está activa.
    pub fn is_open(&self) -> bool {
        self.status == PositionStatus::Open && self.quantity > 0.0
    }
}
