use serde::{Deserialize, Serialize};

/// Clase de activo subyacente para el contrato de futuros.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AssetClass {
    /// Divisas / Tipo de Cambio (ej. DLR Matba Rofex, EUR/USD).
    CurrencyFx,
    /// Materias Primas / Commodities (ej. Petróleo WTI, Oro, Soja, Maíz, Trigo).
    Commodity,
    /// Índices bursátiles (ej. S&P 500, Nasdaq 100, S&P Merval).
    Index,
    /// Criptoactivos (ej. BTC, ETH).
    Crypto,
}

impl AssetClass {
    /// Devuelve el apalancamiento máximo permitido por regulación o gestión de riesgo institucional.
    pub fn default_max_leverage(&self) -> f64 {
        match self {
            AssetClass::CurrencyFx => 20.0,
            AssetClass::Index => 20.0,
            AssetClass::Commodity => 10.0,
            AssetClass::Crypto => 5.0,
        }
    }
}
