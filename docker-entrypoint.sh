#!/bin/sh
# docker-entrypoint.sh
#
# Runs database migrations before starting the Next.js server.
# Migrations are applied via scripts/migrate.mjs (drizzle-orm programmatic API)
# which is safe in non-interactive shells, unlike `drizzle-kit migrate`.
#
# If migrations fail the container exits immediately so the broken state
# is visible in `docker compose logs` / Kubernetes pod logs.

set -e

echo "[entrypoint] Running database migrations..."
node scripts/migrate.mjs

echo "[entrypoint] Starting Next.js server..."
exec node server.js
