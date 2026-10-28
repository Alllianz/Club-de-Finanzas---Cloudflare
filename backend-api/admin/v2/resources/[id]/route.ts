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

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Recurso no encontrado" }, { status: 404 });
    }

    const item = await prisma.resource.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : existing.title,
        url: body.url !== undefined ? String(body.url).trim() : existing.url,
        type: body.type !== undefined ? String(body.type).trim() : existing.type,
        description: body.description !== undefined ? (String(body.description).trim() || null) : existing.description,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/v2/resources/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar recurso" }, { status: 500 });
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
    await prisma.resource.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/v2/resources/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar recurso" }, { status: 500 });
  }
}
