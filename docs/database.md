# Database

Momo uses **PostgreSQL 18** with **Drizzle ORM** for all database operations.

The full schema is defined in `lib/db/schema.ts`.

---

## Schema Overview

### Application Tables

| Table | Description |
|---|---|
| `users` | Core user table — populated on first OAuth login |
| `topics` | User-defined project buckets (e.g. "Tax Return", "Moving") |
| `tasks` | All tasks: one-time, recurring, and daily-quest-eligible |
| `task_completions` | Log of every task completion event |
| `wishlist_items` | Things the user wants to buy, with optional coin-gating |
| `achievements` | Master list of 31 achievements with rarity (common/rare/epic/legendary), coin_reward, and secret flag. Seeded via `seedAchievements()` with upsert |
| `user_achievements` | Junction table: which achievements each user has earned (earnedAt timestamp) |
| `api_keys` | Personal Access Tokens for programmatic API access |
| `linking_requests` | Short-lived tokens for OAuth account linking |
| `cron_runs` | Log of push-notification cron job executions (30-day retention) |
| `quest_postponements` | Log of daily quest postponement events (for weekly review analytics) |
| `notification_channels` | User-configured notification channels (ntfy, pushover, telegram, etc.) |
| `notification_log` | Per-delivery log of every notification attempt (channel, status, error); auto-pruned after 30 days |
| `totp_backup_codes` | One-time recovery codes for TOTP-based 2FA (SHA-256 hashed, single-use) |
| `authenticators` | WebAuthn / Passkey credentials — one row per registered device (Auth.js-compatible schema + Momo display label) |
| `energy_checkins` | Historical log of daily energy check-ins (multiple per day allowed) — drives the Stats page energy block. The cached "today" value also lives on `users.energyLevel` / `users.energyLevelDate` for fast dashboard reads. |

### Auth.js Adapter Tables

| Table | Description |
|---|---|
| `accounts` | OAuth account links (one user → multiple OAuth providers) |
| `sessions` | Active database sessions |
| `verification_tokens` | Magic link / email verification tokens |

All foreign keys referencing `users.id` use `ON DELETE CASCADE` — deleting a user row automatically removes all their data across every table.

---

## Key Column Reference

### `users`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Display name from OAuth provider |
| `email` | text | Email from OAuth provider (unique) |
| `image` | text | Avatar URL from OAuth provider |
| `provider_id` | text | Composite OAuth ID (e.g. `github:12345`) |
| `coins` | integer | Gamification coin balance |
| `level` | integer | Gamification level (1–10) |
| `streak_current` | integer | Current streak in days |
| `streak_max` | integer | All-time maximum streak |
| `streak_last_date` | date | Date of last streak-qualifying action |
| `streak_shield_used_month` | text | Month (YYYY-MM) when the Streak Shield was last consumed. NULL = shield available. Resets naturally when the calendar month changes |
| `monthly_budget` | decimal | Wishlist monthly budget |
| `timezone` | text | IANA timezone identifier (e.g. `Europe/Berlin`, `America/New_York`). Used for all server-side cron jobs (Morning Briefing, Due-Today, Daily Quest, Weekly Review). Settable explicitly via Settings → Timezone or auto-detected from the browser. NULL falls back to UTC |
| `notification_enabled` | boolean | Push notifications enabled |
| `notification_time` | time | Daily reminder time (24h, e.g. `08:00`) |
| `due_today_reminder_enabled` | boolean | Opt-in flag for the "Due today" reminder (default false). When true, the cron dispatcher sends a ping at `notification_time` iff the user has at least one non-completed, non-snoozed task whose `due_date` (or, for RECURRING tasks, `next_due_date`) equals today in the user's timezone. Silent on empty — no "all clear" notifications |
| `recurring_due_reminder_enabled` | boolean | Opt-in flag for per-task recurring due reminders (default false). Sends individual notifications for each RECURRING task whose `next_due_date` is today (≤3 individual, >3 bundled). Suppressed when `morning_briefing_enabled` is true. Uses `notification_time` for delivery timing |
| `morning_briefing_enabled` | boolean | Opt-in daily digest (default false). Consolidates quest, due tasks, streak, and new achievements into one message. Suppresses individual daily-quest and due-today reminders when enabled |
| `morning_briefing_time` | time | Briefing delivery time (24h, default `08:00`). Separate from `notification_time` — users can receive the digest at a different time than individual reminders |
| `push_subscription` | jsonb | Browser Web Push subscription object |
| `theme` | enum | UI theme preference: `light`, `dark`, `system` |
| `quest_postpones_today` | integer | Number of quest postponements the user has used today |
| `quest_postponed_date` | date | Date of the last postpone (used to reset the daily counter) |
| `quest_postpone_limit` | integer | Max daily postponements the user allows themselves (1–5, default 3) |
| `total_tasks_created` | integer | Immutable cumulative counter — incremented on every task creation (including via breakdown), never decremented on deletion. Used for statistics. |
| `emotional_closure_enabled` | boolean | Whether to show an affirmation/quote after completing the daily quest (default: true) |
| `energy_level` | enum | Today's self-reported energy level: `HIGH`, `MEDIUM`, `LOW`. Null = not yet checked in today. Reset daily via `energy_level_date` comparison |
| `energy_level_date` | date | Date (YYYY-MM-DD) on which the energy level was last set. Used for daily reset |
| `totp_secret` | text | TOTP secret encrypted with AES-256-GCM (`iv:tag:cipher`, base64-segmented). NULL when 2FA is off. The plaintext secret is never stored. See [two-factor-auth.md](two-factor-auth.md) |
| `totp_enabled_at` | timestamptz | **Source of truth** for "is 2FA active". NULL means off, even if `totp_secret` is non-NULL |
| `calendar_feed_token_hash` | text (unique) | SHA-256 hash of the user's personal iCal feed token. NULL = no feed active. Plaintext token is shown once at creation and never persisted — mirrors the `api_keys` pattern. See [api.md](api.md#calendar-feed-routes) |
| `calendar_feed_token_created_at` | timestamptz | Timestamp when the current feed token was generated. Displayed in the settings UI ("active since …") |
| `onboarding_completed` | boolean | Whether the user has completed the onboarding wizard. Default `false` for new users. The `(app)` layout gate redirects to `/onboarding` when `false`. Backfill migration sets all pre-existing users to `true` |
| `vacation_end_date` | date | End date of vacation mode (YYYY-MM-DD, inclusive). Null = no active vacation. When set, all RECURRING tasks have `paused_at`/`paused_until` populated. A daily cron job (`vacation-mode-auto-end`) auto-ends vacation once this date has passed |
| `quest_streak_current` | integer | Consecutive days with at least one daily quest completed. Incremented by `updateQuestStreak()` when a daily quest is completed. Reset to 1 on gaps (no shield mechanism). Used for `quest_streak_7` and `quest_streak_30` achievements |
| `quest_streak_last_date` | date | Date (YYYY-MM-DD, user's timezone) of the last daily quest completion. Used to determine streak continuation in `updateQuestStreak()` |

### `sessions` (extended columns)

| Column | Type | Description |
|---|---|---|
| `second_factor_verified_at` | timestamptz | Per-session second-factor verification timestamp (TOTP, backup code, or passkey assertion). NULL on every fresh OAuth session until the user passes the `/login/2fa` challenge. The `(app)` layout gate redirects to `/login/2fa` when `userHasSecondFactor(userId)` is true and this is NULL. Sessions created by the passwordless-passkey primary login flow are inserted with this column already set because a passkey is inherently MFA. *(Historically named `totp_verified_at`; renamed in migration `0015_passkeys` when Passkey support landed.)* |
| `created_at` | timestamptz | When the session was created. NULL for legacy sessions created before migration `0026`. Populated on first request for OAuth sessions, or immediately for passkey login sessions |
| `last_active_at` | timestamptz | Last time session metadata was refreshed (throttled to ~1h intervals via in-memory map). NULL for legacy sessions |
| `user_agent` | text | Raw User-Agent header captured on login or first request. Used to derive browser/OS labels in the "Active Sessions" settings UI |
| `ip_address` | text | Client IP (from `x-forwarded-for` / `x-real-ip` / direct connection). Displayed in the "Active Sessions" settings UI |

### `totp_backup_codes`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `code_hash` | text | SHA-256 hex digest of the plaintext code. Mirrors the `api_keys.key_hash` pattern — codes are high-entropy, so plain SHA-256 is sufficient (no per-row salt) |
| `used_at` | timestamptz | Set when the code is consumed. NULL means the code is still valid. Codes are single-use to prevent replay |
| `created_at` | timestamptz | When the code was issued |

10 codes are generated per setup or regeneration. Codes are 10 characters
from the unambiguous alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no
`I`/`O`/`0`/`1`).

### `authenticators`

WebAuthn / Passkey credentials. One row per registered device. Schema is
compatible with the Auth.js adapter's `authenticators` table plus Momo
additions for a display label and usage tracking.

| Column | Type | Description |
|---|---|---|
| `credential_id` | text | Credential ID returned by the authenticator (base64url). Unique across all users |
| `user_id` | uuid | FK → users (cascade) |
| `provider_account_id` | text | Mirrors the Auth.js column. Always equal to `credential_id` because Momo does not use the Auth.js Passkey provider |
| `credential_public_key` | text | COSE-encoded public key (base64url). Fed back into `verifyAuthenticationResponse` on every assertion |
| `counter` | integer | Signature counter — incremented on every successful assertion. A non-monotonic counter signals a cloned authenticator and fails verification |
| `credential_device_type` | text | `singleDevice` (hardware-bound, e.g. a physical security key) or `multiDevice` (synced via a cloud keychain like iCloud Keychain) |
| `credential_backed_up` | boolean | Whether the credential is backed up to the platform's cloud keychain |
| `transports` | text | Comma-separated list of `AuthenticatorTransport` values (`internal`, `hybrid`, `usb`, `nfc`, `ble`, `cable`, `smart-card`). Hints to the browser which channels to try |
| `name` | text | User-provided display label ("iPhone", "YubiKey 5C"). NULL when the user skipped the name prompt |
| `created_at` | timestamptz | When the credential was registered |
| `last_used_at` | timestamptz | Last successful assertion — used to show "last used" in settings |

Primary key: composite `(user_id, credential_id)`. A `UNIQUE` constraint
on `credential_id` ensures no two users share the same credential.

Presence of at least one row in this table counts as a registered second
factor for `lib/totp.ts::userHasSecondFactor` and therefore for the
`(app)` layout enforcement gate.

### `tasks`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `topic_id` | uuid | FK → topics (set null on topic deletion) |
| `title` | text | Task title |
| `type` | enum | `ONE_TIME`, `RECURRING`, `DAILY_ELIGIBLE` |
| `priority` | enum | `HIGH`, `NORMAL`, `SOMEDAY` |
| `recurrence_interval` | integer | Days between recurrences (RECURRING only) |
| `due_date` | date | User-set due date |
| `next_due_date` | date | Computed next due for recurring tasks |
| `completed_at` | timestamp | Set when ONE_TIME task is completed |
| `coin_value` | integer | Coins awarded on completion (1–10) |
| `notes` | text | Optional free-text notes on the task |
| `is_daily_quest` | boolean | Currently selected as today's daily quest |
| `daily_quest_date` | date | Date (YYYY-MM-DD) on which this task was last assigned as the daily quest — used to reset stale incomplete quests each day so the same task does not repeat |
| `postpone_count` | integer | How many times this task has been postponed as a quest |
| `estimated_minutes` | integer | Optional time estimate: 5, 15, 30, or 60 minutes |
| `snoozed_until` | date | Date (YYYY-MM-DD) until which this task is hidden from all active views. Null = visible. When snoozed_until <= today, the task reappears automatically |
| `energy_level` | enum | Energy required: `HIGH`, `MEDIUM`, `LOW`. Null = matches any energy level. Used by the daily quest algorithm to prefer tasks matching the user's daily check-in |
| `sort_order` | integer | Position within a topic (0-based). Lower values appear first. Auto-assigned on creation; updated by the reorder endpoint |
| `paused_at` | date | Date (YYYY-MM-DD) when this task was paused (vacation mode). Null = not paused. Used to compute the actual pause duration when deactivating vacation mode |
| `paused_until` | date | Date (YYYY-MM-DD, inclusive) until which this task is paused. Null = active. Paused tasks are excluded from daily quest, due-today notifications, and iCal feed. Unlike snooze, pause also shifts `next_due_date` on deactivation and excludes the period from habit streak calculations |

### `topics`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `title` | text | Topic name |
| `color` | text | Optional hex/CSS color for UI |
| `icon` | text | Font Awesome icon key (e.g. `"folder"`, `"camera"`) — resolved via `resolveTopicIcon()` |
| `priority` | enum | `HIGH`, `NORMAL`, `SOMEDAY` — influences quest selection |
| `archived` | boolean | Hidden from main view |
| `sequential` | boolean | Opt-in flag. When `true`, only the first still-open task in this topic (lowest `sort_order`, not snoozed) is eligible for daily quest selection — later tasks are implicitly blocked until earlier ones are completed. Default `false` |
| `default_energy_level` | enum | Optional `HIGH`/`MEDIUM`/`LOW` default — new tasks created in this topic inherit this value when the user does not pick one explicitly. Existing tasks are not retro-tagged when this changes |

### `energy_checkins`

Historical log of every energy self-assessment. Multiple rows per user per day are explicitly allowed (re-check-ins). The "current" value is the row with the largest `created_at` for `date = today`. The cached current value also lives on `users.energyLevel` / `users.energyLevelDate` for fast dashboard reads — this table exists for the Stats page weekly block and future pattern analyses.

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `date` | date | Local date (YYYY-MM-DD) in the user's timezone at check-in time. Stored as the user's local day, not UTC, so calendar-day grouping in the Stats view is correct for users east/west of UTC |
| `energy_level` | enum | The reported level: `HIGH`, `MEDIUM`, or `LOW` |
| `created_at` | timestamptz | Wall-clock UTC timestamp — used for time-of-day analyses |

Index `energy_checkins_user_date_idx` on `(user_id, date)` supports the "what is today's level?" lookup and the per-day collapse logic in `getEnergyHistory()`.

### `wishlist_items`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `title` | text | Item name |
| `price` | decimal | Price (currency-neutral) |
| `url` | text | Optional product URL |
| `priority` | enum | `WANT`, `NICE_TO_HAVE`, `SOMEDAY` |
| `status` | enum | `OPEN`, `BOUGHT`, `DISCARDED` |
| `coin_unlock_threshold` | integer | Minimum coins required to mark as bought; coins are atomically deducted on purchase and refunded on undo |

### `quest_postponements`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `task_id` | uuid | FK → tasks (cascade) |
| `postponed_at` | timestamp (tz) | When the postponement happened |

One row is inserted each time the user postpones their daily quest. Used by the weekly review feature to compute "postponements this week". Historical data starts accumulating from the migration date forward.

### `notification_channels`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `type` | text | Channel type identifier: `"ntfy"`, `"pushover"`, `"telegram"`, `"email"`, `"webhook"` |
| `config` | jsonb | Channel-specific configuration (see below) |
| `enabled` | boolean | Whether this channel is currently active |
| `created_at` | timestamp (tz) | When the channel was configured |
| `updated_at` | timestamp (tz) | When the channel was last modified |

**Unique constraint:** `(user_id, type)` — one channel per type per user.

**Config shapes by type:**
- `ntfy`: `{ "topic": "my-momo", "server": "https://ntfy.sh" }` (server optional, defaults to ntfy.sh)
- `pushover`: `{ "userKey": "...", "appToken": "..." }`
- `telegram`: `{ "botToken": "<bot_id>:<secret>", "chatId": "987654321" }`
- `email`: `{ "address": "you@example.com" }` (SMTP credentials live in `SMTP_*` env vars on the instance)
- `webhook`: `{ "url": "...", "secret": "..." }` (future)

Adding new channel types requires no schema migration — only new code in `lib/notifications.ts` and `lib/validators/index.ts`.

### `notification_log`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `channel` | text | Delivery channel: `"web-push"`, `"ntfy"`, `"pushover"`, `"telegram"`, `"email"` |
| `title` | text | Notification title as shown to the user |
| `body` | text | Notification body (nullable) |
| `status` | text | Delivery outcome: `"sent"` or `"failed"` |
| `error` | text | Error message when status is `"failed"`; null on success |
| `sent_at` | timestamp (tz) | When the delivery attempt was made |

**Index:** `(user_id, sent_at)` — covers the Settings history query (last 50 per user) and the cleanup DELETE.

**Retention:** The `notification-log-cleanup` daily cron job deletes rows older than 30 days.

**Logging is fire-and-forget:** a failed DB insert never blocks or fails the actual notification delivery.

---

## Migrations

Migrations run **automatically** at container startup via `scripts/migrate.mjs`, which is called by `docker-entrypoint.sh` before the Next.js server starts. The script is idempotent: it reconciles the Drizzle migration-tracking table against the actual database schema before calling `migrate()`.

### Creating a new migration (after schema changes)

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate the migration SQL
npx drizzle-kit generate
# 3. Review the generated drizzle/NNNN_*.sql file
# 4. Commit schema.ts + migration SQL + drizzle/meta/
git add lib/db/schema.ts drizzle/
```

> **Never edit `.sql` migration files after they have been applied to any environment.**

### Applying migrations manually (local development)

```bash
# Start the database first
docker compose up db -d

# Apply pending migrations (reads DATABASE_URL from environment)
DATABASE_URL=postgres://... npx drizzle-kit migrate
```

### Production / Kubernetes

Migrations run automatically on container start. To trigger manually:

```bash
# Docker Compose
docker compose exec app node scripts/migrate.mjs

# Kubernetes
kubectl exec -n momo deployment/momo-app -- node scripts/migrate.mjs
```

---

## Drizzle Studio (GUI)

```bash
npx drizzle-kit studio
```

Opens a web-based database browser at `http://localhost:4983`.

---

## Connection

Configured via the `DATABASE_URL` environment variable:

```
DATABASE_URL=postgresql://momo:password@localhost:5432/momo
```

See [Environment Variables](./environment-variables.md) for full reference.
