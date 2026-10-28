import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.sponsor.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[API] Error en /api/public/v2/sponsors:", error);
    return NextResponse.json(
      { error: "Error al listar sponsors" },
      { status: 500 },
    );
  }
}
