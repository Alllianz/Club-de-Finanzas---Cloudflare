"use client";

import React, { useState } from "react";
import { CLUB_GROUPS } from "../constants/groups";
import { useGroupTrading } from "../context/GroupTradingContext";

export const GroupLoginCard: React.FC = () => {
  const { login, isActionLoading } = useGroupTrading();
  const [selectedGroup, setSelectedGroup] = useState<string>("Grupo 1");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError("Por favor ingresá la contraseña de tu grupo.");
      return;
    }

    const res = await login(selectedGroup, password);
    if (!res.success) {
      setError(res.error || "Credenciales incorrectas.");
    }
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
      <div className="mb-6 border-b border-[#f1f5f9] pb-4">
        <div className="flex items-center gap-2">
          <span className="h-[2px] w-4 bg-[#b89047]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
            Paper Trading UBA 2026
          </span>
        </div>
        <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#0b1727]">
          Acceso por Grupos de Análisis
        </h2>
        <p className="mt-1 text-xs text-[#64748b]">
          Ingresá con las credenciales oficiales de tu grupo para operar en el terminal de Paper Trading institucional.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Seleccioná tu Grupo
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {CLUB_GROUPS.map((g) => {
              const isSelected = selectedGroup === g.name;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroup(g.name);
                    setError(null);
                  }}
                  className={`flex flex-col items-center justify-center rounded-lg border p-2.5 text-xs font-bold transition-all ${
                    isSelected
                      ? "border-[#0b1727] bg-[#0b1727] text-white shadow-xs"
                      : "border-[#e5e7eb] bg-[#fafaf9] text-[#334155] hover:border-[#cbd5e1] hover:bg-white"
                  }`}
                >
                  <span>{g.name}</span>
                  <span
                    className={`mt-0.5 text-[10px] font-mono ${
                      isSelected ? "text-[#93c5fd]" : "text-[#64748b]"
                    }`}
                  >
                    {g.assignedAsset}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-[0.1em] text-[#0b1727]">
            Contraseña del {selectedGroup}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Ingresá la contraseña asignada..."
            required
            className="mt-1.5 w-full rounded-md border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0b1727] placeholder-[#94a3b8] transition-colors focus:border-[#0b1727] focus:outline-none focus:ring-1 focus:ring-[#0b1727]"
          />
        </div>

        <button
          type="submit"
          disabled={isActionLoading}
          className="w-full rounded-md bg-[#0b1727] py-3 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white shadow-xs transition hover:bg-[#1e3a8a] disabled:opacity-60"
        >
          {isActionLoading ? "Validando credenciales..." : `Ingresar al Terminal como ${selectedGroup} →`}
        </button>
      </form>
    </div>
  );
};
