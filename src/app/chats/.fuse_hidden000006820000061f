import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages · Qkazi" };

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function ChatsListPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const chats = await prisma.chat.findMany({
    where: {
      booking: {
        OR: [
          { taskerId: current.sub },
          { task: { customerId: current.sub } },
        ],
      },
    },
    orderBy: [
      { lastMessageAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    include: {
      booking: {
        include: {
          tasker: {
            select: {
              id: true,
              name: true,
              taskerProfile: { select: { photoUrl: true } },
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              customerId: true,
              customer: { select: { id: true, name: true } },
            },
          },
        },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: {
        select: {
          messages: {
            where: { readAt: null, senderId: { not: current.sub } },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="mt-1 text-sm text-gray-600">
          Conversations with everyone you&apos;ve booked or accepted.
        </p>
      </header>

      {chats.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">
          No conversations yet. Once an offer is accepted you can chat here.
        </div>
      ) : (
        <ul className="card divide-y divide-gray-100">
          {chats.map((c) => {
            const otherIsTasker = c.booking.task.customerId === current.sub;
            const other = otherIsTasker ? c.booking.tasker : c.booking.task.customer;
            const photo = otherIsTasker
              ? c.booking.tasker.taskerProfile?.photoUrl ?? null
              : null;
            const last = c.messages[0];
            const unread = c._count.messages;
            return (
              <li key={c.id}>
                <Link
                  href={`/chats/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {initials(other.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {other.name}
                      </p>
                      {unread > 0 ? (
                        <span className="badge bg-red-100 text-red-700">
                          {unread}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {c.booking.task.title}
                    </p>
                    {last ? (
                      <p className="mt-1 truncate text-xs text-gray-700">
                        {last.body}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">
                        No messages yet — say hi.
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
