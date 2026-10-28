import { NextResponse } from "next/server";
import { getCountryRiskLatestData } from "@/lib/services/market-service";

export async function GET() {
  try {
    const data = await getCountryRiskLatestData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error en /api/market/riesgo-pais/ultimo:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el último dato de riesgo país" },
      { status: 500 },
    );
  }
}
