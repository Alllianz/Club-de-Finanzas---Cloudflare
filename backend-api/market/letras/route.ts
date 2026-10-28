import { NextRequest, NextResponse } from "next/server";
import { getLetrasCurveData } from "@/lib/services/letras-service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const refresh = searchParams.get("refresh") === "true";

    const data = await getLetrasCurveData({ refresh });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Error en /api/market/letras:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los datos de la curva de letras" },
      { status: 500 },
    );
  }
}
