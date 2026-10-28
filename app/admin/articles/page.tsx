"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BackofficeShell } from "../../components/backoffice-shell";
import { API_BASE_URL } from "../../lib/config";
import { useAuth } from "../../context/AuthContext";
import type { AdminArticle, ArticleSection, ArticleStatus } from "../../lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { INITIAL_ARTICLE_FORM, type ArticleFormValues } from "./article-config";
import { ArticleEditorForm } from "./components/article-editor-form";
import { ArticleCard } from "./components/article-card";

type ListResponse = { items: AdminArticle[] };

const PAGE_SIZE = 6;
const SECTION_ORDER: ArticleSection[] = ["HOME", "PORTFOLIO", "RESEARCH", "NEWS"];

const SECTION_META: Record<ArticleSection, { label: string; eyebrow: string }> = {
  HOME: { label: "Inicio", eyebrow: "Portada Principal" },
  PORTFOLIO: { label: "Portfolio", eyebrow: "Publicaciones de Cartera" },
  RESEARCH: { label: "Research", eyebrow: "Biblioteca de Investigación" },
  NEWS: { label: "Noticias", eyebrow: "Actualidad y Actividades" },
};

function normalizeFeaturedBySection(source: AdminArticle[]) {
  const winnerBySection = new Map<ArticleSection, string>();

  const sorted = [...source].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  for (const item of sorted) {
    if (item.isFeatured && !winnerBySection.has(item.section)) {
      winnerBySection.set(item.section, item.id);
    }
  }

  return source.map((item) => ({
    ...item,
    isFeatured: winnerBySection.get(item.section) === item.id,
  }));
}

export default function AdminArticlesPage() {
  const { user } = useAuth();

  const [items, setItems] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [activeSection, setActiveSection] = useState<ArticleSection>("HOME");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ArticleStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<ArticleFormValues>(INITIAL_ARTICLE_FORM);

  const [editOpen, setEditOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<AdminArticle | null>(null);
  const [editForm, setEditForm] = useState<ArticleFormValues>(INITIAL_ARTICLE_FORM);

  const [editedByMap, setEditedByMap] = useState<Record<string, string>>({});
  const [confirmFeaturedOpen, setConfirmFeaturedOpen] = useState(false);
  const [pendingFeaturedTarget, setPendingFeaturedTarget] = useState<AdminArticle | null>(null);
  const [pendingFeaturedPrevious, setPendingFeaturedPrevious] = useState<AdminArticle | null>(null);

  const loadArticles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/articles`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("No se pudieron cargar artículos");
      const data = (await response.json()) as ListResponse;
      setItems(normalizeFeaturedBySection(data.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSection, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const published = items.filter((item) => item.status === "PUBLISHED").length;
    const draft = items.length - published;

    return {
      total: items.length,
      published,
      draft,
      homeCount: items.filter((item) => item.section === "HOME").length,
      portfolioCount: items.filter((item) => item.section === "PORTFOLIO").length,
      researchCount: items.filter((item) => item.section === "RESEARCH").length,
      newsCount: items.filter((item) => item.section === "NEWS").length,
    };
  }, [items]);

  const activeSectionItems = useMemo(
    () => items.filter((item) => item.section === activeSection),
    [items, activeSection],
  );

  const featuredTitle = useMemo(
    () => activeSectionItems.find((item) => item.isFeatured)?.title ?? "Sin destacada",
    [activeSectionItems],
  );

  const searchedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return activeSectionItems.filter((item) => {
      const statusOk = statusFilter === "ALL" || item.status === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;

      return [
        item.title,
        item.excerpt,
        item.category,
        item.ctaLabel,
        item.author?.fullName,
        item.author?.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeSectionItems, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(searchedItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return searchedItems.slice(start, start + PAGE_SIZE);
  }, [searchedItems, safeCurrentPage]);

  const patchArticle = useCallback(
    async (articleId: string, payload: Record<string, unknown>) => {
      setError("");
      try {
        const response = await fetch(`${API_BASE_URL}/admin/articles/${articleId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("No se pudo actualizar artículo");
        await loadArticles();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    },
    [loadArticles],
  );

  const createArticle = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/articles`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!response.ok) throw new Error("No se pudo crear artículo");

      setCreateForm(INITIAL_ARTICLE_FORM);
      setCreateOpen(false);
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const openEditDialog = (item: AdminArticle) => {
    setEditingArticle(item);
    setEditForm({
      section: item.section,
      category: item.category,
      title: item.title,
      excerpt: item.excerpt,
      content: item.content,
      ctaLabel: item.ctaLabel,
      ctaUrl: item.ctaUrl,
      status: item.status,
      isFeatured: item.isFeatured,
    });
    setEditOpen(true);
  };

  const submitEditArticle = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingArticle) return;

    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/admin/articles/${editingArticle.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!response.ok) throw new Error("No se pudo editar artículo");

      const editor = user?.fullName || user?.email || "Usuario";
      setEditedByMap((prev) => ({ ...prev, [editingArticle.id]: editor }));
      setEditOpen(false);
      setEditingArticle(null);
      await loadArticles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  const setSectionFeaturedLocally = (target: AdminArticle) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.section !== target.section) return item;
        if (item.id === target.id) {
          return { ...item, isFeatured: true, status: "PUBLISHED" as ArticleStatus };
        }
        return { ...item, isFeatured: false };
      }),
    );
  };

  const clearFeaturedLocally = (target: AdminArticle) => {
    setItems((prev) => prev.map((item) => (item.id === target.id ? { ...item, isFeatured: false } : item)));
  };

  const applyFeaturedTarget = (target: AdminArticle) => {
    const sectionName = SECTION_META[target.section].label;
    setSectionFeaturedLocally(target);
    if (target.status === "DRAFT") {
      setNotice(`Se reemplazó la destacada en ${sectionName}. "${target.title}" estaba en borrador y se publicó automáticamente.`);
    } else {
      setNotice(`Se reemplazó la destacada en ${sectionName}. Ahora está destacada: "${target.title}".`);
    }
    void patchArticle(target.id, { isFeatured: true, status: "PUBLISHED" });
  };

  const handleToggleFeatured = (target: AdminArticle) => {
    if (target.isFeatured) {
      clearFeaturedLocally(target);
      setNotice("Se quitó la destacada de esta nota en su sección.");
      void patchArticle(target.id, { isFeatured: false });
      return;
    }

    const previousFeatured = items.find(
      (candidate) =>
        candidate.section === target.section &&
        candidate.isFeatured &&
        candidate.id !== target.id,
    );

    if (previousFeatured) {
      setPendingFeaturedTarget(target);
      setPendingFeaturedPrevious(previousFeatured);
      setConfirmFeaturedOpen(true);
      return;
    }

    setSectionFeaturedLocally(target);
    if (target.status === "DRAFT") {
      setNotice("La nota estaba en borrador. Se publicó automáticamente y quedó como destacada.");
    } else {
      setNotice("La nota seleccionada ahora es la destacada de su sección.");
    }
    void patchArticle(target.id, { isFeatured: true, status: "PUBLISHED" });
  };

  const confirmFeaturedReplacement = () => {
    if (!pendingFeaturedTarget) return;
    applyFeaturedTarget(pendingFeaturedTarget);
    setConfirmFeaturedOpen(false);
    setPendingFeaturedTarget(null);
    setPendingFeaturedPrevious(null);
  };

  const cancelFeaturedReplacement = () => {
    setNotice("Cambio cancelado. Se mantiene la destacada anterior.");
    setConfirmFeaturedOpen(false);
    setPendingFeaturedTarget(null);
    setPendingFeaturedPrevious(null);
  };

  return (
    <BackofficeShell
      title="Gestión de Artículos (Legacy)"
      subtitle="Panel por pestañas con buscador y paginación para artículos editoriales."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
          <CardContent className="p-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Estado Global</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-0.5 text-xs font-bold text-[#0e2246]">Total: {stats.total}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-700">Publicados: {stats.published}</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-700">Borradores: {stats.draft}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
          <CardContent className="p-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Secciones</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 font-semibold text-[#0e2246]">Inicio: {stats.homeCount}</span>
              <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 font-semibold text-[#0e2246]">Portfolio: {stats.portfolioCount}</span>
              <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 font-semibold text-[#0e2246]">Research: {stats.researchCount}</span>
              <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 font-semibold text-[#0e2246]">Noticias: {stats.newsCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#d8e5f8] bg-[#f0f6ff] p-5">
          <CardContent className="p-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0062ff]">Regla de Destacadas</p>
            <p className="mt-2 text-xs leading-relaxed text-[#475569]">
              Solo puede haber 1 nota destacada por sección. Al marcar una nueva, se reemplaza automáticamente la anterior.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm">
        <CardHeader className="p-0 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="font-serif text-2xl font-bold text-[#0e2246]">Listado Editorial</CardTitle>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger className="inline-flex h-9 items-center rounded-full bg-[#0062ff] px-4 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#091a36]">
                + Nuevo Artículo
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 text-[#334155] sm:max-w-[760px]">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl font-bold text-[#0e2246]">Crear Artículo</DialogTitle>
                  <DialogDescription className="text-xs text-[#64748b]">
                    Completá los campos y publicá o guardá como borrador.
                  </DialogDescription>
                </DialogHeader>

                <ArticleEditorForm
                  form={createForm}
                  setForm={(updater) => setCreateForm((prev) => updater(prev))}
                  onSubmit={createArticle}
                  onCancel={() => setCreateOpen(false)}
                  submitLabel="Guardar Artículo"
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SECTION_ORDER.map((section) => {
              const count = items.filter((item) => item.section === section).length;
              const active = section === activeSection;

              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                    active
                      ? "bg-[#091a36] text-white shadow-sm"
                      : "border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#0062ff] hover:text-[#0062ff]"
                  }`}
                >
                  {SECTION_META[section].label} ({count})
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar en ${SECTION_META[activeSection].label}...`}
              className="rounded-xl border-[#e2e8f0] text-xs text-[#0e2246]"
            />

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "ALL" | ArticleStatus)}>
              <SelectTrigger className="rounded-xl border-[#e2e8f0] text-xs text-[#0e2246]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                <SelectItem value="PUBLISHED">Publicado</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 text-[#334155] sm:max-w-[760px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-bold text-[#0e2246]">Editar Artículo</DialogTitle>
              <DialogDescription className="text-xs text-[#64748b]">
                Actualizá el contenido y guardá los cambios.
              </DialogDescription>
            </DialogHeader>

            <ArticleEditorForm
              form={editForm}
              setForm={(updater) => setEditForm((prev) => updater(prev))}
              onSubmit={submitEditArticle}
              onCancel={() => {
                setEditOpen(false);
                setEditingArticle(null);
              }}
              submitLabel="Guardar Cambios"
            />
          </DialogContent>
        </Dialog>

        <Dialog open={confirmFeaturedOpen} onOpenChange={setConfirmFeaturedOpen}>
          <DialogContent className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-6 text-[#334155] sm:max-w-[620px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-bold text-[#0e2246]">Reemplazar Nota Destacada</DialogTitle>
              <DialogDescription className="text-xs text-[#64748b]">
                Esta acción desmarca la destacada actual y deja una sola destacada por sección.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 rounded-xl border border-[#d8e5f8] bg-[#f0f6ff] p-4 text-xs text-[#475569]">
              <p>
                Actual: <span className="font-bold text-[#091a36]">{pendingFeaturedPrevious?.title ?? "-"}</span>
              </p>
              <p>
                Nueva: <span className="font-bold text-[#0062ff]">{pendingFeaturedTarget?.title ?? "-"}</span>
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[#e2e8f0] text-xs font-semibold text-[#64748b]"
                onClick={cancelFeaturedReplacement}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#0062ff] text-xs font-bold uppercase text-white hover:bg-[#091a36]"
                onClick={confirmFeaturedReplacement}
              >
                Confirmar Cambio
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <CardContent className="p-0 pt-3">
          {notice ? (
            <Alert className="mb-4 rounded-xl border-blue-200 bg-blue-50 text-xs text-blue-800">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mb-4 rounded-xl border-red-200 bg-red-50 text-xs text-red-700">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <p className="text-xs text-[#64748b]">Cargando artículos...</p>
          ) : (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#0062ff]">{SECTION_META[activeSection].eyebrow}</p>
                  <h3 className="font-serif text-xl font-bold text-[#0e2246]">{SECTION_META[activeSection].label}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-3 py-0.5 text-xs font-semibold text-[#64748b]">
                    Resultados: {searchedItems.length}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-bold text-amber-700">
                    Destacada: {featuredTitle}
                  </span>
                </div>
              </div>

              {searchedItems.length === 0 ? (
                <p className="text-xs text-[#64748b]">No hay artículos para esa búsqueda en esta sección.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedItems.map((item) => (
                      <ArticleCard
                        key={item.id}
                        item={item}
                        editedBy={editedByMap[item.id]}
                        onEdit={openEditDialog}
                        onToggleStatus={(id, currentStatus) =>
                          void patchArticle(id, {
                            status: currentStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          })
                        }
                        onToggleFeatured={handleToggleFeatured}
                      />
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
                    <p className="text-xs font-semibold text-[#64748b]">
                      Página {safeCurrentPage} de {totalPages} · Mostrando {paginatedItems.length} de {searchedItems.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-[#e2e8f0] bg-white px-4 py-1 text-xs font-semibold text-[#0e2246] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={safeCurrentPage <= 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-[#e2e8f0] bg-white px-4 py-1 text-xs font-semibold text-[#0e2246] disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </CardContent>
      </Card>
    </BackofficeShell>
  );
}
