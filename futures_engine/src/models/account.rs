use serde::{Deserialize, Serialize};
use crate::types::{Currency, MarginMode};

/// Cuenta de derivados de Paper Trading.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    /// Identificador único de la cuenta.
    pub account_id: String,
    /// Saldo líquido de efectivo en la cuenta (Cash Balance).
    pub cash_balance: f64,
    /// Modalidad de margen por defecto (Isolated o Cross).
    pub margin_mode: MarginMode,
    /// Margen bloqueado por órdenes abiertas pendientes de fill.
    pub locked_margin: f64,
    /// Margen inicial total utilizado por posiciones abiertas.
    pub initial_margin: f64,
    /// Margen de mantenimiento mínimo requerido para evitar liquidación.
    pub maintenance_margin: f64,
    /// PnL no realizado agregado de todas las posiciones abiertas.
    pub unrealized_pnl: f64,
    /// PnL realizado histórico acumulado en la cuenta.
    pub realized_pnl: f64,
    /// Patrimonio neto total Mark-to-Market (Equity = Cash Balance + Unrealized PnL).
    pub equity: f64,
    /// Margen libre disponible para abrir nuevas posiciones u órdenes (Equity - Initial Margin - Locked Margin).
    pub free_margin: f64,
    /// Nivel de margen porcentual: (Equity / Initial Margin) * 100%.
    pub margin_level_pct: f64,
    /// Moneda de denominación de la cuenta.
    pub currency: Currency,
}

impl Account {
    /// Crea una nueva cuenta con saldo inicial.
    pub fn new(account_id: impl Into<String>, initial_cash: f64, currency: Currency) -> Self {
        Self {
            account_id: account_id.into(),
            cash_balance: initial_cash,
            margin_mode: MarginMode::Isolated,
            locked_margin: 0.0,
            initial_margin: 0.0,
            maintenance_margin: 0.0,
            unrealized_pnl: 0.0,
            realized_pnl: 0.0,
            equity: initial_cash,
            free_margin: initial_cash,
            margin_level_pct: 100.0,
            currency,
        }
    }

    /// Recalcula el patrimonio neto y el margen libre en base a posiciones y órdenes.
    pub fn recalculate_totals(&mut self) {
        self.equity = self.cash_balance + self.unrealized_pnl;
        let total_committed = self.initial_margin + self.locked_margin;
        self.free_margin = (self.equity - total_committed).max(0.0);
        self.margin_level_pct = if self.initial_margin > 0.0 {
            (self.equity / self.initial_margin) * 100.0
        } else {
            100.0
        };
    }

    /// Intenta reservar margen para una nueva orden. Devuelve Err si no hay margen libre suficiente.
    pub fn reserve_margin(&mut self, amount: f64) -> Result<(), String> {
        if amount <= 0.0 {
            return Ok(());
        }
        if self.free_margin < amount {
            return Err(format!(
                "Margen libre insuficiente: requerido {}, disponible {}",
                amount, self.free_margin
            ));
        }
        self.locked_margin += amount;
        self.recalculate_totals();
        Ok(())
    }

    /// Libera margen bloqueado por una orden cancelada o rechazada.
    pub fn release_locked_margin(&mut self, amount: f64) {
        self.locked_margin = (self.locked_margin - amount).max(0.0);
        self.recalculate_totals();
    }
}
