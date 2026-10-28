import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { TeamSection } from "@/lib/types";

export async function GET() {
  try {
    const items = await prisma.teamMember.findMany({
      where: { isActive: true },
      orderBy: [{ section: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    });

    const grouped = {
      leadership: items.filter((m) => m.section === "LEADERSHIP"),
      portfolio: items.filter((m) => m.section === "PORTFOLIO"),
      research: items.filter((m) => m.section === "RESEARCH"),
      rrii: items.filter((m) => m.section === "RRII"),
    };

    return NextResponse.json({
      items,
      grouped,
    });
  } catch (error) {
    console.error("[API] Error en /api/public/v2/team-members:", error);
    return NextResponse.json(
      { error: "Error al listar integrantes del equipo" },
      { status: 500 },
    );
  }
}
