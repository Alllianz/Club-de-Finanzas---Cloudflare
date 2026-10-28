"use client";

import type { FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ArticleSection, ArticleStatus } from "../../../lib/types";
import type { ArticleFormValues } from "../article-config";
import { LinkPreview } from "./link-preview";

type Props = {
  form: ArticleFormValues;
  setForm: (updater: (prev: ArticleFormValues) => ArticleFormValues) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
};

export function ArticleEditorForm({ form, setForm, onSubmit, onCancel, submitLabel }: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Select
          value={form.section}
          onValueChange={(value) => setForm((prev) => ({ ...prev, section: value as ArticleSection }))}
        >
          <SelectTrigger className="border-white/20 bg-slate-950 text-white">
            <SelectValue placeholder="Seccion" />
          </SelectTrigger>
          <SelectContent className="border-white/20 bg-slate-950 text-white">
            <SelectItem value="HOME">Inicio</SelectItem>
            <SelectItem value="PORTFOLIO">Portfolio</SelectItem>
            <SelectItem value="RESEARCH">Research</SelectItem>
            <SelectItem value="NEWS">Noticias</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={form.status}
          onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as ArticleStatus }))}
        >
          <SelectTrigger className="border-white/20 bg-slate-950 text-white">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="border-white/20 bg-slate-950 text-white">
            <SelectItem value="DRAFT">Borrador</SelectItem>
            <SelectItem value="PUBLISHED">Publicado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Input
        value={form.category}
        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
        placeholder="Categoria"
        className="bg-black/35 text-white placeholder:text-white/35"
      />
      <Input
        value={form.title}
        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
        required
        placeholder="Titulo"
        className="bg-black/35 text-white placeholder:text-white/35"
      />
      <Textarea
        value={form.excerpt}
        onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
        required
        placeholder="Bajada corta"
        className="min-h-20 bg-black/35 text-white placeholder:text-white/35"
      />
      <Textarea
        value={form.content}
        onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
        required
        placeholder="Contenido completo"
        className="min-h-28 bg-black/35 text-white placeholder:text-white/35"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          value={form.ctaLabel}
          onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
          placeholder="Texto del boton"
          className="bg-black/35 text-white placeholder:text-white/35"
        />
        <Input
          value={form.ctaUrl}
          onChange={(e) => setForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
          placeholder="URL de destino"
          className="bg-black/35 text-white placeholder:text-white/35"
        />
      </div>

      <LinkPreview url={form.ctaUrl} />

      <label className="flex items-center gap-2 text-sm text-white/75">
        <input
          type="checkbox"
          checked={form.isFeatured}
          onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))}
        />
        Marcar como destacada (solo 1 destacada por seccion)
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="border-white/20 bg-transparent text-white hover:bg-white/10"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" className="bg-white text-slate-900 hover:bg-white/90">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
