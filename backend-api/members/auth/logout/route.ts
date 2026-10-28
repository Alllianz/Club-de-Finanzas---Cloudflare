import { NextResponse } from "next/server";
import { MEMBER_COOKIE_NAME } from "@/lib/firebase/member-auth";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Sesión cerrada correctamente",
  });

  response.cookies.set(MEMBER_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
