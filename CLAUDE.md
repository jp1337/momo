# Momo – Agent Rules & Development Guidelines

This file defines the rules and conventions for AI-assisted development of Momo.
Every AI agent working on this codebase **must** follow these guidelines without exception.

---

## 🧭 Project Context

- **App:** Momo – a task management app for people with avoidance tendencies and procrastination
- **Repository:** `github.com/jp1337/momo`
- **Developer:** jp1337
- **Development environment:** WSL (Windows Subsystem for Linux), VS Code
- **Active branch:** `main` (all development happens directly on main)
- **Language:** TypeScript throughout. No JavaScript files unless absolutely unavoidable.
- **Package manager:** npm

---

## 🌿 Git Conventions

### Branch Strategy

```
main        ← all development and releases happen here
```

**Always commit directly to `main`.** No feature branches needed.

### Commit After Every Meaningful Change

The agent **must** commit changes to Git after completing any logical unit of work.
Do not accumulate large uncommitted changes. Small, atomic commits are preferred.

```bash
# Always stage and commit after completing a feature, fix, or documentation update
git add .
git commit -m "<type>(<scope>): <short description>"
```

### Commit Message Convention (Conventional Commits)

Format: `<type>(<scope>): <description>`

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `docs` | Documentation only (README, CLAUDE.md, docs/, comments) |
| `style` | Formatting, CSS changes (no logic change) |
| `refactor` | Code restructuring without behavior change |
| `chore` | Build config, dependencies, CI/CD, tooling |
| `test` | Adding or updating tests |
| `db` | Database schema or migration changes |

**Examples:**

```
feat(auth): add GitHub OAuth provider via Auth.js v5
feat(tasks): implement task CRUD API routes with Zod validation
fix(daily-quest): correct algorithm priority order for recurring tasks
docs(env): document all environment variables in .env.example
chore(docker): add multi-stage Dockerfile with non-root user
db(schema): add push_subscription column to users table
style(dashboard): apply dark/light mode CSS variables to task cards
```

### Commit Scope Reference

| Scope | Area |
|---|---|
| `auth` | Authentication, sessions, OAuth |
| `tasks` | Task creation, editing, completion |
| `topics` | Topics and subtasks |
| `recurring` | Recurring task logic |
| `daily-quest` | Daily quest algorithm and UI |
| `gamification` | Coins, streaks, levels, animations |
| `wishlist` | Wishlist and budget features |
| `push` | Web Push / VAPID notifications |
| `pwa` | PWA manifest, service worker |
| `ui` | Shared UI components |
| `db` | Database schema, migrations |
| `api` | API routes |
| `deploy` | Docker, Kubernetes, CI/CD |
| `docs` | Documentation |
| `config` | Configuration files |

---

## 📝 Documentation Obligation

**Everything that is built must be documented. No exceptions.**

Documentation is not an afterthought — it is written alongside the code, in the same commit or immediately after.

### 1. Code Documentation

- Every **exported function** gets a JSDoc comment explaining what it does, its parameters, and its return value.
- Every **API route** gets a brief comment block at the top describing the endpoint, method, auth requirements, and expected input/output.
- Every **database schema table/column** gets an inline comment if the purpose is not immediately obvious.
- Every **complex algorithm** (e.g. daily quest selection, gamification logic) gets a detailed explanation comment above the implementation.

**Example — API Route:**
```typescript
/**
 * POST /api/tasks
 * Creates a new task for the authenticated user.
 * Requires: authentication
 * Body: CreateTaskInput (validated with Zod)
 * Returns: { task: Task } | { error: string }
 */
```

**Example — Function:**
```typescript
/**
 * Selects the daily quest task for a user.
 * Priority order:
 *   1. Oldest overdue task
 *   2. High-priority topic subtask
 *   3. Due recurring task
 *   4. Random open task from pool
 *
 * @param userId - The user's UUID
 * @returns The selected Task, or null if no tasks exist
 */
```

### 2. Environment Variables

Every time a **new environment variable** is introduced:

1. Add it to `.env.example` with a descriptive comment
2. Document it in `docs/environment-variables.md` with type, default value, and description

### 3. API Documentation (`docs/api.md`)

Every API route must be listed in `docs/api.md` with:
- Method & path
- Authentication required (yes/no)
- Request body schema
- Response schema
- Example request/response

### 4. Feature Documentation (`docs/`)

When a **phase or major feature** is completed, update or create the relevant doc file:

| Feature completed | Update this file |
|---|---|
| Auth setup | `docs/oauth-setup.md` |
| Database schema change | `docs/database.md` |
| New environment variables | `docs/environment-variables.md` |
| Docker / deployment change | `docs/deployment.md` |
| Kubernetes change | `docs/kubernetes.md` |
| New user-facing feature | `docs/features.md` |
| API route added/changed | `docs/api.md` |

### 5. README Project Status Table

After completing each phase, update the project status table in `README.md`:

```markdown
| Phase 1 – Foundation | ✅ Done | Next.js setup, Auth, DB schema |
```

### 6. CHANGELOG.md

Maintain a `CHANGELOG.md` in the root. Add an entry for every commit that touches user-facing functionality or infrastructure:

```markdown
## [Unreleased]

### Added
- GitHub OAuth login via Auth.js v5
- Dark/Light mode toggle with system preference detection

### Changed
- ...

### Fixed
- ...
```

---

## 🏗️ Code Architecture Rules

### File & Folder Conventions

- All source code lives under `app/` (Next.js App Router) and `lib/`
- Business logic goes in `lib/`, not in API routes or components
- API routes are thin: validate input → call lib function → return response
- Components are dumb: receive props → render UI → emit events upward
- No business logic in components

### TypeScript Rules

- Strict mode enabled (`"strict": true` in tsconfig)
- No `any` types — use `unknown` and narrow if necessary
- All API inputs validated with **Zod** schemas in `lib/validators/`
- All database queries go through **Drizzle ORM** — no raw SQL strings in application code (migrations are the exception)

### Error Handling

- API routes always return consistent error responses: `{ error: string, code?: string }`
- Use try/catch in all async API route handlers
- Log errors server-side; never expose stack traces to the client

### Environment Variables

- Never hardcode secrets, domains, or environment-specific values
- All env vars accessed via a typed wrapper in `lib/env.ts` (validated at startup with Zod)
- Client-side env vars must be prefixed with `NEXT_PUBLIC_`

---

## 🎨 Design & UI Rules

- Use CSS variables defined in `globals.css` for all colors — never hardcode hex values in components
- Dark and light mode must both work correctly for every new component
- Responsive design is mandatory: test at 375px (mobile) and 1280px (desktop) minimum
- Animations via Framer Motion for complex interactions, CSS-only for simple hover/focus states
- Font usage: `--font-display` (Lora) for headings, `--font-body` (JetBrains Mono) for task text, `--font-ui` (DM Sans) for UI elements

---

## 🔒 Security Rules

- Never commit `.env.local`, `.env`, or any file containing real credentials
- All API routes that modify data must verify the session (auth check at the top)
- User can only access and modify their own data — always filter by `userId` from session
- Input validation with Zod before any database write
- Rate limiting on all mutation API routes

---

## 🐳 Docker & WSL Notes

- The app is developed in **WSL** — all file paths and shell commands use Linux conventions
- `docker compose` (v2 syntax, no hyphen) is used throughout
- The Dockerfile uses multi-stage builds and runs as a non-root user
- Never bind-mount the entire WSL filesystem into Docker — use named volumes for the database

---

## ✅ Definition of Done (per task/feature)

A feature is only considered done when ALL of the following are true:

- [ ] The feature works correctly
- [ ] TypeScript compiles without errors
- [ ] All new functions/routes have JSDoc comments
- [ ] Relevant `docs/` file(s) have been updated
- [ ] `.env.example` updated if new env vars were added
- [ ] `CHANGELOG.md` updated
- [ ] Changes committed to `dev` branch with a proper Conventional Commit message
- [ ] `README.md` status table updated if a full phase was completed

---

*This file is the source of truth for how this project is developed.*
*If in doubt: document it, commit it, keep it clean.*

---

## 🗂️ Project Structure (Quick Reference)

```
app/
  (app)/          → Authenticated routes: dashboard, tasks, topics, wishlist
  (auth)/         → Unauthenticated routes: login
  api/auth/       → Auth.js v5 catch-all handler
  globals.css     → CSS variables (design system), font imports
  layout.tsx      → Root layout with ThemeProvider

lib/
  auth.ts         → Auth.js v5 config (providers, Drizzle adapter)
  env.ts          → Zod-validated env wrapper — ALL env access goes here
  tasks.ts        → Task business logic (CRUD, complete/uncomplete, coin award)
  topics.ts       → Topic business logic (CRUD, task counts)
  db/
    index.ts      → Drizzle client instance
    schema.ts     → All DB table definitions + relations
  validators/     → Zod schemas for API input validation

components/
  layout/         → Navbar, Sidebar
  ui/             → shadcn/ui base components
  theme-toggle.tsx → Dark/Light/System toggle
  tasks/          → TaskItem, TaskForm, TaskList
  topics/         → TopicCard, TopicForm, TopicsGrid, TopicDetailView

docs/             → Markdown docs (api, database, deployment, oauth, env vars)
public/           → Static assets
```

## 🚫 What to Skip (never read these)

- `node_modules/` — dependencies, never edit
- `.next/` — build output, generated
- `package-lock.json` — auto-managed
- `public/` default SVGs (file.svg, globe.svg, next.svg, vercel.svg, window.svg) — Next.js defaults, not project assets
