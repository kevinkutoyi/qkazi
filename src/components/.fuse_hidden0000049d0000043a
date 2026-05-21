"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import NotificationsBell from "./NotificationsBell";

type NavUser = {
  name: string;
  role: "CUSTOMER" | "TASKER" | "ADMIN";
  email: string;
  onboardingComplete: boolean;
  verificationStatus: "NOT_SUBMITTED" | "PENDING" | "APPROVED" | "REJECTED";
};

export type NavCategory = {
  slug: string;
  name: string;
  emoji: string;
  blurb: string | null;
  group: string;
};

function groupCategories(
  categories: NavCategory[],
): { heading: string; items: NavCategory[] }[] {
  // Preserve seed (sortOrder) order across groups; within each group too.
  const order: string[] = [];
  const map = new Map<string, NavCategory[]>();
  for (const c of categories) {
    if (!map.has(c.group)) {
      map.set(c.group, []);
      order.push(c.group);
    }
    map.get(c.group)!.push(c);
  }
  return order.map((heading) => ({
    heading,
    items: map.get(heading) ?? [],
  }));
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

export default function Navbar({
  user,
  categories,
}: {
  user: NavUser | null;
  categories: NavCategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const groupedCategories = groupCategories(categories);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<
    null | "categories" | "notifications" | "profile"
  >(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  const categoriesRef = useDismissable<HTMLDivElement>(
    openMenu === "categories",
    () => setOpenMenu(null),
  );
  const notificationsRef = useDismissable<HTMLDivElement>(
    openMenu === "notifications",
    () => setOpenMenu(null),
  );
  const profileRef = useDismissable<HTMLDivElement>(
    openMenu === "profile",
    () => setOpenMenu(null),
  );

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setOpenMenu(null);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  function toggle(name: "categories" | "notifications" | "profile") {
    setOpenMenu((cur) => (cur === name ? null : name));
  }

  const showOnboardingNudge =
    user?.role === "TASKER" && !user.onboardingComplete;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white font-bold">
            Q
          </span>
          <span className="text-lg font-semibold tracking-tight">Qkazi</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 text-sm md:flex">
          <Link
            href="/tasks"
            className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Browse tasks
          </Link>

          <div className="relative" ref={categoriesRef}>
            <button
              type="button"
              aria-haspopup="true"
              aria-expanded={openMenu === "categories"}
              onClick={() => toggle("categories")}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Categories
              <svg
                className={`h-4 w-4 transition-transform ${openMenu === "categories" ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {openMenu === "categories" ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-40 mt-2 w-[640px] max-w-[calc(100vw-2rem)] rounded-lg bg-white p-5 shadow-lg ring-1 ring-gray-200"
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {groupedCategories.map((group) => (
                    <div key={group.heading}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {group.heading}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {group.items.map((c) => (
                          <li key={c.slug}>
                            <Link
                              href={`/tasks?category=${c.slug}`}
                              role="menuitem"
                              className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2 hover:bg-gray-50"
                            >
                              <span aria-hidden="true" className="mt-0.5 text-lg">
                                {c.emoji}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-900">
                                  {c.name}
                                </span>
                                {c.blurb ? (
                                  <span className="block truncate text-xs text-gray-500">
                                    {c.blurb}
                                  </span>
                                ) : null}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 text-sm">
                  <Link
                    href="/categories"
                    className="font-medium text-brand-700 hover:underline"
                  >
                    See all services →
                  </Link>
                  <Link
                    href="/tasks"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Browse open tasks
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <Link
            href="/taskers"
            className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            Find taskers
          </Link>
          {user ? (
            <Link
              href="/chats"
              className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Messages
            </Link>
          ) : null}

          {showOnboardingNudge ? (
            <Link
              href="/onboarding"
              className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              Complete your profile
            </Link>
          ) : null}

          {user?.role === "ADMIN" ? (
            <Link
              href="/admin/verifications"
              className="rounded-md px-3 py-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <NotificationsBell />

              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={openMenu === "profile"}
                  onClick={() => toggle("profile")}
                  className="relative inline-flex items-center gap-2 rounded-full p-1 pr-2 text-sm hover:bg-gray-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initialsOf(user.name)}
                  </span>
                  {showOnboardingNudge ? (
                    <span className="absolute left-7 top-0 h-2.5 w-2.5 rounded-full bg-yellow-400 ring-2 ring-white" />
                  ) : null}
                  <svg
                    className={`h-4 w-4 text-gray-500 transition-transform ${openMenu === "profile" ? "rotate-180" : ""}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                {openMenu === "profile" ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-gray-200"
                  >
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="truncate text-sm font-semibold">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {user.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="badge bg-brand-100 text-brand-700">
                          {user.role}
                        </span>
                        {user.role === "TASKER" ? (
                          <span
                            className={`badge ${
                              user.verificationStatus === "APPROVED"
                                ? "bg-brand-100 text-brand-700"
                                : user.verificationStatus === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : user.verificationStatus === "REJECTED"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {user.verificationStatus === "APPROVED"
                              ? "Verified"
                              : user.verificationStatus === "PENDING"
                                ? "Pending review"
                                : user.verificationStatus === "REJECTED"
                                  ? "Rejected"
                                  : "Not verified"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ul className="py-1 text-sm">
                      <li>
                        <Link
                          href="/dashboard"
                          className="block px-4 py-2 hover:bg-gray-50"
                          role="menuitem"
                        >
                          Dashboard
                        </Link>
                      </li>
                      {user.role === "TASKER" ? (
                        <>
                          <li>
                            <Link
                              href="/onboarding"
                              className="flex items-center justify-between px-4 py-2 hover:bg-gray-50"
                              role="menuitem"
                            >
                              <span>
                                {user.onboardingComplete
                                  ? "Edit profile"
                                  : "Complete profile"}
                              </span>
                              {!user.onboardingComplete ? (
                                <span className="badge bg-yellow-100 text-yellow-900">
                                  action needed
                                </span>
                              ) : null}
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/availability"
                              className="block px-4 py-2 hover:bg-gray-50"
                              role="menuitem"
                            >
                              Availability
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/wallet"
                              className="block px-4 py-2 hover:bg-gray-50"
                              role="menuitem"
                            >
                              Wallet
                            </Link>
                          </li>
                        </>
                      ) : null}
                      {user.role === "CUSTOMER" ? (
                        <li>
                          <Link
                            href="/tasks/new"
                            className="block px-4 py-2 hover:bg-gray-50"
                            role="menuitem"
                          >
                            Post a task
                          </Link>
                        </li>
                      ) : null}
                      {user.role === "ADMIN" ? (
                        <>
                          <li>
                            <Link
                              href="/admin/verifications"
                              className="block px-4 py-2 hover:bg-gray-50"
                              role="menuitem"
                            >
                              Admin · Verifications
                            </Link>
                          </li>
                          <li>
                            <Link
                              href="/admin/payouts"
                              className="block px-4 py-2 hover:bg-gray-50"
                              role="menuitem"
                            >
                              Admin · Payouts
                            </Link>
                          </li>
                        </>
                      ) : null}
                      <li>
                        <Link
                          href="/tasks"
                          className="block px-4 py-2 hover:bg-gray-50"
                          role="menuitem"
                        >
                          Browse tasks
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 hover:bg-gray-50"
                          role="menuitem"
                        >
                          Settings
                        </Link>
                      </li>
                    </ul>
                    <div className="border-t border-gray-100 py-1 text-sm">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50"
                        role="menuitem"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
            className="-mr-1 inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500 md:hidden"
          >
            {mobileOpen ? (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <nav className="flex flex-col px-4 py-3 text-sm">
            {user ? (
              <div className="mb-2 flex items-center gap-3 rounded-md bg-gray-50 px-3 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {initialsOf(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
                <span className="badge ml-auto bg-brand-100 text-brand-700">
                  {user.role}
                </span>
              </div>
            ) : null}

            {showOnboardingNudge ? (
              <Link
                href="/onboarding"
                className="mb-2 inline-flex items-center justify-between rounded-md bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-900"
              >
                Complete your profile
                <span className="text-xs">→</span>
              </Link>
            ) : null}

            <Link
              href="/tasks"
              className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
            >
              Browse tasks
            </Link>
            <Link
              href="/taskers"
              className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
            >
              Find taskers
            </Link>

            <details className="rounded-md">
              <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50">
                <span className="flex items-center justify-between">
                  Categories
                  <svg
                    className="h-4 w-4 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </summary>
              <ul className="ml-2 mt-1 space-y-1 border-l border-gray-100 pl-3">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/tasks?category=${c.slug}`}
                      className="block rounded-md px-2 py-1.5 text-gray-700 hover:bg-gray-50"
                    >
                      <span className="mr-2" aria-hidden="true">
                        {c.emoji}
                      </span>
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/categories"
                    className="block rounded-md px-2 py-1.5 text-sm font-medium text-brand-700 hover:bg-gray-50"
                  >
                    See all services →
                  </Link>
                </li>
              </ul>
            </details>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Dashboard
                </Link>
                {user.role === "CUSTOMER" ? (
                  <Link
                    href="/tasks/new"
                    className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Post a task
                  </Link>
                ) : null}
                {user.role === "TASKER" ? (
                  <>
                    <Link
                      href="/onboarding"
                      className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      {user.onboardingComplete ? "Edit profile" : "Complete profile"}
                    </Link>
                    <Link
                      href="/availability"
                      className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Availability
                    </Link>
                    <Link
                      href="/wallet"
                      className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Wallet
                    </Link>
                  </>
                ) : null}
                {user.role === "ADMIN" ? (
                  <Link
                    href="/admin/verifications"
                    className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Admin · Verifications
                  </Link>
                ) : null}
                {user.role === "ADMIN" ? (
                  <Link
                    href="/admin/payouts"
                    className="rounded-md px-2 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Admin · Payouts
                  </Link>
                ) : null}
                <button
                  onClick={handleLogout}
                  className="btn-secondary mt-3 w-full"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/login" className="btn-secondary w-full">
                  Log in
                </Link>
                <Link href="/register" className="btn-primary w-full">
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
