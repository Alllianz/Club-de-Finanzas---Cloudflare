import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import { PostSection, PostStatus, PostType, AssetKind } from "@/lib/types";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureUniqueSlug(base: string, idToIgnore?: string): Promise<string> {
  const seed = toSlug(base) || "post";
  let candidate = seed;
  let i = 2;
  while (true) {
    const found = await prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!found || found.id === idToIgnore) return candidate;
    candidate = `${seed}-${i}`;
    i += 1;
  }
}

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
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const items = await prisma.post.findMany({
      include: postInclude(),
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/v2/posts:", error);
    return NextResponse.json({ error: "Error al listar publicaciones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const summary = String(body.summary ?? "").trim();

    if (!title || !summary) {
      return NextResponse.json({ error: "Título y resumen requeridos" }, { status: 400 });
    }

    const type = (body.type ?? "NEWSLETTER") as PostType;
    const section = (body.section ?? "NEWSLETTER") as PostSection;
    const status = (body.status ?? "DRAFT") as PostStatus;
    const isFeatured = Boolean(body.isFeatured);
    const featuredOrder = Number(body.featuredOrder ?? 0);
    const postBody = body.body ? String(body.body).trim() : null;
    const publishedAt = status === "PUBLISHED" ? (body.publishedAt ? new Date(body.publishedAt) : new Date()) : null;

    const slug = await ensureUniqueSlug(title);

    const post = await prisma.post.create({
      data: {
        slug,
        title,
        summary,
        body: postBody,
        type,
        section,
        status,
        isFeatured,
        featuredOrder,
        publishedAt,
        assets: Array.isArray(body.assets) && body.assets.length > 0
          ? {
              create: body.assets.map((asset: { kind: AssetKind; url: string; sortOrder?: number }, index: number) => ({
                kind: asset.kind,
                url: asset.url,
                sortOrder: asset.sortOrder ?? index,
              })),
            }
          : undefined,
        authors: Array.isArray(body.authors) && body.authors.length > 0
          ? {
              create: body.authors.map((author: { teamMemberId: string; sortOrder?: number }, index: number) => ({
                teamMemberId: author.teamMemberId,
                sortOrder: author.sortOrder ?? index,
              })),
            }
          : undefined,
        eventMeta:
          type === "EVENT" && body.eventMeta?.eventDate
            ? {
                create: {
                  eventDate: new Date(body.eventMeta.eventDate),
                  pinUntil: body.eventMeta.pinUntil ? new Date(body.eventMeta.pinUntil) : new Date(body.eventMeta.eventDate),
                  registrationUrl: body.eventMeta.registrationUrl ? String(body.eventMeta.registrationUrl).trim() : null,
                },
              }
            : undefined,
      },
      include: postInclude(),
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/v2/posts:", error);
    return NextResponse.json({ error: "Error al crear la publicación" }, { status: 500 });
  }
}
