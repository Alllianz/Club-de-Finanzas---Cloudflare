import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import { Role } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, "ADMIN");
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const roleParam = searchParams.get("role")?.trim().toUpperCase();

    const users = await prisma.user.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { email: { contains: q, mode: "insensitive" } },
                  { fullName: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          roleParam && Object.values(Role).includes(roleParam as Role)
            ? { role: roleParam as Role }
            : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items: users });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/users:", error);
    return NextResponse.json({ error: "Error al listar usuarios" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, "ADMIN");
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const fullName = String(body.fullName ?? "").trim();
    const roleRaw = String(body.role ?? "EDITOR").trim().toUpperCase();

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    if (!Object.values(Role).includes(roleRaw as Role)) {
      return NextResponse.json({ error: "Rol inválido (ADMIN|EDITOR)" }, { status: 400 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        role: roleRaw as Role,
        isActive: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/users:", error);
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
  }
}
