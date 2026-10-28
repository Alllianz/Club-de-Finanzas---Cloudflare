import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "clubdefinanzas-fullstack",
    timestamp: new Date().toISOString(),
  });
}
