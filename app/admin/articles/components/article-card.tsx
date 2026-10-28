"use client";

import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminArticle, ArticleStatus } from "../../../lib/types";
import { SECTION_LABEL, STATUS_LABEL } from "../article-config";
import { formatDateTime, getEditorLabel, wasEdited } from "../article-utils";
import { LinkPreview } from "./link-preview";

type Props = {
  item: AdminArticle;
  editedBy?: string;
  onToggleStatus: (id: string, status: ArticleStatus) => void;
  onToggleFeatured: (item: AdminArticle) => void;
  onEdit: (item: AdminArticle) => void;
};

export function ArticleCard({ item, editedBy, onToggleStatus, onToggleFeatured, onEdit }: Props) {
  const edited = wasEdited(item.createdAt, item.updatedAt);
  const editorLabel = getEditorLabel({
    editedBy,
    authorName: item.author?.fullName,
    authorEmail: item.author?.email,
    authorId: item.authorId,
  });
  const editedAtLabel = formatDateTime(item.updatedAt);

  return (
    <article
      className={`rounded-xl border p-4 transition ${
        item.isFeatured
          ? "border-amber-400 bg-amber-50/20 shadow-sm"
          : "border-[#e2e8f0] bg-[#ffffff] hover:border-[#0062ff]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#0062ff]">
            {SECTION_LABEL[item.section]} · {item.category}
          </span>
          <h3 className="mt-2 font-serif text-lg font-bold text-[#0e2246]">{item.title}</h3>
          <p className="mt-1 text-xs text-[#64748b] line-clamp-2">{item.excerpt}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge
            variant="outline"
            className={
              item.status === "PUBLISHED"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }
          >
            {STATUS_LABEL[item.status]}
          </Badge>
          {item.isFeatured ? (
            <Badge className="border border-amber-300 bg-amber-100 text-amber-800">DESTACADA</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-[#64748b]">
        <Pencil className="h-3.5 w-3.5 text-[#0062ff]" />
        <span>
          {edited ? `Editado por ${editorLabel} (${editedAtLabel})` : `Sin ediciones. Creado por ${editorLabel}`}
        </span>
      </div>

      <LinkPreview url={item.ctaUrl} />

      <div className="mt-3 flex flex-wrap gap-2 border-t border-[#f1f5f9] pt-3">
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-[#e2e8f0] text-xs font-semibold text-[#0e2246] hover:bg-[#f8fafc]"
          onClick={() => onToggleStatus(item.id, item.status)}
        >
          {item.status === "PUBLISHED" ? "Pasar a borrador" : "Publicar"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-[#e2e8f0] text-xs font-semibold text-[#0e2246] hover:bg-[#f8fafc]"
          onClick={() => onToggleFeatured(item)}
        >
          {item.isFeatured ? "Quitar destacada" : "Marcar destacada"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-[#e2e8f0] text-xs font-semibold text-[#0062ff] hover:bg-[#f0f6ff]"
          onClick={() => onEdit(item)}
        >
          <Pencil className="mr-1 h-3 w-3" />
          Editar
        </Button>
      </div>
    </article>
  );
}
