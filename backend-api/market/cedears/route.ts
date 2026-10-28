import { NextRequest, NextResponse } from "next/server";
import { getCedearsData } from "@/lib/services/cedears-service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") ?? undefined;
    const market = searchParams.get("market") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const data = await getCedearsData({ search, market, limit });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error en /api/market/cedears:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los datos de CEDEARs" },
      { status: 500 },
    );
  }
}
