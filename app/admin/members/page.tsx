"use client";

import { useEffect, useState } from "react";
import { BackofficeShell } from "@/app/components/backoffice-shell";
import type { Member } from "@/lib/types/member";

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.items || []);
      }
    } catch (e) {
      console.error("Error al cargar miembros:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q)
    );
  });

  return (
    <BackofficeShell
      title="Gestión de Miembros"
      subtitle="Registro y base de miembros oficiales del Club de Finanzas UBA"
    >
      <div className="space-y-6">
        {/* Barra de Búsqueda y Estadísticas */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0062ff] text-xl text-white">
              👥
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Total de Miembros</p>
              <h3 className="text-2xl font-extrabold text-[#0e2246]">{members.length}</h3>
            </div>
          </div>

          <div className="w-full max-w-sm">
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-2.5 text-xs text-[#0e2246] placeholder-[#94a3b8] focus:border-[#0062ff] focus:outline-none focus:ring-2 focus:ring-[#0062ff]/20"
            />
          </div>
        </div>

        {/* Tabla de Miembros */}
        <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm">
          {loading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <p className="text-xs font-bold text-[#64748b]">Cargando miembros...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-bold text-[#0e2246]">No se encontraron miembros registrados</p>
              <p className="mt-1 text-xs text-[#64748b]">
                Los miembros que se registren en la web pública aparecerán listados aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#e2e8f0] bg-[#091a36] text-white">
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Nombre y Apellido</th>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Correo Electrónico</th>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Teléfono / WhatsApp</th>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Fecha de Registro</th>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Base / Fuente</th>
                    <th className="px-5 py-3.5 font-bold uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#f8fafc]">
                      <td className="px-5 py-3.5 font-bold text-[#0e2246]">{m.fullName}</td>
                      <td className="px-5 py-3.5 font-mono text-[#475569]">{m.email}</td>
                      <td className="px-5 py-3.5 font-mono text-[#0062ff]">{m.phone}</td>
                      <td className="px-5 py-3.5 text-[#64748b]">
                        {new Date(m.registeredAt).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md border border-[#d8e5f8] bg-[#f0f6ff] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[#0062ff]">
                          {m.source || "Firebase"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </BackofficeShell>
  );
}
