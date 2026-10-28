import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.sponsor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sponsor no encontrado" }, { status: 404 });
    }

    const item = await prisma.sponsor.update({
      where: { id },
      data: {
        name: body.name !== undefined ? String(body.name).trim() : existing.name,
        logoUrl: body.logoUrl !== undefined ? (String(body.logoUrl).trim() || null) : existing.logoUrl,
        linkUrl: body.linkUrl !== undefined ? (String(body.linkUrl).trim() || null) : existing.linkUrl,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/v2/sponsors/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar sponsor" }, { status: 500 });
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
    await prisma.sponsor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/v2/sponsors/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar sponsor" }, { status: 500 });
  }
}
