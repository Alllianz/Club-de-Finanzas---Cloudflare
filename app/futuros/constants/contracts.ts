// Constantes de Contratos de Futuros y Derivados Financieros
// Club de Finanzas UBA - Terminal Cuantitativo Aegis Futures

export interface FutureContractDef {
  symbol: string;
  name: string;
  underlying: string;
  category: "FX" | "Commodity" | "Index" | "Crypto";
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
  // 1. Contratos Dólar Futuro Matba Rofex
  {
    symbol: "DLR-ABR26",
    name: "Dólar Futuro Rofex Abr 2026",
    underlying: "USD/ARS Mayorista",
    category: "FX",
    multiplier: 1000, // 1 contrato = 1.000 USD
    tickSize: 0.1,
    initialMarginPct: 0.01, // Hasta 100x de apalancamiento
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    maturityDate: "30/04/2026",
    daysToMaturity: 25,
    settlementType: "Cash",
    description: "Contrato estándar de futuros cambiarios con liquidación financiera por diferencias en pesos al tipo de cambio A3500.",
  },
  {
    symbol: "DLR-MAY26",
    name: "Dólar Futuro Rofex May 2026",
    underlying: "USD/ARS Mayorista",
    category: "FX",
    multiplier: 1000,
    tickSize: 0.1,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    maturityDate: "29/05/2026",
    daysToMaturity: 56,
    settlementType: "Cash",
    description: "Posición intermedia de la curva cambiaria Matba Rofex para coberturas corporativas.",
  },
  {
    symbol: "DLR-JUN26",
    name: "Dólar Futuro Rofex Jun 2026",
    underlying: "USD/ARS Mayorista",
    category: "FX",
    multiplier: 1000,
    tickSize: 0.1,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    maturityDate: "30/06/2026",
    daysToMaturity: 86,
    settlementType: "Cash",
    description: "Posición trimestral de futuros cambiarios para análisis de paridad cubierta de tasas.",
  },

  // 2. Materias Primas / Commodities (CME / NYMEX)
  {
    symbol: "CL=F",
    name: "Petróleo Crudo WTI (Crude Oil)",
    underlying: "West Texas Intermediate",
    category: "Commodity",
    multiplier: 1000, // 1 contrato = 1.000 barriles
    tickSize: 0.01,
    initialMarginPct: 0.01, // Hasta 100x
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Futuro del petróleo crudo WTI en NYMEX. Cobertura ante shocks energéticos y términos de intercambio.",
  },
  {
    symbol: "GC=F",
    name: "Oro Futuros (Gold COMEX)",
    underlying: "Gold Bullion (100 oz)",
    category: "Commodity",
    multiplier: 100, // 1 contrato = 100 onzas troy
    tickSize: 0.1,
    initialMarginPct: 0.01, // Hasta 100x
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Activo de cobertura por excelencia contra volatilidad inflacionaria y riesgo geopolítico global.",
  },
  {
    symbol: "ZS=F",
    name: "Soja Chicago (Soybeans CBOT)",
    underlying: "Soybeans (5,000 bushels)",
    category: "Commodity",
    multiplier: 50, // Escala normalizada
    tickSize: 0.25,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Commodity agrícola crítico para el balance comercial argentino y la liquidación de divisas.",
  },

  // 3. Índices Financieros
  {
    symbol: "ES=F",
    name: "S&P 500 E-mini Future",
    underlying: "S&P 500 Index",
    category: "Index",
    multiplier: 50,
    tickSize: 0.25,
    initialMarginPct: 0.01, // Hasta 100x apalancamiento
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
    initialMarginPct: 0.01, // Hasta 100x
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Derivado bursátil de alta volatilidad y exposición a empresas tecnológicas de gran capitalización.",
  },

  // 4. Criptomonedas Perpetuas
  {
    symbol: "BTC-USD",
    name: "Bitcoin Perpetual Swap (BTC-PERP)",
    underlying: "Bitcoin / USD",
    category: "Crypto",
    multiplier: 1,
    tickSize: 0.5,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Contrato perpetuo continuo con financiamiento cada 8 horas y apalancamiento de hasta 100x.",
  },
  {
    symbol: "ETH-USD",
    name: "Ethereum Perpetual Swap (ETH-PERP)",
    underlying: "Ethereum / USD",
    category: "Crypto",
    multiplier: 1,
    tickSize: 0.1,
    initialMarginPct: 0.01,
    maintenanceMarginPct: 0.005,
    maxLeverage: 100,
    settlementType: "Cash",
    description: "Contrato perpetuo sobre el token de contratos inteligentes con apalancamiento de hasta 100x.",
  },
];

export const FUTURES_TICKERS = [
  { symbol: "DLR-ABR26", label: "DLR Abr 26 (Rofex)", type: "Futures" },
  { symbol: "DLR-MAY26", label: "DLR May 26 (Rofex)", type: "Futures" },
  { symbol: "DLR-JUN26", label: "DLR Jun 26 (Rofex)", type: "Futures" },
  { symbol: "CL=F", label: "Crude Oil WTI", type: "Futures" },
  { symbol: "GC=F", label: "Gold (Oro COMEX)", type: "Futures" },
  { symbol: "ZS=F", label: "Soja (CBOT)", type: "Futures" },
  { symbol: "ES=F", label: "S&P 500 E-mini", type: "Futures" },
  { symbol: "NQ=F", label: "Nasdaq 100 E-mini", type: "Futures" },
  { symbol: "BTC-USD", label: "BTC/USD Perp", type: "Crypto" },
  { symbol: "ETH-USD", label: "ETH/USD Perp", type: "Crypto" },
];
