import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ChatThread from "./ChatThread";

export const dynamic = "force-dynamic";

export default async function ChatDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const chat = await prisma.chat.findFirst({
    where: {
      id: params.id,
      booking: {
        OR: [
          { taskerId: current.sub },
          { task: { customerId: current.sub } },
        ],
      },
    },
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
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!chat) notFound();

  const otherIsTasker = chat.booking.task.customerId === current.sub;
  const other = otherIsTasker ? chat.booking.tasker : chat.booking.task.customer;
  const otherPhoto = otherIsTasker
    ? chat.booking.tasker.taskerProfile?.photoUrl ?? null
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/chats" className="text-sm text-brand-700 hover:underline">
          ← All conversations
        </Link>
      </div>

      <header className="card flex items-center gap-3 p-4">
        {otherPhoto ? (
          <img
            src={otherPhoto}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {other.name
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{other.name}</p>
          <Link
            href={`/tasks/${chat.booking.task.id}`}
            className="block truncate text-xs text-brand-700 hover:underline"
          >
            {chat.booking.task.title}
          </Link>
        </div>
      </header>

      <ChatThread
        chatId={chat.id}
        myUserId={current.sub}
        initialMessages={chat.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          readAt: m.readAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
