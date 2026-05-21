import { NextResponse } from "next/server";
import { z } from "zod";
import { NotificationType, Role, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { notify } from "@/lib/notifications";

const schema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/admin/verifications/:id  { decision, note? }
 * :id is the user id of the tasker.
 * Admin approves or rejects a pending review. On REJECT a note is required
 * so the tasker knows what to fix.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.ADMIN]);
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { decision, note } = parsed.data;

  if (decision === "REJECT" && (!note || !note.trim())) {
    return jsonError("A note is required when rejecting", 400);
  }

  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: params.id },
  });
  if (!profile) return jsonError("Profile not found", 404);
  if (profile.verificationStatus !== VerificationStatus.PENDING) {
    return jsonError("This profile is not pending review", 409);
  }

  const updated = await prisma.taskerProfile.update({
    where: { userId: params.id },
    data: {
      verificationStatus:
        decision === "APPROVE"
          ? VerificationStatus.APPROVED
          : VerificationStatus.REJECTED,
      verificationReviewedAt: new Date(),
      verificationReviewerId: auth.user.sub,
      verificationNote: decision === "REJECT" ? note : null,
    },
  });

  if (decision === "APPROVE") {
    notify({
      userId: params.id,
      type: NotificationType.VERIFICATION_APPROVED,
      title: "Profile verified ✓",
      body: "You're now visible in tasker search and can take jobs.",
      url: "/dashboard",
    });
  } else {
    notify({
      userId: params.id,
      type: NotificationType.VERIFICATION_REJECTED,
      title: "Profile needs changes",
      body: note ?? undefined,
      url: "/onboarding",
    });
  }

  return NextResponse.json({ profile: updated });
}
