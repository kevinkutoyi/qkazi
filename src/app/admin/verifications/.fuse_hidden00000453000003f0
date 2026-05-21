import Link from "next/link";
import { redirect } from "next/navigation";
import { Role, VerificationStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const TABS: { key: VerificationStatus; label: string }[] = [
  { key: VerificationStatus.PENDING, label: "Pending" },
  { key: VerificationStatus.APPROVED, label: "Approved" },
  { key: VerificationStatus.REJECTED, label: "Rejected" },
];

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (current.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className="mt-2 text-sm text-gray-600">
          This page is only accessible to admin accounts.
        </p>
      </div>
    );
  }

  const statusParam = (searchParams.status ?? "PENDING").toUpperCase();
  const status = (Object.values(VerificationStatus) as string[]).includes(
    statusParam,
  )
    ? (statusParam as VerificationStatus)
    : VerificationStatus.PENDING;

  const profiles = await prisma.taskerProfile.findMany({
    where: { verificationStatus: status },
    orderBy: { verificationSubmittedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tasker verifications</h1>
        <p className="text-sm text-gray-600">
          Review submitted profiles and approve or reject identity documents.
        </p>
      </div>

      <nav className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/verifications?status=${t.key}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              t.key === status
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {profiles.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">
          No profiles in this state.
        </div>
      ) : (
        <ul className="space-y-3">
          {profiles.map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex items-start gap-4">
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/verifications/${p.userId}`}
                        className="text-base font-semibold hover:underline"
                      >
                        {p.user.name}
                      </Link>
                      <p className="truncate text-xs text-gray-500">
                        {p.user.email}
                      </p>
                    </div>
                    <span className="badge bg-yellow-100 text-yellow-800">
                      {p.verificationStatus}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {p.verificationSubmittedAt
                      ? `Submitted ${new Date(p.verificationSubmittedAt).toLocaleString()}`
                      : "Not yet submitted"}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
