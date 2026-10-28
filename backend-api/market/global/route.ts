import { NextResponse } from "next/server";
import { getGlobalMarketData } from "@/lib/services/market-service";

export async function GET() {
  try {
    const data = await getGlobalMarketData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error en /api/market/global:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los datos de mercado global" },
      { status: 500 },
    );
  }
}
