# scripts/

## Purpose
One-off operational scripts run outside the Next.js app context.

## Contents
- `migrate.mjs` — Production database migration runner. Detects pre-existing schema, verifies each migration's DB objects before seeding `drizzle.__drizzle_migrations`, removes stale tracking entries. Run via `docker compose exec app node scripts/migrate.mjs` or as the container entrypoint.

## Patterns
- Scripts use ESM (`.mjs`) to match the project's module format
- Database connection comes from `DATABASE_URL` environment variable
- Never run `drizzle-kit push` in production — always use this migration runner
