import jwt from "jsonwebtoken";
import type { Role } from "../types";

const SESSION_EXPIRATION_DAYS = Number(process.env.SESSION_EXPIRATION_DAYS ?? 30);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-club-finanzas";

export function signSession(user: { id: string; email: string; role: Role }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: `${SESSION_EXPIRATION_DAYS}d` },
  );
}

export function verifySession(token: string): { id: string; email: string; role: Role } {
  return jwt.verify(token, JWT_SECRET) as {
    id: string;
    email: string;
    role: Role;
  };
}
