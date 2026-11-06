use serde::{Deserialize, Serialize};

/// Estado de una posición de futuros en el portafolio.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum PositionStatus {
    /// Posición abierta y activa, sujeta a Mark-to-Market.
    Open,
    /// Posición cerrada normalmente por el usuario mediante orden de contrapartida.
    Closed,
    /// Posición liquidada forzosamente por el motor de riesgo por insuficiencia de margen.
    Liquidated,
}
