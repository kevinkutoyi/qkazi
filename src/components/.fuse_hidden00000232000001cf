import Link from "next/link";

export type TaskCardData = {
  id: string;
  title: string;
  description: string;
  location: string;
  budget: number;
  status: string;
  createdAt: string | Date;
  scheduledFor?: string | Date | null;
  distanceKm?: number | null;
  category?: {
    id: string;
    slug: string;
    name: string;
    emoji: string;
  } | null;
  customer?: { id: string; name: string } | null;
  images?: { id: string; url: string }[];
  _count?: { bookings: number };
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-brand-100 text-brand-700",
  ASSIGNED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function formatSchedule(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TaskCard({ task }: { task: TaskCardData }) {
  const schedule = formatSchedule(task.scheduledFor);
  const thumb = task.images?.[0]?.url ?? null;

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="card flex gap-4 p-5 transition hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
          <span
            className={`badge ${STATUS_STYLES[task.status] ?? "bg-gray-100 text-gray-700"}`}
          >
            {task.status}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">
          {task.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          {task.category ? (
            <span>
              <span className="mr-1" aria-hidden="true">
                {task.category.emoji}
              </span>
              {task.category.name}
            </span>
          ) : null}
          <span>·</span>
          <span>{task.location}</span>
          {task.distanceKm != null ? (
            <>
              <span>·</span>
              <span className="font-medium text-brand-700">
                {task.distanceKm < 1
                  ? `${Math.round(task.distanceKm * 1000)} m away`
                  : `${task.distanceKm.toFixed(1)} km away`}
              </span>
            </>
          ) : null}
          <span>·</span>
          <span className="font-medium text-gray-700">KSh {task.budget}</span>
          {schedule ? (
            <>
              <span>·</span>
              <span aria-label="Scheduled for">📅 {schedule}</span>
            </>
          ) : task.scheduledFor === null && "scheduledFor" in task ? (
            <>
              <span>·</span>
              <span className="text-gray-500">Flexible timing</span>
            </>
          ) : null}
          {task._count ? (
            <>
              <span>·</span>
              <span>{task._count.bookings} offers</span>
            </>
          ) : null}
        </div>
      </div>

      {thumb ? (
        <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-md ring-1 ring-inset ring-gray-200 sm:block">
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
    </Link>
  );
}
