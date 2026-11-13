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
  EquityCurvePoint,
  GroupEquitySeries,
  EquityCurveSeriesResult,
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
  const cleanSymbol = (symbol || "").trim().toUpperCase();
  if (cleanSymbol.length < 2) {
    throw new Error("El símbolo debe tener al menos 2 caracteres.");
  }
  // Se omiten ?_t y cache: no-store para permitir que Cloudflare Edge Cache optimice las peticiones concurrentes
  const res = await fetch(`${API_BASE}/api/paper/market/quote/${encodeURIComponent(cleanSymbol)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `No se pudo obtener cotización para ${cleanSymbol}`);
  }
  return data.data;
}

export async function fetchQuotesBatch(symbols: string[]): Promise<Record<string, LiveMarketQuote>> {
  const validSymbols = Array.from(
    new Set(
      symbols
        .map((s) => (s || "").trim().toUpperCase())
        .filter((s) => s.length >= 2)
    )
  );
  if (validSymbols.length === 0) {
    return {};
  }

  // Petición por lote optimizada: reduce N peticiones a 1 sola llamada con soporte de Edge Cache
  const query = `?symbols=${encodeURIComponent(validSymbols.join(","))}`;
  const res = await fetch(`${API_BASE}/api/paper/market/quotes-batch${query}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "No se pudieron obtener cotizaciones en lote.");
  }
  return data.data || {};
}

export async function fetchPortfolio(
  groupId: string,
  gameId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<{ portfolio: GroupPortfolio; positions: OpenPosition[] }> {
  const params = new URLSearchParams();
  if (gameId) params.append("gameId", gameId);
  if (marketType) params.append("marketType", marketType);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/paper/portfolio/${encodeURIComponent(groupId)}${query}`, {
    signal,
  });
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
  marketType?: string;
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

export async function fetchPendingOrders(
  groupId: string,
  gameId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<PendingOrder[]> {
  const params = new URLSearchParams();
  if (gameId) params.append("gameId", gameId);
  if (marketType) params.append("marketType", marketType);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/paper/orders/${encodeURIComponent(groupId)}${query}`, {
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al consultar órdenes.");
  }
  return data.data || [];
}

export async function cancelOrderApi(
  groupId: string,
  orderId: string,
  gameId?: string,
  marketType?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/orders/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, orderId, gameId, marketType }),
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

export async function closePositionApi(
  groupId: string,
  positionId: string,
  gameId?: string,
  quantity?: number,
  marketType?: string
) {
  const res = await fetch(`${API_BASE}/api/paper/positions/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId, positionId, gameId, quantity, marketType }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al cerrar la posición.");
  }
  return data.data;
}

export async function fetchTradesHistory(
  groupId: string,
  gameId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<ExecutedTrade[]> {
  const params = new URLSearchParams();
  if (gameId) params.append("gameId", gameId);
  if (marketType) params.append("marketType", marketType);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/paper/trades/${encodeURIComponent(groupId)}${query}`, {
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al obtener historial de trades.");
  }
  return data.data || [];
}

export async function fetchLeaderboardApi(
  gameId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<LeaderboardItem[]> {
  const params = new URLSearchParams();
  if (gameId) params.append("gameId", gameId);
  if (marketType) params.append("marketType", marketType);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/paper/leaderboard${query}`, {
    signal,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Error al cargar el leaderboard.");
  }
  return data.data || [];
}

export async function fetchTournamentsList(
  groupId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<TournamentSettings[]> {
  try {
    const params = new URLSearchParams();
    if (groupId) params.append("groupId", groupId);
    if (marketType) params.append("marketType", marketType);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/paper/tournaments${query}`, {
      signal,
    });
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

export async function fetchActiveTournament(
  marketType?: string,
  signal?: AbortSignal
): Promise<TournamentSettings | null> {
  try {
    const query = marketType ? `?marketType=${encodeURIComponent(marketType)}` : "";
    const res = await fetch(`${API_BASE}/api/paper/tournament${query}`, {
      signal,
    });
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

export async function renameGroupApi(
  groupId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/paper/group/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, newName }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "No se pudo actualizar el nombre del equipo." };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error de red al intentar renombrar equipo.",
    };
  }
}

export async function fetchDailySnapshotsApi(
  groupId: string,
  gameId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<any[]> {
  try {
    const params = new URLSearchParams({ groupId });
    if (gameId) params.append("gameId", gameId);
    if (marketType) params.append("marketType", marketType);
    const res = await fetch(`${API_BASE}/api/paper/daily-snapshots?${params.toString()}`, {
      signal,
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

export async function fetchEquityCurveApi(
  gameId?: string,
  marketType?: string,
  signal?: AbortSignal
): Promise<EquityCurveSeriesResult | null> {
  try {
    const params = new URLSearchParams();
    if (gameId) params.append("gameId", gameId);
    if (marketType) params.append("marketType", marketType);
    params.append("reconstruct", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/paper/equity-curve${query}`, {
      signal,
    });
    const data = await res.json();
    return data.success ? (data.data || data) : null;
  } catch {
    return null;
  }
}

