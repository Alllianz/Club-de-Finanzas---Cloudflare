export type Member = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
  registeredAt: string;
  lastLoginAt?: string | null;
  source?: "firebase" | "postgres";
};

export type MemberRegistrationInput = {
  fullName: string;
  email: string;
  phone: string;
};

export type MemberLoginInput = {
  email: string;
};

export type MemberVerifyOtpInput = {
  email: string;
  code: string;
};

export type MemberSession = {
  member: Member;
  token: string;
};
