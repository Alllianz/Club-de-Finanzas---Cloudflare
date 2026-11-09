use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::engine::SessionManager;
use crate::hedging::{CashAndCarryArbitrage, HedgeRatioCalculator};
use crate::models::{FutureContract, MarketTick, Order};
use crate::pricing::{CostOfCarry, ImplicitRateCalculator};
use crate::risk::LiquidationEngine;
use crate::types::{AssetClass, ContractType, Currency, MarginMode, OrderType, Side, StrictTimestamp};

/// Estructura estándar de solicitud JSON-RPC 2.0.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

/// Objeto de error según especificación JSON-RPC 2.0.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

/// Estructura estándar de respuesta JSON-RPC 2.0.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    pub id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

impl JsonRpcResponse {
    pub fn success(id: Value, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: Value, code: i32, message: impl Into<String>) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result: None,
            error: Some(JsonRpcError {
                code,
                message: message.into(),
                data: None,
            }),
        }
    }
}

/// Despachador de comandos JSON-RPC 2.0 para interactuar con el motor de futuros.
pub struct JsonRpcHandler;

impl JsonRpcHandler {
    /// Procesa una solicitud JSON-RPC cruda en formato string y retorna la respuesta serializada.
    pub fn handle_request(session: &mut SessionManager, request_str: &str) -> String {
        let req: JsonRpcRequest = match serde_json::from_str(request_str) {
            Ok(r) => r,
            Err(e) => {
                let err_resp = JsonRpcResponse::error(Value::Null, -32700, format!("Parse error: {}", e));
                return serde_json::to_string(&err_resp).unwrap_or_default();
            }
        };

        let req_id = req.id.unwrap_or(Value::Null);

        if req.jsonrpc != "2.0" {
            let resp = JsonRpcResponse::error(req_id, -32600, "Invalid Request: jsonrpc must be '2.0'");
            return serde_json::to_string(&resp).unwrap_or_default();
        }

        let resp = match req.method.as_str() {
            "calculate_implicit_rate" => Self::handle_calculate_implicit_rate(req_id, &req.params),
            "calculate_cost_of_carry" => Self::handle_calculate_cost_of_carry(req_id, &req.params),
            "calculate_liquidation_price" => Self::handle_calculate_liquidation_price(req_id, &req.params),
            "calculate_hedge_ratio" => Self::handle_calculate_hedge_ratio(req_id, &req.params),
            "calculate_cash_and_carry" => Self::handle_calculate_cash_and_carry(req_id, &req.params),
            "create_account" => Self::handle_create_account(session, req_id, &req.params),
            "register_contract" => Self::handle_register_contract(session, req_id, &req.params),
            "submit_order" => Self::handle_submit_order(session, req_id, &req.params),
            "cancel_order" => Self::handle_cancel_order(session, req_id, &req.params),
            "process_tick" => Self::handle_process_tick(session, req_id, &req.params),
            "get_account" => Self::handle_get_account(session, req_id, &req.params),
            "get_positions" => Self::handle_get_positions(session, req_id, &req.params),
            "calculate_max_drawdown" => Self::handle_calculate_max_drawdown(req_id, &req.params),
            "rank_tournament_competitors" => Self::handle_rank_tournament_competitors(req_id, &req.params),
            "size_position_from_dollars" => Self::handle_size_position_from_dollars(req_id, &req.params),
            _ => JsonRpcResponse::error(req_id, -32601, format!("Method '{}' not found", req.method)),
        };

        serde_json::to_string(&resp).unwrap_or_default()
    }

    fn handle_calculate_implicit_rate(id: Value, params: &Value) -> JsonRpcResponse {
        let spot = match params.get("spot").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta parámetro 'spot' numérico"),
        };
        let futures_price = match params.get("futures_price").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta parámetro 'futures_price' numérico"),
        };
        let days = match params.get("days_to_expiry").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta parámetro 'days_to_expiry' numérico"),
        };

        match ImplicitRateCalculator::calculate(spot, futures_price, days) {
            Ok(res) => JsonRpcResponse::success(id, serde_json::to_value(res).unwrap()),
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_calculate_cost_of_carry(id: Value, params: &Value) -> JsonRpcResponse {
        let spot = match params.get("spot").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta parámetro 'spot' numérico"),
        };
        let r = match params.get("risk_free_rate").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'risk_free_rate'"),
        };
        let q = params.get("convenience_yield").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let days = match params.get("days_to_expiry").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'days_to_expiry'"),
        };

        match CostOfCarry::continuous_price(spot, r, q, days) {
            Ok(price) => {
                let basis = price - spot;
                let val = serde_json::json!({
                    "theoretical_price": price,
                    "theoretical_basis": basis,
                });
                JsonRpcResponse::success(id, val)
            }
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_calculate_liquidation_price(id: Value, params: &Value) -> JsonRpcResponse {
        let side_str = match params.get("side").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta parámetro 'side' (Long/Short)"),
        };
        let side = match side_str.to_lowercase().as_str() {
            "long" => Side::Long,
            "short" => Side::Short,
            _ => return JsonRpcResponse::error(id, -32602, "Lado inválido: use 'Long' o 'Short'"),
        };
        let entry_price = match params.get("entry_price").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'entry_price'"),
        };
        let leverage = match params.get("leverage").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'leverage'"),
        };
        let mmr = params.get("maintenance_margin_rate").and_then(|v| v.as_f64()).unwrap_or(0.03);

        match LiquidationEngine::calculate_thresholds(side, entry_price, leverage, mmr) {
            Ok(thresholds) => JsonRpcResponse::success(id, serde_json::to_value(thresholds).unwrap()),
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_calculate_hedge_ratio(id: Value, params: &Value) -> JsonRpcResponse {
        let spot_std_dev = match params.get("spot_std_dev").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'spot_std_dev'"),
        };
        let futures_std_dev = match params.get("futures_std_dev").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'futures_std_dev'"),
        };
        let correlation = match params.get("correlation").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'correlation'"),
        };
        let spot_size = match params.get("spot_position_size").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'spot_position_size'"),
        };
        let contract_multiplier = match params.get("contract_multiplier").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'contract_multiplier'"),
        };

        match HedgeRatioCalculator::calculate_from_stats(
            spot_std_dev,
            futures_std_dev,
            correlation,
            spot_size,
            contract_multiplier,
        ) {
            Ok(res) => JsonRpcResponse::success(id, serde_json::to_value(res).unwrap()),
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_calculate_cash_and_carry(id: Value, params: &Value) -> JsonRpcResponse {
        let spot = match params.get("spot").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'spot'"),
        };
        let futures_price = match params.get("futures_price").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'futures_price'"),
        };
        let borrowing_rate = match params.get("borrowing_rate").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'borrowing_rate'"),
        };
        let lending_rate = params.get("lending_rate").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let storage_cost = params.get("storage_cost").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let transaction_costs = params.get("transaction_costs").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let days = match params.get("days_to_expiry").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'days_to_expiry'"),
        };

        match CashAndCarryArbitrage::evaluate(
            spot,
            futures_price,
            borrowing_rate,
            lending_rate,
            storage_cost,
            transaction_costs,
            days,
        ) {
            Ok(res) => JsonRpcResponse::success(id, serde_json::to_value(res).unwrap()),
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_create_account(session: &mut SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let account_id = match params.get("account_id").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'account_id'"),
        };
        let initial_cash = params.get("initial_cash").and_then(|v| v.as_f64()).unwrap_or(10_000.0);
        let currency = match params.get("currency").and_then(|v| v.as_str()) {
            Some("ARS") => Currency::ARS,
            Some("USDT") => Currency::USDT,
            Some("EUR") => Currency::EUR,
            _ => Currency::USD,
        };

        let pm = session.create_account(account_id, initial_cash, currency);
        JsonRpcResponse::success(id, serde_json::to_value(&pm.account).unwrap())
    }

    fn handle_register_contract(session: &mut SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let symbol = match params.get("symbol").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'symbol'"),
        };
        let asset_class = match params.get("asset_class").and_then(|v| v.as_str()) {
            Some("CurrencyFx") => AssetClass::CurrencyFx,
            Some("Commodity") => AssetClass::Commodity,
            Some("Index") => AssetClass::Index,
            Some("Crypto") => AssetClass::Crypto,
            _ => AssetClass::CurrencyFx,
        };
        let multiplier = params.get("multiplier").and_then(|v| v.as_f64()).unwrap_or(1000.0);
        let tick_size = params.get("tick_size").and_then(|v| v.as_f64()).unwrap_or(0.01);
        let imr = params.get("initial_margin_rate").and_then(|v| v.as_f64()).unwrap_or(0.05);
        let mmr = params.get("maintenance_margin_rate").and_then(|v| v.as_f64()).unwrap_or(0.03);

        let contract = FutureContract::new(
            symbol,
            ContractType::CashSettled,
            asset_class,
            multiplier,
            tick_size,
            None,
            imr,
            mmr,
            Currency::USD,
        );

        session.register_contract(contract);
        JsonRpcResponse::success(id, serde_json::json!({ "status": "ok", "symbol": symbol }))
    }

    fn handle_submit_order(session: &mut SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let order_id = match params.get("id").and_then(|v| v.as_str()) {
            Some(s) if !s.trim().is_empty() => s.to_string(),
            _ => {
                session.trade_counter += 1;
                format!("ord-auto-{}", session.trade_counter)
            }
        };
        let account_id = match params.get("account_id").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'account_id'"),
        };
        let symbol = match params.get("symbol").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'symbol'"),
        };
        let side = match params.get("side").and_then(|v| v.as_str()) {
            Some("Short") | Some("short") => Side::Short,
            _ => Side::Long,
        };
        let order_type = match params.get("order_type").and_then(|v| v.as_str()) {
            Some("Limit") | Some("limit") => OrderType::Limit,
            Some("StopLoss") | Some("stop_loss") => OrderType::StopLoss,
            _ => OrderType::Market,
        };
        let quantity = match params.get("quantity").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'quantity'"),
        };
        let price = params.get("price").and_then(|v| v.as_f64());
        let stop_price = params.get("stop_price").and_then(|v| v.as_f64());
        let leverage = params.get("leverage").and_then(|v| v.as_f64()).unwrap_or(1.0);
        let timestamp_ms = params
            .get("timestamp_ms")
            .and_then(|v| v.as_u64())
            .unwrap_or(session.temporal_window.current_time().as_millis());

        let order = match Order::new(
            order_id,
            account_id,
            symbol,
            side,
            order_type,
            quantity,
            price,
            stop_price,
            leverage,
            MarginMode::Isolated,
            StrictTimestamp::from_millis(timestamp_ms),
        ) {
            Ok(o) => o,
            Err(e) => return JsonRpcResponse::error(id, -32602, e),
        };

        match session.submit_order(order) {
            Ok(oid) => JsonRpcResponse::success(id, serde_json::json!({ "order_id": oid, "status": "submitted" })),
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_cancel_order(session: &mut SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let order_id = match params.get("order_id").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'order_id'"),
        };

        match session.cancel_order(order_id) {
            Ok(()) => JsonRpcResponse::success(id, serde_json::json!({ "status": "cancelled", "order_id": order_id })),
            Err(e) => JsonRpcResponse::error(id, -32000, e),
        }
    }

    fn handle_process_tick(session: &mut SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let symbol = match params.get("symbol").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'symbol'"),
        };
        let price = match params.get("price").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'price'"),
        };
        let bid = params.get("bid").and_then(|v| v.as_f64());
        let ask = params.get("ask").and_then(|v| v.as_f64());
        let volume = params.get("volume").and_then(|v| v.as_f64()).unwrap_or(1.0);
        let timestamp_ms = match params.get("timestamp_ms").and_then(|v| v.as_u64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'timestamp_ms'"),
        };

        let tick = match MarketTick::new(
            symbol,
            price,
            bid,
            ask,
            volume,
            StrictTimestamp::from_millis(timestamp_ms),
        ) {
            Ok(t) => t,
            Err(e) => return JsonRpcResponse::error(id, -32602, e),
        };

        match session.process_tick(tick) {
            Ok(res) => JsonRpcResponse::success(id, serde_json::to_value(res).unwrap()),
            Err(e) => JsonRpcResponse::error(id, -32001, format!("Look-Ahead Bias Error: {}", e)),
        }
    }

    fn handle_get_account(session: &SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let account_id = match params.get("account_id").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'account_id'"),
        };

        match session.get_account(account_id) {
            Some(acc) => JsonRpcResponse::success(id, serde_json::to_value(acc).unwrap()),
            None => JsonRpcResponse::error(id, -32004, format!("Cuenta '{}' no encontrada", account_id)),
        }
    }

    fn handle_get_positions(session: &SessionManager, id: Value, params: &Value) -> JsonRpcResponse {
        let account_id = match params.get("account_id").and_then(|v| v.as_str()) {
            Some(s) => s,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'account_id'"),
        };

        let positions = session.get_positions(account_id);
        JsonRpcResponse::success(id, serde_json::to_value(positions).unwrap())
    }

    fn handle_calculate_max_drawdown(id: Value, params: &Value) -> JsonRpcResponse {
        let initial_capital = params.get("initial_capital").and_then(|v| v.as_f64()).unwrap_or(10_000.0);
        let equity_series = match params.get("equity_series").and_then(|v| v.as_array()) {
            Some(arr) => arr.iter().filter_map(|v| v.as_f64()).collect::<Vec<f64>>(),
            None => return JsonRpcResponse::error(id, -32602, "Falta array 'equity_series'"),
        };

        let metrics = crate::risk::DrawdownCalculator::calculate_nominal_drawdown(initial_capital, &equity_series);
        JsonRpcResponse::success(id, serde_json::to_value(metrics).unwrap())
    }

    fn handle_rank_tournament_competitors(id: Value, params: &Value) -> JsonRpcResponse {
        let rule_str = params.get("rule").and_then(|v| v.as_str()).unwrap_or("PORTFOLIO_RETURN_OVER_MAX_DD");
        let rule = if rule_str.eq_ignore_ascii_case("FUTURES_MAX_TOTAL_CAPITAL") || rule_str.eq_ignore_ascii_case("FUTURES") {
            crate::risk::TournamentRankingRule::FuturesMaxTotalCapital
        } else {
            crate::risk::TournamentRankingRule::PortfolioReturnOverMaxDd
        };

        let competitors_json = match params.get("competitors").and_then(|v| v.as_array()) {
            Some(arr) => arr,
            None => return JsonRpcResponse::error(id, -32602, "Falta array 'competitors'"),
        };

        let mut competitors = Vec::new();
        for c in competitors_json {
            let group_id = match c.get("group_id").and_then(|v| v.as_str()) {
                Some(s) => s.to_string(),
                None => return JsonRpcResponse::error(id, -32602, "Cada competidor debe tener 'group_id'"),
            };
            let group_name = c.get("group_name").and_then(|v| v.as_str()).map(|s| s.to_string());
            let total_capital = c.get("total_capital").and_then(|v| v.as_f64()).unwrap_or(10_000.0);
            let initial_capital = c.get("initial_capital").and_then(|v| v.as_f64()).unwrap_or(10_000.0);
            let max_drawdown_nominal = c.get("max_drawdown_nominal").and_then(|v| v.as_f64()).unwrap_or(0.0);

            competitors.push(crate::risk::CompetitorScoreInput {
                group_id,
                group_name,
                total_capital,
                initial_capital,
                max_drawdown_nominal,
            });
        }

        let ranked = crate::risk::TournamentRanker::rank_competitors(rule, competitors);
        JsonRpcResponse::success(id, serde_json::to_value(ranked).unwrap())
    }

    fn handle_size_position_from_dollars(id: Value, params: &Value) -> JsonRpcResponse {
        let amount_usd = match params.get("amount_usd").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'amount_usd' numérico"),
        };
        let price = match params.get("price").and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => return JsonRpcResponse::error(id, -32602, "Falta 'price' numérico"),
        };
        let leverage = params.get("leverage").and_then(|v| v.as_f64()).unwrap_or(1.0);
        let available_cash = params.get("available_cash").and_then(|v| v.as_f64()).unwrap_or(10_000.0);
        let contract_multiplier = params.get("contract_multiplier").and_then(|v| v.as_f64());

        let input = crate::risk::PositionSizingInput {
            amount_usd,
            price,
            leverage,
            available_cash,
            contract_multiplier,
        };

        match crate::risk::PositionSizer::size_from_dollars(input) {
            Ok(res) => JsonRpcResponse::success(id, serde_json::to_value(res).unwrap()),
            Err(e) => JsonRpcResponse::error(id, -32602, e),
        }
    }
}
