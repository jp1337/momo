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
- **Feature Roadmap:** `ROADMAP.md` — priorisierte Feature-Ideen und geplante technische Verbesserungen
- **User Documentation:** GitHub Pages unter `jp1337.github.io/momo` (Jekyll, Quellcode in `docs-site/`)

---

## Code Standards

This project uses TypeScript and Markdown as primary languages. Always write new code in TypeScript (not plain JavaScript). Documentation should be in Markdown format.

## UI/CSS Fixes section

When fixing CSS z-index or layout overlap issues, always check ALL overlapping elements (nav bars, button bars, fixed/sticky positioned elements) before proposing a fix. Test the fix mentally against the full component stack.

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

| Type       | When to use                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature or capability                               |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only (README, CLAUDE.md, docs/, comments) |
| `style`    | Formatting, CSS changes (no logic change)               |
| `refactor` | Code restructuring without behavior change              |
| `chore`    | Build config, dependencies, CI/CD, tooling              |
| `test`     | Adding or updating tests                                |
| `db`       | Database schema or migration changes                    |

**Scopes:** `auth`, `tasks`, `topics`, `recurring`, `daily-quest`, `gamification`, `wishlist`, `push`, `pwa`, `ui`, `db`, `api`, `deploy`, `docs`, `config`

---

## 📝 Documentation Obligation

**Everything that is built must be documented. No exceptions.**

Documentation is not an afterthought — it is written alongside the code, in the same commit or immediately after.

### 1. Code Documentation

- Every **exported function** gets a JSDoc comment explaining what it does, its parameters, and its return value.
- Every **API route** gets a brief comment block at the top describing the endpoint, method, auth requirements, and expected input/output.
- Every **database schema table/column** gets an inline comment if the purpose is not immediately obvious.
- Every **complex algorithm** (e.g. daily quest selection, gamification logic) gets a detailed explanation comment above the implementation.

Use JSDoc with `@param` and `@returns` tags. API routes get a header comment with method, path, auth, body, and response.

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

| Feature completed          | Update this file                |
| -------------------------- | ------------------------------- |
| Auth setup                 | `docs/oauth-setup.md`           |
| Database schema change     | `docs/database.md`              |
| New environment variables  | `docs/environment-variables.md` |
| Docker / deployment change | `docs/deployment.md`            |
| Kubernetes change          | `docs/kubernetes.md`            |
| New user-facing feature    | `docs/features.md`              |
| API route added/changed    | `docs/api.md`                   |

### 5. README & CHANGELOG

- Update `README.md` status table when a full phase is completed
- Update `CHANGELOG.md` under `[Unreleased]` for every user-facing or infrastructure change (Added/Changed/Fixed)

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
- Font usage: `--font-display` (Lora) for page-level headings (h1/h2), `--font-body` (JetBrains Mono) for all card/item titles (tasks, topics, wishlist — must be consistent across all three), `--font-ui` (DM Sans) for UI elements (labels, badges, buttons, metadata)

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

- [ ] Feature works correctly, TypeScript compiles without errors
- [ ] JSDoc comments on new functions/routes
- [ ] Relevant `docs/` files updated, `.env.example` if new env vars
- [ ] `CHANGELOG.md` updated
- [ ] Committed to `main` with Conventional Commit message
- [ ] `README.md` status table updated if a full phase was completed

---

## 🗂️ Project Structure (Quick Reference)

```
app/           → Next.js App Router — pages + API routes (see app/CLAUDE.md)
lib/           → All server-side business logic (see lib/CLAUDE.md)
components/    → UI components, dumb by design (see components/CLAUDE.md)
docs/          → Technical docs for devs/selfhosters (see docs/CLAUDE.md)
docs-site/     → User-facing GitHub Pages (Jekyll) — see .claudeignore
deploy/        → Kubernetes manifests (see deploy/CLAUDE.md)
drizzle/       → DB migrations (see drizzle/CLAUDE.md)
messages/      → i18n translations de/en/fr (see messages/CLAUDE.md)
scripts/       → Dev/ops scripts (see scripts/CLAUDE.md)
alexa-skill/   → Separate Lambda project for Alexa integration
```

Skip list: see `.claudeignore`
