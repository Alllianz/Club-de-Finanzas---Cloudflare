import type { ArticleSection, ArticleStatus } from "../../lib/types";

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
};

export const SECTION_LABEL: Record<ArticleSection, string> = {
  HOME: "Inicio",
  PORTFOLIO: "Portfolio",
  RESEARCH: "Research",
  NEWS: "Noticias",
};

export type ArticleFormValues = {
  section: ArticleSection;
  category: string;
  title: string;
  excerpt: string;
  content: string;
  ctaLabel: string;
  ctaUrl: string;
  status: ArticleStatus;
  isFeatured: boolean;
};

export const INITIAL_ARTICLE_FORM: ArticleFormValues = {
  section: "HOME",
  category: "General",
  title: "",
  excerpt: "",
  content: "",
  ctaLabel: "Leer nota",
  ctaUrl: "https://www.linkedin.com/company/club-de-finanzas-uba/",
  status: "DRAFT",
  isFeatured: false,
};
