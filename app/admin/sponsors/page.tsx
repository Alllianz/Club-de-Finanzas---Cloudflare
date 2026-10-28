"use client";

import { useEffect, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { Sponsor } from "../../lib/types";

export default function AdminSponsorsPage() {
  const [items, setItems] = useState<Sponsor[]>([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", logoUrl: "", linkUrl: "", sortOrder: 0, isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", logoUrl: "", linkUrl: "", sortOrder: 0, isActive: true });

  async function load() {
    const response = await fetch(`${API_BASE_URL}/admin/v2/sponsors`, { credentials: "include" });
    const payload = await response.json();
    setItems(payload.items ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/sponsors`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      setForm({ name: "", logoUrl: "", linkUrl: "", sortOrder: 0, isActive: true });
      await load();
      setNotice("Sponsor creado con éxito.");
    } catch {
      setNotice("No se pudo crear sponsor.");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este sponsor?")) return;
    await fetch(`${API_BASE_URL}/admin/v2/sponsors/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  function startEdit(item: Sponsor) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      logoUrl: item.logoUrl ?? "",
      linkUrl: item.linkUrl ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/sponsors/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error();
      setEditingId(null);
      await load();
      setNotice("Sponsor actualizado.");
    } catch {
      setNotice("No se pudo actualizar sponsor.");
    }
  }

  return (
    <BackofficeShell title="Sponsors y Aliados" subtitle="Gestión de organizaciones y entidades que respaldan al Club.">
      {/* Formulario */}
      <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Nuevo Sponsor</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Nombre de la Institución</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. BYMA / Santander"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Logo URL (Opcional)</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="https://..."
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Sitio Web (linkUrl)</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="https://..."
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Orden de Visualización</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={create}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
          >
            Guardar Sponsor
          </button>
          {notice ? <span className="text-xs font-bold text-[#0062ff]">{notice}</span> : null}
        </div>
      </section>

      {/* Listado */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Sponsors Registrados ({items.length})</h2>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 transition hover:border-[#0062ff]">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.linkUrl}
                      onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-full bg-[#0062ff] px-4 py-1.5 text-xs font-bold text-white" onClick={() => void saveEdit()}>
                      Guardar
                    </button>
                    <button className="rounded-full border border-[#e2e8f0] px-4 py-1.5 text-xs font-bold text-[#64748b]" onClick={cancelEdit}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-base font-bold text-[#0e2246]">{item.name}</h3>
                    <p className="text-xs text-[#64748b]">{item.linkUrl ?? "Sin enlace web"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0e2246] transition hover:border-[#0062ff] hover:text-[#0062ff]"
                      onClick={() => startEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                      onClick={() => void remove(item.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </BackofficeShell>
  );
}
