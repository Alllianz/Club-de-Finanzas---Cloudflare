import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PostSection, PostStatus, PostType } from "@/lib/types";

function postInclude() {
  return {
    assets: { orderBy: { sortOrder: "asc" as const } },
    authors: {
      orderBy: { sortOrder: "asc" as const },
      include: {
        teamMember: true,
      },
    },
    eventMeta: true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type")?.toUpperCase() as PostType | undefined;
    const section = searchParams.get("section")?.toUpperCase() as PostSection | undefined;
    const featuredParam = searchParams.get("featured");
    const isFeatured = featuredParam === "true" ? true : featuredParam === "false" ? false : undefined;
    const page = Math.max(Number(searchParams.get("page") ?? 1) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 20) || 20, 1), 100);

    const where = {
      status: PostStatus.PUBLISHED,
      ...(type ? { type } : {}),
      ...(section ? { section } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: postInclude(),
        orderBy: [{ isFeatured: "desc" }, { featuredOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (error) {
    console.error("[API] Error en /api/public/v2/posts:", error);
    return NextResponse.json(
      { error: "Error al listar publicaciones" },
      { status: 500 },
    );
  }
}
