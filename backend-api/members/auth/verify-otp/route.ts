import { NextResponse } from "next/server";
import { membersService } from "@/lib/firebase/members-service";
import { signMemberToken, MEMBER_COOKIE_NAME } from "@/lib/firebase/member-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Correo electrónico y código de verificación son requeridos" },
        { status: 400 },
      );
    }

    const member = await membersService.verifyMemberOtp(email, code);
    const token = signMemberToken(member);

    const response = NextResponse.json({
      success: true,
      message: "¡Sesión iniciada con éxito!",
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
    return NextResponse.json(
      { error: error?.message || "Error al verificar el código de acceso" },
      { status: 400 },
    );
  }
}
