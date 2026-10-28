import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import { ArticleSection, ArticleStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Artículo no encontrado" }, { status: 404 });
    }

    const section = (body.section ?? existing.section) as ArticleSection;
    const status = (body.status ?? existing.status) as ArticleStatus;
    const isFeatured = body.isFeatured !== undefined ? Boolean(body.isFeatured) : existing.isFeatured;

    let publishedAt = existing.publishedAt;
    if (status === "PUBLISHED" && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (body.publishedAt) {
      publishedAt = new Date(body.publishedAt);
    }

    const article = await prisma.article.update({
      where: { id },
      data: {
        section,
        category: body.category !== undefined ? String(body.category).trim() : existing.category,
        title: body.title !== undefined ? String(body.title).trim() : existing.title,
        excerpt: body.excerpt !== undefined ? String(body.excerpt).trim() : existing.excerpt,
        content: body.content !== undefined ? String(body.content).trim() : existing.content,
        ctaLabel: body.ctaLabel !== undefined ? String(body.ctaLabel).trim() : existing.ctaLabel,
        ctaUrl: body.ctaUrl !== undefined ? String(body.ctaUrl).trim() : existing.ctaUrl,
        status,
        isFeatured,
        publishedAt,
      },
      include: { author: { select: { id: true, email: true, fullName: true, role: true } } },
    });

    return NextResponse.json({ article });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/articles/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar artículo" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    await prisma.article.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/articles/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar artículo" }, { status: 500 });
  }
}
