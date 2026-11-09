//! Módulo de Dimensionamiento de Órdenes y Posiciones (Position Sizer)
//! Permite calcular con precisión matemática la cantidad de contratos o unidades
//! a partir de un monto objetivo a invertir en dólares ($ USD), tanto para
//! el portafolio spot como para contratos de derivados y futuros con apalancamiento.
//!
//! Cero Look-Ahead Bias: Opera únicamente sobre precios y saldos conocidos al instante t <= T.

use serde::{Deserialize, Serialize};

/// Modo de especificación de la orden
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum OrderSizingMode {
    /// Invertir por cantidad fija de contratos o unidades
    UnitsOrContracts,
    /// Invertir por monto total nominal en dólares ($ USD)
    NominalDollarsUsd,
}

/// Parámetros de entrada para el dimensionamiento en dólares
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PositionSizingInput {
    /// Monto objetivo a invertir en dólares ($ USD)
    pub amount_usd: f64,
    /// Precio vigente del activo o precio límite
    pub price: f64,
    /// Nivel de apalancamiento (1 a 100)
    pub leverage: f64,
    /// Efectivo disponible en cuenta
    pub available_cash: f64,
    /// Multiplicador de contrato opcional (por defecto 1.0)
    pub contract_multiplier: Option<f64>,
}

/// Resultado del dimensionamiento de la posición
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PositionSizingResult {
    /// Cantidad exacta de contratos o unidades a comprar/vender
    pub quantity: f64,
    /// Valor nocional total de la posición ($ USD)
    pub notional_usd: f64,
    /// Margen de garantía requerido ($ USD)
    pub initial_margin_usd: f64,
    /// Comisión estimada en base a nocional y reglas de activo
    pub estimated_fee_usd: f64,
    /// Efectivo total consumido (margen + comisiones)
    pub total_cash_required_usd: f64,
    /// Si el saldo disponible es suficiente para cubrir la orden
    pub is_affordable: bool,
}

/// Motor de dimensionamiento financiero
pub struct PositionSizer;

impl PositionSizer {
    /// Calcula la cantidad de contratos a partir de una inversión en dólares.
    ///
    /// # Fórmula:
    /// `nocional = amount_usd`
    /// `cantidad = amount_usd / (precio * multiplicador)`
    /// `margen = nocional / leverage`
    pub fn size_from_dollars(input: PositionSizingInput) -> Result<PositionSizingResult, String> {
        if input.amount_usd <= 0.0 {
            return Err("El monto en dólares a invertir debe ser estrictamente mayor a 0.".to_string());
        }
        if input.price <= 0.0 {
            return Err("El precio del activo debe ser estrictamente mayor a 0.".to_string());
        }

        let leverage = input.leverage.clamp(1.0, 100.0);
        let multiplier = input.contract_multiplier.unwrap_or(1.0).max(1e-6);

        // Cantidad de contratos / unidades correspondientes a ese monto USD
        let quantity = input.amount_usd / (input.price * multiplier);
        let notional_usd = quantity * input.price * multiplier;
        let initial_margin_usd = notional_usd / leverage;

        // Estimación estándar de comisiones (piso de $1.00 USD, 0.05% cripto/derivados)
        let estimated_fee_usd = (notional_usd * 0.0005).max(1.0);
        let total_cash_required_usd = initial_margin_usd + estimated_fee_usd;
        let is_affordable = total_cash_required_usd <= (input.available_cash + 1e-6);

        Ok(PositionSizingResult {
            quantity,
            notional_usd,
            initial_margin_usd,
            estimated_fee_usd,
            total_cash_required_usd,
            is_affordable,
        })
    }

    /// Calcula el equivalente en dólares ($ USD) a partir de una cantidad de contratos.
    pub fn dollars_from_quantity(
        quantity: f64,
        price: f64,
        leverage: f64,
        available_cash: f64,
        contract_multiplier: Option<f64>,
    ) -> Result<PositionSizingResult, String> {
        if quantity <= 0.0 {
            return Err("La cantidad de contratos debe ser mayor a 0.".to_string());
        }
        if price <= 0.0 {
            return Err("El precio debe ser mayor a 0.".to_string());
        }

        let leverage = leverage.clamp(1.0, 100.0);
        let multiplier = contract_multiplier.unwrap_or(1.0).max(1e-6);
        let notional_usd = quantity * price * multiplier;
        let initial_margin_usd = notional_usd / leverage;
        let estimated_fee_usd = (notional_usd * 0.0005).max(1.0);
        let total_cash_required_usd = initial_margin_usd + estimated_fee_usd;
        let is_affordable = total_cash_required_usd <= (available_cash + 1e-6);

        Ok(PositionSizingResult {
            quantity,
            notional_usd,
            initial_margin_usd,
            estimated_fee_usd,
            total_cash_required_usd,
            is_affordable,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_size_from_dollars_spot_portfolio() {
        // Invertir $1,000 USD en una acción que vale $200 USD sin apalancamiento (1x)
        let input = PositionSizingInput {
            amount_usd: 1000.0,
            price: 200.0,
            leverage: 1.0,
            available_cash: 5000.0,
            contract_multiplier: None,
        };

        let res = PositionSizer::size_from_dollars(input).unwrap();
        assert_eq!(res.quantity, 5.0);
        assert_eq!(res.notional_usd, 1000.0);
        assert_eq!(res.initial_margin_usd, 1000.0);
        assert!(res.is_affordable);
    }

    #[test]
    fn test_size_from_dollars_leveraged_futures() {
        // Invertir $10,000 USD de nocional en BTC a $50,000 con 10x de apalancamiento
        let input = PositionSizingInput {
            amount_usd: 10000.0,
            price: 50000.0,
            leverage: 10.0,
            available_cash: 2000.0,
            contract_multiplier: Some(1.0),
        };

        let res = PositionSizer::size_from_dollars(input).unwrap();
        // 10,000 / 50,000 = 0.20 BTC contratos
        assert_eq!(res.quantity, 0.20);
        assert_eq!(res.notional_usd, 10000.0);
        // Margen requerido: 10,000 / 10 = 1,000 USD
        assert_eq!(res.initial_margin_usd, 1000.0);
        assert!(res.is_affordable);
    }

    #[test]
    fn test_unaffordable_order_flagged() {
        let input = PositionSizingInput {
            amount_usd: 20000.0,
            price: 100.0,
            leverage: 1.0,
            available_cash: 5000.0, // Insuficiente para $20,000
            contract_multiplier: None,
        };

        let res = PositionSizer::size_from_dollars(input).unwrap();
        assert!(!res.is_affordable);
    }
}
