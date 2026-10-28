import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Member } from "../types/member";
import { membersService } from "./members-service";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-club-finanzas-members-2026";
export const MEMBER_COOKIE_NAME = "club_member_session";

export type MemberJwtPayload = {
  id: string;
  email: string;
  fullName: string;
  role: "MEMBER";
};

export function signMemberToken(member: Member): string {
  const payload: MemberJwtPayload = {
    id: member.id,
    email: member.email,
    fullName: member.fullName,
    role: "MEMBER",
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyMemberToken(token: string): MemberJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as MemberJwtPayload;
    if (decoded && decoded.id && decoded.email) {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function getCurrentMember(): Promise<Member | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(MEMBER_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyMemberToken(token);
    if (!payload) return null;

    const member = await membersService.getMemberById(payload.id);
    if (!member || !member.isActive) return null;

    return member;
  } catch (error) {
    return null;
  }
}
