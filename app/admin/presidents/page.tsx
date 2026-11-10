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
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFilterArea, setSelectedFilterArea] = useState<string>("ALL");
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
      setNotice("No se pudieron cargar los presidentes desde D1.");
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

  function startEdit(item: AreaPresident) {
    setEditingId(item.id);
    setForm({
      area: item.area,
      name: item.name,
      roleTitle: item.roleTitle,
      period: item.period,
      startYear: item.startYear,
      endYear: item.endYear ?? "",
      photoUrl: item.photoUrl || "",
      bio: item.bio || "",
      achievementsText: Array.isArray(item.achievements) ? item.achievements.join("\n") : "",
      linkedinUrl: item.linkedinUrl || "",
      isCurrent: Boolean(item.isCurrent),
      displayOrder: item.displayOrder || 1,
    });
    setNotice(`Editando datos de ${item.name} (${item.area})`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 120, behavior: "smooth" });
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice("Edición cancelada.");
  }

  async function savePresident() {
    if (!form.name.trim() || !form.roleTitle.trim() || !form.period.trim()) {
      setNotice("Por favor completa nombre, cargo y período.");
      return;
    }

    setSaving(true);
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

      if (editingId) {
        // Modo Edición: PATCH
        const response = await fetch(`${API_BASE_URL}/admin/v2/presidents/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...AUTH_HEADER,
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("update");
        setNotice(`✓ Cambios guardados para ${payload.name} exitosamente.`);
      } else {
        // Modo Creación: POST
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
        setNotice(`✓ Presidente ${payload.name} registrado exitosamente.`);
      }

      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch {
      setNotice(editingId ? "No se pudieron guardar los cambios." : "No se pudo registrar el presidente.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: AreaPresident) {
    if (!confirm(`¿Eliminar a ${item.name} de la línea de tiempo de ${item.area}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/presidents/${item.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: AUTH_HEADER,
      });
      if (!response.ok) throw new Error("delete");
      if (editingId === item.id) {
        cancelEdit();
      }
      setNotice(`✓ ${item.name} eliminado de la línea de tiempo.`);
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
      setNotice(`✓ Estado de ${item.name} actualizado.`);
      await load();
    } catch {
      setNotice("No se pudo actualizar el estado actual/histórico.");
    }
  }

  async function seedDefaults() {
    if (!confirm("¿Deseas cargar o restaurar los 9 presidentes institucionales históricos de Portafolio, Futuros y Research en la base D1?")) return;
    setSeeding(true);
    setNotice("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/presidents/seed`, {
        method: "POST",
        credentials: "include",
        headers: AUTH_HEADER,
      });
      if (!response.ok) throw new Error("seed");
      setNotice("✓ Presidentes institucionales cargados exitosamente en Cloudflare D1.");
      await load();
    } catch {
      setNotice("Error al sembrar presidentes.");
    } finally {
      setSeeding(false);
    }
  }

  const filteredItems = items.filter((item) => {
    if (selectedFilterArea === "ALL") return true;
    return item.area === selectedFilterArea;
  });

  return (
    <BackofficeShell
      title="Línea de Tiempo de Presidentes"
      subtitle="Gestión histórica y actual de directores y presidentes de las 3 áreas nucleares (Portafolio, Futuros, Research)."
    >
      {/* Botón superior de acciones y avisos */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {notice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
              {notice}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={seedDefaults}
          disabled={seeding}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] px-4 py-2 text-xs font-bold text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition shadow-xs disabled:opacity-50"
        >
          <span>↺</span>
          <span>{seeding ? "Cargando..." : "Cargar / Restaurar Presidentes Institucionales"}</span>
        </button>
      </div>

      {/* Formulario de Creación / Edición */}
      <section className={`space-y-6 rounded-2xl border p-6 shadow-sm md:p-8 transition-colors ${
        editingId ? "border-[#0062ff] bg-[#f8fafc]" : "border-[#e2e8f0] bg-white"
      }`}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${editingId ? "bg-[#0062ff] animate-pulse" : "bg-emerald-500"}`} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1e3a8a]">
                {editingId ? "Modo Edición Activo" : "Registro de Nuevo Liderazgo"}
              </span>
            </div>
            <h2 className="mt-1 font-serif text-2xl font-bold text-[#0e2246]">
              {editingId ? `Editando a: ${form.name || "Presidente"}` : "Registrar Presidente o Hito Histórico"}
            </h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              {editingId
                ? "Modificá la foto, período, bio, logros u orden y guardá los cambios para actualizar la línea de tiempo en vivo."
                : "Completá los campos para agregar un nuevo presidente histórico o actual a la línea de tiempo institucional."}
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition shadow-xs"
            >
              ✕ Cancelar Edición
            </button>
          )}
        </div>

        {/* Campos Principales */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Área Nuclear
            </label>
            <select
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
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
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
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
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Presidente de Portafolio"
              value={form.roleTitle}
              onChange={(e) => setForm({ ...form, roleTitle: e.target.value })}
            />
          </div>
        </div>

        {/* Período, Años y Orden */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
              Período (Texto visible)
            </label>
            <input
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
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
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
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
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
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
              className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
            />
          </div>
        </div>

        {/* LinkedIn URL */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            LinkedIn URL (Opcional)
          </label>
          <input
            className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
            placeholder="https://linkedin.com/in/..."
            value={form.linkedinUrl}
            onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
          />
        </div>

        {/* Biografía */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            Reseña / Biografía Institucional
          </label>
          <textarea
            className="min-h-[85px] w-full rounded-xl border border-[#cbd5e1] bg-white p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
            placeholder="Descripción del mandato, visión técnica y rol directivo en el área..."
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
        </div>

        {/* Logros */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            Logros & Hitos Técnicos (Uno por línea)
          </label>
          <textarea
            className="min-h-[85px] w-full rounded-xl border border-[#cbd5e1] bg-white p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
            placeholder="Ejemplo:&#10;Implementación de la frontera eficiente de Markowitz.&#10;Publicación del informe insignia de carteras modelo."
            value={form.achievementsText}
            onChange={(e) => setForm({ ...form, achievementsText: e.target.value })}
          />
        </div>

        {/* Subida de Foto */}
        <div className="rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-5">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-[#091a36]">
            Foto del Presidente (Cloudflare D1 / Assets o URL)
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {form.photoUrl ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-[#0062ff] shadow-sm flex-shrink-0">
                <Image
                  src={form.photoUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-[#94a3b8] bg-white text-xs text-[#64748b] flex-shrink-0">
                Sin foto
              </div>
            )}
            <div className="flex-1 min-w-[220px] space-y-2">
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
              <input
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs text-[#0e2246] outline-none focus:border-[#0062ff]"
                placeholder="O escribe una URL directa (/team/fausto.jpg o https://...)"
                value={form.photoUrl}
                onChange={(e) => setForm({ ...form, photoUrl: e.target.value })}
              />
              {uploading && (
                <p className="text-xs font-bold text-[#0062ff] animate-pulse">
                  Subiendo foto...
                </p>
              )}
              {form.photoUrl && (
                <p className="text-xs text-emerald-600 font-medium">
                  ✓ Foto lista: {form.photoUrl}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Checkbox Mandato Actual */}
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

        {/* Botones Guardar y Cancelar */}
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            onClick={savePresident}
            disabled={saving}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-8 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36] active:scale-[0.99] disabled:opacity-50"
          >
            {saving
              ? "Guardando..."
              : editingId
              ? "Actualizar Presidente (Guardar Cambios)"
              : "Registrar Nuevo Presidente"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full border border-gray-300 bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 transition shadow-xs"
            >
              Cancelar
            </button>
          )}
        </div>
      </section>

      {/* Listado de Presidentes Registrados */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#0e2246]">
              Historial y Mandatos ({filteredItems.length} de {items.length})
            </h2>
            <p className="mt-0.5 text-xs text-[#64748b]">
              Filtrá por área y hacé clic en "Editar" para modificar cualquier presidente en vivo.
            </p>
          </div>

          {/* Filtro por Área */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-[#fafaf9] p-1.5">
            {[
              { key: "ALL", label: "Todos" },
              { key: "PORTFOLIO", label: "Portafolio" },
              { key: "FUTUROS", label: "Futuros" },
              { key: "RESEARCH", label: "Research" },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFilterArea(f.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                  selectedFilterArea === f.key
                    ? "bg-[#0b1727] text-white shadow-xs"
                    : "text-[#64748b] hover:bg-white hover:text-[#0b1727]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-xs text-[#64748b]">Cargando línea de tiempo desde D1...</p>
        ) : items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm font-semibold text-[#0e2246]">
              Aún no se han registrado presidentes en la base de datos D1.
            </p>
            <p className="mt-1 text-xs text-[#64748b]">
              Podés registrar el primero con el formulario de arriba o cargar los 9 presidentes institucionales predeterminados con un solo clic:
            </p>
            <button
              type="button"
              onClick={seedDefaults}
              disabled={seeding}
              className="mt-4 inline-flex items-center rounded-xl bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase text-white shadow-sm hover:bg-[#091a36] transition"
            >
              {seeding ? "Cargando..." : "Cargar Presidentes Institucionales"}
            </button>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5 transition ${
                editingId === item.id
                  ? "border-[#0062ff] bg-[#f0f6ff]/40 shadow-sm ring-2 ring-[#0062ff]/20"
                  : "border-[#e2e8f0] bg-white hover:border-[#0062ff]"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-[#091a36] font-bold text-white text-xs flex-shrink-0 shadow-xs">
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
                    <span className="text-[10px] font-mono text-[#64748b]">
                      Orden: {item.displayOrder || 1}
                    </span>
                    {editingId === item.id && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-[#0062ff] animate-pulse">
                        ● Editando ahora
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#1e3a8a]">
                    {item.roleTitle} · <span className="font-mono text-[#64748b]">{item.period}</span>
                  </p>
                  <p className="mt-1 text-xs text-[#64748b] line-clamp-2 max-w-2xl">
                    {item.bio}
                  </p>
                  {item.achievements && item.achievements.length > 0 && (
                    <p className="mt-1 text-[11px] text-[#475569]">
                      <span className="font-bold">{item.achievements.length} logros: </span>
                      <span className="italic">{item.achievements[0]}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-full border border-[#0062ff] bg-[#0062ff]/10 px-3.5 py-1 text-xs font-bold text-[#0062ff] hover:bg-[#0062ff] hover:text-white transition"
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  onClick={() => toggleCurrent(item)}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
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
