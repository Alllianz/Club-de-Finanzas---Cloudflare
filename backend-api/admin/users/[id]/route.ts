import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import { Role } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await authenticateRequest(req, "ADMIN");
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const data: { role?: Role; isActive?: boolean; fullName?: string } = {};

    if (body.role !== undefined) {
      const roleRaw = String(body.role).trim().toUpperCase();
      if (!Object.values(Role).includes(roleRaw as Role)) {
        return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
      }
      data.role = roleRaw as Role;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body.fullName !== undefined) {
      data.fullName = String(body.fullName).trim();
    }

    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ user });
  } catch (error) {
    console.error("[API Admin] Error en PATCH /api/admin/users/[id]:", error);
    return NextResponse.json({ error: "Error al actualizar usuario" }, { status: 500 });
  }
}
