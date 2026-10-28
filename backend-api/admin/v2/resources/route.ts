import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const items = await prisma.resource.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/v2/resources:", error);
    return NextResponse.json({ error: "Error al listar recursos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const title = String(body.title ?? "").trim();
    const url = String(body.url ?? "").trim();
    const type = String(body.type ?? "Enlace").trim();

    if (!title || !url) {
      return NextResponse.json({ error: "Título y URL requeridos" }, { status: 400 });
    }

    const item = await prisma.resource.create({
      data: {
        title,
        url,
        type,
        description: body.description ? String(body.description).trim() : null,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/v2/resources:", error);
    return NextResponse.json({ error: "Error al crear recurso" }, { status: 500 });
  }
}
