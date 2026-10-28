import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "../services/jwt-service";
import prisma from "../prisma";
import type { Role, AuthUser } from "../types";

export type AuthContext = {
  user: AuthUser;
};

export async function authenticateRequest(
  req: NextRequest,
  requiredRole?: Role | Role[],
): Promise<{ user: AuthUser } | { errorResponse: NextResponse }> {
  const token = req.cookies.get("authToken")?.value;

  if (!token) {
    return {
      errorResponse: NextResponse.json(
        { error: "No autorizado. Token no proporcionado" },
        { status: 401 },
      ),
    };
  }

  try {
    const decoded = verifySession(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, fullName: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return {
        errorResponse: NextResponse.json(
          { error: "Sesión inválida o usuario inactivo" },
          { status: 401 },
        ),
      };
    }

    if (requiredRole) {
      const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!allowedRoles.includes(user.role as Role)) {
        return {
          errorResponse: NextResponse.json(
            { error: "Permisos insuficientes" },
            { status: 403 },
          ),
        };
      }
    }

    return { user: user as AuthUser };
  } catch {
    return {
      errorResponse: NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 401 },
      ),
    };
  }
}
