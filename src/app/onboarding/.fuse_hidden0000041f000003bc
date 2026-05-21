import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Wizard from "./Wizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== Role.TASKER) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">For taskers only</h1>
        <p className="mt-2 text-sm text-gray-600">
          Onboarding is for accounts working as taskers. You&apos;re signed in as a
          customer.
        </p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: current.sub },
  });

  if (!profile) {
    // Shouldn't normally happen (we create the profile at signup), but be
    // resilient if a Google-as-tasker user somehow ended up here.
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">No tasker profile yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          Something went wrong creating your profile at signup. Please contact
          support.
        </p>
      </div>
    );
  }

  return (
    <Wizard
      userId={current.sub}
      initial={{
        photoUrl: profile.photoUrl,
        bio: profile.bio,
        hourlyRate: profile.hourlyRate,
        location: profile.location,
        latitude: profile.latitude,
        longitude: profile.longitude,
        skills: profile.skills,
        idFrontUrl: profile.idFrontUrl,
        idBackUrl: profile.idBackUrl,
        selfieUrl: profile.selfieUrl,
        verificationStatus: profile.verificationStatus,
        verificationNote: profile.verificationNote,
      }}
    />
  );
}
