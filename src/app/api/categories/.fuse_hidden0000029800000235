import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/categories
 * Public list of active categories used in dropdowns, navbar, and homepage.
 */
export async function GET() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      emoji: true,
      group: true,
      blurb: true,
    },
  });
  return NextResponse.json({ categories });
}
