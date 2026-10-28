import { NextRequest, NextResponse } from "next/server";
import { createLinkPreviewService } from "../../lib/link-preview";
import { isHttpUrl } from "../../lib/url";

const linkPreviewService = createLinkPreviewService();

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url") ?? "";

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "URL invalida" }, { status: 400 });
  }

  if (!isHttpUrl(parsedUrl)) {
    return NextResponse.json({ error: "Protocolo no permitido" }, { status: 400 });
  }

  const payload = await linkPreviewService.resolve(parsedUrl.toString());
  return NextResponse.json(payload);
}
