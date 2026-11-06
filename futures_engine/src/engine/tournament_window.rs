use serde::{Deserialize, Serialize};
use thiserror::Error;
use crate::types::StrictTimestamp;

/// Errores asociados a la vigencia temporal del torneo (Zero Look-Ahead Bias).
#[derive(Debug, Error, PartialEq, Eq, Clone, Serialize, Deserialize)]
pub enum TournamentWindowError {
    #[error("Inconsistencia cronológica: la fecha de inicio ({start_ms}) es posterior a la de finalización ({end_ms})")]
    InvalidBoundaries { start_ms: u64, end_ms: u64 },

    #[error("Torneo no iniciado: la fecha de inicio programada es {start_ms} ms y el tiempo actual es {current_ms} ms")]
    NotStartedYet { start_ms: u64, current_ms: u64 },

    #[error("Torneo finalizado: la competencia concluyó en {end_ms} ms y el tiempo actual es {current_ms} ms")]
    AlreadyConcluded { end_ms: u64, current_ms: u64 },
}

/// Estado de vigencia operativa del torneo para un instante $t \le T$.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum TournamentExecutionStatus {
    /// El torneo aún no ha comenzado ($t < T_{inicio}$)
    Scheduled,
    /// El torneo está dentro del período hábil para operar ($T_{inicio} \le t \le T_{fin}$)
    Active,
    /// El torneo ha finalizado; no se admiten nuevas operaciones ($t > T_{fin}$)
    Concluded,
    /// Sin restricción de fechas (mercado continuo)
    Continuous,
}

/// Ventana temporal inmutable que gobierna las fechas de inicio y finalización de un torneo de trading.
/// Garantiza que ninguna orden o cálculo acceda ni opere fuera de $[T_{start}, T_{end}]$ (Zero Look-Ahead Bias).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct TournamentDateWindow {
    start_time: Option<StrictTimestamp>,
    end_time: Option<StrictTimestamp>,
}

impl TournamentDateWindow {
    /// Construye una nueva ventana temporal validando la causalidad $T_{start} \le T_{end}$.
    pub fn new(
        start_time: Option<StrictTimestamp>,
        end_time: Option<StrictTimestamp>,
    ) -> Result<Self, TournamentWindowError> {
        if let (Some(start), Some(end)) = (start_time, end_time) {
            if start > end {
                return Err(TournamentWindowError::InvalidBoundaries {
                    start_ms: start.as_millis(),
                    end_ms: end.as_millis(),
                });
            }
        }

        Ok(Self { start_time, end_time })
    }

    /// Retorna el instante oficial de inicio, si fue configurado.
    #[inline]
    pub fn start_time(&self) -> Option<StrictTimestamp> {
        self.start_time
    }

    /// Retorna el instante oficial de finalización, si fue configurado.
    #[inline]
    pub fn end_time(&self) -> Option<StrictTimestamp> {
        self.end_time
    }

    /// Evalúa el estado del torneo en un instante dado sin Look-Ahead Bias.
    pub fn status_at(&self, current_time: StrictTimestamp) -> TournamentExecutionStatus {
        if let Some(start) = self.start_time {
            if current_time < start {
                return TournamentExecutionStatus::Scheduled;
            }
        }

        if let Some(end) = self.end_time {
            if current_time > end {
                return TournamentExecutionStatus::Concluded;
            }
        }

        if self.start_time.is_none() && self.end_time.is_none() {
            TournamentExecutionStatus::Continuous
        } else {
            TournamentExecutionStatus::Active
        }
    }

    /// Verifica si en el instante `current_time` las operaciones de trading están habilitadas.
    #[inline]
    pub fn is_trading_allowed(&self, current_time: StrictTimestamp) -> bool {
        self.status_at(current_time) == TournamentExecutionStatus::Active
            || self.status_at(current_time) == TournamentExecutionStatus::Continuous
    }

    /// Valida de forma estricta que una operación pueda ejecutarse en `current_time`.
    /// Rechaza la orden con el error correspondiente si está fuera de vigencia.
    pub fn validate_order_execution(&self, current_time: StrictTimestamp) -> Result<(), TournamentWindowError> {
        if let Some(start) = self.start_time {
            if current_time < start {
                return Err(TournamentWindowError::NotStartedYet {
                    start_ms: start.as_millis(),
                    current_ms: current_time.as_millis(),
                });
            }
        }

        if let Some(end) = self.end_time {
            if current_time > end {
                return Err(TournamentWindowError::AlreadyConcluded {
                    end_ms: end.as_millis(),
                    current_ms: current_time.as_millis(),
                });
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_window_creation() {
        let t1 = StrictTimestamp::from_millis(1000);
        let t2 = StrictTimestamp::from_millis(2000);

        let window = TournamentDateWindow::new(Some(t1), Some(t2));
        assert!(window.is_ok());

        let err = TournamentDateWindow::new(Some(t2), Some(t1));
        assert!(matches!(err, Err(TournamentWindowError::InvalidBoundaries { .. })));
    }

    #[test]
    fn test_trading_allowance_and_status() {
        let t_start = StrictTimestamp::from_millis(10000);
        let t_end = StrictTimestamp::from_millis(20000);
        let window = TournamentDateWindow::new(Some(t_start), Some(t_end)).unwrap();

        // Antes del inicio
        let t_before = StrictTimestamp::from_millis(9999);
        assert_eq!(window.status_at(t_before), TournamentExecutionStatus::Scheduled);
        assert!(!window.is_trading_allowed(t_before));
        assert!(matches!(
            window.validate_order_execution(t_before),
            Err(TournamentWindowError::NotStartedYet { .. })
        ));

        // En el inicio exacto
        assert_eq!(window.status_at(t_start), TournamentExecutionStatus::Active);
        assert!(window.is_trading_allowed(t_start));
        assert!(window.validate_order_execution(t_start).is_ok());

        // En el medio
        let t_mid = StrictTimestamp::from_millis(15000);
        assert_eq!(window.status_at(t_mid), TournamentExecutionStatus::Active);
        assert!(window.is_trading_allowed(t_mid));
        assert!(window.validate_order_execution(t_mid).is_ok());

        // En el fin exacto
        assert_eq!(window.status_at(t_end), TournamentExecutionStatus::Active);
        assert!(window.is_trading_allowed(t_end));
        assert!(window.validate_order_execution(t_end).is_ok());

        // Posterior al fin
        let t_after = StrictTimestamp::from_millis(20001);
        assert_eq!(window.status_at(t_after), TournamentExecutionStatus::Concluded);
        assert!(!window.is_trading_allowed(t_after));
        assert!(matches!(
            window.validate_order_execution(t_after),
            Err(TournamentWindowError::AlreadyConcluded { .. })
        ));
    }

    #[test]
    fn test_unbounded_window() {
        let window = TournamentDateWindow::new(None, None).unwrap();
        let any_time = StrictTimestamp::from_millis(500000);

        assert_eq!(window.status_at(any_time), TournamentExecutionStatus::Continuous);
        assert!(window.is_trading_allowed(any_time));
        assert!(window.validate_order_execution(any_time).is_ok());
    }
}
