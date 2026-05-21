import Link from "next/link";
import { notFound } from "next/navigation";
import { Role, TaskStatus, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import TaskCard from "@/components/TaskCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
    select: { name: true, blurb: true, active: true },
  });
  if (!category || !category.active) {
    return { title: "Service not found · Qkazi" };
  }
  return {
    title: `${category.name} · Qkazi`,
    description:
      category.blurb ??
      `Find top-rated taskers and recent reviews for ${category.name} jobs on Qkazi.`,
  };
}

const TOP_TASKERS_LIMIT = 6;
const RECENT_REVIEWS_LIMIT = 6;
const OPEN_TASKS_PREVIEW = 4;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function CategoryDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const category = await prisma.category.findUnique({
    where: { slug: params.slug },
  });
  if (!category || !category.active) notFound();

  // Top taskers: approved + has a tasker profile, sorted by rating then count.
  // We pull a few extras so we can compute category-specific completion counts
  // in one groupBy query below.
  const topTaskers = await prisma.user.findMany({
    where: {
      role: Role.TASKER,
      taskerProfile: {
        is: { verificationStatus: VerificationStatus.APPROVED },
      },
    },
    orderBy: [
      { taskerProfile: { ratingAvg: "desc" } },
      { taskerProfile: { ratingCount: "desc" } },
      { name: "asc" },
    ],
    take: TOP_TASKERS_LIMIT,
    select: {
      id: true,
      name: true,
      taskerProfile: {
        select: {
          photoUrl: true,
          location: true,
          hourlyRate: true,
          skills: true,
          ratingAvg: true,
          ratingCount: true,
        },
      },
    },
  });

  const topTaskerIds = topTaskers.map((t) => t.id);

  const [completionCounts, recentReviews, openTasks, openCount, reviewCount] =
    await Promise.all([
      // How many completed bookings each top-tasker has in this category.
      topTaskerIds.length === 0
        ? Promise.resolve([])
        : prisma.booking.groupBy({
            by: ["taskerId"],
            where: {
              status: "COMPLETED",
              taskerId: { in: topTaskerIds },
              task: { categoryId: category.id },
            },
            _count: { _all: true },
          }),
      // Recent reviews on taskers, scoped to bookings on tasks in this category.
      prisma.review.findMany({
        where: { booking: { task: { categoryId: category.id } } },
        orderBy: { createdAt: "desc" },
        take: RECENT_REVIEWS_LIMIT,
        include: {
          author: { select: { id: true, name: true } },
          subject: {
            select: {
              id: true,
              name: true,
              taskerProfile: { select: { photoUrl: true } },
            },
          },
          booking: {
            select: { task: { select: { id: true, title: true } } },
          },
        },
      }),
      prisma.task.findMany({
        where: { categoryId: category.id, status: TaskStatus.OPEN },
        orderBy: { createdAt: "desc" },
        take: OPEN_TASKS_PREVIEW,
        include: {
          customer: { select: { id: true, name: true } },
          category: {
            select: { id: true, slug: true, name: true, emoji: true },
          },
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { id: true, url: true },
          },
          _count: { select: { bookings: true } },
        },
      }),
      prisma.task.count({
        where: { categoryId: category.id, status: TaskStatus.OPEN },
      }),
      prisma.review.count({
        where: { booking: { task: { categoryId: category.id } } },
      }),
    ]);

  const completionsByTasker = new Map<string, number>(
    completionCounts.map((c) => [c.taskerId, c._count._all]),
  );

  return (
    <article className="space-y-10">
      <div>
        <Link
          href="/categories"
          className="text-sm text-brand-700 hover:underline"
        >
          ← All services
        </Link>
      </div>

      {/* Hero */}
      <header className="card p-6 sm:p-8">
        <div className="flex items-start gap-5">
          <span className="text-5xl sm:text-6xl" aria-hidden="true">
            {category.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
              {category.group}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {category.name}
            </h1>
            {category.blurb ? (
              <p className="mt-2 text-sm text-gray-600 sm:text-base">
                {category.blurb}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span>
                <strong className="text-gray-900">{openCount}</strong> open task
                {openCount === 1 ? "" : "s"}
              </span>
              <span>
                <strong className="text-gray-900">{reviewCount}</strong> review
                {reviewCount === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={`/tasks?category=${category.slug}`}
                className="btn-primary"
              >
                Browse open tasks
              </Link>
              <Link href="/tasks/new" className="btn-secondary">
                Post a task
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Top-rated taskers */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Top-rated taskers
          </h2>
          <Link
            href="/taskers"
            className="text-sm text-brand-700 hover:underline"
          >
            Find more taskers →
          </Link>
        </div>

        {topTaskers.length === 0 ? (
          <div className="card p-8 text-center text-gray-600">
            No verified taskers yet. Be the first — sign up as a tasker.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topTaskers.map((t) => {
              const profile = t.taskerProfile;
              const completedHere = completionsByTasker.get(t.id) ?? 0;
              return (
                <li key={t.id}>
                  <Link
                    href={`/taskers/${t.id}`}
                    className="card flex h-full items-start gap-3 p-5 transition hover:shadow-md"
                  >
                    {profile?.photoUrl ? (
                      <img
                        src={profile.photoUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                        {initials(t.name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-gray-900">
                          {t.name}
                        </h3>
                        {profile?.hourlyRate ? (
                          <span className="shrink-0 text-sm font-medium text-gray-700">
                            KSh {profile.hourlyRate}/hr
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {profile?.location ?? "—"}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {profile && profile.ratingCount > 0 ? (
                          <span className="font-medium text-gray-900">
                            ★ {profile.ratingAvg.toFixed(1)}
                            <span className="ml-1 text-gray-500">
                              ({profile.ratingCount})
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-500">No reviews yet</span>
                        )}
                        {completedHere > 0 ? (
                          <span className="badge bg-brand-50 text-brand-700">
                            {completedHere} {category.name} job
                            {completedHere === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
                      {profile?.skills?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {profile.skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="badge bg-gray-100 text-gray-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent reviews */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent reviews
          </h2>
          {recentReviews.length > 0 ? (
            <span className="text-sm text-gray-500">
              Showing latest {recentReviews.length} of {reviewCount}
            </span>
          ) : null}
        </div>

        {recentReviews.length === 0 ? (
          <div className="card p-8 text-center text-gray-600">
            No reviews in this category yet. They&apos;ll appear here once
            customers rate completed jobs.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {recentReviews.map((r) => (
              <li key={r.id} className="card p-5">
                <div className="flex items-center gap-1 text-yellow-500" aria-label={`${r.rating} of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill={i < r.rating ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.447a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.367-2.447a1 1 0 00-1.176 0l-3.367 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                    </svg>
                  ))}
                </div>
                {r.comment ? (
                  <blockquote className="mt-3 text-sm text-gray-700">
                    “{r.comment}”
                  </blockquote>
                ) : null}
                <div className="mt-4 flex items-center gap-3">
                  {r.subject.taskerProfile?.photoUrl ? (
                    <img
                      src={r.subject.taskerProfile.photoUrl}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {initials(r.subject.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      <Link
                        href={`/taskers/${r.subject.id}`}
                        className="hover:underline"
                      >
                        {r.subject.name}
                      </Link>
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {r.author.name} · {r.booking.task.title}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-[11px] text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open tasks preview */}
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent open tasks
          </h2>
          {openCount > openTasks.length ? (
            <Link
              href={`/tasks?category=${category.slug}`}
              className="text-sm text-brand-700 hover:underline"
            >
              See all {openCount} →
            </Link>
          ) : null}
        </div>

        {openTasks.length === 0 ? (
          <div className="card p-8 text-center text-gray-600">
            No open tasks in {category.name} right now.{" "}
            <Link href="/tasks/new" className="text-brand-700 hover:underline">
              Post one →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {openTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={{ ...t, createdAt: t.createdAt.toISOString() }}
              />
            ))}
          </div>
        )}
      </section>
    </article>
  );
}
