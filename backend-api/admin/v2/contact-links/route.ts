import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import type { ContactLinkKind } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const items = await prisma.contactLink.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/v2/contact-links:", error);
    return NextResponse.json({ error: "Error al listar enlaces de contacto" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const kind = (body.kind ?? "OTHER") as ContactLinkKind;
    const label = String(body.label ?? "").trim();
    const href = String(body.href ?? "").trim();

    if (!label || !href) {
      return NextResponse.json({ error: "Etiqueta y URL requeridos" }, { status: 400 });
    }

    const item = await prisma.contactLink.create({
      data: {
        kind,
        label,
        href,
        value: body.value ? String(body.value).trim() : null,
        sortOrder: Number(body.sortOrder ?? 0),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/v2/contact-links:", error);
    return NextResponse.json({ error: "Error al crear enlace de contacto" }, { status: 500 });
  }
}
