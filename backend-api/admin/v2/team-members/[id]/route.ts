import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import type { TeamSection } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Integrante no encontrado" }, { status: 404 });
    }

    const item = await prisma.teamMember.update({
      where: { id },
      data: {
        fullName: body.fullName !== undefined ? String(body.fullName).trim() : existing.fullName,
        title: body.title !== undefined ? String(body.title).trim() : existing.title,
        section: (body.section ?? existing.section) as TeamSection,
        shortBio: body.shortBio !== undefined ? (String(body.shortBio).trim() || null) : existing.shortBio,
        imageUrl: body.imageUrl !== undefined ? (String(body.imageUrl).trim() || null) : existing.imageUrl,
        profileUrl: body.profileUrl !== undefined ? (String(body.profileUrl).trim() || null) : existing.profileUrl,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : existing.displayOrder,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/v2/team-members/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar integrante" }, { status: 500 });
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
    await prisma.teamMember.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/v2/team-members/[id]:", error);
    return NextResponse.json({ error: "Error al eliminar integrante" }, { status: 500 });
  }
}
