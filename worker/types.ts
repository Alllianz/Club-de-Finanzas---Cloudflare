// Definiciones de tipos para Cloudflare Workers & D1 - Motor Institucional Paper Trading

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; meta?: unknown }>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ results: T[]; success: boolean }>>;
}

export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  DB?: D1Database;
  ASSETS: Fetcher;
}

export interface MarketQuote {
  symbol: string;
  asset_type: "Crypto" | "Stock" | "Futures";
  price: number;
  change_24h_pct: number;
  previous_close: number;
  is_market_open: boolean;
  status_message: string;
  timestamp_ms: number;
}

export interface PortfolioRecord {
  game_id: string;
  user_id: string;
  cash_balance: number;
  realized_pnl: number;
  total_fees: number;
  updated_at: number;
}

export interface PositionRecord {
  id: string;
  game_id: string;
  user_id: string;
  symbol: string;
  asset_type: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entry_price: number;
  current_price: number;
  leverage: number;
  margin_mode: "ISOLATED" | "CROSS";
  initial_margin: number;
  unrealized_pnl: number;
  liquidation_price: number;
  updated_at: number;
}

export interface TradeRecord {
  id: string;
  game_id: string;
  user_id: string;
  symbol: string;
  asset_type: string;
  order_side: "BUY" | "SELL";
  position_side: "LONG" | "SHORT";
  quantity: number;
  price: number;
  fee: number;
  realized_pnl: number;
  leverage: number;
  margin_mode: string;
  timestamp: number;
}

export interface LeaderboardEntry {
  groupId: string;
  groupName: string;
  initialCapital: number;
  cashBalance: number;
  usedMargin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalFees: number;
  equity: number;
  roePct: number;
  openPositionsCount: number;
  rank: number;
}

export interface TournamentRecord {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  creator_name: string;
  initial_capital: number;
  max_leverage: number;
  allow_short: number;
  fee_crypto_bps: number;
  fee_stock_bps: number;
  status: "ACTIVE" | "ENDED";
  created_at: number;
  ended_at: number | null;
  allowed_symbols: string;
  rebalance_day?: string;
  trading_start_time?: string;
  trading_end_time?: string;
  max_trades_per_week?: number;
  tournament_type?: "PORTFOLIO" | "FUTURES" | string;
  start_date?: string;
  end_date?: string;
}
