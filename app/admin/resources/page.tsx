"use client";

import { useEffect, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { Resource } from "../../lib/types";

export default function AdminResourcesPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", type: "", url: "", description: "", sortOrder: 0, isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", type: "", url: "", description: "", sortOrder: 0, isActive: true });

  async function load() {
    const response = await fetch(`${API_BASE_URL}/admin/v2/resources`, { credentials: "include" });
    const payload = await response.json();
    setItems(payload.items ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/resources`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      setForm({ title: "", type: "", url: "", description: "", sortOrder: 0, isActive: true });
      await load();
      setNotice("Recurso creado con éxito.");
    } catch {
      setNotice("No se pudo crear recurso.");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este recurso?")) return;
    await fetch(`${API_BASE_URL}/admin/v2/resources/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  function startEdit(item: Resource) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      type: item.type,
      url: item.url,
      description: item.description ?? "",
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
      const response = await fetch(`${API_BASE_URL}/admin/v2/resources/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error();
      setEditingId(null);
      await load();
      setNotice("Recurso actualizado.");
    } catch {
      setNotice("No se pudo actualizar recurso.");
    }
  }

  return (
    <BackofficeShell title="Recursos y Bibliografía" subtitle="Biblioteca de herramientas, planillas descargables y fuentes de datos.">
      {/* Formulario */}
      <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Nuevo Recurso</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Título del Recurso</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Planilla DCF Valuation Model"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Categoría / Formato</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Excel / Spreadsheet / Libro"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">URL del Recurso</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="https://..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Orden de Listado</label>
            <input
              type="number"
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="0"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Descripción Breve</label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
            placeholder="Explicación breve de qué contiene este recurso..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={create}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
          >
            Guardar Recurso
          </button>
          {notice ? <span className="text-xs font-bold text-[#0062ff]">{notice}</span> : null}
        </div>
      </section>

      {/* Listado */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Recursos Configurados ({items.length})</h2>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 transition hover:border-[#0062ff]">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.url}
                      onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="w-full rounded-xl border border-[#e2e8f0] p-3 text-xs"
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  />
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
                    <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0062ff]">
                      {item.type}
                    </span>
                    <h3 className="mt-1 font-serif text-base font-bold text-[#0e2246]">{item.title}</h3>
                    {item.description && <p className="text-xs text-[#64748b]">{item.description}</p>}
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#0062ff] hover:underline">
                      {item.url} ↗
                    </a>
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
