use serde::{Deserialize, Serialize};
use crate::models::{FutureContract, MarketTick, Order, OrderStatus, Trade};
use crate::risk::PnlCalculator;
use crate::types::{OrderType, Side};

/// Motor de emparejamiento y ejecución de órdenes de futuros contra ticks de mercado.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderMatcher {
    /// Tasa de comisión de ejecución (ej. 0.0005 = 5 bps).
    pub fee_rate: f64,
}

impl Default for OrderMatcher {
    fn default() -> Self {
        Self { fee_rate: 0.0005 }
    }
}

impl OrderMatcher {
    /// Crea un nuevo motor de emparejamiento con comisión personalizada.
    pub fn new(fee_rate: f64) -> Self {
        Self { fee_rate }
    }

    /// Intenta emparejar y ejecutar una orden contra un tick de mercado respetando Anti Look-Ahead Bias.
    pub fn match_order(
        &self,
        order: &mut Order,
        tick: &MarketTick,
        contract: &FutureContract,
        trade_id_generator: impl Fn() -> String,
    ) -> Result<Option<Trade>, String> {
        if !order.is_active() {
            return Ok(None);
        }

        if order.symbol != tick.symbol {
            return Err(format!(
                "Símbolo discordante: orden '{}' vs tick '{}'",
                order.symbol, tick.symbol
            ));
        }

        // CERO Look-Ahead Bias: La orden no puede haber sido creada después del tick que la ejecuta
        if order.created_at > tick.timestamp {
            return Err(format!(
                "Violación de causalidad temporal: orden creada en {} ms posterior a tick en {} ms",
                order.created_at.as_millis(),
                tick.timestamp.as_millis()
            ));
        }

        let remaining_qty = order.remaining_quantity();
        if remaining_qty <= 0.0 {
            order.status = OrderStatus::Filled;
            return Ok(None);
        }

        let fill_price = match order.order_type {
            OrderType::Market => {
                // Mercado: toma el precio ask para compras o bid para ventas si existen, o last price
                match order.side {
                    Side::Long => tick.ask.unwrap_or(tick.price),
                    Side::Short => tick.bid.unwrap_or(tick.price),
                }
            }
            OrderType::Limit => {
                let limit_p = order.price.ok_or("Orden límite sin precio especificado")?;
                match order.side {
                    Side::Long => {
                        // Compra límite se llena si el precio de mercado es menor o igual al límite
                        if tick.price <= limit_p {
                            tick.price.min(limit_p)
                        } else {
                            return Ok(None);
                        }
                    }
                    Side::Short => {
                        // Venta límite se llena si el precio de mercado es mayor o igual al límite
                        if tick.price >= limit_p {
                            tick.price.max(limit_p)
                        } else {
                            return Ok(None);
                        }
                    }
                }
            }
            OrderType::StopLoss => {
                let stop_p = order.stop_price.ok_or("Orden Stop Loss sin stop_price")?;
                match order.side {
                    Side::Long => {
                        // Compra stop (cubrir corto o compra por ruptura): se activa si tick.price >= stop_p
                        if tick.price >= stop_p {
                            tick.ask.unwrap_or(tick.price)
                        } else {
                            return Ok(None);
                        }
                    }
                    Side::Short => {
                        // Venta stop (stop loss de protección long o venta por ruptura): se activa si tick.price <= stop_p
                        if tick.price <= stop_p {
                            tick.bid.unwrap_or(tick.price)
                        } else {
                            return Ok(None);
                        }
                    }
                }
            }
            OrderType::StopLimit => {
                let stop_p = order.stop_price.ok_or("Orden Stop Limit sin stop_price")?;
                let limit_p = order.price.ok_or("Orden Stop Limit sin price")?;
                let triggered = match order.side {
                    Side::Long => tick.price >= stop_p,
                    Side::Short => tick.price <= stop_p,
                };
                if !triggered {
                    return Ok(None);
                }
                match order.side {
                    Side::Long => {
                        if tick.price <= limit_p {
                            tick.price.min(limit_p)
                        } else {
                            return Ok(None);
                        }
                    }
                    Side::Short => {
                        if tick.price >= limit_p {
                            tick.price.max(limit_p)
                        } else {
                            return Ok(None);
                        }
                    }
                }
            }
        };

        let execution_price = contract.round_to_tick(fill_price);
        let executed_qty = remaining_qty; // Simulación de fill completo del remanente en Paper Trading

        let commission = PnlCalculator::calculate_commission(contract, executed_qty, execution_price, self.fee_rate);

        // Actualizar estadísticas de la orden
        let prev_cost = order.filled_quantity * order.average_fill_price;
        let new_cost = prev_cost + (executed_qty * execution_price);
        order.filled_quantity += executed_qty;
        order.average_fill_price = new_cost / order.filled_quantity;
        order.status = OrderStatus::Filled;
        order.updated_at = tick.timestamp;

        let trade = Trade::new(
            trade_id_generator(),
            &order.id,
            &order.account_id,
            &order.symbol,
            order.side,
            execution_price,
            executed_qty,
            commission,
            0.0, // PnL realizado será calculado al integrarse en la posición
            tick.timestamp,
        );

        Ok(Some(trade))
    }
}
