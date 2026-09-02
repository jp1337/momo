# scripts/

## Purpose
One-off operational scripts run outside the Next.js app context.

## Contents
- `migrate.mjs` — Production database migration runner. Detects pre-existing schema, verifies each migration's DB objects before seeding `drizzle.__drizzle_migrations`, removes stale tracking entries. Run via `docker compose exec app node scripts/migrate.mjs` or as the container entrypoint.
- `check-design-tokens.mjs` — Design-token ratchet (`npm run check:design`, CI PR gate). Scans `app/` and `components/` for four regex categories — hardcoded color, radius outside the four tokens, `style={{ … }}` (NOT `style={obj}` — a named object literal is invisible to this regex; see the comment at the top of the script and `docs/design-system.md`), spacing utilities outside the 4·8·12·16·24·32·48·72px scale — and compares per-file counts against `design-baseline.json`. The count may only fall; `--update` refuses any increase, even for a file with no prior entry. `--admit <path>` records one deliberate new exception explicitly (visible in shell history/CI logs) rather than as a silent side effect of `--update`. `--selftest` verifies the regexes themselves inject-and-detect each violation category. Run bare to check, or see the script's own header comment for `--update`/`--admit`/`--selftest`
- `design-baseline.json` — The ratchet's per-file baseline counts, read/written by `check-design-tokens.mjs`. Only ever edited via that script, never by hand
- `check-i18n.mjs` — `npm run check:i18n`, CI PR gate. Prueft beide Richtungen und berichtet drei Kategorien auf **jedem** Lauf, auch mit null Befunden (sonst ist "gruen" nicht von "ungeprueft" zu unterscheiden): `MISSING` (im Code als Literal referenziert, fehlt in einer der sieben Locales), `FAMILY` (aus einer codeseitigen Aufzaehlung erwartet, fehlt in einer Locale), `ORPHAN` (steht in `messages/*.json`, wird von keiner Zeile referenziert und ist kein Familienmitglied). Exit 0 nur, wenn alle drei leer sind. Ein `ORPHAN` ist **nicht** automatisch loeschbar: er ist entweder toter Text oder eine Uebersetzung, deren Verdrahtung fehlt
- `i18n-key-families.mjs` — Das Familienregister zu `check-i18n.mjs`. Eine Familie sind Keys, die im Code nur per Template-Literal entstehen (``t(`catalog.${key}.title`)``) und die ein Literal-Scan darum nicht sehen kann. `members()` MUSS aus einer codeseitigen Aufzaehlung ableiten (`ACHIEVEMENT_DEFINITIONS`, `LEVELS`, `VALID_TABS`, `TEMPLATES`, `pgEnum`s aus `lib/db/schema.ts`), nie aus den Locale-Dateien — sonst prueft die Familie sich selbst. Eine Familie ohne echte Aufrufstelle ist keine Familie, sondern ein Fund. `__tests__/check-i18n.test.ts` sichert die Ableitung ab

## Patterns
- Scripts use ESM (`.mjs`) to match the project's module format
- Database connection comes from `DATABASE_URL` environment variable
- Never run `drizzle-kit push` in production — always use this migration runner
