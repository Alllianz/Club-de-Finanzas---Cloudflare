import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import { ArticleSection, ArticleStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const section = searchParams.get("section")?.toUpperCase() as ArticleSection | undefined;
    const status = searchParams.get("status")?.toUpperCase() as ArticleStatus | undefined;

    const items = await prisma.article.findMany({
      where: {
        ...(section ? { section } : {}),
        ...(status ? { status } : {}),
      },
      include: { author: { select: { id: true, email: true, fullName: true, role: true } } },
      orderBy: [{ updatedAt: "desc" }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/articles:", error);
    return NextResponse.json({ error: "Error al listar artículos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const section = (body.section ?? "HOME") as ArticleSection;
    const category = String(body.category ?? "").trim();
    const title = String(body.title ?? "").trim();
    const excerpt = String(body.excerpt ?? "").trim();
    const content = String(body.content ?? "").trim();
    const ctaLabel = String(body.ctaLabel ?? "").trim();
    const ctaUrl = String(body.ctaUrl ?? "").trim();
    const status = (body.status ?? "DRAFT") as ArticleStatus;
    const isFeatured = Boolean(body.isFeatured);
    const publishedAt = status === "PUBLISHED" ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : null;

    if (!category || !title || !excerpt || !content || !ctaLabel || !ctaUrl) {
      return NextResponse.json({ error: "Campos requeridos incompletos" }, { status: 400 });
    }

    const article = await prisma.article.create({
      data: {
        section,
        category,
        title,
        excerpt,
        content,
        ctaLabel,
        ctaUrl,
        status,
        isFeatured,
        publishedAt,
        authorId: authResult.user.id,
      },
      include: { author: { select: { id: true, email: true, fullName: true, role: true } } },
    });

    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/articles:", error);
    return NextResponse.json({ error: "Error al crear artículo" }, { status: 500 });
  }
}
