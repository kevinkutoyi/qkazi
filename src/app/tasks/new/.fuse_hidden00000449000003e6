import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import NewTaskForm from "./NewTaskForm";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== Role.CUSTOMER) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Customers only</h1>
        <p className="mt-2 text-sm text-gray-600">
          Only customer accounts can post tasks.
        </p>
      </div>
    );
  }

  const [categories, user] = await Promise.all([
    prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, slug: true, name: true, emoji: true },
    }),
    prisma.user.findUnique({
      where: { id: current.sub },
      select: { timezone: true },
    }),
  ]);

  return (
    <NewTaskForm
      categories={categories}
      timezone={user?.timezone ?? "UTC"}
    />
  );
}
