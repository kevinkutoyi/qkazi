import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeded categories also drive the Navbar mega-menu and the /categories page.
 * Re-run with `npm run db:seed` after editing — upsert by slug, so this is
 * idempotent and safe to run on populated databases.
 */
const CATEGORIES: {
  slug: string;
  name: string;
  emoji: string;
  group: string;
  blurb: string;
  sortOrder: number;
}[] = [
  // ---------------- Home ----------------
  { slug: "cleaning",          name: "Cleaning",           emoji: "🧹", group: "Home",      blurb: "Homes, apartments, deep cleans",       sortOrder: 10 },
  { slug: "handyman",          name: "Handyman",           emoji: "🔧", group: "Home",      blurb: "Repairs, small fixes, odd jobs",       sortOrder: 20 },
  { slug: "mounting",          name: "Mounting",           emoji: "🖼️", group: "Home",      blurb: "TVs, art, mirrors, shelves",            sortOrder: 25 },
  { slug: "assembly",          name: "Furniture assembly", emoji: "🪛", group: "Home",      blurb: "IKEA, beds, desks, anything flat-pack", sortOrder: 30 },
  { slug: "painting",          name: "Painting",           emoji: "🎨", group: "Home",      blurb: "Rooms, fences, touch-ups",             sortOrder: 40 },
  { slug: "gardening",         name: "Gardening",          emoji: "🌿", group: "Home",      blurb: "Mowing, weeding, planting",            sortOrder: 50 },

  // ---------------- Logistics ----------------
  { slug: "moving",            name: "Moving",             emoji: "📦", group: "Logistics", blurb: "Help loading and hauling",             sortOrder: 60 },
  { slug: "delivery",          name: "Delivery",           emoji: "🚚", group: "Logistics", blurb: "Pickups, drop-offs, courier runs",     sortOrder: 70 },
  { slug: "errands",           name: "Errands",            emoji: "🛒", group: "Logistics", blurb: "Shopping, returns, standing in lines", sortOrder: 80 },

  // ---------------- Other ----------------
  { slug: "personal-assistant", name: "Personal assistant", emoji: "🗓️", group: "Other",    blurb: "Admin, scheduling, research, calls",   sortOrder: 90 },
  { slug: "tech-help",         name: "Tech help",          emoji: "💻", group: "Other",     blurb: "Setup, networking, troubleshooting",   sortOrder: 100 },
  { slug: "pet-care",          name: "Pet care",           emoji: "🐾", group: "Other",     blurb: "Walking, sitting, grooming",            sortOrder: 110 },
  { slug: "events",            name: "Events",             emoji: "🎉", group: "Other",     blurb: "Setup, serving, cleanup",              sortOrder: 120 },
  { slug: "tutoring",          name: "Tutoring",           emoji: "📚", group: "Other",     blurb: "Subjects, skills, music",              sortOrder: 130 },
];

async function main() {
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        emoji: c.emoji,
        group: c.group,
        blurb: c.blurb,
        sortOrder: c.sortOrder,
      },
      create: c,
    });
  }
  const count = await prisma.category.count();
  console.log(`✔ Seeded categories (total: ${count})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
