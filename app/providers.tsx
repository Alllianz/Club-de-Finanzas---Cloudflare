"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./context/AuthContext";
import { MemberAuthProvider } from "@/context/MemberAuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MemberAuthProvider>{children}</MemberAuthProvider>
    </AuthProvider>
  );
}
