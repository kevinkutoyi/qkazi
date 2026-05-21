import Link from "next/link";
import { TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All services · Qkazi",
  description:
    "Browse every category of help on Qkazi — cleaning, moving, mounting, handyman, furniture assembly, personal assistant, and more.",
};

export default async function CategoriesPage() {
  const [categories, counts] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        emoji: true,
        blurb: true,
        group: true,
      },
    }),
    prisma.task.groupBy({
      by: ["categoryId"],
      where: { status: TaskStatus.OPEN },
      _count: { _all: true },
    }),
  ]);

  const countByCategoryId = new Map<string, number>(
    counts.map((c) => [c.categoryId, c._count._all]),
  );

  // Group categories by `group` while preserving sortOrder. Render groups in
  // first-appearance order so the seed controls the layout.
  const groupOrder: string[] = [];
  const byGroup = new Map<string, typeof categories>();
  for (const c of categories) {
    if (!byGroup.has(c.group)) {
      byGroup.set(c.group, []);
      groupOrder.push(c.group);
    }
    byGroup.get(c.group)!.push(c);
  }

  const totalOpen = counts.reduce((n, c) => n + c._count._all, 0);

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          Services
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          What do you need help with?
        </h1>
        <p className="max-w-2xl text-sm text-gray-600 sm:text-base">
          Pick a category to see open tasks near you. There are{" "}
          <strong>{totalOpen}</strong> open tasks across {categories.length}{" "}
          services right now.
        </p>
      </header>

      {groupOrder.map((groupName) => {
        const items = byGroup.get(groupName) ?? [];
        return (
          <section key={groupName}>
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                {groupName}
              </h2>
              <span className="text-xs text-gray-500">
                {items.length} {items.length === 1 ? "category" : "categories"}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => {
                const count = countByCategoryId.get(c.id) ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/categories/${c.slug}`}
                      className="card flex h-full items-start gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="text-3xl" aria-hidden="true">
                        {c.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-semibold text-gray-900">
                            {c.name}
                          </h3>
                          <span
                            className={`badge ${
                              count > 0
                                ? "bg-brand-100 text-brand-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {count} open
                          </span>
                        </div>
                        {c.blurb ? (
                          <p className="mt-1 text-sm text-gray-600">
                            {c.blurb}
                          </p>
                        ) : null}
                        <p className="mt-3 text-xs font-medium text-brand-700">
                          See top taskers & reviews →
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="card bg-gray-50 p-6 sm:p-8">
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-base font-semibold sm:text-lg">
              Don&apos;t see what you need?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Post a custom task with any details — a tasker with the right
              skills will send you an offer.
            </p>
          </div>
          <Link href="/tasks/new" className="btn-primary justify-self-start">
            Post a task
          </Link>
        </div>
      </section>
    </div>
  );
}
