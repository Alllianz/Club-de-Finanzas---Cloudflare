use crate::engine::{SessionManager, TemporalWindow};
use crate::ffi::JsonRpcHandler;
use crate::hedging::{ArbitrageOpportunity, CashAndCarryArbitrage, HedgeRatioCalculator};
use crate::models::{FutureContract, MarketTick, Order, Position};
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

    // 3. Invocar cálculo de Máximo Drawdown Nominal vía JSON-RPC (Fórmula Sylva / Astro EVO)
    let req_dd = r#"{
        "jsonrpc": "2.0",
        "id": 3,
        "method": "calculate_max_drawdown",
        "params": {
            "initial_capital": 10000.0,
            "equity_series": [10000.0, 10500.0, 9700.0, 11200.0, 10400.0]
        }
    }"#;
    let resp_dd = JsonRpcHandler::handle_request(&mut session, req_dd);
    let val_dd: serde_json::Value = serde_json::from_str(&resp_dd).unwrap();
    // Peak 1: 10500, Valle 1: 9700 -> DD 800. Peak 2: 11200, Valle 2: 10400 -> DD 800. Max DD Nominal = 800 USD
    assert_eq!(val_dd["result"]["max_drawdown_nominal"].as_f64().unwrap(), 800.0);
    assert_eq!(val_dd["result"]["peak_equity"].as_f64().unwrap(), 11200.0);

    // 4. Invocar clasificación de competencia oficial vía JSON-RPC
    // Portafolio: (Capital Total - Capital Inicial) / Maximo Drawdown
    let req_rank_port = r#"{
        "jsonrpc": "2.0",
        "id": 4,
        "method": "rank_tournament_competitors",
        "params": {
            "rule": "PORTFOLIO_RETURN_OVER_MAX_DD",
            "competitors": [
                { "group_id": "g1", "total_capital": 12000.0, "initial_capital": 10000.0, "max_drawdown_nominal": 200.0 },
                { "group_id": "g2", "total_capital": 16000.0, "initial_capital": 10000.0, "max_drawdown_nominal": 3000.0 }
            ]
        }
    }"#;
    let resp_rank_port = JsonRpcHandler::handle_request(&mut session, req_rank_port);
    let val_rank_port: serde_json::Value = serde_json::from_str(&resp_rank_port).unwrap();
    // g1 score = 2000 / 200 = 10.0; g2 score = 6000 / 3000 = 2.0 -> g1 es 1° puesto
    assert_eq!(val_rank_port["result"][0]["group_id"].as_str().unwrap(), "g1");
    assert_eq!(val_rank_port["result"][0]["rank"].as_u64().unwrap(), 1);
    assert_eq!(val_rank_port["result"][0]["score"].as_f64().unwrap(), 10.0);
    assert_eq!(val_rank_port["result"][1]["group_id"].as_str().unwrap(), "g2");
    assert_eq!(val_rank_port["result"][1]["rank"].as_u64().unwrap(), 2);

    // Futuros: El que más Capital Total hace
    let req_rank_fut = r#"{
        "jsonrpc": "2.0",
        "id": 5,
        "method": "rank_tournament_competitors",
        "params": {
            "rule": "FUTURES_MAX_TOTAL_CAPITAL",
            "competitors": [
                { "group_id": "g1", "total_capital": 12000.0, "initial_capital": 10000.0, "max_drawdown_nominal": 200.0 },
                { "group_id": "g2", "total_capital": 16000.0, "initial_capital": 10000.0, "max_drawdown_nominal": 3000.0 }
            ]
        }
    }"#;
    let resp_rank_fut = JsonRpcHandler::handle_request(&mut session, req_rank_fut);
    let val_rank_fut: serde_json::Value = serde_json::from_str(&resp_rank_fut).unwrap();
    // En futuros g2 tiene mayor capital ($16,000 > $12,000) -> g2 es 1° puesto
    assert_eq!(val_rank_fut["result"][0]["group_id"].as_str().unwrap(), "g2");
    assert_eq!(val_rank_fut["result"][0]["rank"].as_u64().unwrap(), 1);
    assert_eq!(val_rank_fut["result"][1]["group_id"].as_str().unwrap(), "g1");
    assert_eq!(val_rank_fut["result"][1]["rank"].as_u64().unwrap(), 2);

    // 5. Invocar cálculo de dimensionamiento en dólares vía JSON-RPC
    let req_sizing = r#"{
        "jsonrpc": "2.0",
        "id": 6,
        "method": "size_position_from_dollars",
        "params": {
            "amount_usd": 2000.0,
            "price": 500.0,
            "leverage": 5.0,
            "available_cash": 10000.0
        }
    }"#;
    let resp_sizing = JsonRpcHandler::handle_request(&mut session, req_sizing);
    let val_sizing: serde_json::Value = serde_json::from_str(&resp_sizing).unwrap();
    // 2000 / 500 = 4.0 contratos. Margen = 2000 / 5 = 400 USD
    assert_eq!(val_sizing["result"]["quantity"].as_f64().unwrap(), 4.0);
    assert_eq!(val_sizing["result"]["notional_usd"].as_f64().unwrap(), 2000.0);
    assert_eq!(val_sizing["result"]["initial_margin_usd"].as_f64().unwrap(), 400.0);
    assert!(val_sizing["result"]["is_affordable"].as_bool().unwrap());
}

#[test]
fn test_stop_loss_and_stop_limit_activation() {
    let matcher = crate::engine::OrderMatcher::new(0.0005);
    let contract = FutureContract::new(
        "BTC-USDT",
        ContractType::CashSettled,
        AssetClass::Crypto,
        1.0,
        0.5,
        None,
        0.10,
        0.05,
        Currency::USDT,
    );

    // 1. StopLoss Long (Buy Stop): se activa si tick.price >= stop_p
    let mut order_sl_long = Order::new(
        "sl-long-1",
        "acc-1",
        "BTC-USDT",
        Side::Long,
        OrderType::StopLoss,
        1.0,
        None,
        Some(65_000.0), // Stop price en 65k
        5.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1000),
    ).unwrap();

    // Tick en 64,000 (< 65,000): NO debe activarse
    let tick_below = MarketTick::new(
        "BTC-USDT",
        64_000.0,
        Some(63_990.0),
        Some(64_010.0),
        1.0,
        StrictTimestamp::from_millis(1100),
    ).unwrap();
    let res1 = matcher.match_order(&mut order_sl_long, &tick_below, &contract, || "tr-1".into()).unwrap();
    assert!(res1.is_none());
    assert!(order_sl_long.is_active());

    // Tick en 65,100 (>= 65,000): DEBE activarse y ejecutarse
    let tick_above = MarketTick::new(
        "BTC-USDT",
        65_100.0,
        Some(65_090.0),
        Some(65_110.0),
        1.0,
        StrictTimestamp::from_millis(1200),
    ).unwrap();
    let res2 = matcher.match_order(&mut order_sl_long, &tick_above, &contract, || "tr-2".into()).unwrap();
    assert!(res2.is_some());
    let trade = res2.unwrap();
    assert_eq!(trade.side, Side::Long);
    assert_eq!(trade.fill_price, 65_110.0); // Toma ask disponible
    assert!(!order_sl_long.is_active());

    // 2. StopLoss Short (Sell Stop): se activa si tick.price <= stop_p
    let mut order_sl_short = Order::new(
        "sl-short-1",
        "acc-1",
        "BTC-USDT",
        Side::Short,
        OrderType::StopLoss,
        1.0,
        None,
        Some(60_000.0), // Stop en 60k
        5.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1000),
    ).unwrap();

    // Tick en 61,000 (> 60,000): NO debe activarse
    let tick_high = MarketTick::new(
        "BTC-USDT",
        61_000.0,
        Some(60_990.0),
        Some(61_010.0),
        1.0,
        StrictTimestamp::from_millis(1100),
    ).unwrap();
    let res3 = matcher.match_order(&mut order_sl_short, &tick_high, &contract, || "tr-3".into()).unwrap();
    assert!(res3.is_none());

    // Tick en 59,900 (<= 60,000): DEBE activarse y ejecutarse
    let tick_low = MarketTick::new(
        "BTC-USDT",
        59_900.0,
        Some(59_890.0),
        Some(59_910.0),
        1.0,
        StrictTimestamp::from_millis(1200),
    ).unwrap();
    let res4 = matcher.match_order(&mut order_sl_short, &tick_low, &contract, || "tr-4".into()).unwrap();
    assert!(res4.is_some());
    let trade_short = res4.unwrap();
    assert_eq!(trade_short.side, Side::Short);
    assert_eq!(trade_short.fill_price, 59_890.0); // Toma bid disponible

    // 3. StopLimit Long: se activa si tick.price >= stop_p, y se llena si tick.price <= limit_p
    let mut order_stplmt_long = Order::new(
        "stplmt-long-1",
        "acc-1",
        "BTC-USDT",
        Side::Long,
        OrderType::StopLimit,
        1.0,
        Some(65_200.0), // Limit price
        Some(65_000.0), // Stop price
        5.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1000),
    ).unwrap();

    // Tick en 64,800: no activa
    let tick_pre = MarketTick::new("BTC-USDT", 64_800.0, None, None, 1.0, StrictTimestamp::from_millis(1100)).unwrap();
    assert!(matcher.match_order(&mut order_stplmt_long, &tick_pre, &contract, || "tr-5".into()).unwrap().is_none());

    // Tick en 65_100: activa (65100 >= 65000) y llena (65100 <= 65200)
    let tick_fill = MarketTick::new("BTC-USDT", 65_100.0, None, None, 1.0, StrictTimestamp::from_millis(1200)).unwrap();
    let res_stplmt = matcher.match_order(&mut order_stplmt_long, &tick_fill, &contract, || "tr-6".into()).unwrap();
    assert!(res_stplmt.is_some());
    assert_eq!(res_stplmt.unwrap().fill_price, 65_100.0);

    // StopLimit Long con salto (gap) por encima del límite:
    let mut order_stplmt_gap = Order::new(
        "stplmt-gap-1",
        "acc-1",
        "BTC-USDT",
        Side::Long,
        OrderType::StopLimit,
        1.0,
        Some(65_050.0), // Limit price muy restrictivo
        Some(65_000.0), // Stop price
        5.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1000),
    ).unwrap();
    // Tick en 65_100: activa stop (>= 65000) pero precio supera límite (65100 > 65050) -> NO llena
    assert!(matcher.match_order(&mut order_stplmt_gap, &tick_fill, &contract, || "tr-7".into()).unwrap().is_none());
}

#[test]
fn test_liquidation_cash_balance_net_loss() {
    let t0 = StrictTimestamp::from_millis(10_000);
    let mut session = SessionManager::new(t0);

    // Cuenta con saldo inicial de $10,000 USD
    session.create_account("acc-liq-test", 10_000.0, Currency::USD);

    let contract = FutureContract::new(
        "ETH/USD",
        ContractType::CashSettled,
        AssetClass::Crypto,
        1.0,
        0.1,
        None,
        0.10, // 10x apalancamiento máximo
        0.05, // 5% MMR
        Currency::USD,
    );
    session.register_contract(contract.clone());

    // Publicar tick inicial a $2,000 para permitir orden de mercado
    session.temporal_window.advance_to(StrictTimestamp::from_millis(10_000)).unwrap();
    let tick_init = MarketTick::new("ETH/USD", 2_000.0, Some(2_000.0), Some(2_000.0), 10.0, StrictTimestamp::from_millis(10_000)).unwrap();
    session.process_tick(tick_init).unwrap();

    // Abrir posición Long de 5 contratos a $2,000 con apalancamiento 10x
    // Nocional = 5 * 2,000 * 1.0 = $10,000 USD
    // Margen Inicial (isolated) = $1,000 USD
    let order = Order::new(
        "ord-open-long",
        "acc-liq-test",
        "ETH/USD",
        Side::Long,
        OrderType::Market,
        5.0,
        None,
        None,
        10.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(10_000),
    ).unwrap();
    session.submit_order(order).unwrap();

    let pm = session.accounts.get("acc-liq-test").unwrap();
    let pos = pm.positions.get("ETH/USD").unwrap();
    assert_eq!(pos.isolated_margin, 1_000.0);
    // Margen de mantenimiento: 5 * 2000 * 1.0 * 0.05 = $500
    // Plong_liq = 2000 * (1 - 0.10) / (1 - 0.05) = 2000 * 0.90 / 0.95 = 1894.7368
    // Plong_bank = 2000 * (1 - 0.10) = 1800.0

    let cash_before_liq = pm.account.cash_balance;
    // La comisión por apertura redujo levemente el saldo
    assert!(cash_before_liq < 10_000.0 && cash_before_liq > 9_990.0);

    // Enviar tick en $1,850 (por debajo de liq_price 1894.73 pero por encima de bankruptcy 1800.0)
    // Gross PnL = 5 * (1850 - 2000) = -750 USD
    // Colateral remanente recuperado = 1000 - 750 = $250 USD
    // Pérdida neta real = (1000 - 250) + 0 = $750 USD
    session.temporal_window.advance_to(StrictTimestamp::from_millis(11_000)).unwrap();
    let tick_liq = MarketTick::new("ETH/USD", 1_850.0, Some(1_850.0), Some(1_850.0), 10.0, StrictTimestamp::from_millis(11_000)).unwrap();
    let result = session.process_tick(tick_liq).unwrap();

    assert_eq!(result.liquidations.len(), 1);
    let liq_ev = &result.liquidations[0];
    assert_eq!(liq_ev.margin_recovered, 250.0);
    assert_eq!(liq_ev.deficit_loss, 0.0);

    let pm_after = session.accounts.get("acc-liq-test").unwrap();
    assert!(!pm_after.positions.contains_key("ETH/USD"));
    // El efectivo de la cuenta DEBE sufrir la pérdida de $750, NUNCA sumar 250 al saldo previo
    let expected_cash = cash_before_liq - 750.0;
    assert!((pm_after.account.cash_balance - expected_cash).abs() < 1e-4);
    assert!((pm_after.account.realized_pnl - (-750.0)).abs() < 1e-4);
    assert_eq!(pm_after.account.initial_margin, 0.0);
}

#[test]
fn test_fifo_order_matching_priority() {
    let t0 = StrictTimestamp::from_millis(1_000);
    let mut session = SessionManager::new(t0);
    session.create_account("acc-fifo", 100_000.0, Currency::USD);

    let contract = FutureContract::new(
        "SOL/USD",
        ContractType::CashSettled,
        AssetClass::Crypto,
        1.0,
        0.01,
        None,
        0.10,
        0.05,
        Currency::USD,
    );
    session.register_contract(contract);

    // Enviar 3 órdenes límite de compra al mismo precio ($150.0) en timestamps cronológicos ascendentes
    let ord1 = Order::new(
        "ord-fifo-1",
        "acc-fifo",
        "SOL/USD",
        Side::Long,
        OrderType::Limit,
        1.0,
        Some(150.0),
        None,
        1.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1_000),
    ).unwrap();
    session.submit_order(ord1).unwrap();

    session.temporal_window.advance_to(StrictTimestamp::from_millis(1_100)).unwrap();
    let ord2 = Order::new(
        "ord-fifo-2",
        "acc-fifo",
        "SOL/USD",
        Side::Long,
        OrderType::Limit,
        2.0,
        Some(150.0),
        None,
        1.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1_100),
    ).unwrap();
    session.submit_order(ord2).unwrap();

    session.temporal_window.advance_to(StrictTimestamp::from_millis(1_200)).unwrap();
    let ord3 = Order::new(
        "ord-fifo-3",
        "acc-fifo",
        "SOL/USD",
        Side::Long,
        OrderType::Limit,
        3.0,
        Some(150.0),
        None,
        1.0,
        MarginMode::Isolated,
        StrictTimestamp::from_millis(1_200),
    ).unwrap();
    session.submit_order(ord3).unwrap();

    // Procesar tick en t = 2_000 a precio $149.0 (ejecuta todas las compras límite)
    session.temporal_window.advance_to(StrictTimestamp::from_millis(2_000)).unwrap();
    let tick = MarketTick::new("SOL/USD", 149.0, Some(148.9), Some(149.1), 50.0, StrictTimestamp::from_millis(2_000)).unwrap();
    let res = session.process_tick(tick).unwrap();

    assert_eq!(res.executed_trades.len(), 3);
    // Verificar orden estricto Price-Time Priority FIFO
    assert_eq!(res.executed_trades[0].order_id, "ord-fifo-1");
    assert_eq!(res.executed_trades[0].quantity, 1.0);
    assert_eq!(res.executed_trades[1].order_id, "ord-fifo-2");
    assert_eq!(res.executed_trades[1].quantity, 2.0);
    assert_eq!(res.executed_trades[2].order_id, "ord-fifo-3");
    assert_eq!(res.executed_trades[2].quantity, 3.0);
}

#[test]
fn test_multi_asset_portfolio_recalculation() {
    let mut pm = crate::engine::PortfolioManager::new(
        crate::models::Account::new("acc-multi", 50_000.0, Currency::USD)
    );

    // Posición 1 en BTC: Multiplicador 1.0, MMR 0.05
    let pos_btc = Position::new(
        "pos-btc",
        "acc-multi",
        "BTC/USD",
        Side::Long,
        2.0,
        60_000.0,
        10.0,
        MarginMode::Isolated,
        12_000.0,
        54_000.0,
        50_000.0,
        1.0,  // multiplier BTC
        0.05, // MMR 5%
        StrictTimestamp::from_millis(1000),
    );

    // Posición 2 en DLR: Multiplicador 1000.0, MMR 0.02
    let pos_dlr = Position::new(
        "pos-dlr",
        "acc-multi",
        "DLR/NOV26",
        Side::Long,
        5.0,
        1_000.0,
        20.0,
        MarginMode::Isolated,
        250.0,
        900.0,
        850.0,
        1000.0, // multiplier DLR
        0.02,   // MMR 2%
        StrictTimestamp::from_millis(1000),
    );

    pm.positions.insert("BTC/USD".to_string(), pos_btc);
    pm.positions.insert("DLR/NOV26".to_string(), pos_dlr);

    // Recalcular totales con soporte multiactivo autónomo
    pm.recalculate_account_totals();

    // Requerimiento de mantenimiento BTC = 2.0 * 60,000 * 1.0 * 0.05 = $6,000 USD
    // Requerimiento de mantenimiento DLR = 5.0 * 1,000 * 1000.0 * 0.02 = $100,000 USD
    // Total mantenimiento = 6,000 + 100,000 = $106,000 USD
    assert_eq!(pm.account.maintenance_margin, 106_000.0);
    assert_eq!(pm.account.initial_margin, 12_250.0);
}

#[test]
fn test_anti_lookahead_non_monotonic_detection_without_premature_break() {
    let t_horizon = StrictTimestamp::from_millis(5_000);
    let window = TemporalWindow::new(t_horizon);

    // Secuencia con tick en el futuro (6000 ms) seguido de un tick con timestamp menor (4000 ms)
    // El sistema DEBE detectar la falta de monotonicidad y rechazarlo en lugar de silenciarlo
    let bad_ticks = vec![
        MarketTick::new("DLR", 1000.0, None, None, 10.0, StrictTimestamp::from_millis(1000)).unwrap(),
        MarketTick::new("DLR", 1010.0, None, None, 15.0, StrictTimestamp::from_millis(6000)).unwrap(), // t > T
        MarketTick::new("DLR", 1020.0, None, None, 20.0, StrictTimestamp::from_millis(4000)).unwrap(), // Inversión temporal!
    ];

    let result = window.filter_history_without_bias(&bad_ticks);
    assert!(result.is_err());
    match result.unwrap_err() {
        LookAheadBiasError::NonMonotonicOrder { prev_ms, current_ms } => {
            assert_eq!(prev_ms, 6000);
            assert_eq!(current_ms, 4000);
        }
        _ => panic!("Se esperaba error NonMonotonicOrder"),
    }
}

#[test]
fn test_json_rpc_auto_order_id_generation() {
    let t0 = StrictTimestamp::from_millis(10_000);
    let mut session = SessionManager::new(t0);
    session.create_account("acc-rpc-auto", 10_000.0, Currency::USD);

    let contract = FutureContract::new(
        "BTC-USDT",
        ContractType::CashSettled,
        AssetClass::Crypto,
        1.0,
        1.0,
        None,
        0.10,
        0.05,
        Currency::USDT,
    );
    session.register_contract(contract);

    // Enviar solicitud sin "id" en params
    let req1 = r#"{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "submit_order",
        "params": {
            "account_id": "acc-rpc-auto",
            "symbol": "BTC-USDT",
            "order_type": "Limit",
            "side": "Long",
            "quantity": 0.1,
            "price": 50000.0,
            "leverage": 2.0
        }
    }"#;
    let resp1_str = JsonRpcHandler::handle_request(&mut session, req1);
    let val1: serde_json::Value = serde_json::from_str(&resp1_str).unwrap();
    let oid1 = val1["result"]["order_id"].as_str().unwrap();
    assert!(oid1.starts_with("ord-auto-"));

    // Enviar solicitud con "id": "" (vacío)
    let req2 = r#"{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "submit_order",
        "params": {
            "id": "",
            "account_id": "acc-rpc-auto",
            "symbol": "BTC-USDT",
            "order_type": "Limit",
            "side": "Long",
            "quantity": 0.1,
            "price": 50000.0,
            "leverage": 2.0
        }
    }"#;
    let resp2_str = JsonRpcHandler::handle_request(&mut session, req2);
    let val2: serde_json::Value = serde_json::from_str(&resp2_str).unwrap();
    let oid2 = val2["result"]["order_id"].as_str().unwrap();
    assert!(oid2.starts_with("ord-auto-"));

    // No debe haber colisión en pending_orders
    assert_ne!(oid1, oid2);
    assert_eq!(session.pending_orders.len(), 2);
}
