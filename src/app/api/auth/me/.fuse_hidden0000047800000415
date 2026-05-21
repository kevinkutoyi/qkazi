import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ user: null });
  }
  const user = await prisma.user.findUnique({
    where: { id: current.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      taskerProfile: {
        select: {
          id: true,
          bio: true,
          hourlyRate: true,
          location: true,
          skills: true,
        },
      },
    },
  });
  return NextResponse.json({ user });
}
