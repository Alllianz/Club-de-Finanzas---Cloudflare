use serde::{Deserialize, Serialize};

/// Tipo de contrato de futuros.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ContractType {
    /// Contrato financiero estándar con fecha de vencimiento determinada.
    StandardExpiry,
    /// Contrato perpetuo (sin vencimiento) con financiamiento periódico (funding rate).
    Perpetual,
    /// Contrato con entrega física del subyacente al vencimiento (ej. granos, metales).
    PhysicalDelivery,
    /// Contrato con liquidación financiera por diferencias (Cash Settled, ej. Matba Rofex DLR).
    CashSettled,
}
