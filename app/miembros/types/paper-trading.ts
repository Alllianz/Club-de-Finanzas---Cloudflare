// Definiciones de tipos para el Portal de Paper Trading - Club de Finanzas UBA

export interface GroupAuthSession {
  id: string;
  name: string;
  assignedAsset: string;
  token: string;
}

export interface LiveMarketQuote {
  symbol: string;
  asset_type: "Crypto" | "Stock" | "Futures";
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
  peak_equity?: number;
  max_drawdown_nominal?: number;
  max_drawdown_pct?: number;
  invested_value?: number;
  invested_pct?: number;
  is_fully_invested?: boolean;
  score?: number;
  dailyNominalPnl?: number;
  hasZeroDrawdown?: boolean;
  daily_nominal_pnl?: number;
  has_zero_drawdown?: boolean;
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
  take_profit?: number | null;
  stop_loss?: number | null;
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

export type OrderStatus =
  | "PENDING"
  | "PENDING_OPEN"
  | "PARTIALLY_FILLED"
  | "FILLED"
  | "CANCELLED"
  | "REJECTED";

export interface PendingOrder {
  id: string;
  game_id: string;
  user_id: string;
  symbol: string;
  asset_type: string;
  order_side: "BUY" | "SELL";
  position_side: "LONG" | "SHORT";
  order_type: "MARKET" | "LIMIT";
  quantity: number;
  filled_quantity: number;
  limit_price: number | null;
  leverage: number;
  margin_mode: "ISOLATED" | "CROSS";
  take_profit?: number | null;
  stop_loss?: number | null;
  status: OrderStatus;
  created_at: number;
  filled_at?: number | null;
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
  peakEquity?: number;
  maxDrawdownNominal?: number;
  maxDrawdownPct?: number;
  investedValue?: number;
  investedPct?: number;
  isFullyInvested?: boolean;
  complianceStatus?: "COMPLIANT" | "NON_COMPLIANT_CASH";
  openPositionsCount: number;
  rank: number;
  score?: number;
  dailyNominalPnl?: number;
  hasZeroDrawdown?: boolean;
  rankingRule?: "PORTFOLIO" | "FUTURES" | string;
}

export interface TournamentSettings {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  initialCapital: number;
  maxLeverage: number;
  allowShort: boolean;
  allowedSymbols: string[];
  rebalanceDay?: string;
  tradingStartTime?: string;
  tradingEndTime?: string;
  maxTradesPerWeek?: number;
  tournamentType?: "PORTFOLIO" | "FUTURES" | string;
  marketType?: "PORTFOLIO" | "FUTURES" | string;
  startDate?: string;
  endDate?: string;
  isJoined?: boolean;
  status: string;
  createdAt: number;
}

export interface SaveTournamentParams {
  id?: string;
  tournamentId?: string;
  creatorId: string;
  title: string;
  description?: string;
  allowShort: boolean;
  allowedSymbols: string[];
  maxLeverage?: number;
  initialCapital?: number;
  rebalanceDay?: string;
  tradingStartTime?: string;
  tradingEndTime?: string;
  maxTradesPerWeek?: number;
  resetBalances?: boolean;
  createNew?: boolean;
  tournamentType?: "PORTFOLIO" | "FUTURES" | string;
  marketType?: "PORTFOLIO" | "FUTURES" | string;
  startDate?: string;
  endDate?: string;
}

export interface EquityCurvePoint {
  timestamp: number;
  date?: string;
  bucketTs?: number;
  equity: number;
  peakEquity: number;
  drawdownPct: number;
  maxDrawdownPct: number;
}

export interface GroupEquitySeries {
  groupId: string;
  groupName: string;
  points: EquityCurvePoint[];
}

export interface EquityCurveSeriesResult {
  gameId: string;
  marketType: "FUTURES" | "PORTFOLIO";
  frequency: "15m" | "daily";
  series: GroupEquitySeries[];
}

