"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "../lib/types";
import { authService } from "../services/auth-service";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  email: string;
  setEmail: (value: string) => void;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<AuthUser>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await authService.validateToken();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestOtp = useCallback(async (inputEmail: string) => {
    await authService.requestOtp(inputEmail);
  }, []);

  const verifyOtp = useCallback(async (inputEmail: string, otp: string) => {
    const response = await authService.verifyOtp(inputEmail, otp);
    setUser(response.user);
    return response.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setEmail("");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, email, setEmail, requestOtp, verifyOtp, refresh, logout }),
    [user, loading, email, requestOtp, verifyOtp, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
