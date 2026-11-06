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
  loginAdmin: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<AuthUser>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ADMIN_STORAGE_KEY = "club_admin_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  const refresh = useCallback(async () => {
    try {
      // 1. Verificar si hay sesión de admin persistida en localStorage
      const savedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (savedAdmin) {
        const parsed = JSON.parse(savedAdmin) as AuthUser;
        if (parsed && (parsed.fullName === "Allianz" || parsed.role === "ADMIN")) {
          setUser(parsed);
          setLoading(false);
          return;
        }
      }

      // 2. Verificar vía cookie / backend
      const response = await authService.validateToken();
      setUser(response.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAdmin = useCallback(async (username: string, pass: string) => {
    const trimmedUser = (username || "").trim();
    const trimmedPass = (pass || "").trim();

    if (trimmedUser.toLowerCase() === "allianz" && trimmedPass === "LuciaSape") {
      const adminUser: AuthUser = {
        id: "admin_allianz",
        email: "allianz@clubdefinanzas.uba.ar",
        fullName: "Allianz",
        role: "ADMIN",
        isActive: true,
      };
      setUser(adminUser);
      try {
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
      } catch {
        // Ignorar fallos de storage
      }
      return { success: true };
    }

    return {
      success: false,
      error: "Credenciales inválidas. Usuario o contraseña incorrectos.",
    };
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
    try {
      await authService.logout();
    } catch {
      // Ignorar fallos de red en logout
    }
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch {
      // Ignorar fallos de storage
    }
    setUser(null);
    setEmail("");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, email, setEmail, loginAdmin, requestOtp, verifyOtp, refresh, logout }),
    [user, loading, email, loginAdmin, requestOtp, verifyOtp, refresh, logout],
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
