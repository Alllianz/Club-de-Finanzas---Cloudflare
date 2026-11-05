// Definiciones de tipos para el Portal de Paper Trading - Club de Finanzas UBA

export interface GroupAuthSession {
  id: string;
  name: string;
  assignedAsset: string;
  token: string;
}

export interface LiveMarketQuote {
  symbol: string;
  asset_type: "Crypto" | "Stock";
  price: number;
  change_24h_pct: number;
  previous_close: number;
  is_market_open: boolean;
  status_message: string;
  timestamp_ms: number;
}

export interface GroupPortfolio {
  game_id: string;
  user_id: string;
  cash_balance: number;
  realized_pnl: number;
  total_fees: number;
  equity: number;
  used_margin: number;
  unrealized_pnl: number;
  free_margin: number;
  roe_pct: number;
  updated_at: number;
}

export interface OpenPosition {
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

export interface ExecutedTrade {
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

export interface LeaderboardItem {
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
