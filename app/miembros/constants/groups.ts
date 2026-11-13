// Constantes de Grupos Oficiales - Club de Finanzas UBA

export interface GroupDefinition {
  id: string;
  name: string;
  assignedAsset: string;
}

export const CLUB_GROUPS: GroupDefinition[] = [
  {
    id: "grupo_1",
    name: "Grupo 1",
    assignedAsset: "BTC-USD",
  },
  {
    id: "grupo_2",
    name: "Grupo 2",
    assignedAsset: "ETH-USD",
  },
  {
    id: "grupo_3",
    name: "Grupo 3",
    assignedAsset: "GGAL",
  },
  {
    id: "grupo_4",
    name: "Grupo 4",
    assignedAsset: "YPF",
  },
  {
    id: "grupo_5",
    name: "Grupo 5",
    assignedAsset: "AAPL",
  },
  {
    id: "grupo_6",
    name: "Grupo 6",
    assignedAsset: "GOOG",
  },
  {
    id: "grupo_7",
    name: "Grupo 7",
    assignedAsset: "AVGO",
  },
  {
    id: "grupo_8",
    name: "Grupo 8",
    assignedAsset: "LLY",
  },
  {
    id: "grupo_9",
    name: "Grupo 9",
    assignedAsset: "PAM",
  },
  {
    id: "grupo_10",
    name: "Grupo 10",
    assignedAsset: "INO",
  },
  {
    id: "allianz",
    name: "Allianz",
    assignedAsset: "SPY",
  },
];

export const POPULAR_TICKERS = [
  { symbol: "BTC-USD", label: "BTC/USD (Bitcoin)", type: "Crypto" },
  { symbol: "ETH-USD", label: "ETH/USD (Ethereum)", type: "Crypto" },
  { symbol: "GGAL", label: "GGAL (Grupo Fin. Galicia)", type: "Stock" },
  { symbol: "YPF", label: "YPF (YPF Sociedad Anónima)", type: "Stock" },
  { symbol: "AAPL", label: "AAPL (Apple Inc.)", type: "Stock" },
  { symbol: "GOOG", label: "GOOG (Alphabet Inc.)", type: "Stock" },
  { symbol: "AVGO", label: "AVGO (Broadcom Inc.)", type: "Stock" },
  { symbol: "LLY", label: "LLY (Eli Lilly and Co.)", type: "Stock" },
  { symbol: "PAM", label: "PAM (Pampa Energía S.A.)", type: "Stock" },
  { symbol: "INO", label: "INO (Inovio Pharmaceuticals)", type: "Stock" },
  { symbol: "SPY", label: "SPY (S&P 500 ETF)", type: "Stock" },
  { symbol: "NVDA", label: "NVDA (NVIDIA Corp)", type: "Stock" },
];
