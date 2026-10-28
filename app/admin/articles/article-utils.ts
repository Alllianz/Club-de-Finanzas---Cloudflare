import { getDomainFromUrl } from "../../lib/url";

export function getDomain(value: string) {
  return getDomainFromUrl(value, "link invalido");
}

export function isImageUrl(value: string) {
  return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(value);
}

export function getEditorLabel(params: {
  editedBy?: string;
  authorName?: string;
  authorEmail?: string;
  authorId?: string;
}) {
  return (
    params.editedBy ||
    params.authorName ||
    params.authorEmail ||
    (params.authorId ? `ID ${params.authorId.slice(0, 8)}` : "Usuario")
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function wasEdited(createdAt: string, updatedAt: string) {
  return Math.abs(new Date(updatedAt).getTime() - new Date(createdAt).getTime()) > 1000;
}
