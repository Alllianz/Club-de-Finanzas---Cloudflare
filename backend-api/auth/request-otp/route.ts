import { NextRequest, NextResponse } from "next/server";
import { requestUserOtp } from "@/lib/services/auth-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    await requestUserOtp(email);
    return NextResponse.json({ message: "OTP enviado correctamente" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar solicitud OTP";
    const status = message.includes("no autorizado") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
