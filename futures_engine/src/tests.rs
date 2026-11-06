use crate::engine::{SessionManager, TemporalWindow};
use crate::ffi::JsonRpcHandler;
use crate::hedging::{ArbitrageOpportunity, CashAndCarryArbitrage, HedgeRatioCalculator};
use crate::models::{FutureContract, MarketTick, Order};
use crate::pricing::{CostOfCarry, ImplicitRateCalculator};
use crate::risk::{LeverageValidator, LiquidationEngine};
use crate::types::{AssetClass, ContractType, Currency, LookAheadBiasError, MarginMode, OrderType, Side, StrictTimestamp};

#[test]
fn test_strict_anti_lookahead_bias_rejection() {
    // Definimos tiempo simulado actual T = 10000 ms
    let current_sim_t = StrictTimestamp::from_millis(10_000);
    let mut window = TemporalWindow::new(current_sim_t);

    // Tick en t = 9500 ms (t <= T): Debe ser aceptado
    let valid_tick = MarketTick::new(
        "DLR/NOV26",
        1150.0,
        Some(1149.5),
        Some(1150.5),
        100.0,
        StrictTimestamp::from_millis(9_500),
    ).unwrap();
    assert!(window.verify_tick(&valid_tick).is_ok());

    // Tick en t = 10500 ms (t > T): Debe ser RECHAZADO estrictamente con LookAheadBiasError
    let future_tick = MarketTick::new(
        "DLR/NOV26",
        1155.0,
        Some(1154.5),
        Some(1155.5),
        50.0,
        StrictTimestamp::from_millis(10_500),
    ).unwrap();
    let result = window.verify_tick(&future_tick);
    assert!(result.is_err());
    match result.unwrap_err() {
        LookAheadBiasError::EventInFuture { event_ms, simulated_t_ms } => {
            assert_eq!(event_ms, 10_500);
            assert_eq!(simulated_t_ms, 10_000);
        }
        _ => panic!("Se esperaba error EventInFuture"),
    }

    // Monotonicidad: no permitir ticks que viajen hacia atrás en el tiempo
    let past_tick = MarketTick::new(
        "DLR/NOV26",
        1148.0,
        None,
        None,
        20.0,
        StrictTimestamp::from_millis(9_000), // Menor que 9500 ms ya procesado
    ).unwrap();
    let non_monotonic = window.verify_tick(&past_tick);
    assert!(matches!(non_monotonic, Err(LookAheadBiasError::NonMonotonicOrder { .. })));
}

#[test]
fn test_filter_history_without_lookahead_bias() {
    let t_horizon = StrictTimestamp::from_millis(5_000);
    let window = TemporalWindow::new(t_horizon);

    let ticks = vec![
        MarketTick::new("DLR", 1000.0, None, None, 10.0, StrictTimestamp::from_millis(1000)).unwrap(),
        MarketTick::new("DLR", 1010.0, None, None, 15.0, StrictTimestamp::from_millis(3000)).unwrap(),
        MarketTick::new("DLR", 1020.0, None, None, 20.0, StrictTimestamp::from_millis(5000)).unwrap(),
        MarketTick::new("DLR", 1030.0, None, None, 25.0, StrictTimestamp::from_millis(6000)).unwrap(), // Futuro!
    ];

    let filtered = window.filter_history_without_bias(&ticks).expect("Filtro exitoso");
    assert_eq!(filtered.len(), 3);
    assert_eq!(filtered.last().unwrap().timestamp.as_millis(), 5000);
}

#[test]
fn test_implicit_rate_matba_rofex() {
    // Ejemplo real de mercado financiero de Dólar Futuro:
    // Spot = 1000.0 ARS
    // Futuro DLR a 90 días = 1100.0 ARS
    let spot = 1000.0;
    let futures_price = 1100.0;
    let days = 90.0;

    let rates = ImplicitRateCalculator::calculate(spot, futures_price, days)
        .expect("Cálculo de tasas exitoso");

    // TNA = (1100 - 1000) / 1000 * (365 / 90) = 0.10 * 4.05555... = 40.5555...%
    let expected_tna = 0.10 * (365.0 / 90.0);
    assert!((rates.tna - expected_tna).abs() < 1e-6);

    // TEA = (1100 / 1000)^(365 / 90) - 1 = (1.10)^4.05555 - 1
    let expected_tea = 1.10_f64.powf(365.0 / 90.0) - 1.0;
    assert!((rates.tea - expected_tea).abs() < 1e-6);

    // Reversibilidad: calcular precio forward desde la TNA
    let reconstructed_f = ImplicitRateCalculator::future_price_from_tna(spot, rates.tna, days).unwrap();
    assert!((reconstructed_f - futures_price).abs() < 1e-6);
}

#[test]
fn test_cost_of_carry_and_convenience_yield() {
    let spot = 100.0;
    let r = 0.05; // 5% tasa libre de riesgo
    let q = 0.02; // 2% dividendo / conveniencia
    let days = 182.5; // Medio año

    let price = CostOfCarry::continuous_price(spot, r, q, days).unwrap();
    // F = 100 * exp((0.05 - 0.02) * 0.5) = 100 * exp(0.015) = 101.5113...
    let expected = 100.0 * (0.015_f64).exp();
    assert!((price - expected).abs() < 1e-4);

    // Resolver rendimiento implícito
    let implied_q = CostOfCarry::implied_convenience_yield(spot, price, r, days).unwrap();
    assert!((implied_q - q).abs() < 1e-5);
}

#[test]
fn test_liquidation_and_bankruptcy_prices() {
    let entry_price = 100.0;
    let leverage = 10.0; // 10x apalancamiento
    let mmr = 0.03;      // 3% margen de mantenimiento

    // 1. Posición Long:
    // Plong_liq = 100 * (1 - 0.10) / (1 - 0.03) = 100 * 0.90 / 0.97 = 92.7835
    // Plong_bank = 100 * (1 - 0.10) = 90.0
    let thresholds_long = LiquidationEngine::calculate_thresholds(
        Side::Long,
        entry_price,
        leverage,
        mmr,
    ).unwrap();

    let expected_long_liq = entry_price * ((1.0 - 0.10) / (1.0 - 0.03));
    let expected_long_bank = entry_price * (1.0 - 0.10);
    assert!((thresholds_long.liquidation_price - expected_long_liq).abs() < 1e-4);
    assert!((thresholds_long.bankruptcy_price - expected_long_bank).abs() < 1e-4);
    assert!(thresholds_long.liquidation_price > thresholds_long.bankruptcy_price);

    // Comprobar detección de liquidación Long
    assert!(!LiquidationEngine::is_liquidatable(Side::Long, 95.0, thresholds_long.liquidation_price));
    assert!(LiquidationEngine::is_liquidatable(Side::Long, 92.0, thresholds_long.liquidation_price));

    // 2. Posición Short:
    // Pshort_liq = 100 * (1 + 0.10) / (1 + 0.03) = 100 * 1.10 / 1.03 = 106.7961
    // Pshort_bank = 100 * (1 + 0.10) = 110.0
    let thresholds_short = LiquidationEngine::calculate_thresholds(
        Side::Short,
        entry_price,
        leverage,
        mmr,
    ).unwrap();

    let expected_short_liq = entry_price * ((1.0 + 0.10) / (1.0 + 0.03));
    let expected_short_bank = entry_price * (1.0 + 0.10);
    assert!((thresholds_short.liquidation_price - expected_short_liq).abs() < 1e-4);
    assert!((thresholds_short.bankruptcy_price - expected_short_bank).abs() < 1e-4);
    assert!(thresholds_short.liquidation_price < thresholds_short.bankruptcy_price);

    // Comprobar detección de liquidación Short
    assert!(!LiquidationEngine::is_liquidatable(Side::Short, 105.0, thresholds_short.liquidation_price));
    assert!(LiquidationEngine::is_liquidatable(Side::Short, 107.0, thresholds_short.liquidation_price));
}

#[test]
fn test_leverage_limits_by_asset_class() {
    // Apalancamiento hasta 100x habilitado en derivados
    assert!(LeverageValidator::validate_leverage(AssetClass::CurrencyFx, 100.0).is_ok());
    assert!(LeverageValidator::validate_leverage(AssetClass::CurrencyFx, 100.1).is_err());

    // Commodities: hasta 100x
    assert!(LeverageValidator::validate_leverage(AssetClass::Commodity, 100.0).is_ok());
    assert!(LeverageValidator::validate_leverage(AssetClass::Commodity, 105.0).is_err());

    // Cripto: hasta 100x
    assert!(LeverageValidator::validate_leverage(AssetClass::Crypto, 100.0).is_ok());
    assert!(LeverageValidator::validate_leverage(AssetClass::Crypto, 101.0).is_err());
}

#[test]
fn test_order_submission_margin_lock_and_fill() {
    let t0 = StrictTimestamp::from_millis(10_000);
    let mut session = SessionManager::new(t0);

    // Crear cuenta con $10,000 USD
    session.create_account("acc-allianz", 10_000.0, Currency::USD);

    // Registrar contrato Dólar Futuro con multiplicador 1000
    let contract = FutureContract::new(
        "DLR/NOV26",
        ContractType::CashSettled,
        AssetClass::CurrencyFx,
        1000.0,
        0.05,
        Some(StrictTimestamp::from_millis(50_000)),
        0.05, // 5% = 20x
        0.03, // 3%
        Currency::USD,
    );
    session.register_contract(contract.clone());

    // Emitir orden Límite de compra a 1000.0 por 2 contratos con apalancamiento 10x
    // Nocional = 2 * 1000 * 1000 = $2,000,000
    // Margen requerido a 10x = 2,000,000 / 10 = $200,000 -> Excedería saldo!
    // Usemos cantidad 0.05 contratos:
    // Nocional = 0.05 * 1000 * 1000 = $50,000
    // Margen requerido a 10x = $5,000
    let order = Order::new(
        "ord-1",
        "acc-allianz",
        "DLR/NOV26",
        Side::Long,
        OrderType::Limit,
        0.05,
        Some(1000.0),
        None,
        10.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(10_000),
    ).unwrap();

    let res = session.submit_order(order);
    assert!(res.is_ok());

    // Verificar que el margen fue bloqueado
    let acc = session.get_account("acc-allianz").unwrap();
    assert_eq!(acc.locked_margin, 5_000.0);
    assert_eq!(acc.free_margin, 5_000.0); // 10,000 - 5,000

    // Avanzar el tiempo a t = 11000 y procesar tick que llena la orden a 995.0 (<= 1000.0)
    session.temporal_window.advance_to(StrictTimestamp::from_millis(11_000)).unwrap();
    let tick = MarketTick::new(
        "DLR/NOV26",
        995.0,
        Some(994.5),
        Some(995.5),
        50.0,
        StrictTimestamp::from_millis(11_000),
    ).unwrap();

    let tick_res = session.process_tick(tick).unwrap();
    assert_eq!(tick_res.executed_trades.len(), 1);
    assert_eq!(tick_res.executed_trades[0].fill_price, 995.0);

    // Verificar que la orden ya no está pendiente y la posición está abierta
    assert!(session.pending_orders.is_empty());
    let positions = session.get_positions("acc-allianz");
    assert_eq!(positions.len(), 1);
    assert_eq!(positions[0].quantity, 0.05);
    assert_eq!(positions[0].entry_price, 995.0);

    // Verificar que el margen bloqueado se liberó y pasó a initial_margin de la posición
    let acc_after = session.get_account("acc-allianz").unwrap();
    assert_eq!(acc_after.locked_margin, 0.0);
    assert!(acc_after.initial_margin > 0.0);
}

#[test]
fn test_optimal_hedge_ratio_and_effectiveness() {
    // Spot std dev = 0.08, Futures std dev = 0.10, Correlación = 0.90
    // Posición contado = 100,000 unidades, Multiplicador del contrato de futuros = 1,000
    let analysis = HedgeRatioCalculator::calculate_from_stats(
        0.08,
        0.10,
        0.90,
        100_000.0,
        1_000.0,
    ).unwrap();

    // h* = 0.90 * (0.08 / 0.10) = 0.72
    assert!((analysis.optimal_hedge_ratio - 0.72).abs() < 1e-6);

    // N* = 0.72 * (100,000 / 1,000) = 72 contratos
    assert!((analysis.contracts_needed - 72.0).abs() < 1e-6);
    assert_eq!(analysis.contracts_rounded, 72);

    // HE = 0.90^2 = 0.81 (81% de reducción de varianza)
    assert!((analysis.hedging_effectiveness - 0.81).abs() < 1e-6);
}

#[test]
fn test_cash_and_carry_arbitrage_evaluation() {
    let spot = 100.0;
    let futures_price = 115.0; // Alto contango
    let borrowing_rate = 0.05; // 5%
    let lending_rate = 0.03;   // 3%
    let storage = 1.0;         // $1 por unidad
    let tx_costs = 0.5;        // $0.50 costos de trading
    let days = 182.5;          // 6 meses (0.5 años)

    let report = CashAndCarryArbitrage::evaluate(
        spot,
        futures_price,
        borrowing_rate,
        lending_rate,
        storage,
        tx_costs,
        days,
    ).unwrap();

    assert_eq!(report.opportunity, ArbitrageOpportunity::CashAndCarry);
    // Costo financiero = 100 * 0.05 * 0.5 = 2.5
    // Costo total = 2.5 + 1.0 + 0.5 = 4.0
    // Margen bruto = 115 - 100 = 15.0
    // Beneficio neto = 15.0 - 4.0 = 11.0 por unidad
    assert!((report.net_profit_per_unit - 11.0).abs() < 1e-6);
    assert!(report.annualized_net_yield_pct > 0.0);
}

#[test]
fn test_json_rpc_interface() {
    let t0 = StrictTimestamp::from_millis(10_000);
    let mut session = SessionManager::new(t0);

    // 1. Invocar cálculo de tasas implícitas vía JSON-RPC
    let req = r#"{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "calculate_implicit_rate",
        "params": {
            "spot": 1000.0,
            "futures_price": 1080.0,
            "days_to_expiry": 60.0
        }
    }"#;

    let resp_str = JsonRpcHandler::handle_request(&mut session, req);
    let val: serde_json::Value = serde_json::from_str(&resp_str).unwrap();
    assert_eq!(val["jsonrpc"], "2.0");
    assert_eq!(val["id"], 1);
    assert!(val["result"]["tna"].as_f64().unwrap() > 0.0);

    // 2. Invocar cálculo de precio de liquidación vía JSON-RPC
    let req_liq = r#"{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "calculate_liquidation_price",
        "params": {
            "side": "Long",
            "entry_price": 500.0,
            "leverage": 20.0,
            "maintenance_margin_rate": 0.02
        }
    }"#;
    let resp_liq = JsonRpcHandler::handle_request(&mut session, req_liq);
    let val_liq: serde_json::Value = serde_json::from_str(&resp_liq).unwrap();
    assert!(val_liq["result"]["liquidation_price"].as_f64().unwrap() > 0.0);
}
