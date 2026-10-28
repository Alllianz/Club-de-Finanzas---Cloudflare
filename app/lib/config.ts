export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api`
      : "http://localhost:3000/api");
