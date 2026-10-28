"use client";

import { useEffect, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { ContactLink } from "../../lib/types";

const kinds = ["LINKEDIN", "INSTAGRAM", "X", "EMAIL", "WHATSAPP", "YOUTUBE", "LOCATION", "OTHER"];

export default function AdminLinksPage() {
  const [items, setItems] = useState<ContactLink[]>([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ kind: "OTHER", label: "", value: "", href: "", sortOrder: 0, isActive: true });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ kind: "OTHER", label: "", value: "", href: "", sortOrder: 0, isActive: true });

  async function load() {
    const response = await fetch(`${API_BASE_URL}/admin/v2/contact-links`, { credentials: "include" });
    const payload = await response.json();
    setItems(payload.items ?? []);
  }

  useEffect(() => { void load(); }, []);

  async function create() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/contact-links`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      setForm({ kind: "OTHER", label: "", value: "", href: "", sortOrder: 0, isActive: true });
      await load();
      setNotice("Link creado con éxito.");
    } catch {
      setNotice("No se pudo crear link.");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este link?")) return;
    await fetch(`${API_BASE_URL}/admin/v2/contact-links/${id}`, { method: "DELETE", credentials: "include" });
    await load();
  }

  function startEdit(item: ContactLink) {
    setEditingId(item.id);
    setDraft({
      kind: item.kind,
      label: item.label,
      value: item.value ?? "",
      href: item.href,
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
      const response = await fetch(`${API_BASE_URL}/admin/v2/contact-links/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error();
      setEditingId(null);
      await load();
      setNotice("Link actualizado.");
    } catch {
      setNotice("No se pudo actualizar link.");
    }
  }

  return (
    <BackofficeShell title="Enlaces y Canales" subtitle="Gestión de redes sociales, WhatsApp, CV y medios de contacto.">
      {/* Formulario */}
      <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Nuevo Enlace de Contacto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Tipo de Canal</label>
            <select
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
            >
              {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Etiqueta / Nombre</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Canal de difusión / LinkedIn"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Texto Visible / Subtítulo</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. WhatsApp / @clubdefinanzasuba"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">URL de Destino (href)</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="https://chat.whatsapp.com/..."
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={create}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
          >
            Guardar Enlace
          </button>
          {notice ? <span className="text-xs font-bold text-[#0062ff]">{notice}</span> : null}
        </div>
      </section>

      {/* Listado */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Enlaces Configurados ({items.length})</h2>

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 transition hover:border-[#0062ff]">
              {editingId === item.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.kind}
                      onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                    >
                      {kinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                    </select>
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.label}
                      onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    />
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.value}
                      onChange={(e) => setDraft({ ...draft, value: e.target.value })}
                    />
                    <input
                      className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs"
                      value={draft.href}
                      onChange={(e) => setDraft({ ...draft, href: e.target.value })}
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
                    <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0062ff]">
                      {item.kind}
                    </span>
                    <p className="mt-1 font-serif text-base font-bold text-[#0e2246]">{item.label}</p>
                    <p className="text-xs text-[#64748b]">{item.value ?? item.href}</p>
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
