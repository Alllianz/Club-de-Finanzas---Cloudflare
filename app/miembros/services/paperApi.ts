// Cliente de API para Paper Trading - Club de Finanzas UBA

import {
  GroupAuthSession,
  LiveMarketQuote,
  GroupPortfolio,
  OpenPosition,
  ExecutedTrade,
  PendingOrder,
  LeaderboardItem,
  TournamentSettings,
  SaveTournamentParams,
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
  groupId: string,
  gameId?: string
): Promise<{ portfolio: GroupPortfolio; positions: OpenPosition[] }> {
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const res = await fetch(`${API_BASE}/api/paper/portfolio/${encodeURIComponent(groupId)}${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "No se pudo consultar el portafolio.");
  }
  return data.data;
}

export async function submitOrder(payload: {
  groupId: string;
  symbol: string;
  orderSide?: "BUY" | "SELL";
  positionSide?: "LONG" | "SHORT";
  orderType?: "MARKET" | "LIMIT";
  quantity: number;
  limitPrice?: number;
  leverage: number;
  marginMode?: "ISOLATED" | "CROSS";
  gameId?: string;
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

export async function fetchPendingOrders(groupId: string, gameId?: string): Promise<PendingOrder[]> {
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const res = await fetch(`${API_BASE}/api/paper/orders/${encodeURIComponent(groupId)}${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al consultar órdenes.");
  }
  return data.data || [];
}

export async function cancelOrderApi(groupId: string, orderId: string, gameId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/orders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, orderId, gameId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Error al cancelar la orden." };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red al cancelar orden.",
    };
  }
}

export async function closePositionApi(groupId: string, positionId: string, gameId?: string, quantity?: number) {
  const res = await fetch(`${API_BASE}/api/paper/positions/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, positionId, gameId, quantity }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al cerrar la posición.");
  }
  return data.data;
}

export async function fetchTradesHistory(groupId: string, gameId?: string): Promise<ExecutedTrade[]> {
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const res = await fetch(`${API_BASE}/api/paper/trades/${encodeURIComponent(groupId)}${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al obtener historial de trades.");
  }
  return data.data || [];
}

export async function fetchLeaderboardApi(gameId?: string): Promise<LeaderboardItem[]> {
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
  const res = await fetch(`${API_BASE}/api/paper/leaderboard${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al cargar el leaderboard.");
  }
  return data.data || [];
}

export async function fetchTournamentsList(
  groupId?: string,
  marketType?: string
): Promise<TournamentSettings[]> {
  try {
    const params = new URLSearchParams();
    if (groupId) params.append("groupId", groupId);
    if (marketType) params.append("marketType", marketType);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/paper/tournaments${query}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return [];
    }
    return data.data || [];
  } catch {
    return [];
  }
}

export async function joinTournamentApi(
  groupId: string,
  tournamentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/tournaments/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, tournamentId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "No se pudo unir al torneo." };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red al unirse al torneo.",
    };
  }
}

export async function deleteTournamentApi(
  tournamentId: string,
  creatorId: string = "allianz"
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/tournaments/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournamentId, creatorId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "No se pudo eliminar el torneo." };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red al eliminar el torneo.",
    };
  }
}

export async function fetchActiveTournament(marketType?: string): Promise<TournamentSettings | null> {
  try {
    const query = marketType ? `?marketType=${encodeURIComponent(marketType)}` : "";
    const res = await fetch(`${API_BASE}/api/paper/tournament${query}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      return null;
    }
    return data.data;
  } catch {
    return null;
  }
}

export async function saveTournamentApi(
  params: SaveTournamentParams
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/tournament`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Error al configurar el torneo." };
    }
    return { success: true, data: data.data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red al configurar torneo.",
    };
  }
}
