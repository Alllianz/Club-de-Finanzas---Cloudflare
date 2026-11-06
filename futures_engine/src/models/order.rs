use serde::{Deserialize, Serialize};
use crate::types::{MarginMode, OrderType, Side, StrictTimestamp};

/// Estado del ciclo de vida de una orden.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum OrderStatus {
    /// Orden creada y pendiente de ejecución.
    New,
    /// Orden ejecutada parcialmente.
    PartiallyFilled,
    /// Orden completamente ejecutada.
    Filled,
    /// Orden cancelada por el usuario o por el sistema.
    Cancelled,
    /// Orden rechazada por falta de margen, lookahead o validación.
    Rejected,
}

/// Estructura de una orden de futuros para Paper Trading.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    /// Identificador único de la orden.
    pub id: String,
    /// Cuenta a la que pertenece la orden.
    pub account_id: String,
    /// Símbolo del contrato.
    pub symbol: String,
    /// Lado de la orden (Long / Short).
    pub side: Side,
    /// Tipo de orden (Market, Limit, StopLoss, StopLimit).
    pub order_type: OrderType,
    /// Cantidad de contratos.
    pub quantity: f64,
    /// Precio límite (requerido para Limit y StopLimit).
    pub price: Option<f64>,
    /// Precio de activación stop (requerido para StopLoss y StopLimit).
    pub stop_price: Option<f64>,
    /// Nivel de apalancamiento solicitado (ej. 1.0 a 20.0).
    pub leverage: f64,
    /// Modalidad de margen (Isolated o Cross).
    pub margin_mode: MarginMode,
    /// Margen retenido de la cuenta mientras la orden esté pendiente.
    pub locked_margin: f64,
    /// Estado actual de la orden.
    pub status: OrderStatus,
    /// Cantidad acumulada ya ejecutada.
    pub filled_quantity: f64,
    /// Precio promedio ponderado de ejecución.
    pub average_fill_price: f64,
    /// Timestamp de creación de la orden.
    pub created_at: StrictTimestamp,
    /// Timestamp de última actualización.
    pub updated_at: StrictTimestamp,
}

impl Order {
    /// Crea una nueva orden validando sus parámetros fundamentales.
    pub fn new(
        id: impl Into<String>,
        account_id: impl Into<String>,
        symbol: impl Into<String>,
        side: Side,
        order_type: OrderType,
        quantity: f64,
        price: Option<f64>,
        stop_price: Option<f64>,
        leverage: f64,
        margin_mode: MarginMode,
        timestamp: StrictTimestamp,
    ) -> Result<Self, String> {
        if quantity <= 0.0 {
            return Err("La cantidad de la orden debe ser estrictamente positiva".to_string());
        }
        if leverage < 1.0 {
            return Err("El apalancamiento debe ser al menos 1.0x".to_string());
        }

        match order_type {
            OrderType::Limit => {
                if price.is_none() || price.unwrap() <= 0.0 {
                    return Err("Las órdenes Límite requieren un precio límite positivo".to_string());
                }
            }
            OrderType::StopLoss => {
                if stop_price.is_none() || stop_price.unwrap() <= 0.0 {
                    return Err("Las órdenes Stop Loss requieren un precio stop positivo".to_string());
                }
            }
            OrderType::StopLimit => {
                if price.is_none() || price.unwrap() <= 0.0 {
                    return Err("Las órdenes Stop Límite requieren un precio límite positivo".to_string());
                }
                if stop_price.is_none() || stop_price.unwrap() <= 0.0 {
                    return Err("Las órdenes Stop Límite requieren un precio stop positivo".to_string());
                }
            }
            OrderType::Market => {}
        }

        Ok(Self {
            id: id.into(),
            account_id: account_id.into(),
            symbol: symbol.into(),
            side,
            order_type,
            quantity,
            price,
            stop_price,
            leverage,
            margin_mode,
            locked_margin: 0.0,
            status: OrderStatus::New,
            filled_quantity: 0.0,
            average_fill_price: 0.0,
            created_at: timestamp,
            updated_at: timestamp,
        })
    }

    /// Retorna la cantidad remanente por ejecutar.
    pub fn remaining_quantity(&self) -> f64 {
        (self.quantity - self.filled_quantity).max(0.0)
    }

    /// Comprueba si la orden aún está activa y puede recibir fills.
    pub fn is_active(&self) -> bool {
        matches!(self.status, OrderStatus::New | OrderStatus::PartiallyFilled)
    }
}
