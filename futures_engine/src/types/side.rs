use serde::{Deserialize, Serialize};

/// Lado de una orden o posición en futuros (Largo o Corto).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Side {
    /// Posición compradora (se beneficia de la subida del subyacente).
    Long,
    /// Posición vendedora (se beneficia de la caída del subyacente).
    Short,
}

impl Side {
    /// Signo multiplicador direccional (+1.0 para Long, -1.0 para Short).
    #[inline]
    pub fn sign(&self) -> f64 {
        match self {
            Side::Long => 1.0,
            Side::Short => -1.0,
        }
    }

    /// Lado opuesto (ej. para cerrar o reducir posición).
    #[inline]
    pub fn opposite(&self) -> Side {
        match self {
            Side::Long => Side::Short,
            Side::Short => Side::Long,
        }
    }
}
