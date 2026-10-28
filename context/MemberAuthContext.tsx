"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { Member } from "@/lib/types/member";
import { firebaseAuth } from "@/lib/firebase/config";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

type MemberAuthContextType = {
  member: Member | null;
  isLoading: boolean;
  register: (fullName: string, email: string, phone: string) => Promise<{ success: boolean; error?: string }>;
  requestOtp: (email: string) => Promise<{ success: boolean; error?: string; debugCode?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: (phone?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshMember: () => Promise<void>;
};

const MemberAuthContext = createContext<MemberAuthContextType | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMember = async () => {
    try {
      const res = await fetch("/api/members/me", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMember(data.member || null);
      } else {
        setMember(null);
      }
    } catch {
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMember();
  }, []);

  const register = async (fullName: string, email: string, phone: string) => {
    try {
      const res = await fetch("/api/members/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Error al registrarte" };
      }
      setMember(data.member);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión" };
    }
  };

  const loginWithGoogle = async (phone?: string) => {
    try {
      if (!firebaseAuth) {
        return { success: false, error: "Firebase Auth no está inicializado en este navegador." };
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;

      const res = await fetch("/api/members/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          fullName: user.displayName || user.email?.split("@")[0] || "Miembro Google",
          phone: phone || user.phoneNumber || "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Error al autenticar con Google" };
      }
      setMember(data.member);
      return { success: true };
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") {
        return { success: false, error: "Ventana de Google cancelada por el usuario" };
      }
      return { success: false, error: err.message || "Error al iniciar sesión con Google" };
    }
  };

  const requestOtp = async (email: string) => {
    try {
      const res = await fetch("/api/members/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Error al solicitar código" };
      }
      return { success: true, debugCode: data.debugCode };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión" };
    }
  };

  const verifyOtp = async (email: string, code: string) => {
    try {
      const res = await fetch("/api/members/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Código incorrecto o expirado" };
      }
      setMember(data.member);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Error de conexión" };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/members/auth/logout", { method: "POST" });
    } finally {
      setMember(null);
    }
  };

  return (
    <MemberAuthContext.Provider
      value={{
        member,
        isLoading,
        register,
        loginWithGoogle,
        requestOtp,
        verifyOtp,
        logout,
        refreshMember,
      }}
    >
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth() {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error("useMemberAuth debe ser utilizado dentro de un MemberAuthProvider");
  }
  return context;
}
