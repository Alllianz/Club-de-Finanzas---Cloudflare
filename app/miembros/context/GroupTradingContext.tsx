"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  GroupAuthSession,
  GroupPortfolio,
  OpenPosition,
  ExecutedTrade,
  LeaderboardItem,
} from "../types/paper-trading";
import {
  loginGroup,
  fetchPortfolio,
  fetchTradesHistory,
  fetchLeaderboardApi,
  submitOrder,
  closePositionApi,
} from "../services/paperApi";

interface GroupTradingContextType {
  currentGroup: GroupAuthSession | null;
  portfolio: GroupPortfolio | null;
  positions: OpenPosition[];
  trades: ExecutedTrade[];
  leaderboard: LeaderboardItem[];
  isLoading: boolean;
  isActionLoading: boolean;
  errorMessage: string | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshTradingData: () => Promise<void>;
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

export const GroupTradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentGroup, setCurrentGroup] = useState<GroupAuthSession | null>(null);
  const [portfolio, setPortfolio] = useState<GroupPortfolio | null>(null);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [trades, setTrades] = useState<ExecutedTrade[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Restaurar sesión de grupo persistida en localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GroupAuthSession;
        if (parsed && parsed.id) {
          setCurrentGroup(parsed);
        }
      }
    } catch {
      // Ignorar fallos de parsing de sesión
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos de portafolio, trades y leaderboard
  const refreshTradingData = useCallback(async () => {
    if (!currentGroup) return;
    try {
      setErrorMessage(null);
      const [portData, tradesData, lbData] = await Promise.allSettled([
        fetchPortfolio(currentGroup.id),
        fetchTradesHistory(currentGroup.id),
        fetchLeaderboardApi(),
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
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error al actualizar datos.");
    }
  }, [currentGroup]);

  // Actualización periódica cada 15 segundos
  useEffect(() => {
    if (currentGroup) {
      refreshTradingData();
      const interval = setInterval(refreshTradingData, 15000);
      return () => clearInterval(interval);
    }
  }, [currentGroup, refreshTradingData]);

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
      await submitOrder({
        groupId: currentGroup.id,
        symbol,
        positionSide,
        quantity,
        leverage,
        marginMode,
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
      await closePositionApi(currentGroup.id, positionId);
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

  return (
    <GroupTradingContext.Provider
      value={{
        currentGroup,
        portfolio,
        positions,
        trades,
        leaderboard,
        isLoading,
        isActionLoading,
        errorMessage,
        login,
        logout,
        refreshTradingData,
        placeOrder,
        closePosition,
      }}
    >
      {children}
    </GroupTradingContext.Provider>
  );
};

export function useGroupTrading() {
  const ctx = useContext(GroupTradingContext);
  if (!ctx) {
    throw new Error("useGroupTrading debe usarse dentro de un GroupTradingProvider");
  }
  return ctx;
}
