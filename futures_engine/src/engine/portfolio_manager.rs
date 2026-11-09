use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use crate::models::{Account, FutureContract, LiquidationEvent, MarketTick, Position, Trade};
use crate::risk::{LiquidationEngine, MarginCalculator, PnlCalculator};
use crate::types::MarginMode;

/// Administrador de cartera de derivados y gestión de posiciones para una cuenta.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortfolioManager {
    /// Cuenta asociada.
    pub account: Account,
    /// Posiciones abiertas indexadas por símbolo.
    pub positions: HashMap<String, Position>,
    /// Historial de trades ejecutados en esta cuenta.
    pub trade_history: Vec<Trade>,
    /// Eventos de liquidación ocurridos.
    pub liquidation_history: Vec<LiquidationEvent>,
}

impl PortfolioManager {
    /// Crea un nuevo gestor de cartera para una cuenta.
    pub fn new(account: Account) -> Self {
        Self {
            account,
            positions: HashMap::new(),
            trade_history: Vec::new(),
            liquidation_history: Vec::new(),
        }
    }

    /// Procesa la ejecución de un trade, actualizando posiciones, márgenes y PnL realizado.
    pub fn apply_trade(
        &mut self,
        trade: &mut Trade,
        contract: &FutureContract,
        leverage: f64,
        margin_mode: MarginMode,
    ) -> Result<(), String> {
        // Descontar comisión del efectivo disponible
        self.account.cash_balance -= trade.commission;

        let symbol = &trade.symbol;

        if let Some(mut existing) = self.positions.remove(symbol) {
            if existing.side == trade.side {
                // Mismo lado: Incrementar posición
                let new_entry_price = PnlCalculator::calculate_new_entry_price(
                    existing.quantity,
                    existing.entry_price,
                    trade.quantity,
                    trade.fill_price,
                )?;
                let total_quantity = existing.quantity + trade.quantity;

                let additional_margin = MarginCalculator::calculate_initial_margin(
                    contract,
                    trade.quantity,
                    trade.fill_price,
                    leverage,
                )?;

                let thresholds = LiquidationEngine::calculate_thresholds(
                    existing.side,
                    new_entry_price,
                    leverage,
                    contract.maintenance_margin_rate,
                )?;

                existing.quantity = total_quantity;
                existing.entry_price = new_entry_price;
                existing.current_price = trade.fill_price;
                existing.isolated_margin += additional_margin;
                existing.liquidation_price = thresholds.liquidation_price;
                existing.bankruptcy_price = thresholds.bankruptcy_price;
                existing.multiplier = contract.multiplier;
                existing.maintenance_margin_rate = contract.maintenance_margin_rate;
                existing.updated_at = trade.executed_at;

                self.account.initial_margin += additional_margin;
                self.positions.insert(symbol.clone(), existing);
            } else {
                // Lado opuesto: Reducir, cerrar o invertir posición (Flip)
                if trade.quantity < existing.quantity {
                    // Reducción parcial
                    let closed_qty = trade.quantity;
                    let realized = PnlCalculator::calculate_realized_pnl(
                        existing.side,
                        existing.entry_price,
                        trade.fill_price,
                        closed_qty,
                        contract.multiplier,
                        0.0,
                    );
                    trade.realized_pnl = realized;

                    let released_margin = existing.isolated_margin * (closed_qty / existing.quantity);
                    existing.quantity -= closed_qty;
                    existing.isolated_margin -= released_margin;
                    existing.realized_pnl += realized;
                    existing.current_price = trade.fill_price;
                    existing.updated_at = trade.executed_at;

                    self.account.cash_balance += realized;
                    self.account.realized_pnl += realized;
                    self.account.initial_margin = (self.account.initial_margin - released_margin).max(0.0);

                    self.positions.insert(symbol.clone(), existing);
                } else if (trade.quantity - existing.quantity).abs() < 1e-9 {
                    // Cierre total exacto
                    let closed_qty = existing.quantity;
                    let realized = PnlCalculator::calculate_realized_pnl(
                        existing.side,
                        existing.entry_price,
                        trade.fill_price,
                        closed_qty,
                        contract.multiplier,
                        0.0,
                    );
                    trade.realized_pnl = realized;

                    self.account.cash_balance += realized;
                    self.account.realized_pnl += realized;
                    self.account.initial_margin = (self.account.initial_margin - existing.isolated_margin).max(0.0);
                    // La posición queda completamente cerrada
                } else {
                    // Inversión de posición (Flip): trade.quantity > existing.quantity
                    let closed_qty = existing.quantity;
                    let remaining_new_qty = trade.quantity - closed_qty;

                    let realized = PnlCalculator::calculate_realized_pnl(
                        existing.side,
                        existing.entry_price,
                        trade.fill_price,
                        closed_qty,
                        contract.multiplier,
                        0.0,
                    );
                    trade.realized_pnl = realized;

                    self.account.cash_balance += realized;
                    self.account.realized_pnl += realized;
                    self.account.initial_margin = (self.account.initial_margin - existing.isolated_margin).max(0.0);

                    // Abrir nueva posición con el remanente en la dirección del trade
                    let new_margin = MarginCalculator::calculate_initial_margin(
                        contract,
                        remaining_new_qty,
                        trade.fill_price,
                        leverage,
                    )?;

                    let thresholds = LiquidationEngine::calculate_thresholds(
                        trade.side,
                        trade.fill_price,
                        leverage,
                        contract.maintenance_margin_rate,
                    )?;

                    let new_pos = Position::new(
                        format!("pos-{}-{}", symbol, trade.executed_at.as_millis()),
                        &self.account.account_id,
                        symbol,
                        trade.side,
                        remaining_new_qty,
                        trade.fill_price,
                        leverage,
                        margin_mode,
                        new_margin,
                        thresholds.liquidation_price,
                        thresholds.bankruptcy_price,
                        contract.multiplier,
                        contract.maintenance_margin_rate,
                        trade.executed_at,
                    );

                    self.account.initial_margin += new_margin;
                    self.positions.insert(symbol.clone(), new_pos);
                }
            }
        } else {
            // Abrir nueva posición desde cero
            let initial_margin = MarginCalculator::calculate_initial_margin(
                contract,
                trade.quantity,
                trade.fill_price,
                leverage,
            )?;

            let thresholds = LiquidationEngine::calculate_thresholds(
                trade.side,
                trade.fill_price,
                leverage,
                contract.maintenance_margin_rate,
            )?;

            let pos = Position::new(
                format!("pos-{}-{}", symbol, trade.executed_at.as_millis()),
                &self.account.account_id,
                symbol,
                trade.side,
                trade.quantity,
                trade.fill_price,
                leverage,
                margin_mode,
                initial_margin,
                thresholds.liquidation_price,
                thresholds.bankruptcy_price,
                contract.multiplier,
                contract.maintenance_margin_rate,
                trade.executed_at,
            );

            self.account.initial_margin += initial_margin;
            self.positions.insert(symbol.clone(), pos);
        }

        self.trade_history.push(trade.clone());
        self.recalculate_account_totals();
        Ok(())
    }

    /// Actualiza la posición con un nuevo tick de mercado (Mark-to-Market)
    /// y verifica liquidaciones forzosas.
    pub fn on_market_tick(
        &mut self,
        tick: &MarketTick,
        contract: &FutureContract,
    ) -> Result<Option<LiquidationEvent>, String> {
        let mut liq_event = None;

        if let Some(pos) = self.positions.get_mut(&tick.symbol) {
            pos.current_price = tick.price;
            pos.updated_at = tick.timestamp;

            // Mark-to-market PnL
            pos.unrealized_pnl = PnlCalculator::calculate_unrealized_pnl(
                pos.side,
                pos.entry_price,
                tick.price,
                pos.quantity,
                contract.multiplier,
            );

            // Verificar si el precio gatilla liquidación
            if LiquidationEngine::is_liquidatable(pos.side, tick.price, pos.liquidation_price) {
                let event_id = format!("liq-{}-{}", pos.id, tick.timestamp.as_millis());
                let event = LiquidationEngine::execute_liquidation(
                    pos,
                    contract,
                    tick.price,
                    event_id,
                    tick.timestamp,
                )?;
                liq_event = Some(event);
            }
        }

        if let Some(ref event) = liq_event {
            // Eliminar posición liquidada de la cartera
            if let Some(pos) = self.positions.remove(&event.symbol) {
                self.account.initial_margin = (self.account.initial_margin - pos.isolated_margin).max(0.0);
                let net_loss = (pos.isolated_margin - event.margin_recovered) + event.deficit_loss;
                self.account.cash_balance -= net_loss;
                self.account.realized_pnl -= net_loss;
            }
            self.liquidation_history.push(event.clone());
        }

        self.recalculate_account_totals();
        Ok(liq_event)
    }

    /// Recalcula los totales de margen, PnL no realizado y equity de la cuenta.
    /// Soporta múltiples activos calculando el margen de mantenimiento individualmente
    /// con los parámetros propios de cada posición.
    pub fn recalculate_account_totals(&mut self) {
        let mut agg_unrealized = 0.0;
        let mut agg_initial_margin = 0.0;
        let mut agg_maint_margin = 0.0;

        for pos in self.positions.values() {
            if pos.is_open() {
                agg_unrealized += pos.unrealized_pnl;
                agg_initial_margin += pos.isolated_margin;
                agg_maint_margin += pos.calculate_maintenance_margin();
            }
        }

        self.account.unrealized_pnl = agg_unrealized;
        self.account.initial_margin = agg_initial_margin;
        self.account.maintenance_margin = agg_maint_margin;
        self.account.recalculate_totals();
    }
}
