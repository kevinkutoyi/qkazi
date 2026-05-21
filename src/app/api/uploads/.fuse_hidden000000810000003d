import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { requireAuth, jsonError } from "@/lib/api-utils";
import { saveImage } from "@/lib/upload";

/**
 * POST /api/uploads  (multipart/form-data)
 *   fields:
 *     file:    File (image/jpeg|png|webp, max 5 MB)
 *     purpose: "photo" | "id_front" | "id_back" | "selfie" | "task"
 *   response: { url }
 *
 * Purpose dictates both the storage subdirectory and which roles may upload:
 *   - photo / id_front / id_back / selfie → taskers only (onboarding flow)
 *   - task                                → customers only (task posting flow)
 *
 * The returned URL should then be persisted on the relevant model (e.g.
 * TaskerProfile via PATCH /api/taskers/:id, or sent in POST /api/tasks
 * as part of `imageUrls`).
 */
export async function POST(req: Request) {
  // We require auth here without a role guard; the per-purpose check below
  // enforces who's allowed to upload what.
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Expected multipart/form-data", 400);
  }

  const file = form.get("file");
  const purpose = String(form.get("purpose") ?? "");
  if (!(file instanceof File)) {
    return jsonError("Missing 'file' field", 400);
  }

  let subdir: "photos" | "ids" | "tasks";
  switch (purpose) {
    case "photo":
      if (auth.user.role !== Role.TASKER) return jsonError("Forbidden", 403);
      subdir = "photos";
      break;
    case "id_front":
    case "id_back":
    case "selfie":
      if (auth.user.role !== Role.TASKER) return jsonError("Forbidden", 403);
      subdir = "ids";
      break;
    case "task":
      if (auth.user.role !== Role.CUSTOMER) return jsonError("Forbidden", 403);
      subdir = "tasks";
      break;
    default:
      return jsonError(
        "Invalid 'purpose' (expected photo|id_front|id_back|selfie|task)",
        400,
      );
  }

  const result = await saveImage(file, subdir);
  if (!result.ok) {
    return jsonError(result.error, 400);
  }
  return NextResponse.json({ url: result.url });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
