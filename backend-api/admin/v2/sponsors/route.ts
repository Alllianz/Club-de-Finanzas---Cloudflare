import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const items = await prisma.sponsor.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/v2/sponsors:", error);
    return NextResponse.json({ error: "Error al listar sponsors" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json({ error: "Nombre del sponsor requerido" }, { status: 400 });
    }

    const item = await prisma.sponsor.create({
      data: {
        name,
        logoUrl: body.logoUrl ? String(body.logoUrl).trim() : null,
        linkUrl: body.linkUrl ? String(body.linkUrl).trim() : null,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/v2/sponsors:", error);
    return NextResponse.json({ error: "Error al crear sponsor" }, { status: 500 });
  }
}
