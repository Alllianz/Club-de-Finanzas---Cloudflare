"use client";

import { useEffect, useMemo, useState } from "react";
import type { CedearItem } from "../lib/types";
import { cedearsService } from "../services/cedears-service";

export function CedearsTable() {
  const [items, setItems] = useState<CedearItem[]>([]);
  const [markets, setMarkets] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>("");
  const [search, setSearch] = useState("");
  const [market, setMarket] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await cedearsService.getAll({
          search: search || undefined,
          market: market || undefined,
          limit: 1200,
        });
        setItems(data.items);
        setMarkets(data.markets);
        setUpdatedAt(data.updatedAt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la tabla de cedears");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search, market]);

  const formattedUpdatedAt = useMemo(() => {
    if (!updatedAt) return "-";
    return new Date(updatedAt).toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }, [updatedAt]);

  return (
    <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
      {/* Controles de Búsqueda y Filtro */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <div className="relative">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por compañía (ej. Apple, Microsoft) o ticker (ej. AAPL)..."
            className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 text-sm text-[#0e2246] outline-none transition placeholder:text-[#94a3b8] focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
          />
        </div>
        <select
          value={market}
          onChange={(event) => setMarket(event.target.value)}
          className="h-11 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 text-sm font-semibold text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
        >
          <option value="">Todos los mercados</option>
          {markets.map((marketOption) => (
            <option key={marketOption} value={marketOption}>
              {marketOption}
            </option>
          ))}
        </select>
      </div>

      {/* Metadatos y contador */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[#64748b]">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-[#0062ff]" />
          <p>{loading ? "Consultando dataset..." : `${items.length} activos encontrados`}</p>
        </div>
        <p className="font-mono">Actualizado: {formattedUpdatedAt}</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Tabla con Estilo del Reporte (Cabecera Navy, Tickers Mono y Zebra) */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] shadow-sm">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-[#091a36] text-left text-white shadow-sm">
              <tr>
                <th className="px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider">Compañía Subyacente</th>
                <th className="px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider">Ticker BYMA</th>
                <th className="px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider">Mercado Origen</th>
                <th className="px-5 py-3.5 text-xs font-extrabold uppercase tracking-wider">Ratio Conversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {items.map((item, index) => (
                <tr
                  key={`${item.bymaCode}-${item.companyName}-${item.listedMarket}-${item.ratio}-${index}`}
                  className="transition hover:bg-[#f0f6ff]/70 odd:bg-[#ffffff] even:bg-[#f8fafc]"
                >
                  <td className="px-5 py-3 font-semibold text-[#0e2246]">{item.companyName}</td>
                  <td className="px-5 py-3 font-mono font-bold text-[#0062ff]">{item.bymaCode}</td>
                  <td className="px-5 py-3 text-xs font-medium text-[#64748b]">
                    <span className="rounded-md border border-[#e2e8f0] bg-[#ffffff] px-2 py-0.5">
                      {item.listedMarket}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono font-bold text-[#091a36]">{item.ratio}</td>
                </tr>
              ))}
              {!loading && items.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-center text-sm text-[#64748b]" colSpan={4}>
                    No se encontraron CEDEARs para los filtros ingresados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
