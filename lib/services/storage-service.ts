import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "node:crypto";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const endpoint = process.env.R2_S3_ENDPOINT ?? (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;

function requireConfig() {
  if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicBaseUrl) {
    throw new Error("R2 config incompleta. Revisar R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_S3_ENDPOINT y R2_PUBLIC_BASE_URL");
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, endpoint, publicBaseUrl };
}

function buildClient() {
  const config = requireConfig();
  return new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export type UploadKind = "image" | "pdf" | "flyer";

export async function uploadBuffer(params: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  kind: UploadKind;
}) {
  const cfg = requireConfig();
  const client = buildClient();

  const ext = params.fileName.includes(".") ? params.fileName.split(".").pop() : undefined;
  const safeExt = ext ? ext.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
  const key = `${params.kind}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;

  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: params.buffer,
      ContentType: params.mimeType,
    }),
  );

  const publicUrl = `${cfg.publicBaseUrl.replace(/\/+$/, "")}/${key}`;
  return { key, publicUrl };
}

export async function deleteObjectByKey(key: string) {
  const cfg = requireConfig();
  const client = buildClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    }),
  );
}
