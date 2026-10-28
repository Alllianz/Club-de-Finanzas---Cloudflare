import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/site-shell";
import { publicPostsService } from "../../services/public-posts-service";
import type { Post } from "../../lib/types";

type Props = {
  params: Promise<{ slug: string }>;
};

const samplePost: Post = {
  id: "sample-post",
  slug: "analisis",
  type: "REPORT",
  section: "RESEARCH",
  status: "PUBLISHED",
  title: "Informe Institucional",
  summary: "Análisis y publicaciones del Club de Finanzas UBA.",
  body: "Contenido del informe institucional elaborado por los equipos de investigación y portfolio.",
  isFeatured: false,
  featuredOrder: 0,
  publishedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assets: [],
  authors: [],
  eventMeta: null,
};

export async function generateStaticParams() {
  return [{ slug: "analisis" }];
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;
  const response = await publicPostsService.getBySlug(slug).catch(() => null);
  const post = response?.post ?? (slug === "analisis" ? samplePost : null);
  if (!post) return notFound();

  const media = post.assets[0];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#334155]">
      <SiteHeader currentPath={post.type === "NEWSLETTER" ? "/newsletter" : `/${post.section.toLowerCase()}`} />
      <main className="mx-auto w-[min(980px,92vw)] space-y-8 py-12 md:py-16">
        {/* Encabezado del Artículo */}
        <section className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-8 md:p-10 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#d8e5f8] bg-[#f0f6ff] px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider text-[#0062ff]">
              {post.type} · {post.section}
            </span>
            {post.publishedAt && (
              <span className="font-mono text-xs font-semibold text-[#64748b]">
                {new Date(post.publishedAt).toLocaleDateString("es-AR", {
                  dateStyle: "long",
                })}
              </span>
            )}
          </div>

          <h1 className="mt-5 font-serif text-3xl font-bold leading-tight text-[#0e2246] sm:text-4xl md:text-5xl">
            {post.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-[#475569]">
            {post.summary}
          </p>

          {post.authors && post.authors.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[#f1f5f9] pt-4 text-xs font-semibold text-[#64748b]">
              <span>Autores:</span>
              {post.authors.map((author) => (
                <span key={author.id} className="rounded-full bg-[#f8fafc] border border-[#e2e8f0] px-3 py-1 text-[#091a36]">
                  {author.teamMember?.fullName || "Miembro"}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Visor de PDF para Informes y Reportes */}
        {post.type === "REPORT" && media ? (
          <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0062ff]">Documento de Research / Reporte</span>
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#091a36] hover:underline"
              >
                Abrir PDF en pestaña nueva ↗
              </a>
            </div>
            <iframe title={post.title} src={media.url} className="h-[75vh] w-full rounded-xl border border-[#e2e8f0]" />
          </section>
        ) : null}

        {/* Imagen para otros tipos */}
        {post.type !== "REPORT" && post.type !== "NEWSLETTER" && media ? (
          <section className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
            <img src={media.url} alt={post.title} className="max-h-[70vh] w-full rounded-xl object-contain" />
          </section>
        ) : null}

        {/* Galería de imágenes para Newsletter */}
        {post.type === "NEWSLETTER" && post.assets.length ? (
          <section className="grid gap-6 md:grid-cols-2">
            {post.assets.map((asset) => (
              <article key={asset.id} className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-4 shadow-sm">
                <img src={asset.url} alt={post.title} className="max-h-[60vh] w-full rounded-xl object-contain" />
              </article>
            ))}
          </section>
        ) : null}

        {/* Cuerpo del Artículo */}
        {post.body ? (
          <section className="rounded-2xl border border-[#e2e8f0] bg-[#ffffff] p-8 md:p-10 shadow-sm">
            <div className="prose prose-slate max-w-none text-base leading-relaxed text-[#334155] whitespace-pre-line">
              {post.body}
            </div>
          </section>
        ) : null}

        {/* CTA para Eventos */}
        {post.type === "EVENT" && post.eventMeta?.registrationUrl ? (
          <div className="flex justify-center pt-4">
            <a
              href={post.eventMeta.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#0062ff] px-8 py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#091a36]"
            >
              <span>Inscribirme al Evento</span>
              <span>→</span>
            </a>
          </div>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
