# app/

## Purpose
Next.js 15 App Router pages and API routes. Thin layer — validates input, calls `lib/` functions, returns responses.

## Structure
```
(app)/          → Route group: authenticated app shell
  layout.tsx    → Auth guard (redirects to /login if no session) + Navbar/Sidebar
  dashboard/    → Daily Quest hero card + stats + 5-Min CTA
  quick/        → "5-Minute Mode" — focused view for tasks with estimatedMinutes ≤ 5
  tasks/        → Task list and management
  topics/       → Topics + subtasks
  wishlist/     → Wishlist + budget tracker
  settings/     → Notification, budget, language, account deletion settings
  api-keys/     → API key management UI
  stats/        → User statistics page
  admin/        → Admin statistics (requires ADMIN_USER_IDS env var)
  review/       → Weekly review page (weekly performance summary)
(auth)/         → Route group: unauthenticated
  layout.tsx    → Centered layout for auth pages
  login/        → OAuth provider buttons (GitHub, Discord, Google)
(docs)/         → Public documentation routes (no auth)
  api-docs/     → Interactive OpenAPI / Swagger UI
(legal)/        → Legal pages (no auth)
  datenschutz/  → Privacy policy (Datenschutzerklärung)
  impressum/    → Legal notice (Impressum)
api/
  auth/[...nextauth]/route.ts        → Auth.js v5 handler (GET + POST)
  tasks/route.ts                     → GET (list, ?topicId/type/completed filters), POST (create)
  tasks/[id]/route.ts                → GET (single), PATCH (update), DELETE
  tasks/[id]/complete/route.ts       → POST (complete + award coins, body: {timezone?}), DELETE (uncomplete + refund)
  tasks/[id]/snooze/route.ts         → POST (snooze until date, body: {snoozedUntil}), DELETE (unsnooze/wake up)
  tasks/[id]/breakdown/route.ts      → POST (split task into subtasks under new topic)
  topics/route.ts                    → GET (list with task counts), POST (create)
  topics/[id]/route.ts               → GET (with tasks), PATCH, DELETE
  daily-quest/route.ts               → GET (fetch today's quest, returns completed quest all day), POST (force new quest)
  daily-quest/postpone/route.ts      → POST (postpone quest, body: {taskId, timezone?}, enforces daily limit)
  energy-checkin/route.ts            → POST (set daily energy level + select matching quest, body: {energyLevel, timezone?})
  wishlist/route.ts                  → GET (list), POST (create)
  wishlist/[id]/route.ts             → PATCH, DELETE
  wishlist/[id]/buy/route.ts         → POST (mark purchased, deduct coins)
  wishlist/[id]/discard/route.ts     → POST (discard item)
  settings/budget/route.ts           → GET/PATCH (monthly coin budget)
  push/subscribe/route.ts            → POST/DELETE (save/remove Web Push subscription)
  push/test/route.ts                 → POST (send test push notification)
  cron/route.ts                      → POST (unified cron dispatcher — runs all jobs from lib/cron.ts, protected by CRON_SECRET)
  health/route.ts                    → GET (liveness probe, returns 200 OK)
  admin/seed/route.ts                → POST (seed demo data — dev/staging only)
  auth/link-request/route.ts         → POST (initiate OAuth account linking flow)
  auth/link-callback/route.ts        → GET (complete OAuth account linking by token)
  user/export/route.ts               → GET (GDPR data export as JSON download)
  user/delete/route.ts               → DELETE (full account deletion)
  locale/route.ts                    → POST (set UI locale cookie)
  settings/quest/route.ts            → PATCH (save quest settings: postpone limit, emotional closure toggle)
  openapi.json/route.ts              → GET (OpenAPI 3.1.0 spec, public)
globals.css     → Design system CSS variables, Tailwind v4, Google Fonts
layout.tsx      → Root layout: ThemeProvider (next-themes), font variables
page.tsx        → Landing page (unauthenticated) or redirect to /dashboard (authenticated)
```

## Patterns
- Route groups `(app)` and `(auth)` don't affect URL paths
- API routes: always auth-check first, validate with Zod, call lib function, return `{ data }` or `{ error: string }`
- Server Components by default; add `"use client"` only when needed (interactivity, hooks)
- New API routes get a JSDoc block describing method, auth, body, response
