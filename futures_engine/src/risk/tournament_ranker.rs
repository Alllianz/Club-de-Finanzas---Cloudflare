//! Módulo de Ranking y Scoring Competitivo
//! Implementa las reglas oficiales de torneo para el Club de Finanzas UBA:
//! 1. Competencia de Portafolio:
//!    Score = (Capital Total - Capital Inicial) / Maximo Drawdown Nominal
//!    (Basado en la fórmula institucional de Sylva / Astro EVO).
//! 2. Competencia de Futuros:
//!    Score = Capital Total (El equipo con mayor patrimonio acumulado gana).
//!
//! Cero Look-Ahead Bias: Todos los cálculos operan estrictamente sobre estados t <= T.

use serde::{Deserialize, Serialize};

/// Criterio de ordenación y jerarquía del torneo
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum TournamentRankingRule {
    /// Portafolio: Ratio de Calmar Nominal = (Capital Total - Capital Inicial) / Max Drawdown
    PortfolioReturnOverMaxDd,
    /// Futuros: Mayor Capital Total (Patrimonio neto / Equity)
    FuturesMaxTotalCapital,
}

impl Default for TournamentRankingRule {
    fn default() -> Self {
        Self::PortfolioReturnOverMaxDd
    }
}

/// Datos de entrada de un competidor para ser clasificado
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompetitorScoreInput {
    pub group_id: String,
    pub group_name: Option<String>,
    pub total_capital: f64,
    pub initial_capital: f64,
    pub max_drawdown_nominal: f64,
}

/// Resultado de puntuación y ranking asignado a un competidor
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RankedCompetitor {
    pub rank: usize,
    pub group_id: String,
    pub group_name: String,
    pub total_capital: f64,
    pub initial_capital: f64,
    pub net_profit: f64,
    pub max_drawdown_nominal: f64,
    pub score: f64,
    pub rule: TournamentRankingRule,
}

/// Evaluador cuantitativo de torneos
pub struct TournamentRanker;

impl TournamentRanker {
    /// Calcula el puntaje individual de un competidor según la regla de la competencia.
    ///
    /// # Portafolio:
    /// - `Score = (total_capital - initial_capital) / max_drawdown_nominal`
    /// - Si `max_drawdown_nominal == 0`:
    ///   - Si `net_profit > 0`: Asigna `999.0 + net_profit` (premio máximo al retorno con 0 caída, estándar Sylva).
    ///   - Si `net_profit <= 0`: Asigna `0.0`.
    ///
    /// # Futuros:
    /// - `Score = total_capital` (patrimonio total absoluto).
    pub fn calculate_score(
        rule: TournamentRankingRule,
        total_capital: f64,
        initial_capital: f64,
        max_drawdown_nominal: f64,
    ) -> f64 {
        match rule {
            TournamentRankingRule::PortfolioReturnOverMaxDd => {
                let net_profit = total_capital - initial_capital;
                let dd = max_drawdown_nominal.max(0.0);

                if dd > 1e-9 {
                    net_profit / dd
                } else if net_profit > 1e-9 {
                    // Cero drawdown y ganancia positiva: retorno infinito/máximo
                    999.0 + net_profit
                } else {
                    0.0
                }
            }
            TournamentRankingRule::FuturesMaxTotalCapital => total_capital,
        }
    }

    /// Clasifica una lista de competidores y les asigna sus puestos (rank 1, 2, ...).
    /// - Para Portafolio: Ordena por score descendente. Ante empate de score, desempata por total_capital descendente.
    /// - Para Futuros: Ordena directamente por total_capital descendente.
    pub fn rank_competitors(
        rule: TournamentRankingRule,
        competitors: Vec<CompetitorScoreInput>,
    ) -> Vec<RankedCompetitor> {
        let mut ranked: Vec<RankedCompetitor> = competitors
            .into_iter()
            .map(|c| {
                let score = Self::calculate_score(
                    rule,
                    c.total_capital,
                    c.initial_capital,
                    c.max_drawdown_nominal,
                );
                let net_profit = c.total_capital - c.initial_capital;
                let group_name = c.group_name.unwrap_or_else(|| c.group_id.clone());

                RankedCompetitor {
                    rank: 0,
                    group_id: c.group_id,
                    group_name,
                    total_capital: c.total_capital,
                    initial_capital: c.initial_capital,
                    net_profit,
                    max_drawdown_nominal: c.max_drawdown_nominal,
                    score,
                    rule,
                }
            })
            .collect();

        match rule {
            TournamentRankingRule::PortfolioReturnOverMaxDd => {
                ranked.sort_by(|a, b| {
                    b.score
                        .partial_cmp(&a.score)
                        .unwrap_or(std::cmp::Ordering::Equal)
                        .then_with(|| {
                            b.total_capital
                                .partial_cmp(&a.total_capital)
                                .unwrap_or(std::cmp::Ordering::Equal)
                        })
                });
            }
            TournamentRankingRule::FuturesMaxTotalCapital => {
                ranked.sort_by(|a, b| {
                    b.total_capital
                        .partial_cmp(&a.total_capital)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
            }
        }

        for (idx, item) in ranked.iter_mut().enumerate() {
            item.rank = idx + 1;
        }

        ranked
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_portfolio_ranking_prioritizes_drawdown_efficiency() {
        // Grupo A: Ganó $2,000 con solo $200 de DD -> Score = 2000 / 200 = 10.0
        let a = CompetitorScoreInput {
            group_id: "grupo_1".to_string(),
            group_name: Some("Equipo Eficiente".to_string()),
            total_capital: 12000.0,
            initial_capital: 10000.0,
            max_drawdown_nominal: 200.0,
        };

        // Grupo B: Ganó $5,000 pero sufrió $2,500 de DD -> Score = 5000 / 2500 = 2.0
        let b = CompetitorScoreInput {
            group_id: "grupo_2".to_string(),
            group_name: Some("Equipo Volátil".to_string()),
            total_capital: 15000.0,
            initial_capital: 10000.0,
            max_drawdown_nominal: 2500.0,
        };

        let ranked_portfolio = TournamentRanker::rank_competitors(
            TournamentRankingRule::PortfolioReturnOverMaxDd,
            vec![a.clone(), b.clone()],
        );

        // En Portafolio: Grupo A debe salir en 1° puesto (rank 1) por mejor ratio
        assert_eq!(ranked_portfolio[0].group_id, "grupo_1");
        assert_eq!(ranked_portfolio[0].rank, 1);
        assert!((ranked_portfolio[0].score - 10.0).abs() < 1e-4);

        assert_eq!(ranked_portfolio[1].group_id, "grupo_2");
        assert_eq!(ranked_portfolio[1].rank, 2);
        assert!((ranked_portfolio[1].score - 2.0).abs() < 1e-4);
    }

    #[test]
    fn test_futures_ranking_prioritizes_highest_capital() {
        // Mismos competidores que arriba
        let a = CompetitorScoreInput {
            group_id: "grupo_1".to_string(),
            group_name: Some("Equipo Eficiente".to_string()),
            total_capital: 12000.0,
            initial_capital: 10000.0,
            max_drawdown_nominal: 200.0,
        };

        let b = CompetitorScoreInput {
            group_id: "grupo_2".to_string(),
            group_name: Some("Equipo Volátil".to_string()),
            total_capital: 15000.0,
            initial_capital: 10000.0,
            max_drawdown_nominal: 2500.0,
        };

        let ranked_futures = TournamentRanker::rank_competitors(
            TournamentRankingRule::FuturesMaxTotalCapital,
            vec![a, b],
        );

        // En Futuros: Grupo B debe ser el 1° puesto porque hizo más capital ($15,000 > $12,000)
        assert_eq!(ranked_futures[0].group_id, "grupo_2");
        assert_eq!(ranked_futures[0].rank, 1);
        assert_eq!(ranked_futures[0].total_capital, 15000.0);

        assert_eq!(ranked_futures[1].group_id, "grupo_1");
        assert_eq!(ranked_futures[1].rank, 2);
    }

    #[test]
    fn test_zero_drawdown_handling_sylva_standard() {
        let input = CompetitorScoreInput {
            group_id: "grupo_perfecto".to_string(),
            group_name: None,
            total_capital: 11000.0,
            initial_capital: 10000.0,
            max_drawdown_nominal: 0.0,
        };

        let score = TournamentRanker::calculate_score(
            TournamentRankingRule::PortfolioReturnOverMaxDd,
            input.total_capital,
            input.initial_capital,
            input.max_drawdown_nominal,
        );

        // Ganancia de $1,000 con 0 DD recibe 999 + 1000 = 1999.0
        assert!((score - 1999.0).abs() < 1e-4);
    }
}
