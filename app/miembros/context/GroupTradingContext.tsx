"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  GroupAuthSession,
  GroupPortfolio,
  OpenPosition,
  ExecutedTrade,
  LeaderboardItem,
  TournamentSettings,
  SaveTournamentParams,
} from "../types/paper-trading";
import {
  loginGroup,
  fetchPortfolio,
  fetchTradesHistory,
  fetchLeaderboardApi,
  submitOrder,
  closePositionApi,
  fetchActiveTournament,
  fetchTournamentsList,
  joinTournamentApi,
  saveTournamentApi,
  deleteTournamentApi,
} from "../services/paperApi";

interface GroupTradingContextType {
  marketType: "PORTFOLIO" | "FUTURES";
  currentGroup: GroupAuthSession | null;
  portfolio: GroupPortfolio | null;
  positions: OpenPosition[];
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
  placeOrder: (
    symbol: string,
    positionSide: "LONG" | "SHORT",
    quantity: number,
    leverage: number,
    marginMode?: "ISOLATED" | "CROSS"
  ) => Promise<{ success: boolean; error?: string }>;
  closePosition: (positionId: string) => Promise<{ success: boolean; error?: string }>;
}

const GroupTradingContext = createContext<GroupTradingContextType | undefined>(undefined);

const STORAGE_KEY = "club_finanzas_group_session";

export const GroupTradingProvider: React.FC<{
  children: React.ReactNode;
  marketType?: "PORTFOLIO" | "FUTURES";
}> = ({ children, marketType = "PORTFOLIO" }) => {
  const TOURNAMENT_STORAGE_KEY = `club_finanzas_selected_tournament_id_${marketType}`;

  const [currentGroup, setCurrentGroup] = useState<GroupAuthSession | null>(null);
  const [portfolio, setPortfolio] = useState<GroupPortfolio | null>(null);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [trades, setTrades] = useState<ExecutedTrade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [tournament, setTournament] = useState<TournamentSettings | null>(null);
  const [availableTournaments, setAvailableTournaments] = useState<TournamentSettings[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Consulta y sincronización del torneo activo y lista de torneos disponibles por mercado
  const refreshTournament = useCallback(async () => {
    try {
      const gid = currentGroup?.id;
      const [data, allTours] = await Promise.all([
        fetchActiveTournament(marketType),
        fetchTournamentsList(gid, marketType),
      ]);

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
      // Ignorar fallos de red silenciosos en background
    }
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
  }, []);

  useEffect(() => {
    refreshTournament();
  }, [refreshTournament]);

  // Cargar datos de portafolio, trades, leaderboard y torneo según el torneo seleccionado
  const refreshTradingData = useCallback(async () => {
    if (!currentGroup) return;
    try {
      setErrorMessage(null);
      const targetGameId = selectedTournamentId || tournament?.id || undefined;

      const [portData, tradesData, lbData, allTours] = await Promise.allSettled([
        fetchPortfolio(currentGroup.id, targetGameId),
        fetchTradesHistory(currentGroup.id, targetGameId),
        fetchLeaderboardApi(targetGameId),
        fetchTournamentsList(currentGroup.id, marketType),
      ]);

      if (portData.status === "fulfilled") {
        setPortfolio(portData.value.portfolio);
        setPositions(portData.value.positions);
      }
      if (tradesData.status === "fulfilled") {
        setTrades(tradesData.value);
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
      setErrorMessage(err instanceof Error ? err.message : "Error al actualizar datos.");
    }
  }, [currentGroup, selectedTournamentId, tournament?.id]);

  // Actualización periódica en segundo plano cada 6 segundos
  useEffect(() => {
    if (currentGroup) {
      refreshTradingData();
      const interval = setInterval(refreshTradingData, 6000);
      return () => clearInterval(interval);
    }
  }, [currentGroup, refreshTradingData]);

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
    setCurrentGroup(null);
    setPortfolio(null);
    setPositions([]);
    setTrades([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOURNAMENT_STORAGE_KEY);
  };

  const placeOrder = async (
    symbol: string,
    positionSide: "LONG" | "SHORT",
    quantity: number,
    leverage: number,
    marginMode: "ISOLATED" | "CROSS" = "ISOLATED"
  ) => {
    if (!currentGroup) return { success: false, error: "No hay sesión de grupo activa." };
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const targetGameId = selectedTournamentId || tournament?.id || undefined;
      await submitOrder({
        groupId: currentGroup.id,
        symbol,
        positionSide,
        quantity,
        leverage,
        marginMode,
        gameId: targetGameId,
      });
      await refreshTradingData();
      setIsActionLoading(false);
      return { success: true };
    } catch (err) {
      setIsActionLoading(false);
      const msg = err instanceof Error ? err.message : "Error al ejecutar la orden.";
      setErrorMessage(msg);
      return { success: false, error: msg };
    }
  };

  const closePosition = async (positionId: string) => {
    if (!currentGroup) return { success: false, error: "No hay sesión de grupo activa." };
    setIsActionLoading(true);
    setErrorMessage(null);
    try {
      const targetGameId = selectedTournamentId || tournament?.id || undefined;
      await closePositionApi(currentGroup.id, positionId, targetGameId);
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
        placeOrder,
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
