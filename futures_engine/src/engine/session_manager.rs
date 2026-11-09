use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use crate::engine::anti_lookahead::TemporalWindow;
use crate::engine::order_matcher::OrderMatcher;
use crate::engine::portfolio_manager::PortfolioManager;
use crate::models::{Account, FutureContract, LiquidationEvent, MarketTick, Order, OrderStatus, Position, Trade};
use crate::risk::{LeverageValidator, MarginCalculator};
use crate::types::{Currency, LookAheadBiasError, StrictTimestamp};

/// Eventos resultantes del procesamiento de un tick de mercado en la sesión.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TickProcessingResult {
    /// Símbolo procesado.
    pub symbol: String,
    /// Trades ejecutados a partir de órdenes pendientes emparejadas.
    pub executed_trades: Vec<Trade>,
    /// Eventos de liquidación forzosa provocados por el tick.
    pub liquidations: Vec<LiquidationEvent>,
}

/// Gestor de sesiones de Paper Trading para múltiples cuentas y estrategias.
pub struct SessionManager {
    /// Ventana temporal anti look-ahead bias ($t \le T$).
    pub temporal_window: TemporalWindow,
    /// Catálogo de contratos de futuros registrados.
    pub contracts: HashMap<String, FutureContract>,
    /// Gestores de cartera por cada cuenta de usuario/estrategia.
    pub accounts: HashMap<String, PortfolioManager>,
    /// Órdenes activas pendientes en el libro de órdenes simulado.
    pub pending_orders: HashMap<String, Order>,
    /// Último tick de mercado conocido por símbolo ($t_{tick} \le T$).
    pub latest_ticks: HashMap<String, MarketTick>,
    /// Motor de emparejamiento de órdenes.
    pub order_matcher: OrderMatcher,
    /// Contador secuencial de identificadores de trades.
    pub trade_counter: u64,
}

impl SessionManager {
    /// Crea una nueva sesión de Paper Trading con un instante temporal base $T_0$.
    pub fn new(initial_time: StrictTimestamp) -> Self {
        Self {
            temporal_window: TemporalWindow::new(initial_time),
            contracts: HashMap::new(),
            accounts: HashMap::new(),
            pending_orders: HashMap::new(),
            latest_ticks: HashMap::new(),
            order_matcher: OrderMatcher::default(),
            trade_counter: 0,
        }
    }

    /// Registra un contrato de futuros disponible para operar.
    pub fn register_contract(&mut self, contract: FutureContract) {
        self.contracts.insert(contract.symbol.clone(), contract);
    }

    /// Obtiene una referencia a un contrato registrado.
    pub fn get_contract(&self, symbol: &str) -> Option<&FutureContract> {
        self.contracts.get(symbol)
    }

    /// Abre una nueva cuenta de Paper Trading con saldo inicial.
    pub fn create_account(
        &mut self,
        account_id: impl Into<String>,
        initial_cash: f64,
        currency: Currency,
    ) -> &PortfolioManager {
        let id = account_id.into();
        let account = Account::new(id.clone(), initial_cash, currency);
        let pm = PortfolioManager::new(account);
        self.accounts.insert(id.clone(), pm);
        self.accounts.get(&id).unwrap()
    }

    /// Obtiene el estado actual de una cuenta.
    pub fn get_account(&self, account_id: &str) -> Option<&Account> {
        self.accounts.get(account_id).map(|pm| &pm.account)
    }

    /// Obtiene las posiciones de una cuenta.
    pub fn get_positions(&self, account_id: &str) -> Vec<Position> {
        self.accounts
            .get(account_id)
            .map(|pm| pm.positions.values().cloned().collect())
            .unwrap_or_default()
    }

    /// Envía una orden con validación estricta de apalancamiento, margen y Anti Look-Ahead Bias.
    pub fn submit_order(&mut self, mut order: Order) -> Result<String, String> {
        // 1. CERO Look-Ahead Bias: La orden no puede tener timestamp posterior al $T$ actual
        self.temporal_window
            .verify_order(&order)
            .map_err(|e| format!("Rechazo por Look-Ahead Bias: {}", e))?;

        // 2. Validar que el contrato exista
        let contract = self
            .contracts
            .get(&order.symbol)
            .ok_or_else(|| format!("Contrato '{}' no registrado", order.symbol))?
            .clone();

        // 3. Validar apalancamiento permitido según la clase de activo
        LeverageValidator::validate_leverage(contract.asset_class, order.leverage)?;

        // 4. Calcular margen inicial requerido para bloquear
        let ref_price = match order.order_type {
            crate::types::OrderType::Market => {
                if let Some(tick) = self.latest_ticks.get(&order.symbol) {
                    tick.price
                } else {
                    return Err(format!("No hay tick de mercado previo para {}", order.symbol));
                }
            }
            crate::types::OrderType::Limit | crate::types::OrderType::StopLimit => {
                order.price.ok_or("Orden límite requiere precio")?
            }
            crate::types::OrderType::StopLoss => {
                order.stop_price.ok_or("Orden Stop Loss requiere stop_price")?
            }
        };

        let required_margin = MarginCalculator::calculate_initial_margin(
            &contract,
            order.quantity,
            ref_price,
            order.leverage,
        )?;

        // 5. Reservar margen en la cuenta
        let pm = self
            .accounts
            .get_mut(&order.account_id)
            .ok_or_else(|| format!("Cuenta '{}' no encontrada", order.account_id))?;

        pm.account.reserve_margin(required_margin)?;
        order.locked_margin = required_margin;

        let order_id = order.id.clone();

        // 6. Si es orden de mercado y ya tenemos un tick en $t \le T$, intentar ejecutar de inmediato
        if order.order_type == crate::types::OrderType::Market {
            if let Some(latest_tick) = self.latest_ticks.get(&order.symbol).cloned() {
                self.trade_counter += 1;
                let trade_id = format!("tr-{}", self.trade_counter);
                let leverage = order.leverage;
                let margin_mode = order.margin_mode;

                if let Some(mut trade) = self.order_matcher.match_order(
                    &mut order,
                    &latest_tick,
                    &contract,
                    || trade_id.clone(),
                )? {
                    // Liberar el margen bloqueado temporal y transferir a la posición abierta
                    let pm = self.accounts.get_mut(&order.account_id).unwrap();
                    pm.account.release_locked_margin(required_margin);
                    pm.apply_trade(&mut trade, &contract, leverage, margin_mode)?;
                    return Ok(order_id);
                }
            }
        }

        // Si no se ejecutó inmediatamente (o es límite/stop), guardar como pendiente
        self.pending_orders.insert(order_id.clone(), order);
        Ok(order_id)
    }

    /// Cancela una orden activa y libera su margen reservado.
    pub fn cancel_order(&mut self, order_id: &str) -> Result<(), String> {
        let mut order = self
            .pending_orders
            .remove(order_id)
            .ok_or_else(|| format!("Orden '{}' no encontrada o ya ejecutada", order_id))?;

        if let Some(pm) = self.accounts.get_mut(&order.account_id) {
            pm.account.release_locked_margin(order.locked_margin);
        }

        order.status = OrderStatus::Cancelled;
        order.locked_margin = 0.0;
        Ok(())
    }

    /// Procesa un tick de mercado entrante bajo estricto control Anti Look-Ahead Bias ($t \le T$).
    /// 1. Valida $t \le T$ y monotonicidad.
    /// 2. Actualiza el último tick del símbolo.
    /// 3. Empareja órdenes pendientes.
    /// 4. Actualiza Mark-to-Market y liquida posiciones insolventes.
    pub fn process_tick(&mut self, tick: MarketTick) -> Result<TickProcessingResult, LookAheadBiasError> {
        // CERO Look-Ahead Bias: Verificación estricta
        self.temporal_window.verify_tick(&tick)?;

        let symbol = tick.symbol.clone();
        let mut executed_trades = Vec::new();
        let mut liquidations = Vec::new();

        let contract_opt = self.contracts.get(&symbol).cloned();

        if let Some(contract) = contract_opt {
            // Emparejar órdenes pendientes garantizando Price-Time Priority (FIFO)
            let mut symbol_orders: Vec<(String, Order)> = Vec::new();
            let mut remaining_pending = HashMap::new();

            for (id, order) in self.pending_orders.drain() {
                if order.symbol == symbol {
                    symbol_orders.push((id, order));
                } else {
                    remaining_pending.insert(id, order);
                }
            }

            // Prioridad temporal FIFO: procesar órdenes más antiguas primero
            symbol_orders.sort_by_key(|(_, order)| order.created_at);

            let mut trades_to_apply = Vec::new();

            for (id, mut order) in symbol_orders {
                self.trade_counter += 1;
                let trade_id = format!("tr-{}", self.trade_counter);
                let leverage = order.leverage;
                let margin_mode = order.margin_mode;
                let locked_margin = order.locked_margin;

                match self.order_matcher.match_order(&mut order, &tick, &contract, || trade_id.clone()) {
                    Ok(Some(trade)) => {
                        trades_to_apply.push((order.account_id.clone(), trade, leverage, margin_mode, locked_margin));
                    }
                    _ => {
                        if order.is_active() {
                            remaining_pending.insert(id, order);
                        }
                    }
                }
            }

            self.pending_orders = remaining_pending;

            // Aplicar trades a sus respectivas carteras
            for (acc_id, mut trade, leverage, margin_mode, locked_margin) in trades_to_apply {
                if let Some(pm) = self.accounts.get_mut(&acc_id) {
                    pm.account.release_locked_margin(locked_margin);
                    let _ = pm.apply_trade(&mut trade, &contract, leverage, margin_mode);
                    executed_trades.push(trade);
                }
            }

            // Actualizar Mark-to-Market y liquidaciones en todas las cuentas con posiciones en este símbolo
            for pm in self.accounts.values_mut() {
                if pm.positions.contains_key(&symbol) {
                    if let Ok(Some(liq_event)) = pm.on_market_tick(&tick, &contract) {
                        liquidations.push(liq_event);
                    }
                }
            }
        }

        self.latest_ticks.insert(symbol.clone(), tick);

        Ok(TickProcessingResult {
            symbol,
            executed_trades,
            liquidations,
        })
    }
}
