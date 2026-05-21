import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingStatus, NotificationType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { notify } from "@/lib/notifications";

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

/**
 * POST /api/bookings/:id/reviews — write a review for a completed booking.
 *
 * Both directions allowed (customer→tasker and tasker→customer); each party
 * can submit one review. Authoring updates the subject's denormalized rating
 * (TaskerProfile.ratingAvg/Count for taskers, User.customerRating* for
 * customers) inside a transaction so reads stay consistent.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const { rating, comment } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: {
      task: { select: { id: true, title: true, customerId: true } },
    },
  });
  if (!booking) return jsonError("Booking not found", 404);
  if (booking.status !== BookingStatus.COMPLETED) {
    return jsonError(
      "You can only review a booking once it's marked complete.",
      409,
    );
  }

  const isCustomer = booking.task.customerId === auth.user.sub;
  const isTasker = booking.taskerId === auth.user.sub;
  if (!isCustomer && !isTasker) return jsonError("Forbidden", 403);

  const subjectId = isCustomer ? booking.taskerId : booking.task.customerId;
  const subjectRole = isCustomer ? Role.TASKER : Role.CUSTOMER;

  // Prevent duplicate reviews per (booking, author) — also enforced by
  // @@unique([bookingId, authorId]) in the schema.
  const existing = await prisma.review.findUnique({
    where: {
      bookingId_authorId: { bookingId: booking.id, authorId: auth.user.sub },
    },
  });
  if (existing) {
    return jsonError("You've already reviewed this booking.", 409);
  }

  // Compute the new average inside a transaction so concurrent reviews don't
  // race. We re-aggregate from scratch to keep the denormalized values
  // perfectly truthful.
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        bookingId: booking.id,
        authorId: auth.user.sub,
        subjectId,
        rating,
        comment: comment?.trim() || null,
      },
    });

    const agg = await tx.review.aggregate({
      where: { subjectId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const ratingAvg = agg._avg.rating ?? 0;
    const ratingCount = agg._count._all;

    if (subjectRole === Role.TASKER) {
      // Update the tasker's profile row. It's safe to upsert nothing if
      // somehow the row doesn't exist (shouldn't happen — tasker always
      // has a TaskerProfile after signup).
      await tx.taskerProfile
        .update({
          where: { userId: subjectId },
          data: { ratingAvg, ratingCount },
        })
        .catch(() => undefined);
    } else {
      await tx.user.update({
        where: { id: subjectId },
        data: {
          customerRatingAvg: ratingAvg,
          customerRatingCount: ratingCount,
        },
      });
    }

    return created;
  });

  // Fire-and-forget notification to the subject.
  notify({
    userId: subjectId,
    type: NotificationType.REVIEW_RECEIVED,
    title: `${rating}★ review on "${booking.task.title}"`,
    body: comment ? `"${comment.slice(0, 120)}"` : undefined,
    url: `/tasks/${booking.task.id}`,
    data: { bookingId: booking.id, reviewId: review.id, rating },
  });

  return NextResponse.json({ review }, { status: 201 });
}

/**
 * GET /api/bookings/:id/reviews — list reviews on this booking (both
 * directions, if both parties have written one).
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const reviews = await prisma.review.findMany({
    where: { bookingId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json({ reviews });
}
