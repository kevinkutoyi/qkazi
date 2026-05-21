import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readWorkingHours, formatBlockRange } from "@/lib/availability";
import AvailabilityForm from "./AvailabilityForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Availability · Qkazi" };

export default async function AvailabilityPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== Role.TASKER) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">For taskers only</h1>
        <p className="mt-2 text-sm text-gray-600">
          Availability management is for tasker accounts.
        </p>
        <Link href="/dashboard" className="btn-primary mt-4 inline-flex">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const profile = await prisma.taskerProfile.findUnique({
    where: { userId: current.sub },
    include: {
      availabilityBlocks: {
        orderBy: { startDate: "asc" },
      },
    },
  });
  if (!profile) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">No tasker profile yet</h1>
        <p className="mt-2 text-sm text-gray-600">
          Finish onboarding first so we have a profile to attach hours to.
        </p>
        <Link href="/onboarding" className="btn-primary mt-4 inline-flex">
          Start onboarding
        </Link>
      </div>
    );
  }

  const workingHours = readWorkingHours(profile.workingHours);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const timeOff = profile.availabilityBlocks.map((b) => ({
    id: b.id,
    startDate: b.startDate.toISOString(),
    endDate: b.endDate.toISOString(),
    reason: b.reason,
    label: formatBlockRange(b.startDate, b.endDate),
    expired: b.endDate.getTime() < today.getTime(),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Your availability</h1>
        <p className="mt-1 text-sm text-gray-600">
          Set your typical weekly hours and block off days you can&apos;t work.
          Customers see a summary on your profile.
        </p>
      </header>

      <AvailabilityForm
        userId={current.sub}
        initialWorkingHours={workingHours}
        initialTimeOff={timeOff}
      />
    </div>
  );
}
