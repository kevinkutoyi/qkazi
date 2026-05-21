import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TimezoneSettingsForm from "./TimezoneSettingsForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · Qkazi",
};

export default async function SettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: current.sub },
    select: { id: true, email: true, name: true, role: true, timezone: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Account preferences. More options coming soon.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Profile</h2>
        <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Name</dt>
          <dd>{user.name}</dd>
          <dt className="text-gray-500">Email</dt>
          <dd>{user.email}</dd>
          <dt className="text-gray-500">Role</dt>
          <dd>{user.role}</dd>
        </dl>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold">Timezone</h2>
        <p className="mt-1 text-sm text-gray-600">
          We use this to display every scheduled date/time in your local
          zone.
        </p>
        <TimezoneSettingsForm current={user.timezone} />
      </section>
    </div>
  );
}
