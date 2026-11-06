use serde::{Deserialize, Serialize};
use crate::models::{MarketTick, Order};
use crate::types::{LookAheadBiasError, StrictTimestamp};

/// Ventana temporal estricta que previene a nivel de tipos y lógica cualquier Look-Ahead Bias ($t \le T$).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalWindow {
    /// Instante temporal máximo actual de la simulación o backtest ($T$).
    current_time: StrictTimestamp,
    /// Timestamp del último tick procesado para verificar estricta monotonicidad.
    last_tick_time: Option<StrictTimestamp>,
}

impl TemporalWindow {
    /// Inicializa la ventana temporal con un instante inicial $T_0$.
    pub fn new(initial_time: StrictTimestamp) -> Self {
        Self {
            current_time: initial_time,
            last_tick_time: None,
        }
    }

    /// Retorna el instante simulado actual $T$.
    #[inline]
    pub fn current_time(&self) -> StrictTimestamp {
        self.current_time
    }

    /// Avanza el tiempo simulado $T$ hacia el futuro ($T_{nuevo} \ge T_{actual}$).
    /// Rechaza retrocesos temporales para preservar la causalidad.
    pub fn advance_to(&mut self, next_time: StrictTimestamp) -> Result<(), LookAheadBiasError> {
        if next_time < self.current_time {
            return Err(LookAheadBiasError::NonMonotonicOrder {
                prev_ms: self.current_time.as_millis(),
                current_ms: next_time.as_millis(),
            });
        }
        self.current_time = next_time;
        Ok(())
    }

    /// Valida que un tick de mercado no provenga del futuro ($t_{tick} \le T$)
    /// y que respete la monotonicidad de llegada de mercado.
    pub fn verify_tick(&mut self, tick: &MarketTick) -> Result<(), LookAheadBiasError> {
        // CERO Look-Ahead Bias: t <= T
        tick.timestamp.assert_not_future(self.current_time)?;

        // Monotonicidad: no procesar ticks con timestamps desordenados hacia atrás
        if let Some(prev) = self.last_tick_time {
            if tick.timestamp < prev {
                return Err(LookAheadBiasError::NonMonotonicOrder {
                    prev_ms: prev.as_millis(),
                    current_ms: tick.timestamp.as_millis(),
                });
            }
        }

        self.last_tick_time = Some(tick.timestamp);
        Ok(())
    }

    /// Valida que una orden emitida no tenga un timestamp en el futuro respecto a $T$.
    pub fn verify_order(&self, order: &Order) -> Result<(), LookAheadBiasError> {
        order.created_at.assert_not_future(self.current_time)
    }

    /// Filtra rigurosamente una serie histórica de ticks asegurando que NINGÚN registro posterior a $T$ sea visible.
    /// Garantiza CERO Look-Ahead Bias en análisis técnico, backtest o pricing.
    pub fn filter_history_without_bias<'a>(
        &self,
        ticks: &'a [MarketTick],
    ) -> Result<Vec<&'a MarketTick>, LookAheadBiasError> {
        let mut filtered = Vec::new();
        let mut prev_time: Option<StrictTimestamp> = None;

        for tick in ticks {
            // Rechazo estricto si está en el futuro
            if tick.timestamp > self.current_time {
                break;
            }

            // Verificación de orden
            if let Some(prev) = prev_time {
                if tick.timestamp < prev {
                    return Err(LookAheadBiasError::NonMonotonicOrder {
                        prev_ms: prev.as_millis(),
                        current_ms: tick.timestamp.as_millis(),
                    });
                }
            }

            filtered.push(tick);
            prev_time = Some(tick.timestamp);
        }

        Ok(filtered)
    }
}
