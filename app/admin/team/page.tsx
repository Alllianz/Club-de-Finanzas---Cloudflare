"use client";

import { useEffect, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { TeamMember } from "../../lib/types";

const sections = ["LEADERSHIP", "PORTFOLIO", "RESEARCH", "RRII"] as const;

export default function AdminTeamPage() {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    title: "",
    shortBio: "",
    section: "LEADERSHIP",
    profileUrl: "",
    imageUrl: "",
    displayOrder: 0,
    isActive: true,
  });

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/team-members`, { credentials: "include" });
      const payload = await response.json();
      setItems(payload.items ?? []);
    } catch {
      setNotice("No se pudieron cargar integrantes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadImage(file: File) {
    setUploading(true);
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", "image");
      const response = await fetch(`${API_BASE_URL}/admin/v2/uploads`, {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!response.ok) throw new Error("upload");
      const payload = await response.json();
      setForm((prev) => ({ ...prev, imageUrl: payload.asset.url }));
      setNotice("Imagen subida con éxito.");
    } catch {
      setNotice("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/team-members`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("create");
      setForm({ fullName: "", title: "", shortBio: "", section: "LEADERSHIP", profileUrl: "", imageUrl: "", displayOrder: 0, isActive: true });
      setNotice("Integrante creado.");
      await load();
    } catch {
      setNotice("No se pudo crear el integrante.");
    }
  }

  async function patch(item: TeamMember, payload: Partial<TeamMember>) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/team-members/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("patch");
      await load();
    } catch {
      setNotice("No se pudo actualizar integrante.");
    }
  }

  async function remove(item: TeamMember) {
    if (!confirm(`¿Eliminar a ${item.fullName}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/team-members/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("delete");
      await load();
    } catch {
      setNotice("No se pudo eliminar integrante.");
    }
  }

  return (
    <BackofficeShell title="Equipo e Integrantes" subtitle="Administración de autoridades, consejo directivo y analistas por área.">
      {/* Formulario de Nuevo Integrante */}
      <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Nuevo Integrante</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Nombre Completo</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Julián Robin"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Cargo / Rol</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Presidente / Analista Sr"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Área / Sección</label>
            <select
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            >
              {sections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">URL Perfil LinkedIn</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="https://linkedin.com/in/..."
              value={form.profileUrl}
              onChange={(e) => setForm({ ...form, profileUrl: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Bio Corta (Opcional)</label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
            placeholder="Breve reseña sobre experiencia o estudios..."
            value={form.shortBio}
            onChange={(e) => setForm({ ...form, shortBio: e.target.value })}
          />
        </div>

        <div className="rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-4">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091a36]">Foto de Perfil</label>
          <input
            type="file"
            accept="image/*"
            className="mt-2 block w-full text-xs file:mr-4 file:rounded-full file:border-0 file:bg-[#091a36] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#0062ff]"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
              e.currentTarget.value = "";
            }}
            disabled={uploading}
          />
          {uploading ? <p className="mt-2 text-xs font-bold text-[#0062ff]">Subiendo foto...</p> : null}
          {form.imageUrl ? (
            <p className="mt-2 text-xs text-emerald-600">Foto cargada correctamente.</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={create}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
          >
            Guardar Integrante
          </button>
          {notice && <span className="text-xs font-bold text-[#0062ff]">{notice}</span>}
        </div>
      </section>

      {/* Listado de Integrantes */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Integrantes Registrados ({items.length})</h2>
        {loading ? <p className="mt-3 text-xs text-[#64748b]">Cargando...</p> : null}

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 transition hover:border-[#0062ff]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#091a36] font-bold text-white text-xs">
                  {item.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-serif text-base font-bold text-[#0e2246]">{item.fullName}</h3>
                  <p className="text-xs text-[#64748b]">{item.title} · <span className="font-bold text-[#0062ff]">{item.section}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch(item, { isActive: !item.isActive })}
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase transition ${
                    item.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                >
                  {item.isActive ? "Activo" : "Inactivo"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(item)}
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </BackofficeShell>
  );
}
