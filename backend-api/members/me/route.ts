import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/firebase/member-auth";

export async function GET() {
  try {
    const member = await getCurrentMember();
    if (!member) {
      return NextResponse.json({ authenticated: false, member: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      member,
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false, member: null }, { status: 401 });
  }
}
