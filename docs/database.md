# Database

Momo uses **PostgreSQL 18** with **Drizzle ORM** for all database operations.

## Schema Overview

| Table | Description |
|---|---|
| `users` | Core user table — populated on first OAuth login |
| `accounts` | Auth.js adapter table — OAuth account links |
| `sessions` | Auth.js adapter table — active sessions |
| `verification_tokens` | Auth.js adapter table — magic link tokens |
| `topics` | User-defined project buckets |
| `tasks` | All tasks (one-time, recurring, daily-eligible) |
| `task_completions` | Log of every task completion event |
| `wishlist_items` | Items a user wants to buy |
| `achievements` | Master list of available achievements |
| `user_achievements` | Junction: which achievements a user has earned |

The full schema is defined in `/lib/db/schema.ts`.

## Running Migrations

### Local development

```bash
# Start the database
docker compose up db -d

# Generate a migration from the current schema
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate
```

### Docker (production)

```bash
docker compose exec app npx drizzle-kit migrate
```

## Drizzle Studio (GUI)

```bash
npx drizzle-kit studio
```

Opens a web-based database browser at `http://localhost:4983`.

## Connection

The database is configured via the `DATABASE_URL` environment variable:

```
DATABASE_URL=postgresql://momo:password@localhost:5432/momo
```

See [Environment Variables](./environment-variables.md) for full reference.
