import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PostSection, PostStatus } from "@/lib/types";

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
  { params }: { params: Promise<{ section: string }> },
) {
  try {
    const { section: rawSection } = await params;
    const section = rawSection?.toUpperCase() as PostSection;

    if (!section || !Object.values(PostSection).includes(section)) {
      return NextResponse.json({ error: "Sección inválida" }, { status: 400 });
    }

    const [featured, latest] = await Promise.all([
      prisma.post.findFirst({
        where: { section, status: PostStatus.PUBLISHED, isFeatured: true },
        include: postInclude(),
        orderBy: [{ featuredOrder: "asc" }, { publishedAt: "desc" }],
      }),
      prisma.post.findMany({
        where: { section, status: PostStatus.PUBLISHED },
        include: postInclude(),
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 12,
      }),
    ]);

    return NextResponse.json({ featured, latest });
  } catch (error) {
    console.error("[API] Error en /api/public/v2/sections/[section]:", error);
    return NextResponse.json(
      { error: "Error al cargar la sección" },
      { status: 500 },
    );
  }
}
