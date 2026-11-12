"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  GroupAuthSession,
  GroupPortfolio,
  OpenPosition,
  ExecutedTrade,
  PendingOrder,
  LeaderboardItem,
  TournamentSettings,
  SaveTournamentParams,
} from "../types/paper-trading";
import {
  loginGroup,
  fetchPortfolio,
  fetchTradesHistory,
  fetchPendingOrders,
  fetchLeaderboardApi,
  submitOrder,
  cancelOrderApi,
  closePositionApi,
  fetchActiveTournament,
  fetchTournamentsList,
  joinTournamentApi,
  saveTournamentApi,
  deleteTournamentApi,
  renameGroupApi,
} from "../services/paperApi";

interface GroupTradingContextType {
  marketType: "PORTFOLIO" | "FUTURES";
  currentGroup: GroupAuthSession | null;
  portfolio: GroupPortfolio | null;
  positions: OpenPosition[];
  pendingOrders: PendingOrder[];
  trades: ExecutedTrade[];
  leaderboard: LeaderboardItem[];
  tournament: TournamentSettings | null;
  availableTournaments: TournamentSettings[];
  selectedTournamentId: string | null;
  isLoading: boolean;
  isActionLoading: boolean;
  errorMessage: string | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  selectTournament: (tournamentId: string) => void;
  joinTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  refreshTradingData: () => Promise<void>;
  refreshTournament: () => Promise<void>;
  saveTournamentConfig: (
    params: Omit<SaveTournamentParams, "creatorId">
  ) => Promise<{ success: boolean; error?: string }>;
  deleteTournament: (tournamentId: string) => Promise<{ success: boolean; error?: string }>;
  renameGroup: (groupId: string, newName: string) => Promise<{ success: boolean; error?: string }>;
  placeOrder: (
    symbol: string,
    side: "BUY" | "SELL" | "LONG" | "SHORT",
    quantity: number,
    leverage: number,
    marginModeOrOrderType?: "ISOLATED" | "CROSS" | "MARKET" | "LIMIT",
    orderTypeOrLimitPrice?: "MARKET" | "LIMIT" | number,
    limitPriceOrMarginMode?: number | "ISOLATED" | "CROSS"
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  closePosition: (positionId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>;
}

const GroupTradingContext = createContext<GroupTradingContextType | undefined>(undefined);

const STORAGE_KEY = "club_finanzas_group_session";

export const GroupTradingProvider: React.FC<{
  children: React.ReactNode;
  marketType?: "PORTFOLIO" | "FUTURES";
  pollingEnabled?: boolean;
}> = ({ children, marketType = "PORTFOLIO", pollingEnabled = true }) => {
  const TOURNAMENT_STORAGE_KEY = `club_finanzas_selected_tournament_id_${marketType}`;

  const [currentGroup, setCurrentGroup] = useState<GroupAuthSession | null>(null);
  const [portfolio, setPortfolio] = useState<GroupPortfolio | null>(null);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [trades, setTrades] = useState<ExecutedTrade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [tournament, setTournament] = useState<TournamentSettings | null>(null);
  const [availableTournaments, setAvailableTournaments] = useState<TournamentSettings[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [isTournamentReady, setIsTournamentReady] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);
  const tournamentAbortRef = useRef<AbortController | null>(null);
  const tournamentPromiseRef = useRef<Promise<void> | null>(null);

  // Page Visibility API: Detecta cuando el usuario cambia de pestaña para pausar polling
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(!document.hidden);
    };
    if (typeof document !== "undefined") {
      setIsTabVisible(!document.hidden);
      document.addEventListener("visibilitychange", handleVisibility);
    }
    return () => {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, []);

  // Reiniciar estado y abortar peticiones pendientes al cambiar de marketType para evitar mezcla de datos
  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (tournamentAbortRef.current) {
      tournamentAbortRef.current.abort();
    }
    requestSeqRef.current++;

    setPortfolio(null);
    setPositions([]);
    setPendingOrders([]);
    setTrades([]);
    setLeaderboard([]);
    setTournament(null);
    setAvailableTournaments([]);
    setIsTournamentReady(false);
    setErrorMessage(null);

    try {
      const savedTourId = localStorage.getItem(`club_finanzas_selected_tournament_id_${marketType}`);
      setSelectedTournamentId(savedTourId || null);
    } catch {
      setSelectedTournamentId(null);
    }
  }, [marketType]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      tournamentAbortRef.current?.abort();
    };
  }, []);

  // Consulta y sincronización del torneo activo y lista de torneos disponibles por mercado
  const refreshTournament = useCallback(async () => {
    if (tournamentAbortRef.current) {
      tournamentAbortRef.current.abort();
    }
    const controller = new AbortController();
    tournamentAbortRef.current = controller;

    const run = async () => {
      try {
        const gid = currentGroup?.id;
        const [data, allTours] = await Promise.all([
          fetchActiveTournament(marketType, controller.signal),
          fetchTournamentsList(gid, marketType, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        if (allTours && allTours.length > 0) {
          setAvailableTournaments(allTours);
        } else {
          setAvailableTournaments([]);
        }

        if (data) {
          setTournament((prev) => {
            if (selectedTournamentId && allTours) {
              const currentSelected = allTours.find((t) => t.id === selectedTournamentId);
              if (currentSelected) return currentSelected;
            }
            return data;
          });

          setSelectedTournamentId((prev) => {
            if (prev && allTours && allTours.some((t) => t.id === prev)) {
              return prev;
            }
            return data.id;
          });
        }
      } catch {
        // Silencioso
      } finally {
        if (!controller.signal.aborted) {
          setIsTournamentReady(true);
        }
      }
    };

    const p = run();
    tournamentPromiseRef.current = p;
    return p;
  }, [currentGroup?.id, selectedTournamentId, marketType]);

  // Restaurar sesión de grupo persistida y torneo seleccionado en localStorage
  useEffect(() => {
    try {
      const savedTourId = localStorage.getItem(TOURNAMENT_STORAGE_KEY);
      if (savedTourId) {
        setSelectedTournamentId(savedTourId);
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GroupAuthSession;
        if (parsed && parsed.id) {
          setCurrentGroup(parsed);
        }
      }
    } catch {
      // Ignorar
    } finally {
      setIsLoading(false);
    }
  }, [TOURNAMENT_STORAGE_KEY]);

  useEffect(() => {
    refreshTournament();
  }, [refreshTournament]);

  // Cargar datos de portafolio, trades, leaderboard y torneo según el torneo seleccionado
  const refreshTradingData = useCallback(async () => {
    if (!currentGroup) return;

    if (!isTournamentReady) {
      if (tournamentPromiseRef.current) {
        await tournamentPromiseRef.current;
      } else {
        await refreshTournament();
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentSeq = ++requestSeqRef.current;

    try {
      setErrorMessage(null);
      const targetGameId = selectedTournamentId || tournament?.id || undefined;

      const [portData, tradesData, ordersData, lbData, allTours] = await Promise.allSettled([
        fetchPortfolio(currentGroup.id, targetGameId, marketType, controller.signal),
        fetchTradesHistory(currentGroup.id, targetGameId, marketType, controller.signal),
        fetchPendingOrders(currentGroup.id, targetGameId, marketType, controller.signal),
        fetchLeaderboardApi(targetGameId, marketType, controller.signal),
        fetchTournamentsList(currentGroup.id, marketType, controller.signal),
      ]);

      if (controller.signal.aborted || currentSeq !== requestSeqRef.current) {
        return;
      }

      if (portData.status === "fulfilled") {
        setPortfolio(portData.value.portfolio);
        setPositions(portData.value.positions);
      }
      if (tradesData.status === "fulfilled") {
        setTrades(tradesData.value);
      }
      if (ordersData.status === "fulfilled") {
        setPendingOrders(ordersData.value);
      }
      if (lbData.status === "fulfilled") {
        setLeaderboard(lbData.value);
      }
      if (allTours.status === "fulfilled" && allTours.value.length > 0) {
        setAvailableTournaments(allTours.value);
        if (targetGameId) {
          const match = allTours.value.find((t) => t.id === targetGameId);
          if (match) {
            setTournament((prev) => {
              if (
                prev &&
                prev.id === match.id &&
                prev.startDate === match.startDate &&
                prev.endDate === match.endDate &&
                prev.title === match.title &&
                prev.initialCapital === match.initialCapital &&
                prev.maxLeverage === match.maxLeverage &&
                prev.allowShort === match.allowShort &&
                prev.rebalanceDay === match.rebalanceDay &&
                prev.tradingStartTime === match.tradingStartTime &&
                prev.tradingEndTime === match.tradingEndTime &&
                prev.maxTradesPerWeek === match.maxTradesPerWeek
              ) {
                return prev;
              }
              return match;
            });
          }
        }
      }
    } catch (err) {
      if (controller.signal.aborted || currentSeq !== requestSeqRef.current) {
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : "Error al actualizar datos.");
    }
  }, [currentGroup, selectedTournamentId, tournament?.id, marketType, isTournamentReady, refreshTournament]);

  // Actualización periódica en segundo plano optimizada a 20 segundos
  // Se suspende inmediatamente si la pestaña está oculta (document.hidden) o si pollingEnabled es false o si el torneo aún no está listo
  useEffect(() => {
    if (currentGroup && pollingEnabled && isTabVisible && isTournamentReady) {
      refreshTradingData();
      const interval = setInterval(() => {
        if (!document.hidden) {
          refreshTradingData();
        }
      }, 20000);
      return () => clearInterval(interval);
    }
  }, [currentGroup, pollingEnabled, isTabVisible, isTournamentReady, refreshTradingData]);

  const selectTournament = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    try {
      localStorage.setItem(TOURNAMENT_STORAGE_KEY, tournamentId);
    } catch {
      // Ignorar
    }
    const match = availableTournaments.find((t) => t.id === tournamentId);
    if (match) setTournament(match);
  };

  const joinTournament = async (tournamentId: string) => {
    if (!currentGroup) return { success: false, error: "No hay sesión de grupo activa." };
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await joinTournamentApi(currentGroup.id, tournamentId);
      if (res.success) {
        selectTournament(tournamentId);
        await refreshTradingData();
        await refreshTournament();
      }
      setIsActionLoading(false);
      return res;
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al unirse al torneo.";
      return { success: false, error: msg };
    }
  };

  const login = async (username: string, pass: string) => {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginGroup(username, pass);
      if (!res.success || !res.group) {
        setIsActionLoading(false);
        return { success: false, error: res.error || "Credenciales incorrectas." };
      }
      setCurrentGroup(res.group);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res.group));
      setIsActionLoading(false);
      return { success: true };
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión.";
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (tournamentAbortRef.current) {
      tournamentAbortRef.current.abort();
    }
    requestSeqRef.current++;
    setCurrentGroup(null);
    setPortfolio(null);
    setPositions([]);
    setPendingOrders([]);
    setTrades([]);
    setLeaderboard([]);
    setTournament(null);
    setAvailableTournaments([]);
    setIsTournamentReady(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
  };

  const renameGroup = async (groupId: string, newName: string) => {
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await renameGroupApi(groupId, newName);
      if (res.success) {
        if (currentGroup && (currentGroup.id === groupId || currentGroup.id === groupId.toLowerCase())) {
          const updated = { ...currentGroup, name: newName };
          setCurrentGroup(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
        await refreshTradingData();
        setIsActionLoading(false);
        return { success: true };
      } else {
        setIsActionLoading(false);
        return { success: false, error: res.error || "No se pudo actualizar el nombre del equipo." };
      }
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al renombrar equipo.";
      return { success: false, error: msg };
    }
  };

  const placeOrder = async (
    symbol: string,
    side: "BUY" | "SELL" | "LONG" | "SHORT",
    quantity: number,
    leverage: number,
    marginModeOrOrderType?: "ISOLATED" | "CROSS" | "MARKET" | "LIMIT",
    orderTypeOrLimitPrice?: "MARKET" | "LIMIT" | number,
    limitPriceOrMarginMode?: number | "ISOLATED" | "CROSS"
  ) => {
    if (!currentGroup) return { success: false, error: "No hay sesión de grupo activa." };
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const orderSide: "BUY" | "SELL" = (side === "SELL" || side === "SHORT") ? "SELL" : "BUY";
      const positionSide: "LONG" | "SHORT" = (side === "SHORT" || side === "SELL") ? "SHORT" : "LONG";

      let marginMode: "ISOLATED" | "CROSS" = "ISOLATED";
      let orderType: "MARKET" | "LIMIT" = "MARKET";
      let limitPrice: number | undefined = undefined;

      if (marginModeOrOrderType === "ISOLATED" || marginModeOrOrderType === "CROSS") {
        marginMode = marginModeOrOrderType;
        if (orderTypeOrLimitPrice === "LIMIT" || orderTypeOrLimitPrice === "MARKET") {
          orderType = orderTypeOrLimitPrice;
        }
        if (typeof limitPriceOrMarginMode === "number") {
          limitPrice = limitPriceOrMarginMode;
        }
      } else if (marginModeOrOrderType === "LIMIT" || marginModeOrOrderType === "MARKET") {
        orderType = marginModeOrOrderType;
        if (typeof orderTypeOrLimitPrice === "number") {
          limitPrice = orderTypeOrLimitPrice;
        }
        if (limitPriceOrMarginMode === "CROSS" || limitPriceOrMarginMode === "ISOLATED") {
          marginMode = limitPriceOrMarginMode;
        }
      }

      const targetGameId = selectedTournamentId || tournament?.id || undefined;
      const res = await submitOrder({
        groupId: currentGroup.id,
        symbol,
        orderSide,
        positionSide,
        orderType,
        quantity,
        limitPrice,
        leverage,
        marginMode,
        gameId: targetGameId,
        marketType,
      });
      setIsActionLoading(false);
      void refreshTradingData();
      return { success: true, message: res?.message };
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al ejecutar la orden.";
      setErrorMessage(msg);
      return { success: false, error: msg };
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!currentGroup) return { success: false, error: "No hay sesión de grupo activa." };
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const targetGameId = selectedTournamentId || tournament?.id || undefined;
      const res = await cancelOrderApi(currentGroup.id, orderId, targetGameId, marketType);
      await refreshTradingData();
      setIsActionLoading(false);
      return res;
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al cancelar la orden.";
      setErrorMessage(msg);
      return { success: false, error: msg };
    }
  };

  const closePosition = async (positionId: string, quantity?: number) => {
    if (!currentGroup) return { success: false, error: "No hay sesión de grupo activa." };
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const targetGameId = selectedTournamentId || tournament?.id || undefined;
      await closePositionApi(currentGroup.id, positionId, targetGameId, quantity, marketType);
      await refreshTradingData();
      setIsActionLoading(false);
      return { success: true };
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al cerrar la posición.";
      setErrorMessage(msg);
      return { success: false, error: msg };
    }
  };

  const saveTournamentConfig = async (
    params: Omit<SaveTournamentParams, "creatorId">
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || currentGroup.id !== "allianz") {
      return { success: false, error: "Solo el usuario Allianz puede administrar torneos." };
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await saveTournamentApi({
        ...params,
        creatorId: "allianz",
        tournamentType: params.tournamentType || marketType,
        marketType: params.marketType || marketType,
      });
      if (!res.success) {
        setIsActionLoading(false);
        return { success: false, error: res.error || "No se pudo actualizar el torneo." };
      }
      await refreshTournament();
      await refreshTradingData();
      setIsActionLoading(false);
      return { success: true };
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al configurar torneo.";
      return { success: false, error: msg };
    }
  };

  const deleteTournament = async (tournamentId: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentGroup || currentGroup.id !== "allianz") {
      return { success: false, error: "Solo el usuario Allianz puede eliminar torneos." };
    }
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await deleteTournamentApi(tournamentId, "allianz");
      if (!res.success) {
        setIsActionLoading(false);
        return { success: false, error: res.error || "No se pudo eliminar el torneo." };
      }
      if (selectedTournamentId === tournamentId) {
        try {
          localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
        } catch {}
        setSelectedTournamentId(null);
      }
      await refreshTournament();
      await refreshTradingData();
      setIsActionLoading(false);
      return { success: true };
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al eliminar torneo.";
      return { success: false, error: msg };
    }
  };

  return (
    <GroupTradingContext.Provider
      value={{
        marketType,
        currentGroup,
        portfolio,
        positions,
        pendingOrders,
        trades,
        leaderboard,
        tournament,
        availableTournaments,
        selectedTournamentId,
        isLoading,
        isActionLoading,
        errorMessage,
        login,
        logout,
        selectTournament,
        joinTournament,
        refreshTradingData,
        refreshTournament,
        saveTournamentConfig,
        deleteTournament,
        renameGroup,
        placeOrder,
        cancelOrder,
        closePosition,
      }}
    >
      {children}
    </GroupTradingContext.Provider>
  );
};

export const useGroupTrading = () => {
  const context = useContext(GroupTradingContext);
  if (!context) {
    throw new Error("useGroupTrading debe ser utilizado dentro de un GroupTradingProvider");
  }
  return context;
};
