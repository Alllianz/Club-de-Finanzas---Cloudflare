// Constantes de Grupos Oficiales - Club de Finanzas UBA

export interface GroupDefinition {
  id: string;
  name: string;
  assignedAsset: string;
  defaultPasswordHint: string;
}

export const CLUB_GROUPS: GroupDefinition[] = [
  {
    id: "grupo_1",
    name: "Grupo 1",
    assignedAsset: "BTC-USD",
    defaultPasswordHint: "Bitcoin",
  },
  {
    id: "grupo_2",
    name: "Grupo 2",
    assignedAsset: "ETH-USD",
    defaultPasswordHint: "Ethereum",
  },
  {
    id: "grupo_3",
    name: "Grupo 3",
    assignedAsset: "GGAL",
    defaultPasswordHint: "GGAL",
  },
  {
    id: "grupo_4",
    name: "Grupo 4",
    assignedAsset: "YPF",
    defaultPasswordHint: "YPF",
  },
  {
    id: "grupo_5",
    name: "Grupo 5",
    assignedAsset: "AAPL",
    defaultPasswordHint: "AAPL",
  },
  {
    id: "grupo_6",
    name: "Grupo 6",
    assignedAsset: "GOOG",
    defaultPasswordHint: "GOOG",
  },
];

export const POPULAR_TICKERS = [
  { symbol: "BTC-USD", label: "BTC/USD (Bitcoin)", type: "Crypto" },
  { symbol: "ETH-USD", label: "ETH/USD (Ethereum)", type: "Crypto" },
  { symbol: "GGAL", label: "GGAL (Grupo Fin. Galicia)", type: "Stock" },
  { symbol: "YPF", label: "YPF (YPF Sociedad Anónima)", type: "Stock" },
  { symbol: "AAPL", label: "AAPL (Apple Inc.)", type: "Stock" },
  { symbol: "GOOG", label: "GOOG (Alphabet Inc.)", type: "Stock" },
  { symbol: "SPY", label: "SPY (S&P 500 ETF)", type: "Stock" },
  { symbol: "NVDA", label: "NVDA (NVIDIA Corp)", type: "Stock" },
];
