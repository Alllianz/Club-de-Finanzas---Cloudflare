import { NextResponse } from "next/server";
import { membersService } from "@/lib/firebase/members-service";
import { signMemberToken, MEMBER_COOKIE_NAME } from "@/lib/firebase/member-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName, phone } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Correo electrónico no proporcionado por Google" },
        { status: 400 },
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    let member = await membersService.getMemberByEmail(cleanEmail);

    if (!member) {
      // Si es la primera vez que inicia sesión con Google, lo registramos
      member = await membersService.createMember({
        email: cleanEmail,
        fullName: fullName?.trim() || cleanEmail.split("@")[0],
        phone: phone?.trim() || "No especificado",
      });
    }

    const token = signMemberToken(member);

    const response = NextResponse.json({
      success: true,
      message: "¡Sesión iniciada con Google exitosamente!",
      member,
    });

    response.cookies.set(MEMBER_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 días
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("[API Members Google Auth] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al autenticar con Google" },
      { status: 400 },
    );
  }
}
