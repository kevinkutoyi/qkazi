import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { buildAuthUrl, generateState } from "@/lib/google-oauth";

const STATE_COOKIE = "qkazi_oauth_state";
const ROLE_COOKIE = "qkazi_oauth_role";

/**
 * Kick off the Google sign-in flow. Accepts an optional ?role=CUSTOMER|TASKER
 * query param so new accounts created via Google land in the right role.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roleParam = (searchParams.get("role") ?? "").toUpperCase();
  const role = (Object.values(Role) as string[]).includes(roleParam)
    ? (roleParam as Role)
    : Role.CUSTOMER;

  const state = generateState();
  const url = buildAuthUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  res.cookies.set({
    name: ROLE_COOKIE,
    value: role,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return res;
}

export const STATE_COOKIE_NAME = STATE_COOKIE;
export const ROLE_COOKIE_NAME = ROLE_COOKIE;
