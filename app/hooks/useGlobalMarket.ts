"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marketService } from "../services/market-service";
import type { CountryRiskPoint, GlobalMarketResponse } from "../lib/types";

type UseGlobalMarketResult = {
  data: GlobalMarketResponse | null;
  countryRisk: {
    series: CountryRiskPoint[];
    latest: CountryRiskPoint | null;
    previous: CountryRiskPoint | null;
    updatedAt: string | null;
    stale: boolean;
    error: string;
  };
  loading: boolean;
  refreshing: boolean;
  globalError: string;
  refresh: () => Promise<void>;
};

export function useGlobalMarket(): UseGlobalMarketResult {
  const [data, setData] = useState<GlobalMarketResponse | null>(null);
  const [countryRisk, setCountryRisk] = useState<{
    series: CountryRiskPoint[];
    latest: CountryRiskPoint | null;
    previous: CountryRiskPoint | null;
    updatedAt: string | null;
    stale: boolean;
    error: string;
  }>({
    series: [],
    latest: null,
    previous: null,
    updatedAt: null,
    stale: false,
    error: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const hasDataRef = useRef(false);

  useEffect(() => {
    hasDataRef.current = Boolean(data);
  }, [data]);

  const refresh = useCallback(async () => {
    const hasExistingData = hasDataRef.current;
    if (hasExistingData) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setGlobalError("");
    setCountryRisk((current) => ({ ...current, error: "" }));

    const [globalResult, countryRiskSeriesResult, countryRiskLatestResult] = await Promise.allSettled([
      marketService.getGlobal(),
      marketService.getCountryRisk(),
      marketService.getCountryRiskLatest(),
    ]);

    if (globalResult.status === "fulfilled") {
      const globalResponse = globalResult.value;
      setData(globalResponse);
    } else {
      setGlobalError(
        globalResult.reason instanceof Error ? globalResult.reason.message : "No se pudo cargar Monitor Global",
      );
    }

    const series = countryRiskSeriesResult.status === "fulfilled" ? countryRiskSeriesResult.value : null;
    const latest = countryRiskLatestResult.status === "fulfilled" ? countryRiskLatestResult.value : null;

    if (series || latest) {
      const seriesItems = series?.items ?? [];
      const latestItem = latest?.item ?? (seriesItems.length ? seriesItems[seriesItems.length - 1] : null);
      const previousItem =
        seriesItems.length > 1
          ? seriesItems[seriesItems.length - 2]
          : seriesItems.length === 1 && latestItem && seriesItems[0].date !== latestItem.date
            ? seriesItems[0]
            : null;

      setCountryRisk({
        series: seriesItems,
        latest: latestItem,
        previous: previousItem,
        updatedAt: latest?.updatedAt ?? series?.updatedAt ?? null,
        stale: Boolean(series?.stale || latest?.stale),
        error: "",
      });
    } else {
      const message =
        countryRiskSeriesResult.status === "rejected" && countryRiskSeriesResult.reason instanceof Error
          ? countryRiskSeriesResult.reason.message
          : countryRiskLatestResult.status === "rejected" && countryRiskLatestResult.reason instanceof Error
            ? countryRiskLatestResult.reason.message
            : "No se pudo cargar riesgo país";
      setCountryRisk((current) => ({
        ...current,
        error: message,
      }));
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, countryRisk, loading, refreshing, globalError, refresh };
}
