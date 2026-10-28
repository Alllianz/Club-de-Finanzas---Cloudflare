import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import type { ContactLinkKind } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.contactLink.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });
    }

    const item = await prisma.contactLink.update({
      where: { id },
      data: {
        kind: (body.kind ?? existing.kind) as ContactLinkKind,
        label: body.label !== undefined ? String(body.label).trim() : existing.label,
        href: body.href !== undefined ? String(body.href).trim() : existing.href,
        value: body.value !== undefined ? (String(body.value).trim() || null) : existing.value,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/v2/contact-links/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar enlace" }, { status: 500 });
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
    await prisma.contactLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/v2/contact-links/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar enlace" }, { status: 500 });
  }
}
