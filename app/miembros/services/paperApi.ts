// Cliente de API para Paper Trading - Club de Finanzas UBA

import {
  GroupAuthSession,
  LiveMarketQuote,
  GroupPortfolio,
  OpenPosition,
  ExecutedTrade,
  LeaderboardItem,
} from "../types/paper-trading";

const API_BASE = ""; // En producción se invoca relativo al Worker

export async function loginGroup(
  username: string,
  password: string
): Promise<{ success: boolean; group?: GroupAuthSession; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Error al autenticar grupo." };
    }
    return { success: true, group: data.group };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red al intentar autenticar.",
    };
  }
}

export async function fetchQuote(symbol: string): Promise<LiveMarketQuote> {
  const res = await fetch(`${API_BASE}/api/paper/market/quote/${encodeURIComponent(symbol)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `No se pudo obtener cotización para ${symbol}`);
  }
  return data.data;
}

export async function fetchPortfolio(
  groupId: string
): Promise<{ portfolio: GroupPortfolio; positions: OpenPosition[] }> {
  const res = await fetch(`${API_BASE}/api/paper/portfolio/${encodeURIComponent(groupId)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "No se pudo consultar el portafolio.");
  }
  return data.data;
}

export async function submitOrder(payload: {
  groupId: string;
  symbol: string;
  positionSide: "LONG" | "SHORT";
  quantity: number;
  leverage: number;
  marginMode?: "ISOLATED" | "CROSS";
}) {
  const res = await fetch(`${API_BASE}/api/paper/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al ejecutar la orden.");
  }
  return data.data;
}

export async function closePositionApi(groupId: string, positionId: string) {
  const res = await fetch(`${API_BASE}/api/paper/positions/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, positionId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al cerrar la posición.");
  }
  return data.data;
}

export async function fetchTradesHistory(groupId: string): Promise<ExecutedTrade[]> {
  const res = await fetch(`${API_BASE}/api/paper/trades/${encodeURIComponent(groupId)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al obtener historial de trades.");
  }
  return data.data || [];
}

export async function fetchLeaderboardApi(): Promise<LeaderboardItem[]> {
  const res = await fetch(`${API_BASE}/api/paper/leaderboard`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al cargar el leaderboard.");
  }
  return data.data || [];
}
