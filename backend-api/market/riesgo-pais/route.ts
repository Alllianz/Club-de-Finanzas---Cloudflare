import { NextRequest, NextResponse } from "next/server";
import { getCountryRiskData } from "@/lib/services/market-service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const data = await getCountryRiskData(limit);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error en /api/market/riesgo-pais:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los datos de riesgo país" },
      { status: 500 },
    );
  }
}
