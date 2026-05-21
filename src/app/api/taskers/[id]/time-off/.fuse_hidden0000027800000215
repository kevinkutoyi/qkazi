import { NextResponse } from "next/server";

/**
 * NOTE: this route is intentionally a no-op. The canonical endpoint for
 * unavailable-dates CRUD is `/api/taskers/:id/availability`. We can't
 * delete this file in the dev sandbox, so it just 410s.
 */
export function GET() {
  return NextResponse.json(
    { error: "Use /api/taskers/[id]/availability" },
    { status: 410 },
  );
}
export const POST = GET;
export const DELETE = GET;
