import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { workingHoursSchema } from "@/lib/availability";

const updateProfileSchema = z
  .object({
    bio: z.string().max(1000).optional(),
    hourlyRate: z.number().int().positive().optional(),
    location: z.string().max(120).optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    skills: z.array(z.string().min(1).max(40)).optional(),
    photoUrl: z.string().max(500).optional(),
    idFrontUrl: z.string().max(500).optional(),
    idBackUrl: z.string().max(500).optional(),
    selfieUrl: z.string().max(500).optional(),
    workingHours: workingHoursSchema.optional(),
  })
  .refine(
    (d) => {
      const latProvided = d.latitude !== undefined;
      const lngProvided = d.longitude !== undefined;
      // Both must be set together (either both numbers, both null, or both omitted).
      return latProvided === lngProvided;
    },
    { message: "Provide both latitude and longitude, or neither", path: ["latitude"] },
  );

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const tasker = await prisma.user.findFirst({
    where: { id: params.id, role: Role.TASKER },
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
          onboardingCompletedAt: true,
        },
      },
    },
  });
  if (!tasker) return jsonError("Tasker not found", 404);
  return NextResponse.json({ tasker });
}

/**
 * PATCH /api/taskers/:id — tasker updates their own profile.
 * The :id is the user id.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.TASKER]);
  if ("error" in auth) return auth.error;
  if (auth.user.sub !== params.id) return jsonError("Forbidden", 403);

  const parsed = await parseBody(req, updateProfileSchema);
  if ("error" in parsed) return parsed.error;

  const updated = await prisma.taskerProfile.update({
    where: { userId: params.id },
    data: parsed.data,
  });
  return NextResponse.json({ profile: updated });
}
