# Qkazi

A TaskRabbit‑style marketplace where customers post local tasks and skilled taskers send offers. This is the MVP foundation — auth, profiles, task listings, tasker search, and an offer/accept booking flow — built to be extended with payments, messaging, reviews, and notifications.

## Tech stack

- **Framework:** Next.js 14 (App Router) — frontend + API routes in one project
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL 16 via Docker Compose
- **ORM:** Prisma
- **Auth:** JWT in an HTTP-only cookie (`jose`), bcrypt passwords, role-based access (`CUSTOMER` / `TASKER` / `ADMIN`), Google OAuth, email verification, password reset
- **Email:** Resend
- **Validation:** Zod on every API route

> Note: you originally asked for an Express backend. In setup you picked the Next.js fullstack option, so the API lives in `src/app/api/*` route handlers instead of a separate Express server. The auth, validation and role‑guard patterns are the same — moving them into Express later is mostly copy/paste.

## Project layout

```
Qkazi/
├── docker-compose.yml                 # Postgres for local dev
├── prisma/schema.prisma               # User / TaskerProfile / Task / Booking / VerificationToken
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout + auth-aware Navbar
│   │   ├── page.tsx                   # Marketing homepage
│   │   ├── login, register            # Email/password + Google
│   │   ├── verify-email/              # Post-signup + confirm screens
│   │   ├── password-reset/            # Request + confirm screens
│   │   ├── dashboard                  # Role-based dashboard
│   │   ├── tasks/                     # Browse / new / detail (+ offer flow)
│   │   ├── taskers/                   # Search + profile pages
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register, login, logout, me
│   │       │   ├── google + google/callback     (OAuth)
│   │       │   ├── verify-email + verify-email/send
│   │       │   └── password-reset + password-reset/confirm
│   │       ├── tasks/                 # GET list + POST + GET/PATCH/DELETE by id
│   │       ├── taskers/               # GET list + GET/PATCH by id
│   │       └── bookings/              # GET list + POST offer, PATCH accept/decline/complete
│   ├── components/                    # Navbar, TaskCard, GoogleButton
│   └── lib/                           # prisma, auth, api-utils, mailer, tokens, google-oauth
└── README.md
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure env

```bash
cp .env.example .env
```

Open `.env` and fill in:

- `JWT_SECRET` — `openssl rand -base64 32` is a good source
- `APP_URL` — keep as `http://localhost:3000` for local dev
- `RESEND_API_KEY` — sign up at <https://resend.com>, create an API key. For local dev you can use the default sender `onboarding@resend.dev`; for production you'll want to verify a domain.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — see below

#### Google Maps setup

1. In the [Google Cloud Console](https://console.cloud.google.com/), enable **Maps JavaScript API**, **Places API**, and **Maps Static API**.
2. **APIs & Services → Credentials → Create credentials → API key**.
3. Restrict the key:
   - *Application restrictions* → **HTTP referrers** → add `http://localhost:3000/*` (and your production origin later).
   - *API restrictions* → restrict to the three APIs above.
4. Copy the key into `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env`. (It must be `NEXT_PUBLIC_` so the Maps JS API can read it client-side; this is fine when paired with referrer restrictions.)

If the key isn't set, address-autocomplete and map previews degrade gracefully to plain text + a small notice — the rest of the app still works.

#### Google OAuth setup

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
2. **APIs & Services → OAuth consent screen** → configure (User Type: External is fine for dev).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → Application type **Web application**.
4. Under **Authorized redirect URIs** add: `http://localhost:3000/api/auth/google/callback`
5. Copy the Client ID and Client Secret into `.env`.

### 3. Start Postgres

```bash
npm run db:up
```

This boots a Postgres 16 container on `localhost:5432` matching the `DATABASE_URL` in `.env.example`.

### 4. Run the first migration

```bash
npm run db:migrate
```

Prisma will create the schema and generate the typed client. The `postinstall` hook also runs `prisma generate` for you.

### 4a. Seed categories

The Task ↔ Category relation is required, so before you can post a task you need the categories seeded. The migrate step will offer to run the seed automatically; if it didn't, run:

```bash
npm run db:seed
```

This populates 12 categories (Cleaning, Moving, etc.). The seed uses `upsert` by slug, so it's safe to re-run after editing `prisma/seed.ts`.

> **Coming from an earlier version?** `Task.category` changed from a free-text `String` to a foreign key to the new `Category` table. The cleanest path on a dev DB is `npm run db:reset`, which drops everything, re-applies migrations, and re-runs the seed.

### 5. Start the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

## Auth flows

**Email/password signup**

1. User fills out `/register` → POST `/api/auth/register`.
2. Account is created with `emailVerified = null`. **No session cookie is set.**
3. Verification email is sent via Resend. User is redirected to `/verify-email`.
4. User clicks the email link → `/api/auth/verify-email?token=…` → marks `emailVerified`, redirects to `/login?verified=1`.
5. User logs in normally.

**Login**

- POST `/api/auth/login` checks the password and refuses if `emailVerified` is null (returns `403 EMAIL_NOT_VERIFIED` + the email, so the UI can offer "Resend").
- On success: signs a JWT and sets the `qkazi_token` HTTP-only cookie.

**Password reset**

1. `/password-reset` → POST `/api/auth/password-reset` (always 200, prevents enumeration).
2. User clicks reset link → `/password-reset/confirm?token=…`.
3. They set a new password → POST `/api/auth/password-reset/confirm` consumes the token, updates the password, and also marks the email verified (receipt of the email proves inbox control).

**Google OAuth**

- `/api/auth/google?role=CUSTOMER|TASKER` sets a state cookie and redirects to Google.
- `/api/auth/google/callback` validates state, exchanges the code, fetches the profile, and either:
  - links the Google identity to an existing account by email, or
  - creates a brand new account with `emailVerified` already set (Google attests it).
- A JWT cookie is set and the user lands on `/dashboard`.

## What you can do today

1. Register as a **customer** (just name/email/password) or as a **tasker** (also hourly rate, skills, location, bio). Confirm via email link, then log in. Or skip all that with **Continue with Google**.
2. As a customer: post a task, see incoming offers, accept one. The accepted booking marks the task `ASSIGNED` and auto‑declines the other pending offers. Mark the booking complete when the work is done.
3. As a tasker: browse open tasks, filter by category, send an offer with a message. Track offer status from the dashboard.
4. Anyone can browse taskers by skill, location, and max hourly rate.

## Database schema

The full Prisma schema lives at `prisma/schema.prisma`. Models:

| Model               | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `User`              | Customers, taskers, and admins. Auth fields, Google linkage.           |
| `TaskerProfile`     | One-to-one with `User`. Onboarding data + verification status.         |
| `Category`          | Task categories (Cleaning, Moving, …). Seeded by `prisma/seed.ts`.     |
| `Task`              | A job a customer is looking to get done. FK to `Category`, has many `TaskImage`, optional `scheduledFor`. |
| `TaskImage`         | Photos attached to a task. Sorted by `sortOrder`.                      |
| `Booking`           | A tasker's bid on a task: `priceCents`, `estimatedMinutes`, `message`. Unique on `(taskId, taskerId)`. |
| `Payment`           | One per booking. Amount in cents, provider/status enums, fee tracking. |
| `Review`            | Bidirectional (customer↔tasker). One per booking per author.           |
| `Chat` / `Message`  | One chat per booking. Messages have `readAt` for unread badges.        |
| `Notification`      | In-app notifications. Type enum + free-form `data` JSON.               |
| `Favorite`          | Customers' saved taskers. Unique on `(customerId, taskerId)`.          |
| `VerificationToken` | Email-verify and password-reset tokens.                                |

Indexes added for the queries we'll run most often: open tasks by category, bookings by tasker + status, notifications by recipient, messages by chat + time, reviews by subject.

**Implemented today:** users, tasker profiles, categories, tasks, bookings, favorites, verification tokens. **Schema-only for now:** payments, reviews, chats, messages, notifications — the tables exist with relations and indexes; the customer dashboard reads from them and shows empty states, so wiring up the create flows lights them up automatically.

## Posting a task

`/tasks/new` is a sectioned form for logged-in customers:

1. **What needs to be done** — title, description, category (select driven by the `Category` table).
2. **Photos** — up to 6 images. Each is uploaded inline to `POST /api/uploads` with `purpose=task`; the customer sees a thumbnail with an Uploading… / Remove overlay. The returned URLs are submitted with the rest of the form.
3. **Where & when** — location text + a two-button toggle: "I'm flexible" (no specific time) or "Pick a date" (date + optional time, defaults to 9:00 AM). Stored as `Task.scheduledFor` (nullable).
4. **Your budget** — quick chips ($25 / $50 / $100 / $200) plus a custom amount field.

Submit posts a single `POST /api/tasks` containing `{ title, description, categoryId, location, budget, scheduledFor, imageUrls }`; the API resolves the category and creates the `Task` + `TaskImage` rows in one call.

Browse cards, dashboards, and the detail page all surface the first image as a thumbnail and show the scheduled time ("Flexible" when null). The detail page renders a small photo grid that opens full-size on click.

## Services directory

`/categories` is a server-rendered directory of every active category. Categories are grouped into Home / Logistics / Other sections (the seed's `group` column drives this) and each card shows the seed blurb plus a live count of open tasks in that category. The Navbar's mega-menu also reads from the same query, so updating `prisma/seed.ts` and re-running `npm run db:seed` flows through the whole UI automatically.

Each card links to `/categories/[slug]` — a detail page that surfaces:
- The category's hero (emoji, name, group, blurb, open-tasks count, review count).
- **Top-rated taskers** (up to 6): verified taskers sorted by `ratingAvg` then `ratingCount`. Each card shows a "N {Category} jobs" badge when the tasker has completed bookings in this category (computed in a single `groupBy` over `Booking`).
- **Recent reviews**: latest 6 reviews on bookings whose task belongs to this category. Stars + comment + reviewer + tasker.
- **Recent open tasks**: 4 open tasks in this category with a "See all N →" link to `/tasks?category=slug`.

Ratings and reviews remain sparse until the Review-creation flow lands; the page degrades gracefully with empty states until then.

## Task search

`/tasks` is a server-rendered search page with a filter sidebar. All filters are URL-driven (`<form method="GET">`), so the page is bookmarkable and shareable, and works without JavaScript.

Filters available:

- **Search** — full-text on title + description (case-insensitive `contains`)
- **Category** — exact match on `Category.slug` (dropdown driven by the categories table)
- **Price** — `minBudget` / `maxBudget` in dollars; range filter on `Task.budget`
- **Near** — case-insensitive `contains` on `Task.location` (best-effort proximity until we wire geocoding)
- **Availability** — `from` / `to` date range on `Task.scheduledFor`, with an "include flexible-timing tasks" checkbox that ORs in tasks with `scheduledFor = NULL`
- **Min customer rating** — chips for Any / 3★+ / 4★+ / 4.5★+, filters `customer.customerRatingAvg`
- **Sort** — Newest (default), Price low→high, Price high→low, Soonest available

Implementation lives in `src/lib/task-search.ts`: `parseTaskSearchParams` coerces query params into a typed object; `buildTaskSearchWhere` produces a Prisma `where` clause; `buildTaskSearchOrderBy` maps the sort key. The `/tasks` page and `GET /api/tasks` both use these helpers so the page UI and JSON API always agree.

**Rating-data caveat** — `User.customerRatingAvg` / `customerRatingCount` are denormalized fields ready for review writes; until the review-creation flow ships they're 0 for everyone, so the rating filter only meaningfully excludes results once reviews exist. The chips and schema are correct now; no further work needed when reviews go live.

## Location & maps

Tasks and tasker profiles store nullable `latitude` / `longitude` columns alongside the existing free-text `location`. A compound index `@@index([latitude, longitude])` on Task speeds up the bounding-box filter used for distance search.

**Address entry** — `PlacesAutocomplete` (a small client component wrapping `google.maps.places.Autocomplete`) sits in three places:
- `/tasks/new` — the customer's Location field
- `/onboarding` — the tasker's Location step
- (the search-page filter is geolocation-driven; see below)

When the user picks a suggestion, the formatted address goes into the existing `location` string and the geocoded coordinates go into `latitude`/`longitude`. The Maps JS API loads on demand the first time any autocomplete mounts; subsequent mounts reuse the same promise.

**Map previews** — `MapPreview` is a *server* component that builds a Maps Static API URL and renders a plain `<img>` tag. Lower API cost than embedding interactive maps, and zero client JS. Shown on `/tasks/[id]` (under "Location") and `/taskers/[id]` (under "Service area") whenever lat/lng are present.

**Distance search** —

- Sidebar on `/tasks` has a **Distance** fieldset with a "Use my location" button (`UseMyLocationButton`, wraps `navigator.geolocation.getCurrentPosition`). Until the user grants permission, the radius select is hidden; once granted, the user picks 5 / 10 / 25 / 50 / 100 km.
- Captured coords + radius live as hidden inputs in the URL-driven `<form method="GET">`, so the filter ends up in the URL and is shareable / refresh-safe.
- `buildTaskSearchWhere` applies a Prisma bounding-box filter on `latitude` / `longitude` — that's cheap and indexable. After the query, `applyDistance` computes the exact great-circle distance with Haversine, drops anything outside the requested radius, and (if sort = Distance) re-sorts ascending.
- TaskCards show "1.2 km away" / "350 m away" when a distance is attached.

A separate free-text "Or by text" filter is still there for users who don't want to share location — it just does `location ILIKE %text%`.

**Production note** — distance accuracy is good enough for city-scale matching but not sub-meter (Haversine treats Earth as a sphere). If you outgrow it, swap the Postgres image to `postgis/postgis` and replace `applyDistance` with a `geography(Point)` column + `ST_DWithin` query.

## Tasker wallet

`/wallet` is the tasker's home for everything money. It derives a unified view from the existing `Payment` and `Payout` rows — no new tables, no eventual-consistency cache to keep in sync.

Stats up top:

- **Available** — earned − withdrawn − pending withdrawals (the ceiling for a new withdrawal).
- **Lifetime earned** — sum of `Payment.amountCents` where `status = RELEASED` on the tasker's bookings.
- **In escrow** — sum of `Payment.amountCents` where `status = CAPTURED` but the booking isn't yet `COMPLETED`. This is money the customer paid that hasn't unlocked.
- **Withdrawn** — sum of `Payout.amountCents` where `status = PAID`; pending withdrawals (`REQUESTED` / `PROCESSING`) are surfaced as a subtitle.

Below the stats:

- **Request a withdrawal** — reuses `PayoutRequestForm`. Method/destination defaults come from `TaskerProfile`.
- **Pending payments** — focused list of payments currently in escrow with a per-row link to the task.
- **Transaction history** — a single chronological ledger merging payments and payouts. Each row is typed: `EARNED` (released payment, green credit), `ESCROW_HOLD` (yellow hold), `WITHDRAW_PENDING` / `WITHDRAW_PAID` (debit), `WITHDRAW_FAILED`, `WITHDRAW_CANCELLED`, `ESCROW_REFUND`. Rows linking to a task are click-throughs.

`src/lib/wallet.ts` houses the `getWalletState(taskerId)` function that produces the stats and the ordered transaction list. The old `/payouts` URL now redirects to `/wallet`.

## Payments & payouts (Pesapal)

Qkazi uses [Pesapal](https://pesapal.com) for payments — cards, M-Pesa, and the other methods Pesapal supports show up automatically on their hosted checkout page. Payouts to taskers go through a request/approve flow: tasker requests, admin marks paid (with an automated path stubbed for when you enable Pesapal Disbursements).

### Setup

1. Sign up at <https://pesapal.com>. The sandbox lives at <https://developer.pesapal.com> and uses a separate base URL we auto-pick when `PESAPAL_ENV=sandbox`.
2. Get your **Consumer Key** and **Consumer Secret** and put them in `.env`:
   ```
   PESAPAL_ENV="sandbox"
   PESAPAL_CONSUMER_KEY="..."
   PESAPAL_CONSUMER_SECRET="..."
   DEFAULT_CURRENCY="KES"
   ```
3. Set `APP_URL` to the externally-reachable URL of your app (use `ngrok http 3000` for local Pesapal testing — Pesapal needs to hit your IPN).
4. First time a customer checks out, the app calls `RegisterIPN` and caches the returned `ipn_id` in the `PesapalIpn` table. To pin it, set `PESAPAL_IPN_ID` instead.

### Customer payment flow

1. Customer accepts a tasker's offer → booking goes to `ACCEPTED`.
2. Customer hits **Pay now** on the dashboard or the booking detail → `/checkout/[bookingId]`.
3. Server creates a `Payment` row (amount = tasker's `priceCents` if present, otherwise the task budget × 100; currency = `DEFAULT_CURRENCY`), then calls `POST /api/Transactions/SubmitOrderRequest` and stores `order_tracking_id` on `Payment.providerPaymentId`.
4. Client redirects to Pesapal's hosted checkout.
5. After payment, Pesapal redirects to `/payments/return?paymentId=…&OrderTrackingId=…`. That page re-fetches the live status via `GetTransactionStatus` and updates `Payment.status` accordingly.
6. Pesapal also pings `POST /api/webhooks/pesapal`. That handler re-queries Pesapal (never trusts the inbound payload) and reconciles the row.
7. When the customer marks the task complete, the bookings PATCH transactionally flips the `Payment` from `CAPTURED` → `RELEASED`. That's the moment the money counts toward the tasker's available balance.

### Tasker payouts

`/payouts` shows three numbers — earned (sum of `RELEASED` payments on the tasker's bookings), pending (already-requested payouts not yet `PAID`/`FAILED`/`CANCELLED`), and **available** = earned − pending. The request form captures method (M-Pesa / Bank / Other), destination (phone or account), an optional label, and the amount; it's validated against available balance server-side. Tasker defaults are stored on `TaskerProfile.payoutMethod/Destination/DestinationName` and pre-fill the next request.

`/admin/payouts` is the admin queue. Tabs for `REQUESTED` / `PROCESSING` / `PAID` / `FAILED` / `CANCELLED`. Each row shows the destination details and a state machine: Mark processing → Mark paid (with a free-text **reference**, e.g. M-Pesa transaction code) → done. Admin can also Mark failed (with a reason that's shown to the tasker) or Cancel.

When you're ready to automate disbursement, swap the body of `submitDisbursement(...)` in `src/lib/pesapal.ts` for the real Pesapal payout call and have the admin route trigger it before flipping to `PROCESSING`. The Payout row already has `providerPayoutId` for the returned reference.

### Schema

- `Payment` — already in the schema. `provider` enum gained `PESAPAL`; `currency` default is now `KES`.
- `Payout` (new) — `taskerId`, `amountCents`, `currency`, `status` (`REQUESTED`/`PROCESSING`/`PAID`/`FAILED`/`CANCELLED`), `method` (`M_PESA`/`BANK`/`MANUAL`), `destination`/`destinationName` (snapshotted), `providerPayoutId`, `reference`, timestamps, plus the admin who processed it.
- `PesapalIpn` (new) — single-row registry of the IPN id we registered.
- `TaskerProfile` gained `payoutMethod` / `payoutDestination` / `payoutDestinationName` defaults.

## Tasker availability

Each tasker has two pieces of availability data:

- **Weekly working hours** — stored as a JSON blob on `TaskerProfile.workingHours` (typed shape lives in `src/lib/availability.ts`: 7 day keys, each with `enabled`, `start "HH:MM"`, and `end "HH:MM"`). Defaults to Mon–Fri 09:00–17:00 with weekends off.
- **Unavailable date ranges** — rows in the `AvailabilityBlock` table. Each has inclusive `startDate` / `endDate` stored at UTC midnight, plus an optional `reason`.

Taskers manage both at `/availability`. The page renders an interactive seven-row grid for working hours (toggle + start/end time inputs per day, with a "Reset to default" shortcut) and a list of upcoming time-off blocks underneath, with a form to add new ranges. PATCH `/api/taskers/[id]` accepts `{ workingHours }`; `POST /api/taskers/[id]/time-off` and `DELETE /api/taskers/[id]/time-off/[blockId]` cover the block CRUD.

The public tasker profile (`/taskers/[id]`) renders an "Availability" section with `summarizeWorkingHours()` output ("Mon–Fri 9 AM–5 PM · Sat 10 AM–2 PM") plus the next five upcoming unavailable ranges. The Navbar profile dropdown gains an "Availability" entry for tasker accounts (and the mobile menu too).

The pieces are deliberately decoupled from the customer's date/time picker for now — the picker doesn't yet check "is this tasker available at this instant" — so customers can still propose times outside a tasker's hours, and the tasker can decline. Adding validation later is straightforward: combine `readWorkingHours(profile.workingHours)` with the booking's UTC instant + the tasker's `User.timezone`.

## Booking & scheduling

Every datetime is stored in UTC (Postgres + Prisma default) and rendered in the viewer's IANA timezone. `User.timezone` holds that zone — auto-set on first login by `<TimezoneSync>` (a tiny client component that reads `Intl.DateTimeFormat().resolvedOptions().timeZone` and POSTs to `/api/users/me/timezone`) and editable any time at `/settings`.

The reusable scheduling UI:

- **`<Calendar>`** — month-grid date picker. Operates purely on `"YYYY-MM-DD"` strings so it doesn't drift across timezones. Past days disabled, today highlighted, prev/next month buttons.
- **`<DateTimePicker>`** — composes the Calendar with a row of time-slot chips (09:00 – 19:00 hourly by default, plus a custom-time input). Emits a UTC `Date` via `onChange`, computed by `dateTimeInZoneToUtc(date, time, timezone)` in `src/lib/datetime.ts`. Renders a "Times shown in EAT (UTC+3)" hint with a link to settings.

Pickers are wired in:

- **`/tasks/new`** — when the customer toggles "Pick a date", the date+time inputs are replaced by the new `<DateTimePicker>` initialized in the customer's timezone.
- **Tasker offer form** (on `/tasks/[id]`) — a new "Propose a date & time" checkbox unlocks the picker; the selected UTC Date is stored on `Booking.scheduledAt`.

Display: the task detail page formats `Task.scheduledFor` and each offer's `Booking.scheduledAt` in the viewer's timezone, with a small "(EAT, UTC+3)" hint under the time so cross-zone bookings aren't ambiguous.

`src/lib/datetime.ts` exposes the building blocks reusable everywhere else: `formatScheduled`, `formatShort`, `formatDate`, `zoneLabel`, `todayInZone`, and the `TIMEZONES` curated list used in the settings dropdown.

## Real-time bidding

When a tasker views an open task they're not the customer of, the side panel shows a bid form with three fields: **price** (pre-filled with the customer's budget, with live "$X over / under budget" feedback), **estimated time in hours**, and an optional **message**. Submitting calls `POST /api/bookings` with `priceCents`, `estimatedMinutes`, and `message`. Each tasker can only bid once per task (unique `(taskId, taskerId)`).

The customer's task page lists incoming offers sorted by lowest price first. Each row shows the tasker's photo, name, rating, written message, their proposed price (with the over/under-budget delta highlighted), and time estimate. A small green "Live" indicator with a pulsing dot sits next to the "Offers" heading.

That "Live" indicator is an SSE subscription:

- `GET /api/tasks/[id]/offers/stream` returns `Content-Type: text/event-stream`, validates the requester is the task owner, and subscribes to a tiny in-memory event bus (`src/lib/offer-events.ts`) keyed by `taskId`. Heartbeats every 25 s.
- `POST /api/bookings` and `PATCH /api/bookings/[id]` publish `new-offer` and `offer-update` events to the bus after their DB writes succeed.
- The `LiveOffersListener` client component opens the EventSource and calls `router.refresh()` on every payload — the server re-renders and the new offer fades into the list.

**Multi-instance:** set `REDIS_URL` and the bus automatically uses Redis pub/sub. Unset → in-process Map (fine for `next dev` and any single-process deploy). See **Realtime SSE** below for details.

## Customer dashboard

At `/dashboard`, logged-in customers see a unified overview:

- **Stats strip** — counts for active tasks, completed tasks, pending payments, and saved taskers.
- **Active tasks** — `OPEN` + `ASSIGNED` tasks the customer posted, rendered as cards (top 4, link to "All tasks").
- **Pending payments** — accepted offers that have no `Payment` row yet (i.e. need checkout), plus any existing `Payment` rows in `PENDING` / `AUTHORIZED`.
- **Recently completed** — top 3 `COMPLETED` tasks.
- **Messages** — most recent 5 conversations with unread counts (chats are 1:1 with bookings).
- **Favorite taskers** — top 6 saved taskers with verified-tick when applicable.

Favorites are powered by a new `Favorite` table; the heart button lives on each tasker's profile page (`/taskers/[id]`) for logged-in customers. API: `POST /api/favorites` (idempotent upsert) and `DELETE /api/favorites/[taskerId]`.

## Tasker onboarding

After a tasker signs up they're nudged through a 5‑step wizard at `/onboarding`:

1. **Basics** — profile photo + bio
2. **Work** — hourly rate + skills
3. **Location** — service area
4. **ID check** — government ID (front + optional back) + selfie holding ID
5. **Review** — submit for admin review

The schema tracks each piece on `TaskerProfile`, plus a `VerificationStatus` (`NOT_SUBMITTED` → `PENDING` → `APPROVED` / `REJECTED`) and a reviewer note for rejections.

**Search hides incomplete profiles.** `GET /api/taskers` filters out anyone whose `onboardingCompletedAt` is null or who's in `NOT_SUBMITTED` / `REJECTED`. The navbar and dashboard show a yellow "Complete your profile" nudge until the wizard is done.

### File uploads (local dev)

Uploaded images are saved under `public/uploads/{photos,ids}/<random>.<ext>` and served as `/uploads/...`. Filenames are 16 random bytes, so URLs are not guessable from user ids, but the directory **is** publicly served — fine for local dev, not for production.

When you move to production, swap `src/lib/upload.ts` to write to S3 / R2 / Vercel Blob and serve ID documents only via a signed-URL or authenticated proxy. The directory is gitignored.

### Admin review

The `/admin/verifications` page lists pending profiles. Click one to see the full submission with the ID photos and approve / reject (rejections require a note that the tasker sees on their dashboard).

**Bootstrapping the admin role.** Admins are users with `role = ADMIN`. To promote yourself for local testing:

```bash
npm run db:studio    # opens Prisma Studio in a browser
# edit your user row → set role = ADMIN
```

Or with `psql`:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## What's intentionally not built yet

- Two-factor auth

(Payments via Pesapal, geocoded address search, messaging, reviews, notifications, cloud storage, and Redis-backed SSE are now wired — see the sections below.)

## Realtime SSE (live offers + chat)

Both the live-offers stream on `/tasks/[id]` and the chat stream on `/chats/[id]` flow through a small shared pub/sub abstraction in `src/lib/sse-bus.ts`. The route handlers wrap a `ReadableStream` around a subscription; the publish side fires from the bookings + chats mutations.

Two backends, picked at runtime:

- **`REDIS_URL` unset (default)** — in-process `Map<id, Set<Listener>>`. Survives HMR via `globalThis`. Perfect for `next dev` and any single-process deploy.
- **`REDIS_URL` set** — channels become `offers:<taskId>` and `chats:<chatId>` on Redis pub/sub. Two singleton `ioredis` clients (one publisher, one subscriber, both stashed on `globalThis` to survive HMR) handle every channel. The bus issues `SUBSCRIBE` only when the first local listener for an id arrives, and `UNSUBSCRIBE` when the last leaves. Works with any Redis-compatible service: managed Redis, Upstash, AWS ElastiCache, Cloudflare/Vercel KV in Redis-compat mode, etc.

`REDIS_URL` accepts standard URLs: `redis://default:<password>@<host>:6379` or `rediss://...` for TLS.

The public API of `offer-events.ts` and `message-events.ts` is unchanged — `subscribe(id, listener)` and `publish(id, payload)` — so every existing call site (`POST /api/bookings`, `PATCH /api/bookings/[id]`, `POST /api/chats/[id]/messages`, `POST /api/chats/[id]/read`) and SSE route handler continues to work without edits.

## File storage

Two backends, picked by env. Existing render sites (`<img src={photoUrl}>` everywhere) keep working because the URL stored in the DB is the URL the browser fetches — the backend just changes what shape that string is.

**Local mode (default, dev only).** If `S3_BUCKET` is unset, `saveImage()` writes to `./public/uploads/<purpose>/<random>.<ext>` and stores a `/uploads/<purpose>/<random>.<ext>` URL. Next.js serves it from `/public`. **Doesn't work on Vercel or any read-only-filesystem deploy** and silently misbehaves on multi-instance setups because every node writes to its own disk.

**S3-compatible mode (production).** Set `S3_BUCKET` and friends — works with AWS S3, Cloudflare R2, MinIO, Backblaze B2, DigitalOcean Spaces. Object keys are `photos/<random>.ext`, `tasks/<random>.ext`, `ids/<random>.ext`. The URL we store in the DB depends on the prefix:

- `ids/*` — **always** stored as `/api/files/ids/<key>`. That URL is an auth-gated proxy: it 302-redirects to a **5-minute** signed S3 URL after verifying the requester is either an admin or the tasker who owns the document. The bucket itself never needs to be public.
- `photos/*` and `tasks/*` — if `S3_PUBLIC_BASE_URL` is set we store `${S3_PUBLIC_BASE_URL}/<key>` (CDN-direct, fastest). If not, we store `/api/files/<key>` and the proxy serves a 1-hour signed URL after a logged-in check.

**Setup:**

```env
S3_BUCKET="qkazi-prod"
S3_REGION="auto"               # AWS expects a real region (e.g. us-east-1); R2 uses "auto"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."

# Non-AWS endpoints:
# Cloudflare R2:    https://<account>.r2.cloudflarestorage.com
# MinIO:            http://localhost:9000
# DO Spaces:        https://<region>.digitaloceanspaces.com
S3_ENDPOINT=""
S3_FORCE_PATH_STYLE="false"    # "true" for MinIO

# Optional. Put a CDN in front of the bucket for photos/* + tasks/* hot paths.
# When set, those URLs are returned directly. When blank, every read goes
# through the auth-gated /api/files proxy.
S3_PUBLIC_BASE_URL=""
```

**Bucket policy.** Recommended: one bucket, private by default. The app signs every read. For photos/tasks you can either leave them private and rely on the proxy (most secure, +1 hop) or expose `photos/` + `tasks/` via a CDN and set `S3_PUBLIC_BASE_URL`. `ids/` should **never** be public — the proxy is the only legitimate path.

**Migrating existing local data.** Rows in the DB still hold `/uploads/...` paths after you switch to S3 mode; those won't resolve on the new deploy. Either reset and start fresh (`npm run db:reset` for dev), or copy `./public/uploads/**` into the bucket preserving paths and run a one-shot Prisma query to rewrite `^/uploads/(.+)$` → the S3 form.

## Messaging

A `Chat` row is auto-created the moment a customer accepts a tasker's offer (`bookings PATCH` upserts on `bookingId`). Both parties can talk via:

- `/chats` — list of conversations with last-message preview + unread badges
- `/chats/[id]` — message thread with optimistic send, auto-scroll, and a real-time `EventSource` listener on `GET /api/chats/[id]/stream`. Server emits a `message` event after `POST /api/chats/[id]/messages` and `read` after `POST /api/chats/[id]/read`; the client fetches deltas via `GET /api/chats/[id]/messages?after=<iso>` to avoid re-rendering the whole thread.
- The chat URL is linked from the customer dashboard's Messages section and from the Navbar.

The bus is the same in-memory pub/sub pattern as `offer-events.ts` (module-level Map, single-process; swap for Redis when scaling out). Sending a message also fires a bell notification to the recipient (`NEW_MESSAGE`).

## Reviews

`POST /api/bookings/[id]/reviews` accepts `{ rating: 1–5, comment? }` from either party once the booking is `COMPLETED`. A `@@unique([bookingId, authorId])` ensures one review per party. Inside a single transaction we (a) insert the review and (b) re-aggregate the subject's rating from scratch, updating the denormalized `TaskerProfile.ratingAvg / ratingCount` or `User.customerRatingAvg / customerRatingCount` accordingly so reads stay consistent.

UI:

- The task detail page renders a `ReviewForm` (with a star picker) inline on each `COMPLETED` booking for the customer, and in the sidebar for the tasker. Already-submitted reviews show as a read-only summary.
- The tasker profile page picks up the existing star widgets and adds a "Recent reviews" section listing the latest 6 reviews for that subject.
- The category detail page already pulls reviews via `prisma.review.findMany` — those now light up.

`REVIEW_RECEIVED` notifications are fired to the subject on insert.

## Notifications (real)

The Navbar bell is no longer a placeholder. `<NotificationsBell />` is a client component that polls `GET /api/notifications` every 30 s (cheap: one count + one find with limit 15), shows the unread count as a red badge, and renders a panel with read/unread styling. Clicking an item marks it read via `POST /api/notifications/[id]/read` and follows the entry's `url`; "Mark all read" hits `/api/notifications/read-all`.

`src/lib/notifications.ts` exposes `notify({ userId, type, title, body?, url?, data? })`. Every business action wraps the call in fire-and-forget so a failed insert never breaks the underlying flow. Wired sites:

- `POST /api/bookings` → `NEW_OFFER` to task owner
- `PATCH /api/bookings/[id]` → `OFFER_ACCEPTED` / `OFFER_DECLINED` / `TASK_COMPLETED` to the tasker
- `POST /api/chats/[id]/messages` → `NEW_MESSAGE` to recipient
- `POST /api/payments/[id]/sync` → `PAYMENT_AUTHORIZED` (captured) and `PAYMENT_RELEASED` (after task complete) to the tasker
- `POST /api/bookings/[id]/reviews` → `REVIEW_RECEIVED` to subject
- `POST /api/admin/verifications/[id]` → `VERIFICATION_APPROVED` / `VERIFICATION_REJECTED` to the tasker

## Pesapal sanity notes

While building reviews/messages/notifications I also tightened a couple of Pesapal edges:

- The billing block now always has a non-empty `first_name` / `last_name` (single-word user names fall back to `"."` so Pesapal doesn't 400).
- The merchant reference sent to `SubmitOrderRequest` is now `${paymentId}-${Date.now()}` per attempt so a retry of a failed payment doesn't collide with the previous attempt's reference. The webhook handler strips the timestamp suffix when falling back to a payment-id lookup.
- The webhook still re-fetches `GetTransactionStatus` for the authoritative status; spoofed inbound payloads are harmless.

## Geocoding / maps

Live in three places:

- **`PlacesAutocomplete`** in `/tasks/new` (customer location) and `/onboarding` (tasker service area). Selecting a suggestion writes both the formatted address and lat/lng.
- **`MapPreview`** (Static Maps `<img>` tag) on the task detail page and tasker profile.
- **Distance search** on `/tasks` and now on `/taskers` too. The taskers page got the same `DistanceFilter` component + bbox filter on `TaskerProfile.latitude/longitude` + Haversine refinement and ascending sort. Distance shows up inline on each tasker card (`350 m away` / `1.2 km away`).

If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` isn't set the autocomplete degrades to a plain input and `MapPreview` shows a placeholder — the rest of the app stays functional.

## Useful scripts

```bash
npm run dev          # Next.js dev server
npm run db:up        # docker compose up -d
npm run db:down      # docker compose down
npm run db:migrate   # prisma migrate dev
npm run db:reset     # drop, re-migrate, re-seed (DEV ONLY)
npm run db:seed      # run prisma/seed.ts (categories)
npm run db:studio    # prisma studio (DB GUI)
npm run db:generate  # regenerate prisma client
npm run build        # production build
npm run start        # production server
```
# qkazi
