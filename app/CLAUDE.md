# app/

## Purpose
Next.js 15 App Router pages and API routes. Thin layer — validates input, calls `lib/` functions, returns responses.

## Structure
```
(app)/          → Route group: authenticated app shell
  layout.tsx    → Auth guard (redirects to /login if no session) + Navbar/Sidebar
  dashboard/    → Daily Quest hero card + stats + 5-Min CTA
  quick/        → "5-Minute Mode" — focused view for tasks with estimatedMinutes ≤ 5
  focus/        → Focus Mode — distraction-free view: Daily Quest + Quick Wins (≤ 15 min) only
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
  login/2fa/    → Second-factor challenge — reached via the (app) layout gate when sessions.totp_verified_at IS NULL on a user with active 2FA
setup/2fa/      → Forced 2FA setup page (REQUIRE_2FA hard-lock). Lives at the top level on purpose: must NOT inherit AppLayout's enforcement gate or the redirect would loop. Has its own minimal layout with auth() check only
onboarding/     → Onboarding wizard for new users (4-step guided setup). Lives at the top level like setup/2fa/ — must NOT inherit AppLayout's onboarding gate or the redirect would loop. Own layout with auth() check only. Redirects to /dashboard if onboarding already completed
(docs)/         → Public documentation routes (no auth)
  api-docs/     → Interactive OpenAPI / Swagger UI
(legal)/        → Legal pages (no auth)
  datenschutz/  → Privacy policy (Datenschutzerklärung)
  impressum/    → Legal notice (Impressum)
api/
  auth/[...nextauth]/route.ts        → Auth.js v5 handler (GET + POST)
  auth/2fa/setup/route.ts            → POST (start TOTP wizard, returns QR + manual key, sets short-lived signed setup cookie; writes nothing to DB)
  auth/2fa/verify-setup/route.ts     → POST (verify first code, encrypts secret + persists, generates 10 backup codes, marks current session as totp-verified)
  auth/2fa/verify/route.ts           → POST (login-time challenge — accepts 6-digit code XOR 10-char backup code, marks sessions.totp_verified_at)
  auth/2fa/disable/route.ts          → POST (re-verify code, then wipe secret + all backup codes; 403 TOTP_REQUIRED_BY_ADMIN when REQUIRE_2FA=true)
  auth/2fa/regenerate-backup-codes/route.ts → POST (re-verify code, replace all 10 backup codes; backup codes not accepted as auth here)
  auth/passkey/register/options/route.ts    → POST (generate WebAuthn registration options, stash challenge in signed cookie; session required)
  auth/passkey/register/verify/route.ts     → POST (verify attestation, persist to `authenticators` table; session required)
  auth/passkey/login/options/route.ts       → POST (passwordless primary login — discoverable credentials assertion options, public endpoint, rate-limited by IP)
  auth/passkey/login/verify/route.ts        → POST (verify assertion, create Auth.js session row with `second_factor_verified_at = now()`, set session cookie — public endpoint)
  auth/passkey/second-factor/options/route.ts → POST (assertion options for a known user — allow-list scoped; session required)
  auth/passkey/second-factor/verify/route.ts  → POST (verify assertion, mark current session as second-factor-verified; session required)
  auth/passkey/[id]/route.ts                → PATCH (rename credential), DELETE (revoke credential; blocks last-factor removal when REQUIRE_2FA=true)
  auth/sessions/route.ts                   → GET (list all active sessions with device info, IP, timestamps; 30/min)
  auth/sessions/[id]/route.ts              → DELETE (revoke session by SHA-256 hash ID; blocks current session revocation; 10/min)
  auth/sessions/revoke-others/route.ts     → POST (revoke all sessions except current; 5/min)
  tasks/route.ts                     → GET (list, ?topicId/type/completed filters), POST (create)
  tasks/[id]/route.ts                → GET (single), PATCH (update), DELETE
  tasks/[id]/complete/route.ts       → POST (complete + award coins, body: {timezone?}), DELETE (uncomplete + refund)
  tasks/[id]/snooze/route.ts         → POST (snooze until date, body: {snoozedUntil}), DELETE (unsnooze/wake up)
  tasks/bulk/route.ts                → PATCH (bulk action on multiple tasks: delete/complete/changeTopic/setPriority; body: BulkTaskActionInput discriminated union; 10/min; bulk-complete skips gamification)
  tasks/[id]/breakdown/route.ts      → POST (split task into subtasks under new topic)
  topics/route.ts                    → GET (list with task counts), POST (create)
  topics/[id]/route.ts               → GET (with tasks sorted by sortOrder), PATCH, DELETE
  topics/[id]/reorder/route.ts       → PUT (reorder tasks within topic, body: {taskIds: string[]})
  topics/import-template/route.ts    → POST (import a curated topic template; body: {templateKey: "moving"|"taxes"|"fitness"}, resolves titles via current UI locale, creates topic + tasks atomically, 10/min)
  calendar/[token]/route.ts          → GET (public iCal feed; token in path IS the auth, `.ics` suffix stripped; 60/min per token; unknown/revoked tokens → 404, not 401)
  settings/calendar-feed/route.ts    → GET (status), POST (create or rotate token, returns plaintext URL once), DELETE (revoke). 2FA-verified session required for the mutation methods
  daily-quest/route.ts               → GET (fetch today's quest, returns completed quest all day), POST (force new quest)
  daily-quest/postpone/route.ts      → POST (postpone quest, body: {taskId, timezone?}, enforces daily limit)
  daily-quest/restore/route.ts       → POST (pin a specific task as today's quest — used as Undo for the energy auto-reroll, body: {taskId, timezone?})
  energy-checkin/route.ts            → POST (record daily energy level + auto-reroll quest if mismatched via reselectQuestForEnergy; body: {energyLevel, timezone?}; returns {quest, swapped, previousQuestId?, previousQuestTitle?})
  wishlist/route.ts                  → GET (list), POST (create)
  wishlist/[id]/route.ts             → PATCH, DELETE
  wishlist/[id]/buy/route.ts         → POST (mark purchased, deduct coins)
  wishlist/[id]/discard/route.ts     → POST (discard item)
  settings/budget/route.ts           → GET/PATCH (monthly coin budget)
  push/subscribe/route.ts            → POST (register/upsert Web Push subscription), PATCH (update reminder preferences: notificationTime, timezone, dueTodayReminderEnabled, recurringDueReminderEnabled, morningBriefingEnabled, morningBriefingTime), DELETE (remove subscription by endpoint)
  push/test/route.ts                 → POST (send test push notification)
  cron/route.ts                      → POST (unified cron dispatcher — runs all jobs from lib/cron.ts, protected by CRON_SECRET)
  health/route.ts                    → GET (liveness probe, returns 200 OK)
  admin/seed/route.ts                → POST (seed demo data — dev/staging only)
  auth/link-request/route.ts         → POST (initiate OAuth account linking flow)
  auth/link-callback/route.ts        → GET (complete OAuth account linking by token)
  user/export/route.ts               → GET (GDPR data export as JSON download)
  user/profile/route.ts              → GET (profile: name, email, image), PATCH (update profile: name, email, avatar with server-side resize)
  user/route.ts                      → GET (user stats: coins, level, streakCurrent, streakShieldAvailable), DELETE (full account deletion)
  locale/route.ts                    → POST (set UI locale cookie)
  settings/quest/route.ts            → GET (current quest settings), PATCH (save quest settings: postpone limit, emotional closure toggle)
  settings/timezone/route.ts         → GET (user's stored IANA timezone), PATCH (update timezone; 10/min; validates via Intl.DateTimeFormat)
  settings/notification-channels/route.ts     → GET (list channels), PUT (upsert channel)
  settings/notification-history/route.ts      → GET (last 50 notification delivery attempts for the user)
  settings/vacation-mode/route.ts    → GET (vacation status), PATCH (activate/deactivate vacation mode; 10/min; sets pausedAt/pausedUntil on all RECURRING tasks, shifts nextDueDate on deactivation)
  settings/notification-channels/[type]/route.ts → DELETE (remove channel)
  settings/notification-channels/[type]/test/route.ts → POST (send test notification)
  onboarding/complete/route.ts       → POST (mark onboarding as completed; 10/min)
  openapi.json/route.ts              → GET (OpenAPI 3.1.0 spec, public)
globals.css     → Design system CSS variables, Tailwind v4, Google Fonts
layout.tsx      → Root layout: ThemeProvider (next-themes), font variables, root SEO metadata (metadataBase, OG, Twitter Cards, robots)
page.tsx        → Landing page (unauthenticated) or redirect to /dashboard (authenticated). Embeds SoftwareApplication JSON-LD inline for rich snippets
robots.ts       → Typed Next.js MetadataRoute.Robots — generates /robots.txt at request time. Allows public marketing surface, disallows /api/*, /api-docs, /login/2fa, /setup/, all authenticated app routes. Sitemap URL built from clientEnv.NEXT_PUBLIC_APP_URL
sitemap.ts      → Typed Next.js MetadataRoute.Sitemap — generates /sitemap.xml. One entry per public route (/, /login, /impressum, /datenschutz). Cookie-based i18n means no per-locale fan-out and no hreflang
icon.svg, apple-icon.svg, favicon.ico → Auto-mapped by Next.js into <head> link tags — do not duplicate in metadata
```

## Patterns
- Route groups `(app)` and `(auth)` don't affect URL paths
- API routes: always auth-check first, validate with Zod, call lib function, return `{ data }` or `{ error: string }`
- Server Components by default; add `"use client"` only when needed (interactivity, hooks)
- New API routes get a JSDoc block describing method, auth, body, response
