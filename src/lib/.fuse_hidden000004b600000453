import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import type { Role } from "@prisma/client";
import { getCurrentUser, JwtPayload } from "./auth";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: jsonError("Invalid JSON body", 400) };
  }
  try {
    return { data: schema.parse(body) };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        error: NextResponse.json(
          { error: "Validation failed", details: err.flatten() },
          { status: 422 },
        ),
      };
    }
    throw err;
  }
}

/**
 * Require an authenticated user. Optionally restrict by role(s).
 * Returns either { user } or { error: NextResponse } so callers can early-return.
 */
export async function requireAuth(
  roles?: Role[],
): Promise<{ user: JwtPayload } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: jsonError("Unauthorized", 401) };
  }
  if (roles && !roles.includes(user.role)) {
    return { error: jsonError("Forbidden", 403) };
  }
  return { user };
}
