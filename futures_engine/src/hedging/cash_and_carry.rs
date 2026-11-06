use serde::{Deserialize, Serialize};

/// Tipo de oportunidad de arbitraje identificada.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ArbitrageOpportunity {
    /// Cash & Carry tradicional: Comprar contado, Vender futuro.
    CashAndCarry,
    /// Reverse Cash & Carry: Vender corto contado, Comprar futuro.
    ReverseCashAndCarry,
    /// Sin arbitraje rentable tras considerar costos de transacción y financiamiento.
    NoArbitrage,
}

/// Informe de análisis de arbitraje Cash & Carry.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CashAndCarryReport {
    /// Tipo de oportunidad.
    pub opportunity: ArbitrageOpportunity,
    /// Beneficio monetario neto por unidad de activo subyacente.
    pub net_profit_per_unit: f64,
    /// Tasa de rendimiento anualizada neta (puntos porcentuales).
    pub annualized_net_yield_pct: f64,
    /// Costo total de financiamiento y custodia.
    pub total_carrying_cost: f64,
    /// Base bruta de mercado ($F - S$).
    pub gross_basis: f64,
}

/// Evaluador de oportunidades de arbitraje Cash & Carry y Reverse Cash & Carry.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct CashAndCarryArbitrage;

impl CashAndCarryArbitrage {
    /// Analiza la viabilidad económica de ejecutar un arbitraje Cash & Carry:
    ///
    /// Parámetros:
    /// - `spot`: Precio contado ($S$).
    /// - `futures_price`: Precio del contrato de futuros ($F$).
    /// - `borrowing_rate`: Tasa anual de financiamiento/endeudamiento ($r_{borrow}$, ej. 0.08 = 8%).
    /// - `lending_rate`: Tasa anual de colocación libre de riesgo para reverse ($r_{lend}$, ej. 0.05 = 5%).
    /// - `storage_or_custody_cost_per_unit`: Costo de almacenaje/custodia hasta el vencimiento ($c$).
    /// - `transaction_costs_per_unit`: Costos totales de comisiones spot + futuro.
    /// - `days_to_expiry`: Días remanentes al vencimiento.
    pub fn evaluate(
        spot: f64,
        futures_price: f64,
        borrowing_rate: f64,
        lending_rate: f64,
        storage_or_custody_cost_per_unit: f64,
        transaction_costs_per_unit: f64,
        days_to_expiry: f64,
    ) -> Result<CashAndCarryReport, String> {
        if spot <= 0.0 || futures_price <= 0.0 {
            return Err("Precios deben ser estrictamente positivos".to_string());
        }
        if days_to_expiry <= 0.0 {
            return Err("Días al vencimiento deben ser positivos".to_string());
        }

        let t = days_to_expiry / 365.0;
        let gross_basis = futures_price - spot;

        // 1. Evaluación Cash & Carry (Comprar spot, financiarlo, vender futuro)
        let financing_cost_cc = spot * borrowing_rate * t;
        let total_carrying_cost_cc = financing_cost_cc + storage_or_custody_cost_per_unit + transaction_costs_per_unit;
        let net_profit_cc = gross_basis - total_carrying_cost_cc;

        // 2. Evaluación Reverse Cash & Carry (Vender corto spot, colocar fondos, comprar futuro)
        let financing_income_rev = spot * lending_rate * t;
        let total_cost_rev = transaction_costs_per_unit;
        let net_profit_rev = -gross_basis + financing_income_rev - total_cost_rev;

        if net_profit_cc > 0.0 {
            let annualized_yield = (net_profit_cc / spot) * (365.0 / days_to_expiry) * 100.0;
            Ok(CashAndCarryReport {
                opportunity: ArbitrageOpportunity::CashAndCarry,
                net_profit_per_unit: net_profit_cc,
                annualized_net_yield_pct: annualized_yield,
                total_carrying_cost: total_carrying_cost_cc,
                gross_basis,
            })
        } else if net_profit_rev > 0.0 {
            let annualized_yield = (net_profit_rev / spot) * (365.0 / days_to_expiry) * 100.0;
            Ok(CashAndCarryReport {
                opportunity: ArbitrageOpportunity::ReverseCashAndCarry,
                net_profit_per_unit: net_profit_rev,
                annualized_net_yield_pct: annualized_yield,
                total_carrying_cost: total_cost_rev,
                gross_basis,
            })
        } else {
            Ok(CashAndCarryReport {
                opportunity: ArbitrageOpportunity::NoArbitrage,
                net_profit_per_unit: net_profit_cc.max(net_profit_rev),
                annualized_net_yield_pct: 0.0,
                total_carrying_cost: total_carrying_cost_cc,
                gross_basis,
            })
        }
    }
}
