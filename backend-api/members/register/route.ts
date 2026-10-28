import { NextResponse } from "next/server";
import { membersService } from "@/lib/firebase/members-service";
import { signMemberToken, MEMBER_COOKIE_NAME } from "@/lib/firebase/member-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone } = body;

    if (!fullName || !email || !phone) {
      return NextResponse.json(
        { error: "Todos los campos (Nombre y Apellido, Correo y Teléfono) son obligatorios" },
        { status: 400 },
      );
    }

    const member = await membersService.createMember({
      fullName,
      email,
      phone,
    });

    const token = signMemberToken(member);

    const response = NextResponse.json({
      success: true,
      message: "¡Registro exitoso! Bienvenido al Club de Finanzas UBA.",
      member,
    });

    // Guardar cookie HTTP-Only segura
    response.cookies.set(MEMBER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 días
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[API Members Register] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Ocurrió un error al registrarte como miembro" },
      { status: 400 },
    );
  }
}
