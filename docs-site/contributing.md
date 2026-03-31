---
layout: default
title: Contributing
description: How to contribute to Momo — dev setup, code conventions, and PR process.
---

# Contributing to Momo

Momo is open source and contributions are welcome. This guide covers how to set up a development environment, the code conventions to follow, and how to submit changes.

---

## Development Environment Setup

### Prerequisites

- **Node.js 20+**
- **npm** (included with Node.js)
- **Docker** (for the PostgreSQL database)
- **Git**

### Step 1 — Fork and clone

Fork the repository on GitHub, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/momo.git
cd momo
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment variables

```bash
cp .env.example .env.local
```

Minimum required for development:

```env
DATABASE_URL=postgresql://momo:password@localhost:5432/momo
AUTH_SECRET=any-random-string-at-least-32-chars
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

### Step 4 — Start the database

```bash
docker compose up db -d
```

### Step 5 — Run migrations

```bash
npx drizzle-kit migrate
```

### Step 6 — Start the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000) with hot reload.

### Useful commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx drizzle-kit studio   # Open Drizzle Studio (DB browser at :4983)
npx drizzle-kit generate # Generate a migration from schema changes
npx drizzle-kit migrate  # Apply pending migrations
```

---

## Code Conventions

### Language

**TypeScript throughout.** No JavaScript files unless absolutely unavoidable. Strict mode is enabled in `tsconfig.json`.

### TypeScript Rules

- No `any` types — use `unknown` and narrow with type guards
- All API inputs validated with **Zod** schemas in `lib/validators/`
- All database queries through **Drizzle ORM** — no raw SQL in application code
- Exported functions must have JSDoc comments

### File Structure

```
app/          ← Next.js App Router (routes, pages, API routes)
lib/          ← Business logic, database, utilities
  db/         ← Drizzle schema and database client
  validators/ ← Zod schemas for API input validation
components/   ← React components (presentational)
```

**Rule of thumb:**
- Business logic lives in `lib/`, not in components or API routes
- API routes are thin: validate → call lib function → return response
- Components only render UI — no business logic

### Error Handling

API routes always return consistent JSON:

```typescript
// Success
return Response.json({ data: result })

// Error
return Response.json(
  { error: "Human-readable message", code: "MACHINE_CODE" },
  { status: 400 }
)
```

Never expose stack traces to the client. Log errors server-side.

### Documentation

Every contribution must include documentation:

- **Exported functions** — JSDoc comment with `@param` and `@returns`
- **API routes** — comment block at the top with method, path, auth requirements, body, and response
- **New environment variables** — add to `.env.example` with a comment, and update `docs/environment-variables.md`
- **New features** — update the relevant file in `docs/`

---

## Commit Message Format

Momo uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, CSS (no logic change) |
| `refactor` | Code restructuring without behavior change |
| `chore` | Build config, dependencies, tooling |
| `test` | Adding or updating tests |
| `db` | Database schema or migration changes |

Common scopes: `auth`, `tasks`, `topics`, `recurring`, `daily-quest`, `gamification`, `wishlist`, `push`, `pwa`, `ui`, `db`, `api`, `deploy`, `docs`, `config`

Examples:

```
feat(tasks): add task priority field with high/medium/low options
fix(daily-quest): correct algorithm to skip completed recurring tasks
docs(api): document new push notification endpoints
db(schema): add priority column to tasks table
```

---

## Submitting a Pull Request

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** — keep commits small and atomic.

3. **Verify the build passes:**
   ```bash
   npm run build
   npm run lint
   ```

4. **Push your branch:**
   ```bash
   git push origin feat/your-feature-name
   ```

5. **Open a pull request** against `main` on GitHub.

6. In the PR description, include:
   - What the change does
   - Why it's needed
   - How to test it
   - Screenshots for UI changes

---

## Reporting Issues

Found a bug or have a feature request? Open an issue on [GitHub Issues](https://github.com/jp1337/momo/issues).

For bugs, include:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, browser, Docker version)
- Relevant logs or screenshots

---

## Code of Conduct

Be kind. This project is built to help people who struggle — the contributors are often the same people. Treat everyone with patience and respect.

---

## License

By contributing to Momo, you agree that your contributions will be licensed under the [MIT License](https://github.com/jp1337/momo/blob/main/LICENSE).
