import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import TimezoneSync from "@/components/TimezoneSync";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { profileCompleteness } from "@/lib/profile";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qkazi — Get things done",
  description:
    "Qkazi connects customers with trusted local taskers for everyday jobs.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();

  let onboardingComplete = true;
  let verificationStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED" =
    "APPROVED";
  let userTimezone: string | null = null;

  if (current) {
    const userRow = await prisma.user.findUnique({
      where: { id: current.sub },
      select: { timezone: true },
    });
    userTimezone = userRow?.timezone ?? null;

    if (current.role === "TASKER") {
      const profile = await prisma.taskerProfile.findUnique({
        where: { userId: current.sub },
      });
      onboardingComplete = profileCompleteness(profile).complete;
      verificationStatus = (profile?.verificationStatus ??
        "NOT_SUBMITTED") as typeof verificationStatus;
    }
  }

  const navCategories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true, emoji: true, blurb: true, group: true },
  });

  return (
    <html lang="en">
      <body>
        <Navbar
          user={
            current
              ? {
                  name: current.name,
                  role: current.role,
                  email: current.email,
                  onboardingComplete,
                  verificationStatus,
                }
              : null
          }
          categories={navCategories}
        />
        {current ? <TimezoneSync current={userTimezone} /> : null}
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
