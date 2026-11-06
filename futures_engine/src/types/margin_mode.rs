use serde::{Deserialize, Serialize};

/// Modalidad de margen de futuros.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MarginMode {
    /// Margen Aislado: El riesgo está estrictamente acotado al colateral asignado a la posición.
    Isolated,
    /// Margen Cruzado: Todo el balance disponible de la cuenta respalda las posiciones abiertas.
    Cross,
}
