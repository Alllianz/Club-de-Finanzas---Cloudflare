import crypto from "node:crypto";
import prisma from "../prisma";
import { signSession } from "./jwt-service";
import { sendOtpEmail } from "./email-service";
import type { AuthUser } from "../types";

const OTP_EXPIRATION_MINUTES = Number(process.env.OTP_EXPIRATION_MINUTES ?? 15);

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function requestUserOtp(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    throw new Error("Email requerido");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new Error("Usuario no autorizado o inactivo");
  }

  const code = generateSecureOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60_000);

  await prisma.otp.create({
    data: {
      email,
      code,
      expiresAt,
      userId: user.id,
    },
  });

  await sendOtpEmail(email, code);
}

export async function verifyUserOtp(rawEmail: string, rawOtp: string): Promise<{ token: string; user: AuthUser }> {
  const email = normalizeEmail(rawEmail);
  const otp = rawOtp.replace(/\D/g, "").slice(0, 6);

  if (!email || !otp || otp.length !== 6) {
    throw new Error("Email y código OTP válido de 6 dígitos requeridos");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new Error("Usuario no autorizado o inactivo");
  }

  const otpRecord = await prisma.otp.findFirst({
    where: {
      email,
      code: otp,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new Error("Código OTP inválido o expirado");
  }

  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { consumedAt: new Date() },
  });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    isActive: user.isActive,
  };

  const token = signSession(user);

  return { token, user: authUser };
}
