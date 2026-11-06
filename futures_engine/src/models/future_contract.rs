use serde::{Deserialize, Serialize};
use crate::types::{AssetClass, ContractType, Currency, StrictTimestamp};

/// Definición y especificaciones contractuales de un contrato de futuros.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FutureContract {
    /// Símbolo del contrato (ej. "DLR/NOV26", "WTI/DEC26", "SPX/DEC26").
    pub symbol: String,
    /// Tipo de contrato (Estándar, Perpetuo, Con Entrega, Por Diferencias).
    pub contract_type: ContractType,
    /// Clase de activo (Divisas, Materias Primas, Índices, Cripto).
    pub asset_class: AssetClass,
    /// Multiplicador o tamaño de contrato (ej. 1000 para Dólar Rofex, 100 para Oro, 1 para Cripto).
    pub multiplier: f64,
    /// Mínimo cambio de precio permitido (tick size, ej. 0.05 o 0.01).
    pub tick_size: f64,
    /// Fecha y hora de vencimiento (None para perpetuos).
    pub expiry_timestamp: Option<StrictTimestamp>,
    /// Tasa de margen inicial requerido (ej. 0.05 para 20x, 0.10 para 10x).
    pub initial_margin_rate: f64,
    /// Tasa de margen de mantenimiento mínimo antes de liquidación (ej. 0.03 = 3%).
    pub maintenance_margin_rate: f64,
    /// Moneda de liquidación de PnL y colateral.
    pub settlement_currency: Currency,
}

impl FutureContract {
    /// Crea un nuevo contrato de futuros con especificaciones completas.
    pub fn new(
        symbol: impl Into<String>,
        contract_type: ContractType,
        asset_class: AssetClass,
        multiplier: f64,
        tick_size: f64,
        expiry_timestamp: Option<StrictTimestamp>,
        initial_margin_rate: f64,
        maintenance_margin_rate: f64,
        settlement_currency: Currency,
    ) -> Self {
        Self {
            symbol: symbol.into(),
            contract_type,
            asset_class,
            multiplier,
            tick_size,
            expiry_timestamp,
            initial_margin_rate,
            maintenance_margin_rate,
            settlement_currency,
        }
    }

    /// Redondea un precio propuesto al tick size exacto del contrato.
    pub fn round_to_tick(&self, price: f64) -> f64 {
        if self.tick_size <= 0.0 {
            return price;
        }
        (price / self.tick_size).round() * self.tick_size
    }

    /// Verifica si el contrato ya ha vencido con respecto al instante simulado $T$.
    pub fn is_expired(&self, current_time: StrictTimestamp) -> bool {
        if let Some(expiry) = self.expiry_timestamp {
            current_time.as_millis() >= expiry.as_millis()
        } else {
            false
        }
    }

    /// Calcula el valor nocional de una cantidad dada a un precio determinado:
    /// Nocional = Cantidad * Precio * Multiplicador
    pub fn calculate_notional(&self, quantity: f64, price: f64) -> f64 {
        quantity.abs() * price * self.multiplier
    }
}
