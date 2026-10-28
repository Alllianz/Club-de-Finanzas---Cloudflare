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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.post.findUnique({ where: { id }, include: { eventMeta: true } });
    if (!existing) {
      return NextResponse.json({ error: "Publicación no encontrada" }, { status: 404 });
    }

    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    const summary = body.summary !== undefined ? String(body.summary).trim() : existing.summary;
    const type = (body.type ?? existing.type) as PostType;
    const section = (body.section ?? existing.section) as PostSection;
    const status = (body.status ?? existing.status) as PostStatus;
    const isFeatured = body.isFeatured !== undefined ? Boolean(body.isFeatured) : existing.isFeatured;
    const featuredOrder = body.featuredOrder !== undefined ? Number(body.featuredOrder) : existing.featuredOrder;
    const postBody = body.body !== undefined ? (String(body.body).trim() || null) : existing.body;

    let publishedAt = existing.publishedAt;
    if (status === "PUBLISHED" && !existing.publishedAt) {
      publishedAt = new Date();
    } else if (body.publishedAt) {
      publishedAt = new Date(body.publishedAt);
    }

    let slug = existing.slug;
    if (body.title && body.title.trim() !== existing.title) {
      slug = await ensureUniqueSlug(body.title, id);
    }

    // Actualización transaccional de assets y autores si fueron provistos
    const post = await prisma.$transaction(async (tx: any) => {
      if (Array.isArray(body.assets)) {
        await tx.postAsset.deleteMany({ where: { postId: id } });
        if (body.assets.length > 0) {
          await tx.postAsset.createMany({
            data: body.assets.map((asset: { kind: AssetKind; url: string; sortOrder?: number }, index: number) => ({
              postId: id,
              kind: asset.kind,
              url: asset.url,
              sortOrder: asset.sortOrder ?? index,
            })),
          });
        }
      }

      if (Array.isArray(body.authors)) {
        await tx.postAuthor.deleteMany({ where: { postId: id } });
        if (body.authors.length > 0) {
          await tx.postAuthor.createMany({
            data: body.authors.map((author: { teamMemberId: string; sortOrder?: number }, index: number) => ({
              postId: id,
              teamMemberId: author.teamMemberId,
              sortOrder: author.sortOrder ?? index,
            })),
          });
        }
      }

      if (body.eventMeta !== undefined) {
        if (body.eventMeta?.eventDate) {
          await tx.eventMeta.upsert({
            where: { postId: id },
            create: {
              postId: id,
              eventDate: new Date(body.eventMeta.eventDate),
              pinUntil: body.eventMeta.pinUntil ? new Date(body.eventMeta.pinUntil) : new Date(body.eventMeta.eventDate),
              registrationUrl: body.eventMeta.registrationUrl ? String(body.eventMeta.registrationUrl).trim() : null,
            },
            update: {
              eventDate: new Date(body.eventMeta.eventDate),
              pinUntil: body.eventMeta.pinUntil ? new Date(body.eventMeta.pinUntil) : new Date(body.eventMeta.eventDate),
              registrationUrl: body.eventMeta.registrationUrl ? String(body.eventMeta.registrationUrl).trim() : null,
            },
          });
        } else {
          await tx.eventMeta.deleteMany({ where: { postId: id } });
        }
      }

      return tx.post.update({
        where: { id },
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
        },
        include: postInclude(),
      });
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/v2/posts/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar la publicación" }, { status: 500 });
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
    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/v2/posts/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar la publicación" }, { status: 500 });
  }
}
