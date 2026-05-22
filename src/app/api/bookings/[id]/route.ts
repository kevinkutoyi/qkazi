import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BookingStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  Role,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, parseBody, requireAuth } from "@/lib/api-utils";
import { publish, OfferEvent } from "@/lib/offer-events";
import { notify } from "@/lib/notifications";

const updateBookingSchema = z.object({
  status: z.nativeEnum(BookingStatus),
});

/**
 * PATCH /api/bookings/:id
 *   - Customer can ACCEPT or DECLINE a PENDING offer (accept marks the task
 *     ASSIGNED and auto-declines competing pending offers).
 *   - Either party can mark a booking COMPLETED or CANCELLED.
 *
 * Every status change emits an offer-update event on the task's stream so
 * other parties see the change in real time.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, updateBookingSchema);
  if ("error" in parsed) return parsed.error;
  const { status } = parsed.data;

  const booking = await prisma.booking.findUnique({
    where: { id: params.id },
    include: { task: true },
  });
  if (!booking) return jsonError("Booking not found", 404);

  const isCustomer = booking.task.customerId === auth.user.sub;
  const isTasker = booking.taskerId === auth.user.sub;
  if (!isCustomer && !isTasker) return jsonError("Forbidden", 403);

  if (
    (status === BookingStatus.ACCEPTED || status === BookingStatus.DECLINED) &&
    !isCustomer
  ) {
    return jsonError("Only the task owner can accept or decline offers", 403);
  }

  let updated;
  if (status === BookingStatus.ACCEPTED) {
    const [u] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.ACCEPTED },
      }),
      prisma.booking.updateMany({
        where: {
          taskId: booking.taskId,
          id: { not: booking.id },
          status: BookingStatus.PENDING,
        },
        data: { status: BookingStatus.DECLINED },
      }),
      prisma.task.update({
        where: { id: booking.taskId },
        data: { status: TaskStatus.ASSIGNED },
      }),
    ]);
    updated = u;

    // Spin up a Chat for this booking so the customer + tasker can talk.
    // Upsert so we don't crash if it already exists from a prior state.
    await prisma.chat
      .upsert({
        where: { bookingId: booking.id },
        update: {},
        create: { bookingId: booking.id },
      })
      .catch((err) => {
        console.error("[bookings/PATCH] chat upsert failed:", err);
      });
  } else if (status === BookingStatus.COMPLETED) {
    // Marking complete moves a captured Payment to RELEASED so the tasker's
    // available balance picks it up. If the customer hasn't paid yet
    // (no Payment row, or status still PENDING/FAILED) we leave it — the
    // status sync flow will release once payment lands.
    const releasePayment = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        status: PaymentStatus.CAPTURED,
      },
      select: { id: true },
    });

    // Heterogeneous transaction (booking + task, optionally payment), so the
    // array is typed as PrismaPromise<unknown>[] and the booking result is
    // cast back to its concrete type.
    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.COMPLETED },
      }),
      prisma.task.update({
        where: { id: booking.taskId },
        data: { status: TaskStatus.COMPLETED },
      }),
    ];
    if (releasePayment) {
      ops.push(
        prisma.payment.update({
          where: { id: releasePayment.id },
          data: {
            status: PaymentStatus.RELEASED,
            releasedAt: new Date(),
          },
        }),
      );
    }

    const results = await prisma.$transaction(ops);
    updated = results[0] as Awaited<ReturnType<typeof prisma.booking.update>>;
  } else {
    updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status },
    });
  }

  // Bell pings for the affected party.
  const taskTitle = booking.task.title;
  if (status === BookingStatus.ACCEPTED) {
    notify({
      userId: booking.taskerId,
      type: NotificationType.OFFER_ACCEPTED,
      title: `Offer accepted on "${taskTitle}"`,
      body: "The customer accepted your offer.",
      url: `/tasks/${booking.taskId}`,
      data: { taskId: booking.taskId, bookingId: booking.id },
    });
  } else if (status === BookingStatus.DECLINED) {
    notify({
      userId: booking.taskerId,
      type: NotificationType.OFFER_DECLINED,
      title: `Offer declined on "${taskTitle}"`,
      body: "Keep an eye out for other tasks in your area.",
      url: "/tasks",
      data: { taskId: booking.taskId, bookingId: booking.id },
    });
  } else if (status === BookingStatus.COMPLETED) {
    notify({
      userId: booking.taskerId,
      type: NotificationType.TASK_COMPLETED,
      title: `Task complete: "${taskTitle}"`,
      body: "Funds released to your wallet.",
      url: "/wallet",
      data: { taskId: booking.taskId, bookingId: booking.id },
    });
  }

  const event: OfferEvent = {
    type: "offer-update",
    bookingId: updated.id,
    status: updated.status,
    taskerId: updated.taskerId,
  };
  publish(booking.taskId, event);

  return NextResponse.json({ booking: updated });
}
