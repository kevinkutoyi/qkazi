import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  fetchUserInfo,
} from "@/lib/google-oauth";

const STATE_COOKIE = "qkazi_oauth_state";
const ROLE_COOKIE = "qkazi_oauth_role";

function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function errorRedirect(reason: string) {
  const url = new URL("/login", appUrl());
  url.searchParams.set("oauth_error", reason);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) return errorRedirect(errorParam);
  if (!code || !state) return errorRedirect("missing_code");

  // CSRF check: state must match the cookie we set when starting the flow.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieMap = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p) => p[0])
      .map(([k, v]) => [k, decodeURIComponent(v ?? "")]),
  );
  const cookieState = cookieMap[STATE_COOKIE];
  const cookieRole = cookieMap[ROLE_COOKIE];
  if (!cookieState || cookieState !== state) {
    return errorRedirect("state_mismatch");
  }
  const preferredRole = (Object.values(Role) as string[]).includes(
    cookieRole ?? "",
  )
    ? (cookieRole as Role)
    : Role.CUSTOMER;

  let profile;
  try {
    const tokens = await exchangeCodeForTokens(code);
    profile = await fetchUserInfo(tokens.access_token);
  } catch (err) {
    console.error("[google-oauth] failed:", err);
    return errorRedirect("provider_error");
  }

  if (!profile.email || !profile.email_verified) {
    return errorRedirect("email_not_verified");
  }

  // Upsert: link by googleId first, fall back to matching email.
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.sub }, { email: profile.email }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name ?? profile.email.split("@")[0],
        role: preferredRole,
        googleId: profile.sub,
        emailVerified: new Date(),
        // No passwordHash — Google-only account.
        taskerProfile:
          preferredRole === Role.TASKER
            ? {
                create: {
                  // Sensible defaults; user can edit later.
                  hourlyRate: 20,
                  location: null,
                  bio: null,
                  skills: [],
                },
              }
            : undefined,
      },
    });
  } else if (!user.googleId) {
    // Existing email/password account → link this Google identity to it
    // and mark the email as verified since Google attests it.
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: profile.sub,
        emailVerified: user.emailVerified ?? new Date(),
      },
    });
  }

  const token = await signToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const res = NextResponse.redirect(new URL("/dashboard", appUrl()));
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  // Clear the OAuth scratch cookies.
  res.cookies.set({ name: STATE_COOKIE, value: "", path: "/", maxAge: 0 });
  res.cookies.set({ name: ROLE_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
