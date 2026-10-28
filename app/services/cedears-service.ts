import type { CedearsResponse } from "../lib/types";

export const cedearsService = {
  async getAll(params?: { search?: string; market?: string; limit?: number }): Promise<CedearsResponse> {
    const url = new URL("/api/market/cedears", window.location.origin);
    if (params?.search) url.searchParams.set("search", params.search);
    if (params?.market) url.searchParams.set("market", params.market);
    if (params?.limit) url.searchParams.set("limit", String(params.limit));

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const raw = await response.text();
    const payload = (raw ? JSON.parse(raw) : null) as CedearsResponse | { error?: string } | null;
    if (!response.ok) {
      throw new Error(
        typeof payload === "object" && payload && "error" in payload && payload.error
          ? payload.error
          : `Request error ${response.status}`,
      );
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Respuesta invalida del servidor");
    }

    return payload as CedearsResponse;
  },
};
