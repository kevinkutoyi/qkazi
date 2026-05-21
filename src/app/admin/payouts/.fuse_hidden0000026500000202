import Link from "next/link";
import { redirect } from "next/navigation";
import { PayoutStatus, Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import PayoutActions from "./PayoutActions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Payouts · Admin" };

const TABS: { key: PayoutStatus; label: string }[] = [
  { key: PayoutStatus.REQUESTED, label: "Queue" },
  { key: PayoutStatus.PROCESSING, label: "Processing" },
  { key: PayoutStatus.PAID, label: "Paid" },
  { key: PayoutStatus.FAILED, label: "Failed" },
  { key: PayoutStatus.CANCELLED, label: "Cancelled" },
];

export default async function AdminPayoutsPage({
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
      </div>
    );
  }

  const statusParam = (searchParams.status ?? "REQUESTED").toUpperCase();
  const status = (Object.values(PayoutStatus) as string[]).includes(statusParam)
    ? (statusParam as PayoutStatus)
    : PayoutStatus.REQUESTED;

  const payouts = await prisma.payout.findMany({
    where: { status },
    orderBy: { requestedAt: "asc" },
    include: {
      tasker: {
        select: {
          id: true,
          name: true,
          email: true,
          taskerProfile: { select: { photoUrl: true } },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Tasker payouts</h1>
        <p className="text-sm text-gray-600">
          Review requested payouts and mark them paid once you&apos;ve sent
          the money.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/payouts?status=${t.key}`}
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

      {payouts.length === 0 ? (
        <div className="card p-8 text-center text-gray-600">
          No payouts in this state.
        </div>
      ) : (
        <ul className="space-y-3">
          {payouts.map((p) => (
            <li key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-4">
                {p.tasker.taskerProfile?.photoUrl ? (
                  <img
                    src={p.tasker.taskerProfile.photoUrl}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-brand-100" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold">
                        {p.tasker.name}{" "}
                        <span className="ml-1 text-sm font-normal text-gray-500">
                          {p.tasker.email}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Requested {new Date(p.requestedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatMoney(p.amountCents, p.currency)}
                      </p>
                      <p className="text-xs text-gray-500">via {p.method}</p>
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-1 text-sm">
                    <dt className="text-gray-500">Destination</dt>
                    <dd className="font-mono">{p.destination}</dd>
                    {p.destinationName ? (
                      <>
                        <dt className="text-gray-500">Label</dt>
                        <dd>{p.destinationName}</dd>
                      </>
                    ) : null}
                    {p.notes ? (
                      <>
                        <dt className="text-gray-500">Notes</dt>
                        <dd>{p.notes}</dd>
                      </>
                    ) : null}
                    {p.reference ? (
                      <>
                        <dt className="text-gray-500">Ref</dt>
                        <dd className="font-mono">{p.reference}</dd>
                      </>
                    ) : null}
                    {p.failureReason ? (
                      <>
                        <dt className="text-gray-500">Failure</dt>
                        <dd className="text-red-600">{p.failureReason}</dd>
                      </>
                    ) : null}
                  </dl>

                  {p.status === PayoutStatus.REQUESTED ||
                  p.status === PayoutStatus.PROCESSING ? (
                    <PayoutActions
                      payoutId={p.id}
                      currentStatus={p.status}
                    />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
