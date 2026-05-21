/**
 * Image storage abstraction. Two backends, picked at runtime by env:
 *
 *   - Local filesystem (default; dev only) — writes to ./public/uploads/<purpose>/
 *     and returns "/uploads/<purpose>/<file>" so Next.js serves it directly.
 *
 *   - S3-compatible cloud storage (production) — writes to
 *     <purpose>/<file> inside `S3_BUCKET`, returns one of:
 *       • `<S3_PUBLIC_BASE_URL>/<purpose>/<file>` for `purpose ∈ {photos,tasks}`
 *         when `S3_PUBLIC_BASE_URL` is set (CDN in front of bucket).
 *       • `/api/files/<purpose>/<key>` otherwise — an auth-gated proxy that
 *         redirects to a short-lived signed URL. IDs *always* go through
 *         the proxy regardless of `S3_PUBLIC_BASE_URL`.
 *
 * The DB stores whatever string we return, so existing render sites keep
 * working without any per-site changes when switching between modes.
 */

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

// We import the AWS SDK eagerly because the SDK doesn't pull anything into
// the client bundle (it's only used from server modules). If you really
// want to avoid the install in pure-local deployments, switch these to
// dynamic imports inside `getS3()` instead.
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StoragePurpose = "photos" | "ids" | "tasks";

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export type SaveResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/* ------------------------- backend selection ------------------------- */

function useS3(): boolean {
  return Boolean(process.env.S3_BUCKET);
}

/* ---------------------------- core helpers --------------------------- */

function validate(file: File): { ext: string } | { error: string } {
  const ext = ALLOWED[file.type];
  if (!ext) {
    return { error: "Only JPEG, PNG, or WebP images are allowed." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "File is too large (max 5 MB)." };
  }
  if (file.size === 0) {
    return { error: "File is empty." };
  }
  return { ext };
}

function newName(ext: string): string {
  // 16 random bytes → 32 hex chars; unguessable in practice.
  return `${randomBytes(16).toString("hex")}${ext}`;
}

/* ------------------------------- local ------------------------------- */

async function saveLocal(
  file: File,
  purpose: StoragePurpose,
): Promise<SaveResult> {
  const check = validate(file);
  if ("error" in check) return { ok: false, error: check.error };

  const name = newName(check.ext);
  const relDir = path.posix.join("uploads", purpose);
  const absDir = path.join(process.cwd(), "public", relDir);
  await mkdir(absDir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absDir, name), buf);
  return { ok: true, url: `/${relDir}/${name}` };
}

/* --------------------------------- S3 -------------------------------- */

let s3Singleton: S3Client | null = null;

function getS3(): S3Client {
  if (s3Singleton) return s3Singleton;
  const region = process.env.S3_REGION ?? "auto";
  const config: S3ClientConfig = {
    region,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  };
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
  }
  if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };
  }
  s3Singleton = new S3Client(config);
  return s3Singleton;
}

function bucket(): string {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error("S3_BUCKET is not set");
  return b;
}

function isPrivatePurpose(purpose: StoragePurpose): boolean {
  return purpose === "ids";
}

function publicBaseUrl(): string | null {
  const base = process.env.S3_PUBLIC_BASE_URL;
  return base ? base.replace(/\/+$/, "") : null;
}

async function saveS3(
  file: File,
  purpose: StoragePurpose,
): Promise<SaveResult> {
  const check = validate(file);
  if ("error" in check) return { ok: false, error: check.error };

  const name = newName(check.ext);
  const key = `${purpose}/${name}`;
  const buf = Buffer.from(await file.arrayBuffer());

  try {
    await getS3().send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: buf,
        ContentType: file.type,
        // Server-side encryption is on by default for many providers; if
        // your bucket policy doesn't enforce it, uncomment:
        // ServerSideEncryption: "AES256",
      }),
    );
  } catch (err) {
    console.error("[storage/s3] put failed:", err);
    return {
      ok: false,
      error: "Couldn't upload to storage — please try again.",
    };
  }

  // Decide what URL the DB should hold for this object.
  if (isPrivatePurpose(purpose)) {
    return { ok: true, url: `/api/files/${key}` };
  }
  const base = publicBaseUrl();
  if (base) {
    return { ok: true, url: `${base}/${key}` };
  }
  // No public CDN configured — go through the proxy.
  return { ok: true, url: `/api/files/${key}` };
}

/* ---------------------------- public API ----------------------------- */

/**
 * Persist `file` and return a URL the browser can render. The URL shape
 * depends on the active backend; callers don't need to know which.
 */
export async function saveImage(
  file: File,
  purpose: StoragePurpose,
): Promise<SaveResult> {
  return useS3() ? saveS3(file, purpose) : saveLocal(file, purpose);
}

/**
 * Whether a stored URL points at our `/api/files/...` proxy. Used by the
 * proxy route itself to know if it should serve.
 */
export function isProxyPath(url: string): boolean {
  return url.startsWith("/api/files/");
}

/**
 * Given a stored "key path" from a /api/files/* URL, sign a short-lived
 * GET URL the browser can follow. Throws if S3 isn't configured.
 */
export async function signedGetUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

/**
 * Parse the `purpose` segment out of a stored proxy URL or DB-stored key.
 * Returns null if the input doesn't look like one of our images.
 */
export function purposeOf(urlOrKey: string): StoragePurpose | null {
  // /api/files/<purpose>/<name>
  const proxy = /^\/api\/files\/(photos|ids|tasks)\//.exec(urlOrKey);
  if (proxy) return proxy[1] as StoragePurpose;
  // <purpose>/<name>
  const direct = /^(photos|ids|tasks)\//.exec(urlOrKey);
  if (direct) return direct[1] as StoragePurpose;
  return null;
}

export function storageMode(): "local" | "s3" {
  return useS3() ? "s3" : "local";
}
