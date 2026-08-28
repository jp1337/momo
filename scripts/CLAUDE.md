# scripts/

## Purpose
One-off operational scripts run outside the Next.js app context.

## Contents
- `migrate.mjs` — Production database migration runner. Detects pre-existing schema, verifies each migration's DB objects before seeding `drizzle.__drizzle_migrations`, removes stale tracking entries. Run via `docker compose exec app node scripts/migrate.mjs` or as the container entrypoint.
- `check-design-tokens.mjs` — Design-token ratchet (`npm run check:design`, CI PR gate). Scans `app/` and `components/` for four regex categories — hardcoded color, radius outside the four tokens, `style={{ … }}` (NOT `style={obj}` — a named object literal is invisible to this regex; see the comment at the top of the script and `docs/design-system.md`), spacing utilities outside the 4·8·12·16·24·32·48·72px scale — and compares per-file counts against `design-baseline.json`. The count may only fall; `--update` refuses any increase, even for a file with no prior entry. `--admit <path>` records one deliberate new exception explicitly (visible in shell history/CI logs) rather than as a silent side effect of `--update`. `--selftest` verifies the regexes themselves inject-and-detect each violation category. Run bare to check, or see the script's own header comment for `--update`/`--admit`/`--selftest`
- `design-baseline.json` — The ratchet's per-file baseline counts, read/written by `check-design-tokens.mjs`. Only ever edited via that script, never by hand
- `check-i18n.mjs` — `npm run check:i18n`. Verifies every translation key exists in all seven locales (`messages/*.json`) — fails if any locale is missing a key another locale has

## Patterns
- Scripts use ESM (`.mjs`) to match the project's module format
- Database connection comes from `DATABASE_URL` environment variable
- Never run `drizzle-kit push` in production — always use this migration runner
