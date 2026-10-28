"use client";

import { useEffect, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import type { Post, PostSection, PostType } from "../../lib/types";

const emptyForm = {
  title: "",
  summary: "",
  body: "",
  type: "NEWSLETTER" as PostType,
  section: "NEWSLETTER" as PostSection,
  status: "PUBLISHED",
  isFeatured: false,
  assets: [] as { kind: "PDF" | "IMAGE" | "FLYER"; url: string; key?: string }[],
  authorsText: "",
  eventDate: "",
  registrationUrl: "",
};

export default function AdminPostsPage() {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/posts`, { credentials: "include" });
      const payload = await response.json();
      setItems(payload.items ?? []);
    } catch {
      setNotice("No se pudieron cargar los posts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const currentAssetKind = form.type === "REPORT" ? "pdf" : form.type === "EVENT" ? "flyer" : "image";

  async function uploadFile(file: File) {
    setUploading(true);
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("kind", currentAssetKind);
      const response = await fetch(`${API_BASE_URL}/admin/v2/uploads`, {
        method: "POST",
        credentials: "include",
        body: data,
      });
      if (!response.ok) throw new Error("upload error");
      const payload = await response.json();
      const asset = payload.asset as { url: string; kind: string; key: string };
      setForm((prev) => ({
        ...prev,
        assets: [...prev.assets, { kind: asset.kind as "PDF" | "IMAGE" | "FLYER", url: asset.url, key: asset.key }],
      }));
      setNotice("Archivo subido a R2.");
    } catch {
      setNotice("No se pudo subir el archivo.");
    } finally {
      setUploading(false);
    }
  }

  async function createPost() {
    try {
      const assets = form.assets.map((asset, index) => ({ ...asset, sortOrder: index }));
      const authors = form.authorsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((teamMemberId, index) => ({ teamMemberId, sortOrder: index }));

      const body = {
        title: form.title,
        summary: form.summary,
        body: form.body,
        type: form.type,
        section: form.section,
        status: form.status,
        isFeatured: form.isFeatured,
        assets,
        authors,
        eventMeta:
          form.type === "EVENT" && form.eventDate
            ? {
                eventDate: form.eventDate,
                pinUntil: form.eventDate,
                registrationUrl: form.registrationUrl || null,
              }
            : undefined,
      };

      const isEdit = Boolean(editingId);
      const endpoint = isEdit ? `${API_BASE_URL}/admin/v2/posts/${editingId}` : `${API_BASE_URL}/admin/v2/posts`;
      const response = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("error");
      setForm(emptyForm);
      setEditingId(null);
      setNotice(isEdit ? "Post actualizado." : "Post creado.");
      await load();
    } catch {
      setNotice(editingId ? "No se pudo actualizar el post." : "No se pudo crear el post.");
    }
  }

  function deriveKeyFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, "");
    } catch {
      return null;
    }
  }

  async function removeAsset(index: number) {
    const target = form.assets[index];
    if (!target) return;

    if (target.key) {
      try {
        const params = new URLSearchParams({ key: target.key });
        const response = await fetch(`${API_BASE_URL}/admin/v2/uploads?${params.toString()}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!response.ok) throw new Error("delete failed");
      } catch {
        setNotice("No se pudo borrar el archivo en R2.");
        return;
      }
    }

    setForm((prev) => ({
      ...prev,
      assets: prev.assets.filter((_, i) => i !== index),
    }));
  }

  function startEdit(post: Post) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      summary: post.summary,
      body: post.body ?? "",
      type: post.type,
      section: post.section,
      status: post.status,
      isFeatured: post.isFeatured,
      assets: post.assets.map((asset) => ({
        kind: asset.kind,
        url: asset.url,
        key: deriveKeyFromUrl(asset.url) ?? undefined,
      })),
      authorsText: post.authors.map((author) => author.teamMemberId).join("\n"),
      eventDate: post.eventMeta?.eventDate ? post.eventMeta.eventDate.slice(0, 16) : "",
      registrationUrl: post.eventMeta?.registrationUrl ?? "",
    });
    setNotice("Editando publicación.");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice("");
  }

  async function deletePost(postId: string) {
    if (!confirm("¿Eliminar esta publicación?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/v2/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("delete failed");
      if (editingId === postId) {
        cancelEdit();
      }
      setNotice("Post eliminado.");
      await load();
    } catch {
      setNotice("No se pudo eliminar el post.");
    }
  }

  return (
    <BackofficeShell title="Gestión de Publicaciones" subtitle="Editor y repositorio de informes de Portfolio, Research, Newsletter y Eventos.">
      {/* Formulario de Creación / Edición */}
      <section className="space-y-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
          <h2 className="font-serif text-2xl font-bold text-[#0e2246]">{editingId ? "Editar Publicación" : "Nueva Publicación"}</h2>
          {editingId && (
            <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3 py-1 text-xs font-bold text-[#0062ff]">
              Modo Edición
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Título</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Portfolio Renta Variable Agosto 2026"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Resumen / Bajada</label>
            <input
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
              placeholder="Ej. Análisis de 6 compañías del sector energía..."
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Tipo de Post</label>
            <select
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.target.value as PostType })}
            >
              <option value="REPORT">Informe (PDF)</option>
              <option value="NEWSLETTER">Newsletter (Imágenes/Texto)</option>
              <option value="EVENT">Evento (Flyer/Inscripción)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Sección Destino</label>
            <select
              className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff]"
              value={form.section}
              onChange={(event) => setForm({ ...form, section: event.target.value as PostSection })}
            >
              <option value="HOME">Home</option>
              <option value="PORTFOLIO">Portfolio</option>
              <option value="RESEARCH">Research</option>
              <option value="NEWSLETTER">Newsletter</option>
              <option value="INSTITUTIONAL">Institucional</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Cuerpo Completo (Opcional si es PDF)</label>
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 text-sm text-[#0e2246] outline-none transition focus:border-[#0062ff] focus:ring-2 focus:ring-[#0062ff]/10"
            placeholder="Texto completo del informe o artículo..."
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </div>

        {/* Carga de Assets R2 */}
        <div className="rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#091a36]">Archivos Adjuntos (R2 / S3)</p>
          <p className="mt-1 text-xs text-[#64748b]">
            {form.type === "REPORT" ? "Subí el archivo PDF del informe para visualizador embebido." : form.type === "EVENT" ? "Subí el flyer del evento." : "Subí imágenes para la galería del newsletter."}
          </p>

          <input
            type="file"
            accept={form.type === "REPORT" ? "application/pdf" : "image/*"}
            className="mt-3 block w-full text-xs file:mr-4 file:rounded-full file:border-0 file:bg-[#091a36] file:px-4 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#0062ff]"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadFile(file);
              event.currentTarget.value = "";
            }}
            disabled={uploading}
          />
          {uploading ? <p className="mt-2 text-xs font-bold text-[#0062ff]">Subiendo archivo a almacenamiento seguro...</p> : null}

          <div className="mt-4 space-y-2">
            {form.assets.map((asset, index) => (
              <div key={`${asset.url}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-3 text-xs">
                <a href={asset.url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold text-[#0062ff] hover:underline">
                  {asset.url}
                </a>
                <button
                  type="button"
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 font-bold text-red-600 transition hover:bg-red-100"
                  onClick={() => void removeAsset(index)}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>

        {form.type === "EVENT" && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Fecha del Evento</label>
              <input
                type="datetime-local"
                className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none"
                value={form.eventDate}
                onChange={(event) => setForm({ ...form, eventDate: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">Link de Inscripción (Forms/Luma)</label>
              <input
                className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-2.5 text-sm text-[#0e2246] outline-none"
                placeholder="https://forms.gle/..."
                value={form.registrationUrl}
                onChange={(event) => setForm({ ...form, registrationUrl: event.target.value })}
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            id="featured"
            type="checkbox"
            checked={form.isFeatured}
            onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#0062ff] focus:ring-[#0062ff]"
          />
          <label htmlFor="featured" className="text-xs font-bold uppercase tracking-wider text-[#0e2246]">
            Marcar como Destacado en Portada
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={createPost}
            className="inline-flex items-center rounded-full bg-[#0062ff] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#091a36]"
          >
            {editingId ? "Guardar Cambios" : "Crear Publicación"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center rounded-full border border-[#e2e8f0] bg-white px-5 py-2.5 text-xs font-bold text-[#64748b] transition hover:bg-[#f8fafc]"
            >
              Cancelar Edición
            </button>
          ) : null}
        </div>

        {notice ? <p className="text-xs font-bold text-[#0062ff]">{notice}</p> : null}
      </section>

      {/* Listado de Publicaciones */}
      <section className="mt-8 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm md:p-8">
        <h2 className="font-serif text-2xl font-bold text-[#0e2246]">Publicaciones Cargadas ({items.length})</h2>
        {loading ? <p className="mt-3 text-xs text-[#64748b]">Cargando listado...</p> : null}

        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-4 transition hover:border-[#0062ff]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0062ff]">
                    {item.type} · {item.section}
                  </span>
                  {item.isFeatured && (
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      ★ Destacado
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-serif text-lg font-bold text-[#0e2246]">{item.title}</h3>
                <p className="mt-0.5 text-xs text-[#64748b] line-clamp-1">{item.summary}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-full border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0e2246] transition hover:border-[#0062ff] hover:text-[#0062ff]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void deletePost(item.id)}
                  className="rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </BackofficeShell>
  );
}
