import { NextRequest, NextResponse } from "next/server";

type Role = "ADMIN" | "EDITOR";

function decodePayload(token: string | null): null | { role?: Role; exp?: number } {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as { role?: Role; exp?: number };
  } catch {
    return null;
  }
}

function isExpired(exp?: number) {
  if (!exp) return false;
  return exp <= Math.floor(Date.now() / 1000);
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get("authToken")?.value ?? null;
  const payload = decodePayload(token);

  const requiresAuth = pathname.startsWith("/admin");
  if (!requiresAuth) return NextResponse.next();

  if (!payload || isExpired(payload.exp)) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin/users") && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/admin/articles", request.url));
  }

  if ((pathname === "/admin" || pathname.startsWith("/admin/articles")) && payload.role !== "ADMIN" && payload.role !== "EDITOR") {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
