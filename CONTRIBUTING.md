# Contributing to Momo

Thank you for your interest in contributing. This document explains how to get up and running and what to do before opening a pull request.

## Development setup

```bash
git clone https://github.com/jp1337/momo.git
cd momo
npm install

# Start the PostgreSQL database
docker compose up db -d

# Copy and configure environment variables
cp .env.example .env.local

# Apply database migrations
npx drizzle-kit migrate

# Start the development server
npm run dev
```

The app is available at `http://localhost:3000`.

## Quality gates

Every pull request must pass all four checks:

```bash
npm test              # integration test suite (real PostgreSQL)
npm run check:i18n    # all translation keys exist in all 5 languages
npx eslint .          # no lint errors
npx tsc --noEmit      # no TypeScript errors
```

## Adding a feature

1. Business logic goes in `lib/` — not in API routes or components.
2. API routes are thin: validate input with Zod → call `lib/` → return response.
3. Every exported function needs a JSDoc comment.
4. New environment variables must be added to `.env.example` and `docs-site/environment-variables.md`.
5. New user-facing copy needs keys in all five `messages/*.json` files (de/en/fr/es/nl). Run `npm run check:i18n` to verify.
6. Update `CHANGELOG.md` under `[Unreleased]` for every user-facing or infrastructure change.

## Adding a translation

1. Open `messages/en.json` and add the key in the correct namespace.
2. Repeat for `de.json`, `fr.json`, `es.json`, `nl.json`.
3. Run `npm run check:i18n` — it should exit 0.

## Adding a test

Tests live in `__tests__/`. Each file maps roughly to one module in `lib/` or one API route group. Use the existing helpers in `__tests__/helpers/` to create test users, topics, and tasks. Tests run against a real PostgreSQL database (`momo_test`) — no mocks for the DB layer.

## Commit convention

Momo uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Tests only |
| `docs` | Documentation |
| `style` | CSS / formatting |
| `refactor` | No behaviour change |
| `chore` | Build, deps, CI |
| `db` | Schema or migration |

Common scopes: `auth`, `tasks`, `topics`, `daily-quest`, `gamification`, `wishlist`, `push`, `ui`, `db`, `api`, `docs`, `config`.

## Good first issues

The [issues list](https://github.com/jp1337/momo/issues?q=is%3Aopen+label%3A%22good+first+issue%22) is tagged with **`good first issue`** for contributions that don't require deep context. See the Contributing section of the README for a table of easy areas to start with.

## Code of conduct

Be kind, be constructive. Momo is a project built for people who struggle — that ethos extends to how we treat each other here.
