import { NextResponse } from "next/server";
import { z } from "zod";
import { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";

const updateTaskSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).max(2000).optional(),
  location: z.string().min(1).max(120).optional(),
  budget: z.number().int().positive().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  categoryId: z.string().min(1).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      customer: { select: { id: true, name: true } },
      category: {
        select: { id: true, slug: true, name: true, emoji: true },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, url: true, sortOrder: true },
      },
      bookings: {
        include: {
          tasker: {
            select: {
              id: true,
              name: true,
              taskerProfile: {
                select: {
                  hourlyRate: true,
                  location: true,
                  skills: true,
                  photoUrl: true,
                  verificationStatus: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!task) return jsonError("Task not found", 404);
  return NextResponse.json({ task });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Task not found", 404);
  if (existing.customerId !== auth.user.sub) {
    return jsonError("Forbidden", 403);
  }

  const parsed = await parseBody(req, updateTaskSchema);
  if ("error" in parsed) return parsed.error;

  const { scheduledFor, ...rest } = parsed.data;
  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(scheduledFor !== undefined
        ? { scheduledFor: scheduledFor ? new Date(scheduledFor) : null }
        : {}),
    },
  });
  return NextResponse.json({ task });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth([Role.CUSTOMER]);
  if ("error" in auth) return auth.error;

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing) return jsonError("Task not found", 404);
  if (existing.customerId !== auth.user.sub) {
    return jsonError("Forbidden", 403);
  }

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
