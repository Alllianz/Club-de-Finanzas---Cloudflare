use serde::{Deserialize, Serialize};

/// Tipo de orden de futuros.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OrderType {
    /// Orden a mercado: se ejecuta inmediatamente al mejor precio disponible.
    Market,
    /// Orden límite: se ejecuta únicamente a un precio igual o mejor que el especificado.
    Limit,
    /// Orden stop loss: se activa cuando el precio cruza el nivel de stop establecido.
    StopLoss,
    /// Orden stop límite: activa una orden límite al tocarse el precio stop.
    StopLimit,
}
