export interface FutureContractDef {
  symbol: string;
  name: string;
  underlying: string;
  category: "Crypto FX" | "Commodity" | "Index" | "Crypto";
  multiplier: number;
  tickSize: number;
  initialMarginPct: number;
  maintenanceMarginPct: number;
  maxLeverage: number;
  maturityDate?: string;
  daysToMaturity?: number;
  settlementType: "Cash" | "Physical";
  description: string;
}

export const FUTURES_CONTRACTS: FutureContractDef[] = [
  {
    symbol: "USDTARS",
    name: "Tether / Peso Argentino (USDT/ARS)",
    underlying: "USDT / ARS Binance Spot & FX",
    category: "Crypto FX",
    multiplier: 1,
    tickSize: 0.1,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Par de referencia cambiaria libre operado 24/7 en Binance para arbitraje y cobertura cambiaria.",
  },
  {
    symbol: "BTCUSDT",
    name: "Bitcoin Perpetual Swap (BTC/USDT)",
    underlying: "Bitcoin / USDT",
    category: "Crypto",
    multiplier: 1,
    tickSize: 0.1,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Contrato perpetuo sobre Bitcoin referenciado a USDT en Binance con apalancamiento de hasta 100x.",
  },
  {
    symbol: "ETHUSDT",
    name: "Ethereum Perpetual Swap (ETH/USDT)",
    underlying: "Ethereum / USDT",
    category: "Crypto",
    multiplier: 1,
    tickSize: 0.01,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Contrato perpetuo sobre Ethereum referenciado a USDT en Binance con apalancamiento de hasta 100x.",
  },
  {
    symbol: "PAXGUSDT",
    name: "PAX Gold Perpetual Swap (PAXG/USDT)",
    underlying: "PAX Gold (Tokenized Gold) / USDT",
    category: "Crypto",
    multiplier: 1,
    tickSize: 0.01,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Contrato referenciado a oro tokenizado PAX Gold respaldado 1:1 por onzas troy de oro fino.",
  },
  {
    symbol: "CL=F",
    name: "Petróleo Crudo WTI (Crude Oil)",
    underlying: "West Texas Intermediate",
    category: "Commodity",
    multiplier: 1000,
    tickSize: 0.01,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Futuro del petróleo crudo WTI en NYMEX. Derivado energético de referencia internacional.",
  },
  {
    symbol: "GC=F",
    name: "Oro Futuros (Gold COMEX)",
    underlying: "Gold Bullion (100 oz)",
    category: "Commodity",
    multiplier: 100,
    tickSize: 0.1,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Activo de resguardo de valor por excelencia contra volatilidad inflacionaria y riesgo macroeconómico global.",
  },
  {
    symbol: "ZS=F",
    name: "Soja Chicago (Soybeans CBOT)",
    underlying: "Soybeans (5,000 bushels)",
    category: "Commodity",
    multiplier: 50,
    tickSize: 0.25,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Commodity agrícola crítico para el balance comercial argentino y la liquidación de divisas.",
  },
  {
    symbol: "ES=F",
    name: "S&P 500 E-mini Future",
    underlying: "S&P 500 Index",
    category: "Index",
    multiplier: 50,
    tickSize: 0.25,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "El derivado de acciones más líquido del mundo en el Chicago Mercantile Exchange (CME).",
  },
  {
    symbol: "NQ=F",
    name: "Nasdaq 100 E-mini Future",
    underlying: "Nasdaq-100 Tech Index",
    category: "Index",
    multiplier: 20,
    tickSize: 0.25,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Derivado bursátil de alta volatilidad y exposición a empresas tecnológicas de gran capitalización.",
  },
];

export const FUTURES_TICKERS = [
  { symbol: "USDTARS", label: "USDT/ARS Binance", type: "Crypto FX" },
  { symbol: "BTCUSDT", label: "BTC/USDT Perp", type: "Crypto" },
  { symbol: "ETHUSDT", label: "ETH/USDT Perp", type: "Crypto" },
  { symbol: "PAXGUSDT", label: "PAXG/USDT (Oro)", type: "Crypto" },
  { symbol: "CL=F", label: "Crude Oil WTI", type: "Futures" },
  { symbol: "GC=F", label: "Gold (Oro COMEX)", type: "Futures" },
  { symbol: "ZS=F", label: "Soja (CBOT)", type: "Futures" },
  { symbol: "ES=F", label: "S&P 500 E-mini", type: "Futures" },
  { symbol: "NQ=F", label: "Nasdaq 100 E-mini", type: "Futures" },
];
