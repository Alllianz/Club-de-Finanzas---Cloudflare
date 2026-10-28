import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/utils/auth-guard";
import { uploadBuffer, deleteObjectByKey, UploadKind } from "@/lib/services/storage-service";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function normalizeKind(raw: unknown): UploadKind | undefined {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "image" || value === "pdf" || value === "flyer") return value as UploadKind;
  return undefined;
}

function isMimeAllowed(kind: UploadKind, mime: string): boolean {
  if (kind === "pdf") return mime === "application/pdf";
  if (kind === "image" || kind === "flyer") return mime.startsWith("image/");
  return false;
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const kind = normalizeKind(formData.get("kind"));

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    if (!kind) {
      return NextResponse.json({ error: "Tipo de archivo inválido (image|pdf|flyer)" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Archivo demasiado grande (máximo 15MB)" }, { status: 400 });
    }

    if (!isMimeAllowed(kind, file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido para la categoría seleccionada" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploaded = await uploadBuffer({
      fileName: file.name,
      mimeType: file.type,
      buffer,
      kind,
    });

    return NextResponse.json(
      {
        asset: {
          key: uploaded.key,
          url: uploaded.publicUrl,
          kind,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[API Admin] Error en POST /api/admin/v2/uploads:", error);
    return NextResponse.json({ error: "Error al subir archivo a R2/S3" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authResult = await authenticateRequest(req, ["ADMIN", "EDITOR"]);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const key = req.nextUrl.searchParams.get("key")?.trim();
    if (!key) {
      return NextResponse.json({ error: "Key requerida" }, { status: 400 });
    }

    await deleteObjectByKey(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API Admin] Error en DELETE /api/admin/v2/uploads:", error);
    return NextResponse.json({ error: "Error al eliminar archivo de R2/S3" }, { status: 500 });
  }
}
