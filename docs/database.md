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
| `achievements` | Master list of available achievements (seeded once) |
| `user_achievements` | Junction table: which achievements each user has earned |
| `api_keys` | Personal Access Tokens for programmatic API access |
| `linking_requests` | Short-lived tokens for OAuth account linking |
| `cron_runs` | Log of push-notification cron job executions (30-day retention) |
| `quest_postponements` | Log of daily quest postponement events (for weekly review analytics) |

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
| `monthly_budget` | decimal | Wishlist monthly budget |
| `notification_enabled` | boolean | Push notifications enabled |
| `notification_time` | time | Daily reminder time (24h, e.g. `08:00`) |
| `push_subscription` | jsonb | Browser Web Push subscription object |
| `theme` | enum | UI theme preference: `light`, `dark`, `system` |
| `quest_postpones_today` | integer | Number of quest postponements the user has used today |
| `quest_postponed_date` | date | Date of the last postpone (used to reset the daily counter) |
| `quest_postpone_limit` | integer | Max daily postponements the user allows themselves (1–5, default 3) |
| `total_tasks_created` | integer | Immutable cumulative counter — incremented on every task creation (including via breakdown), never decremented on deletion. Used for statistics. |
| `emotional_closure_enabled` | boolean | Whether to show an affirmation/quote after completing the daily quest (default: true) |
| `energy_level` | enum | Today's self-reported energy level: `HIGH`, `MEDIUM`, `LOW`. Null = not yet checked in today. Reset daily via `energy_level_date` comparison |
| `energy_level_date` | date | Date (YYYY-MM-DD) on which the energy level was last set. Used for daily reset |

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
| `coin_unlock_threshold` | integer | Minimum coins required to mark as bought |

### `quest_postponements`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `task_id` | uuid | FK → tasks (cascade) |
| `postponed_at` | timestamp (tz) | When the postponement happened |

One row is inserted each time the user postpones their daily quest. Used by the weekly review feature to compute "postponements this week". Historical data starts accumulating from the migration date forward.

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
