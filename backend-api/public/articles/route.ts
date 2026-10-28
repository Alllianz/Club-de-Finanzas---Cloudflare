import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ArticleSection, ArticleStatus } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const section = searchParams.get("section")?.toUpperCase() as ArticleSection | undefined;
    const featuredParam = searchParams.get("featured");
    const isFeatured = featuredParam === "true" ? true : featuredParam === "false" ? false : undefined;
    const page = Math.max(Number(searchParams.get("page") ?? 1) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20) || 20, 1), 100);

    const where = {
      status: ArticleStatus.PUBLISHED,
      ...(section ? { section } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: { author: { select: { id: true, email: true, fullName: true, role: true } } },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    console.error("[API] Error en /api/public/articles:", error);
    return NextResponse.json({ error: "Error al listar artículos" }, { status: 500 });
  }
}
