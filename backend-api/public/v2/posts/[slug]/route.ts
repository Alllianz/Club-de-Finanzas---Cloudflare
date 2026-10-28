import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PostStatus } from "@/lib/types";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ error: "Slug requerido" }, { status: 400 });
    }

    const post = await prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
      include: postInclude(),
    });

    if (!post) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[API] Error en /api/public/v2/posts/[slug]:", error);
    return NextResponse.json(
      { error: "Error al obtener publicación" },
      { status: 500 },
    );
  }
}
