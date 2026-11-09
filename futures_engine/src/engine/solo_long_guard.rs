//! Guardián de Regla Institucional Solo Long y Validación de Órdenes Límite / Parciales
//! Diseñado para la competencia del Club de Finanzas UBA con Cero Look-Ahead Bias ($t \le T$).

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

use crate::models::{Order, Position};
use crate::types::{OrderType, Side};

/// Errores de validación en la política Solo Long
#[derive(Debug, Error, PartialEq, Clone, Serialize, Deserialize)]
pub enum SoloLongViolation {
    #[error("Violación Solo Long: No se permite operar en corto sin tenencia. Activo '{symbol}' no posee posición comprada (LONG).")]
    NoOpenLongPosition { symbol: String },

    #[error("Violación Solo Long: La cantidad a vender ({requested}) supera la tenencia comprada disponible ({available}) para '{symbol}' (Reservadas en órdenes pendientes: {reserved}).")]
    SellQuantityExceedsHolding {
        symbol: String,
        requested: f64,
        available: f64,
        reserved: f64,
    },

    #[error("Violación Temporal Anti Look-Ahead Bias: La orden {order_id} tiene timestamp {order_ts_ms} ms posterior al tiempo actual de mercado {current_ts_ms} ms.")]
    LookAheadTemporalViolation {
        order_id: String,
        order_ts_ms: u64,
        current_ts_ms: u64,
    },

    #[error("Cantidad de orden inválida: {quantity}. Debe ser estrictamente positiva.")]
    InvalidQuantity { quantity: f64 },

    #[error("Precio límite inválido: {price:?}. Debe ser estrictamente positivo.")]
    InvalidLimitPrice { price: Option<f64> },
}

/// Política de control para torneos regulados
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SoloLongGuard {
    /// Indica si las operaciones en corto desnudas están habilitadas en el torneo
    pub allow_short: bool,
}

impl SoloLongGuard {
    /// Crea un nuevo guardián especificando si se permite shorting
    pub fn new(allow_short: bool) -> Self {
        Self { allow_short }
    }

    /// Valida si una orden (Mercado o Límite, total o parcial) cumple con la gobernanza Solo Long
    /// y respeta la causalidad temporal sin Look-Ahead Bias.
    pub fn validate_order(
        &self,
        order: &Order,
        open_positions: &HashMap<String, Position>,
        pending_orders: &[Order],
        current_simulated_time_ms: u64,
    ) -> Result<(), SoloLongViolation> {
        // 1. Cero Look-Ahead Bias: la orden no puede provenir del futuro
        if order.created_at.as_millis() > current_simulated_time_ms {
            return Err(SoloLongViolation::LookAheadTemporalViolation {
                order_id: order.id.clone(),
                order_ts_ms: order.created_at.as_millis(),
                current_ts_ms: current_simulated_time_ms,
            });
        }

        // 2. Validación de cantidad
        if order.quantity <= 0.0 || order.quantity.is_nan() {
            return Err(SoloLongViolation::InvalidQuantity {
                quantity: order.quantity,
            });
        }

        // 3. Si la orden es límite, validar precio
        if order.order_type == OrderType::Limit {
            match order.price {
                Some(p) if p > 0.0 && !p.is_nan() => {}
                other => return Err(SoloLongViolation::InvalidLimitPrice { price: other }),
            }
        }

        // 4. Si Shorting está permitido, no se aplica restricción Solo Long
        if self.allow_short {
            return Ok(());
        }

        // 5. En modo Solo Long, si la orden es de venta (Side::Short):
        if order.side == Side::Short {
            let symbol = &order.symbol;

            // Debe existir una posición comprada (LONG) en ese activo
            let long_pos = open_positions.get(symbol).filter(|p| p.side == Side::Long);
            let owned_qty = match long_pos {
                Some(p) if p.quantity > 0.0 => p.quantity,
                _ => {
                    return Err(SoloLongViolation::NoOpenLongPosition {
                        symbol: symbol.clone(),
                    });
                }
            };

            // Calcular unidades comprometidas en otras órdenes de venta pendientes
            let reserved_qty: f64 = pending_orders
                .iter()
                .filter(|o| o.symbol == *symbol && o.side == Side::Short && o.id != order.id)
                .map(|o| o.remaining_quantity())
                .sum();

            let available_qty = (owned_qty - reserved_qty).max(0.0);

            // Se permite venta parcial o total siempre que no exceda lo disponible
            if order.quantity > available_qty + 1e-9 {
                return Err(SoloLongViolation::SellQuantityExceedsHolding {
                    symbol: symbol.clone(),
                    requested: order.quantity,
                    available: available_qty,
                    reserved: reserved_qty,
                });
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{MarginMode, StrictTimestamp};

    #[test]
    fn test_solo_long_allows_buy() {
        let guard = SoloLongGuard::new(false);
        let positions = HashMap::new();
        let pending = Vec::new();

        let buy_order = Order::new(
            "ord_buy_1",
            "grupo_alpha",
            "BTC-USD",
            Side::Long,
            OrderType::Limit,
            1.5,
            Some(60000.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();

        assert!(guard
            .validate_order(&buy_order, &positions, &pending, 1000)
            .is_ok());
    }

    #[test]
    fn test_solo_long_rejects_sell_without_holding() {
        let guard = SoloLongGuard::new(false);
        let positions = HashMap::new();
        let pending = Vec::new();

        let sell_order = Order::new(
            "ord_sell_1",
            "grupo_alpha",
            "BTC-USD",
            Side::Short,
            OrderType::Limit,
            1.0,
            Some(70000.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();

        let err = guard
            .validate_order(&sell_order, &positions, &pending, 1000)
            .unwrap_err();
        assert_eq!(
            err,
            SoloLongViolation::NoOpenLongPosition {
                symbol: "BTC-USD".to_string()
            }
        );
    }

    #[test]
    fn test_solo_long_allows_partial_and_total_sell() {
        let guard = SoloLongGuard::new(false);
        let mut positions = HashMap::new();
        let pending = Vec::new();

        let pos = Position::new(
            "pos_1",
            "grupo_alpha",
            "BTC-USD",
            Side::Long,
            10.0, // Posee 10 unidades compradas
            60000.0,
            1.0,
            MarginMode::Isolated,
            60000.0,
            0.0,
            0.0,
            1.0,
            0.03,
            StrictTimestamp::from_millis(900),
        );
        positions.insert("BTC-USD".to_string(), pos);

        // 1. Venta parcial: Vender 4 de las 10 unidades
        let partial_sell = Order::new(
            "ord_sell_part",
            "grupo_alpha",
            "BTC-USD",
            Side::Short,
            OrderType::Limit,
            4.0,
            Some(65000.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();
        assert!(guard
            .validate_order(&partial_sell, &positions, &pending, 1000)
            .is_ok());

        // 2. Venta total: Vender las 10 unidades completas
        let total_sell = Order::new(
            "ord_sell_full",
            "grupo_alpha",
            "BTC-USD",
            Side::Short,
            OrderType::Limit,
            10.0,
            Some(65000.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();
        assert!(guard
            .validate_order(&total_sell, &positions, &pending, 1000)
            .is_ok());

        // 3. Venta excesiva: Intentar vender 12 cuando se poseen 10
        let excess_sell = Order::new(
            "ord_sell_excess",
            "grupo_alpha",
            "BTC-USD",
            Side::Short,
            OrderType::Limit,
            12.0,
            Some(65000.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();
        let err = guard
            .validate_order(&excess_sell, &positions, &pending, 1000)
            .unwrap_err();
        assert_eq!(
            err,
            SoloLongViolation::SellQuantityExceedsHolding {
                symbol: "BTC-USD".to_string(),
                requested: 12.0,
                available: 10.0,
                reserved: 0.0,
            }
        );
    }

    #[test]
    fn test_solo_long_respects_reserved_pending_orders() {
        let guard = SoloLongGuard::new(false);
        let mut positions = HashMap::new();

        let pos = Position::new(
            "pos_1",
            "grupo_alpha",
            "AAPL",
            Side::Long,
            10.0, // Tenencia: 10 acciones
            150.0,
            1.0,
            MarginMode::Isolated,
            1500.0,
            0.0,
            0.0,
            1.0,
            0.03,
            StrictTimestamp::from_millis(900),
        );
        positions.insert("AAPL".to_string(), pos);

        // Ya hay una orden pendiente de venta límite por 6 acciones
        let pending = vec![Order::new(
            "ord_pending_1",
            "grupo_alpha",
            "AAPL",
            Side::Short,
            OrderType::Limit,
            6.0,
            Some(180.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(950),
        )
        .unwrap()];

        // Intento 1: Vender 4 acciones -> Disponible = 10 - 6 = 4 -> OK!
        let valid_second_order = Order::new(
            "ord_valid_2",
            "grupo_alpha",
            "AAPL",
            Side::Short,
            OrderType::Limit,
            4.0,
            Some(190.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();
        assert!(guard
            .validate_order(&valid_second_order, &positions, &pending, 1000)
            .is_ok());

        // Intento 2: Vender 5 acciones -> 5 > 4 disponible -> RECHAZADO!
        let invalid_second_order = Order::new(
            "ord_invalid_2",
            "grupo_alpha",
            "AAPL",
            Side::Short,
            OrderType::Limit,
            5.0,
            Some(190.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1000),
        )
        .unwrap();
        let err = guard
            .validate_order(&invalid_second_order, &positions, &pending, 1000)
            .unwrap_err();
        assert_eq!(
            err,
            SoloLongViolation::SellQuantityExceedsHolding {
                symbol: "AAPL".to_string(),
                requested: 5.0,
                available: 4.0,
                reserved: 6.0,
            }
        );
    }

    #[test]
    fn test_strict_anti_lookahead_bias_rejection() {
        let guard = SoloLongGuard::new(false);
        let positions = HashMap::new();
        let pending = Vec::new();

        // Orden con timestamp 1500 ms cuando el mercado está en 1000 ms
        let future_order = Order::new(
            "ord_future",
            "grupo_alpha",
            "BTC-USD",
            Side::Long,
            OrderType::Limit,
            1.0,
            Some(50000.0),
            None,
            1.0,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(1500),
        )
        .unwrap();

        let err = guard
            .validate_order(&future_order, &positions, &pending, 1000)
            .unwrap_err();
        assert_eq!(
            err,
            SoloLongViolation::LookAheadTemporalViolation {
                order_id: "ord_future".to_string(),
                order_ts_ms: 1500,
                current_ts_ms: 1000,
            }
        );
    }
}
