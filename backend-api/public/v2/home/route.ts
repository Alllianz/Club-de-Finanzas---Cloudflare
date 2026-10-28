import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const [novedades, latest, sponsors, resources, contactLinks] = await Promise.all([
      prisma.post.findMany({
        where: {
          status: PostStatus.PUBLISHED,
          OR: [
            { section: PostSection.HOME },
            { type: PostType.EVENT },
            { section: PostSection.NEWSLETTER },
          ],
        },
        include: postInclude(),
        orderBy: [
          { isFeatured: "desc" },
          { featuredOrder: "asc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: 5,
      }),
      prisma.post.findMany({
        where: { status: PostStatus.PUBLISHED, section: PostSection.HOME },
        include: postInclude(),
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 12,
      }),
      prisma.sponsor.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.resource.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.contactLink.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    return NextResponse.json({
      novedades,
      latest,
      sponsors,
      resources,
      contactLinks,
    });
  } catch (error) {
    console.error("[API] Error en /api/public/v2/home:", error);
    return NextResponse.json(
      { error: "Error al cargar los datos de portada" },
      { status: 500 },
    );
  }
}
