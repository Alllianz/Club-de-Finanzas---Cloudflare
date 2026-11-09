"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { AreaPresident } from "../../lib/types";

const areas = [
  { key: "PORTFOLIO", label: "Portafolio" },
  { key: "FUTUROS", label: "Futuros" },
  { key: "RESEARCH", label: "Research" },
] as const;

const AUTH_HEADER = { Authorization: "Bearer admin_allianz_session_token_2026" };

const emptyForm = {
  area: "PORTFOLIO" as "PORTFOLIO" | "FUTUROS" | "RESEARCH",
  name: "",
  roleTitle: "",
  period: "",
  startYear: new Date().getFullYear(),
  endYear: "" as string | number,
  photoUrl: "",
  bio: "",
  achievementsText: "",
  linkedinUrl: "",
  isCurrent: true,
  displayOrder: 1,
};

export default function AdminPresidentsPage() {
  const [items, setItems] = useState<AreaPresident[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/presidents`, {
        credentials: "include",
        headers: AUTH_HEADER,
      });
      const payload = await response.json();
      setItems(payload.items ?? []);
    } catch {
      setNotice("No se pudieron cargar los presidentes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function uploadPhoto(file: File) {
    setUploading(true);
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", "image");
      const response = await fetch(`${API_BASE_URL}/admin/v2/uploads`, {
        method: "POST",
        credentials: "include",
        headers: AUTH_HEADER,
        body: data,
      });
      if (!response.ok) throw new Error("upload");
      const payload = await response.json();
      if (payload.asset?.url) {
        setForm((prev) => ({ ...prev, photoUrl: payload.asset.url }));
        setNotice("Foto institucional subida con éxito.");
      }
    } catch {
      setNotice("No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  async function create() {
    if (!form.name.trim() || !form.roleTitle.trim() || !form.period.trim()) {
      setNotice("Por favor completa nombre, cargo y período.");
      return;
    }

    setNotice("");
    try {
      const achievements = form.achievementsText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const payload = {
        area: form.area,
        name: form.name.trim(),
        roleTitle: form.roleTitle.trim(),
        period: form.period.trim(),
        startYear: Number(form.startYear),
        endYear: form.endYear ? Number(form.endYear) : null,
        photoUrl: form.photoUrl || null,
        bio: form.bio.trim(),
        achievements,
        linkedinUrl: form.linkedinUrl.trim() || null,
        isCurrent: Boolean(form.isCurrent),
        displayOrder: Number(form.displayOrder || 1),
      };

      const response = await fetch(`${API_BASE_URL}/admin/v2/presidents`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...AUTH_HEADER,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("create");
      setForm(emptyForm);
      setNotice("Presidente registrado exitosamente.");
      await load();
    } catch {
      setNotice("No se pudo guardar el presidente.");
    }
  }

  async function remove(item: AreaPresident) {
    if (!confirm(`¿Eliminar a ${item.name} de la línea de tiempo?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/presidents/${item.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: AUTH_HEADER,
      });
      if (!response.ok) throw new Error("delete");
      setNotice("Presidente eliminado.");
      await load();
    } catch {
      setNotice("No se pudo eliminar el registro.");
    }
  }

  async function toggleCurrent(item: AreaPresident) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/presidents/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...AUTH_HEADER,
        },
        body: JSON.stringify({ isCurrent: !item.isCurrent }),
      });
      if (!response.ok) throw new Error("patch");
      await load();
    } catch {
      setNotice("No se pudo actualizar el estado.");
    }
  }

  return (
    <BackofficeShell
      title="Línea de Tiempo de Presidentes"
      subtitle="Gestión histórica y actual de directores y presidentes de las 3 áreas nucleares (Portafolio, Futuros, Research)."
    >
      {/* Formulario de Nuevo Presidente */}
      <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
          Registrar Presidente o Hito Histórico
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Área Nuclear
            </label>
            <select
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value as any })}
            >
              {areas.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Nombre Completo
            </label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Fausto Crivelli"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Cargo Formal
            </label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Presidente de Portafolio"
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Período (Texto visible)
            </label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              placeholder="Ej. 2025 - Presente"
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Año Inicio
            </label>
            <input
              type="number"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.startYear}
              onChange={(e) => setForm({ ...form, startYear: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Año Fin (Opcional)
            </label>
            <input
              type="number"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              placeholder="Vacío si es actual"
              value={form.endYear}
              onChange={(e) => setForm({ ...form, endYear: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Orden Visual
            </label>
            <input
              type="number"
              className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            LinkedIn URL (Opcional)
          </label>
          <input
            className="w-full rounded-xl border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
            placeholder="https://linkedin.com/in/..."
            value={form.linkedinUrl}
            onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            Reseña / Biografía Institucional
          </label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
            placeholder="Descripción del mandato y rol en el área..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            Logros & Hitos Técnicos (Uno por línea)
          </label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-[#e2e8f0] bg-white p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
            placeholder="Ejemplo:&#10;Implementación de la frontera eficiente de Markowitz.&#10;Publicación del informe insignia de carteras modelo."
            value={form.achievementsText}
            onChange={(e) => setForm({ ...form, achievementsText: e.target.value })}
          />
        </div>

        {/* Subida de Foto */}
        <div className="rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-5">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091a36]">
            Foto del Presidente (Cloudflare D1 / Assets)
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {form.photoUrl ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-[#0062ff] shadow-sm">
                <Image
                  src={form.photoUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[#94a3b8] bg-white text-xs text-[#64748b]">
                Sin foto
              </div>
            )}
            <div className="flex-1 min-w-[200px]">
              <input
                type="file"
                accept="image/*"
                className="block w-full text-xs file:mr-4 file:rounded-full file:border-0 file:bg-[#091a36] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#0062ff] cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  e.currentTarget.value = "";
                }}
                disabled={uploading}
              />
              {uploading && (
                <p className="mt-2 text-xs font-bold text-[#0062ff] animate-pulse">
                  Subiendo foto...
                </p>
              )}
              {form.photoUrl && (
                <p className="mt-1 text-xs text-emerald-600 font-medium">
                  ✓ Foto lista: {form.photoUrl}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#0e2246]">
            <input
              type="checkbox"
              checked={form.isCurrent}
              onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              className="h-4 w-4 rounded border-[#cbd5e1] text-[#0062ff] focus:ring-[#0062ff]"
            />
            <span>¿Es el Presidente actual en funciones?</span>
          </label>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={create}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36] active:scale-[0.99]"
          >
            Guardar Presidente
          </button>
          {notice && <span className="text-xs font-bold text-[#0062ff]">{notice}</span>}
        </div>
      </section>

      {/* Listado de Presidentes Registrados */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
          Historial y Mandatos ({items.length})
        </h2>
        {loading ? (
          <p className="mt-3 text-xs text-[#64748b]">Cargando línea de tiempo...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-xs text-[#64748b]">
            Aún no se han registrado presidentes en la base D1. Agregá el primero arriba.
          </p>
        ) : null}

        <div className="mt-5 space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-white p-5 transition hover:border-[#0062ff]"
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#091a36] font-bold text-white text-xs flex-shrink-0">
                  {item.photoUrl ? (
                    <Image
                      src={item.photoUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    item.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-serif text-base font-bold text-[#0e2246]">
                      {item.name}
                    </h3>
                    <span className="rounded-full bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0062ff]">
                      {item.area}
                    </span>
                    {item.isCurrent ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        Actual
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">
                        Histórico
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#1e3a8a]">
                    {item.roleTitle} · <span className="font-mono text-[#64748b]">{item.period}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#64748b] line-clamp-2 max-w-2xl">
                    {item.bio}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleCurrent(item)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold hover:bg-gray-50"
                >
                  {item.isCurrent ? "Marcar Histórico" : "Marcar Actual"}
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
