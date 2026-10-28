import { api } from "../lib/api";
import type { AuthResponse } from "../lib/types";

export const authService = {
  async requestOtp(email: string): Promise<{ message?: string; otp?: string }> {
    return api.post<{ message?: string; otp?: string }>("/auth/request-otp", { email });
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    return api.post<AuthResponse>("/auth/verify-otp", { email, otp });
  },

  async validateToken(): Promise<AuthResponse> {
    return api.get<AuthResponse>("/auth/validate-token");
  },

  async logout(): Promise<void> {
    await api.post<null>("/auth/logout");
  },
};
