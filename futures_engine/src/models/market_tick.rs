use serde::{Deserialize, Serialize};
use crate::types::StrictTimestamp;

/// Tick inmutable de mercado para futuros.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketTick {
    /// Símbolo del contrato cotizado.
    pub symbol: String,
    /// Último precio operado (Last Price).
    pub price: f64,
    /// Mejor oferta compradora (Best Bid).
    pub bid: Option<f64>,
    /// Mejor oferta vendedora (Best Ask).
    pub ask: Option<f64>,
    /// Volumen operado en el tick.
    pub volume: f64,
    /// Timestamp estricto del tick ($t \le T$).
    pub timestamp: StrictTimestamp,
}

impl MarketTick {
    /// Construye un nuevo tick de mercado con validación de precios no negativos.
    pub fn new(
        symbol: impl Into<String>,
        price: f64,
        bid: Option<f64>,
        ask: Option<f64>,
        volume: f64,
        timestamp: StrictTimestamp,
    ) -> Result<Self, String> {
        if price <= 0.0 {
            return Err("El precio del tick de mercado debe ser estrictamente positivo".to_string());
        }
        if volume < 0.0 {
            return Err("El volumen del tick de mercado no puede ser negativo".to_string());
        }
        Ok(Self {
            symbol: symbol.into(),
            price,
            bid,
            ask,
            volume,
            timestamp,
        })
    }

    /// Retorna el precio medio entre Bid y Ask si ambos están presentes, o el último precio operado.
    pub fn mid_price(&self) -> f64 {
        match (self.bid, self.ask) {
            (Some(b), Some(a)) => (b + a) / 2.0,
            _ => self.price,
        }
    }
}
