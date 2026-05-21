import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { parseBody, requireAuth } from "@/lib/api-utils";

const schema = z.object({
  timezone: z.string().min(1).max(80),
});

/**
 * POST /api/users/me/timezone  { timezone }
 * Stores the user's IANA timezone. Validated lightly — Intl.DateTimeFormat
 * will reject bogus values when we try to use them anyway, so storing an
 * invalid string is harmless (formatters fall back to UTC).
 */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;

  await prisma.user.update({
    where: { id: auth.user.sub },
    data: { timezone: parsed.data.timezone },
  });
  return NextResponse.json({ ok: true });
}
