import { NextResponse } from "next/server";

/**
 * NOTE: this route is intentionally a no-op. The canonical endpoint for
 * unavailable-dates CRUD is `/api/taskers/:id/availability/[blockId]`. We
 * can't delete this file in the dev sandbox, so it just 410s.
 */
export function GET() {
  return NextResponse.json(
    { error: "Use /api/taskers/[id]/availability/[blockId]" },
    { status: 410 },
  );
}
export const DELETE = GET;
