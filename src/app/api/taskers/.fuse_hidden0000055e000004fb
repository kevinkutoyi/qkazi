import { NextResponse } from "next/server";
import { Role, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/taskers?skill=Plumbing&location=Nairobi&maxRate=2000
 *
 * Only profiles that have completed onboarding *and* are APPROVED (or for
 * lenient display, also PENDING) are shown to customers. NOT_SUBMITTED and
 * REJECTED profiles are hidden from search.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const skill = searchParams.get("skill");
  const location = searchParams.get("location");
  const maxRate = searchParams.get("maxRate");

  const profileFilters: any = {
    onboardingCompletedAt: { not: null },
    verificationStatus: {
      in: [VerificationStatus.APPROVED, VerificationStatus.PENDING],
    },
  };
  if (skill) profileFilters.skills = { has: skill };
  if (location)
    profileFilters.location = { contains: location, mode: "insensitive" };
  if (maxRate) {
    const rate = Number(maxRate);
    if (!Number.isNaN(rate)) profileFilters.hourlyRate = { lte: rate };
  }

  const taskers = await prisma.user.findMany({
    where: {
      role: Role.TASKER,
      taskerProfile: { is: profileFilters },
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      taskerProfile: {
        select: {
          bio: true,
          hourlyRate: true,
          location: true,
          skills: true,
          photoUrl: true,
          verificationStatus: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ taskers });
}
