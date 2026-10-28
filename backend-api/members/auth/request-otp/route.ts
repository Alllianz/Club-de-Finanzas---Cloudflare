import { NextResponse } from "next/server";
import { membersService } from "@/lib/firebase/members-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Por favor ingresá tu correo electrónico" },
        { status: 400 },
      );
    }

    const { code } = await membersService.createMemberOtp(email);

    return NextResponse.json({
      success: true,
      message: "Te enviamos un código de 6 dígitos para ingresar.",
      // En modo desarrollo exponemos el código si no hay Brevo configurado
      ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al solicitar el código de acceso" },
      { status: 400 },
    );
  }
}
