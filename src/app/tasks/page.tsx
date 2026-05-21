import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TaskCard from "@/components/TaskCard";
import { getCurrentUser } from "@/lib/auth";
import {
  applyDistance,
  buildTaskSearchOrderBy,
  buildTaskSearchWhere,
  parseTaskSearchParams,
  SORT_OPTIONS,
  type TaskSearchParams,
} from "@/lib/task-search";
import DistanceFilter from "./DistanceFilter";

export const dynamic = "force-dynamic";

const RATING_CHIPS: { value: string; label: string }[] = [
  { value: "0", label: "Any" },
  { value: "3", label: "3★+" },
  { value: "4", label: "4★+" },
  { value: "4.5", label: "4.5★+" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = parseTaskSearchParams(searchParams);
  const where = buildTaskSearchWhere(params);

  const [rawTasks, user, categories] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: buildTaskSearchOrderBy(params.sort ?? "newest"),
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            customerRatingAvg: true,
            customerRatingCount: true,
          },
        },
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
    getCurrentUser(),
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, emoji: true },
    }),
  ]);

  // Refine bbox results to the exact radius and sort by distance when asked.
  const tasks = applyDistance(rawTasks, params);

  const hasFilters = filtersAreActive(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Open tasks</h1>
          <p className="text-sm text-gray-600">
            {tasks.length} {tasks.length === 1 ? "result" : "results"}
            {hasFilters ? " · matching your filters" : ""}
          </p>
        </div>
        {user?.role === "CUSTOMER" ? (
          <Link href="/tasks/new" className="btn-primary">
            Post a task
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <FiltersSidebar params={params} categories={categories} />

        <div className="space-y-4">
          <form
            action="/tasks"
            method="GET"
            className="card flex flex-wrap items-center justify-between gap-3 p-3"
          >
            <HiddenFilters params={params} skip={["sort"]} />
            <label className="text-sm text-gray-600" htmlFor="sort">
              Sort by
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={params.sort ?? "newest"}
              className="input max-w-[220px]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-secondary text-sm">
              Apply
            </button>
          </form>

          {tasks.length === 0 ? (
            <div className="card p-8 text-center text-gray-600">
              No tasks match these filters. Try removing one or two.
              <div className="mt-3">
                <Link
                  href="/tasks"
                  className="text-sm text-brand-700 hover:underline"
                >
                  Clear all filters
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  task={{ ...t, createdAt: t.createdAt.toISOString() }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ Filters ============================ */

function filtersAreActive(p: TaskSearchParams): boolean {
  return Boolean(
    p.q ||
      p.category ||
      p.minBudget !== undefined ||
      p.maxBudget !== undefined ||
      p.near ||
      p.from ||
      p.to ||
      p.includeFlexible ||
      (p.minRating !== undefined && p.minRating > 0) ||
      p.lat !== undefined ||
      (p.sort && p.sort !== "newest"),
  );
}

function FiltersSidebar({
  params,
  categories,
}: {
  params: TaskSearchParams;
  categories: { slug: string; name: string; emoji: string }[];
}) {
  const content = (
    <form action="/tasks" method="GET" className="space-y-5">
      <div>
        <label className="label" htmlFor="q">
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={params.q ?? ""}
          className="input"
          placeholder="Plumbing, cleaning…"
        />
      </div>

      <div>
        <label className="label" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue={params.category ?? ""}
          className="input"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">Price (KSh)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            name="minBudget"
            min={0}
            defaultValue={
              params.minBudget !== undefined ? params.minBudget : ""
            }
            className="input"
            placeholder="Min"
            aria-label="Min budget"
          />
          <input
            type="number"
            name="maxBudget"
            min={0}
            defaultValue={
              params.maxBudget !== undefined ? params.maxBudget : ""
            }
            className="input"
            placeholder="Max"
            aria-label="Max budget"
          />
        </div>
      </fieldset>

      <DistanceFilter
        initialLat={params.lat}
        initialLng={params.lng}
        initialRadius={params.radiusKm}
      />

      <div>
        <label className="label" htmlFor="near">
          Or by text
        </label>
        <input
          id="near"
          name="near"
          defaultValue={params.near ?? ""}
          className="input"
          placeholder="City or neighborhood"
        />
        <p className="mt-1 text-xs text-gray-500">
          Matches task locations containing this text. Use this when you
          don&apos;t want to share your location.
        </p>
      </div>

      <fieldset>
        <legend className="label">Availability</legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            id="from"
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="input"
            aria-label="From date"
          />
          <input
            id="to"
            type="date"
            name="to"
            defaultValue={params.to ?? ""}
            className="input"
            aria-label="To date"
          />
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            name="includeFlexible"
            value="1"
            defaultChecked={params.includeFlexible}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Include flexible-timing tasks
        </label>
      </fieldset>

      <fieldset>
        <legend className="label">Min customer rating</legend>
        <div className="grid grid-cols-4 gap-1">
          {RATING_CHIPS.map((c) => {
            const selected = (params.minRating ?? 0).toString() === c.value;
            return (
              <label
                key={c.value}
                className={`cursor-pointer rounded-md border px-2 py-1.5 text-center text-xs font-medium transition ${
                  selected
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="minRating"
                  value={c.value}
                  defaultChecked={selected}
                  className="sr-only"
                />
                {c.label}
              </label>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Ratings appear once customers receive reviews.
        </p>
      </fieldset>

      <input type="hidden" name="sort" value={params.sort ?? "newest"} />

      <div className="flex flex-col gap-2">
        <button type="submit" className="btn-primary w-full">
          Apply filters
        </button>
        <Link href="/tasks" className="btn-secondary w-full text-center">
          Clear all
        </Link>
      </div>
    </form>
  );

  return (
    <aside>
      <div className="hidden lg:block">
        <div className="card p-5">
          <h2 className="mb-4 text-base font-semibold">Filters</h2>
          {content}
        </div>
      </div>
      <details className="card p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">
          Filters
        </summary>
        <div className="mt-4">{content}</div>
      </details>
    </aside>
  );
}

function HiddenFilters({
  params,
  skip = [],
}: {
  params: TaskSearchParams;
  skip?: string[];
}) {
  const entries: { name: string; value: string }[] = [];
  const push = (name: string, v: string | number | boolean | undefined) => {
    if (skip.includes(name)) return;
    if (v === undefined || v === "" || v === false) return;
    entries.push({ name, value: String(v === true ? "1" : v) });
  };
  push("q", params.q);
  push("category", params.category);
  push("minBudget", params.minBudget);
  push("maxBudget", params.maxBudget);
  push("near", params.near);
  push("from", params.from);
  push("to", params.to);
  push("includeFlexible", params.includeFlexible);
  push(
    "minRating",
    params.minRating !== undefined && params.minRating > 0
      ? params.minRating
      : undefined,
  );
  push("lat", params.lat);
  push("lng", params.lng);
  push("radiusKm", params.radiusKm);

  return (
    <>
      {entries.map((e) => (
        <input key={e.name} type="hidden" name={e.name} value={e.value} />
      ))}
    </>
  );
}
