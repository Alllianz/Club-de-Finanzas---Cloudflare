import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/auth-guard";

export async function GET(req: NextRequest) {
  const result = await authenticateRequest(req);
  if ("errorResponse" in result) {
    return result.errorResponse;
  }

  return NextResponse.json({ user: result.user });
}
