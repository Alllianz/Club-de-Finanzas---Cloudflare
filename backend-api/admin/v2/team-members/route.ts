import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import type { TeamSection } from "@/lib/types";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const items = await prisma.teamMember.findMany({
      orderBy: [{ section: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API Admin] Error en GET /api/admin/v2/team-members:", error);
    return NextResponse.json({ error: "Error al listar integrantes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const body = await req.json();
    const fullName = String(body.fullName ?? "").trim();
    const title = String(body.title ?? "").trim();
    const section = (body.section ?? "PORTFOLIO") as TeamSection;

    if (!fullName || !title) {
      return NextResponse.json({ error: "Nombre completo y cargo requeridos" }, { status: 400 });
    }

    const item = await prisma.teamMember.create({
      data: {
        fullName,
        title,
        section,
        shortBio: body.shortBio ? String(body.shortBio).trim() : null,
        imageUrl: body.imageUrl ? String(body.imageUrl).trim() : null,
        profileUrl: body.profileUrl ? String(body.profileUrl).trim() : null,
        displayOrder: Number(body.displayOrder ?? 0),
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/v2/team-members:", error);
    return NextResponse.json({ error: "Error al crear integrante" }, { status: 500 });
  }
}
