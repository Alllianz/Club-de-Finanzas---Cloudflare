use serde::{Deserialize, Serialize};

/// Moneda de liquidación o denominación de la cuenta / contrato.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Currency {
    /// Dólares Estadounidenses.
    USD,
    /// Pesos Argentinos (común en Matba Rofex DLR).
    ARS,
    /// Tether / Stablecoins USD.
    USDT,
    /// Euros.
    EUR,
}
