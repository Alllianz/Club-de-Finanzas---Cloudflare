use serde::{Deserialize, Serialize};
use std::fmt;

/// Error estricto de Look-Ahead Bias en procesamiento financiero.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error, Serialize, Deserialize)]
pub enum LookAheadBiasError {
    #[error("Violación de Look-Ahead Bias: el evento tiene timestamp {event_ms} ms, que excede el tiempo simulado T={simulated_t_ms} ms")]
    EventInFuture {
        event_ms: u64,
        simulated_t_ms: u64,
    },
    #[error("Violación de orden temporal: timestamp recibido {current_ms} ms es menor al timestamp previo {prev_ms} ms (no monotónico)")]
    NonMonotonicOrder {
        prev_ms: u64,
        current_ms: u64,
    },
}

/// Guardia temporal estricta para garantizar CERO Look-Ahead Bias ($t \le T$).
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub struct StrictTimestamp {
    millis: u64,
}

impl StrictTimestamp {
    /// Crea un nuevo timestamp inmutable a partir de milisegundos desde epoch.
    #[inline]
    pub const fn from_millis(millis: u64) -> Self {
        Self { millis }
    }

    /// Retorna los milisegundos brutos.
    #[inline]
    pub const fn as_millis(&self) -> u64 {
        self.millis
    }

    /// Comprueba si este timestamp es anterior o igual a la cota máxima $T$ permitida ($t \le T$).
    #[inline]
    pub fn is_at_or_before(&self, max_allowed_t: StrictTimestamp) -> bool {
        self.millis <= max_allowed_t.millis
    }

    /// Valida que este evento no pertenezca al futuro con respecto al instante simulado $T$.
    /// Si $t > T$, genera un error formal y rechaza el evento.
    pub fn assert_not_future(&self, simulated_t: StrictTimestamp) -> Result<(), LookAheadBiasError> {
        if self.millis > simulated_t.millis {
            Err(LookAheadBiasError::EventInFuture {
                event_ms: self.millis,
                simulated_t_ms: simulated_t.millis,
            })
        } else {
            Ok(())
        }
    }

    /// Diferencia en días como número decimal (utilizado en cálculos de tasas y Cost-of-Carry).
    pub fn days_between(&self, other: StrictTimestamp) -> f64 {
        let diff_ms = if other.millis >= self.millis {
            (other.millis - self.millis) as f64
        } else {
            -((self.millis - other.millis) as f64)
        };
        diff_ms / (1000.0 * 60.0 * 60.0 * 24.0)
    }
}

impl fmt::Display for StrictTimestamp {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "StrictTimestamp({} ms)", self.millis)
    }
}
