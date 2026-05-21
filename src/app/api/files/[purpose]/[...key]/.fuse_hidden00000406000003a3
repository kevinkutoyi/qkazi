import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { signedGetUrl, storageMode } from "@/lib/storage";

/**
 * GET /api/files/<purpose>/<...key>
 *
 * Auth-gated proxy that 302-redirects to a short-lived signed S3 URL.
 *
 * Auth rules:
 *   - purpose = "ids"  → admin OR the tasker who owns the document
 *   - purpose = anything else → any logged-in user
 *
 * Only meaningful when running with S3 storage. In local mode, files are
 * served directly from /public/uploads/... by Next.js and this route is
 * not exercised; we still return a clean 404 just in case.
 *
 * Cache: `Cache-Control: private, no-store` — the redirect target is a
 * signed URL that already has its own expiry; we don't want intermediate
 * caches handing it to other users.
 */
export async function GET(
  _req: Request,
  { params }: { params: { purpose: string; key: string[] } },
) {
  if (storageMode() !== "s3") {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const purpose = params.purpose;
  const tail = params.key.join("/");
  if (!purpose || !tail) {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (!["photos", "ids", "tasks"].includes(purpose)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Tight auth for ID documents.
  if (purpose === "ids") {
    let allowed = user.role === Role.ADMIN;
    if (!allowed) {
      // The tasker who owns the doc can view their own.
      const proxyUrl = `/api/files/ids/${tail}`;
      const owner = await prisma.taskerProfile.findFirst({
        where: {
          userId: user.sub,
          OR: [
            { idFrontUrl: proxyUrl },
            { idBackUrl: proxyUrl },
            { selfieUrl: proxyUrl },
          ],
        },
        select: { id: true },
      });
      allowed = Boolean(owner);
    }
    if (!allowed) return new NextResponse("Forbidden", { status: 403 });
  }

  const key = `${purpose}/${tail}`;
  let url: string;
  try {
    url = await signedGetUrl(
      key,
      purpose === "ids" ? 300 : 60 * 60, // 5 min for IDs, 1 h for the rest
    );
  } catch (err) {
    console.error("[api/files] sign failed:", err);
    return new NextResponse("Storage unavailable", { status: 502 });
  }

  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

export const dynamic = "force-dynamic";
