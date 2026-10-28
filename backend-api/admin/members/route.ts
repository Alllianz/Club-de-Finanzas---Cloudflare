import { NextRequest, NextResponse } from "next/server";
import { membersService } from "@/lib/firebase/members-service";
import { authenticateRequest } from "@/lib/utils/auth-guard";

export async function GET(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const members = await membersService.getAllMembers();
    return NextResponse.json({ items: members });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error al obtener la lista de miembros" },
      { status: 500 },
    );
  }
}
