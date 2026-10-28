import { NextRequest, NextResponse } from "next/server";
import { verifyUserOtp } from "@/lib/services/auth-service";

const SESSION_EXPIRATION_DAYS = Number(process.env.SESSION_EXPIRATION_DAYS ?? 30);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const otp = typeof body?.otp === "string" ? body.otp : "";

    if (!email || !otp) {
      return NextResponse.json({ error: "Email y código OTP requeridos" }, { status: 400 });
    }

    const { token, user } = await verifyUserOtp(email, otp);

    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.json({ user });

    response.cookies.set("authToken", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_EXPIRATION_DAYS * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al verificar OTP";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
