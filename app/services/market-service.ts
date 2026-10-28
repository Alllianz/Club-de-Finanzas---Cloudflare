import type {
  CountryRiskLatestResponse,
  CountryRiskResponse,
  GlobalMarketResponse,
  LetrasCurveResponse,
} from "../lib/types";

export const marketService = {
  async getGlobal(): Promise<GlobalMarketResponse> {
    const response = await fetch("/api/market/global", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as GlobalMarketResponse | { error?: string };
    if (!response.ok) {
      throw new Error(
        typeof payload === "object" && payload && "error" in payload && payload.error
          ? payload.error
          : `Request error ${response.status}`,
      );
    }

    return payload as GlobalMarketResponse;
  },
  async getCountryRisk(limit?: number): Promise<CountryRiskResponse> {
    const url = new URL("/api/market/riesgo-pais", window.location.origin);
    if (typeof limit === "number") url.searchParams.set("limit", String(limit));

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as CountryRiskResponse | { error?: string };
    if (!response.ok) {
      throw new Error(
        typeof payload === "object" && payload && "error" in payload && payload.error
          ? payload.error
          : `Request error ${response.status}`,
      );
    }

    return payload as CountryRiskResponse;
  },
  async getCountryRiskLatest(): Promise<CountryRiskLatestResponse> {
    const response = await fetch("/api/market/riesgo-pais/ultimo", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as CountryRiskLatestResponse | { error?: string };
    if (!response.ok) {
      throw new Error(
        typeof payload === "object" && payload && "error" in payload && payload.error
          ? payload.error
          : `Request error ${response.status}`,
      );
    }

    return payload as CountryRiskLatestResponse;
  },
  async getLetrasCurve(params?: { refresh?: boolean }): Promise<LetrasCurveResponse> {
    const url = new URL("/api/market/letras", window.location.origin);
    if (params?.refresh) url.searchParams.set("refresh", "true");

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json()) as LetrasCurveResponse | { error?: string };
    if (!response.ok) {
      throw new Error(
        typeof payload === "object" && payload && "error" in payload && payload.error
          ? payload.error
          : `Request error ${response.status}`,
      );
    }

    return payload as LetrasCurveResponse;
  },
};
