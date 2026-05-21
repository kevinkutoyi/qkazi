import { NextResponse } from "next/server";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAuth } from "@/lib/api-utils";
import { profileCompleteness } from "@/lib/profile";

/**
 * POST /api/taskers/:id/verification
 *
 * Tasker marks their profile as ready for admin review. Requires every
 * onboarding field (photo, bio, rate, location, skills, ID front, selfie)
 * to be filled. Transitions verificationStatus from NOT_SUBMITTED or
 * REJECTED to PENDING and stamps onboardingCompletedAt.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;
  if (auth.user.sub !== params.id) return jsonError("Forbidden", 403);

  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: params.id },
  });
  if (!profile) return jsonError("Profile not found", 404);

  const check = profileCompleteness(profile);
  if (!check.complete) {
    return NextResponse.json(
      {
        error: "Profile is incomplete",
        filled: check.filled,
        total: check.total,
      },
      { status: 400 },
    );
  }

  if (profile.verificationStatus === VerificationStatus.APPROVED) {
    return jsonError("This profile is already verified", 409);
  }

  const updated = await prisma.taskerProfile.update({
    where: { userId: params.id },
    data: {
      verificationStatus: VerificationStatus.PENDING,
      verificationSubmittedAt: new Date(),
      verificationReviewedAt: null,
      verificationReviewerId: null,
      verificationNote: null,
      onboardingCompletedAt: profile.onboardingCompletedAt ?? new Date(),
    },
  });
  return NextResponse.json({ profile: updated });
}
