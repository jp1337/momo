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
| `is_daily_quest` | boolean | Currently selected as today's daily quest |

### `topics`

| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (cascade) |
| `title` | text | Topic name |
| `color` | text | Optional hex/CSS color for UI |
| `icon` | text | Optional emoji identifier |
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

---

## Migrations

> **Important:** Migrations do not run automatically on startup. They must be run explicitly after deploying schema changes.

### Local development

```bash
# Start the database
docker compose up db -d

# Generate a new migration from the current schema
npx drizzle-kit generate

# Apply all pending migrations
npx drizzle-kit migrate
```

### Docker Compose (production)

```bash
docker compose exec app npx drizzle-kit migrate
```

### Kubernetes

```bash
kubectl exec -n momo deployment/momo-app -- npx drizzle-kit migrate
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
