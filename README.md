# 🪶 Momo

> *"You must do one more thing, and you'll get to rest."*

**Steal your time back.**

Momo is a task management app built for people who struggle with avoidance, procrastination, and the overwhelming weight of everyday tasks. Not a power-user productivity suite — a quiet, daily companion that asks only one thing of you: *one small step, today.*

🌐 **Live version:** [momotask.app](https://momotask.app)  
📖 **Documentation:** [jp1337.github.io/momo](https://jp1337.github.io/momo)

---

## ✨ The Name

The name **Momo** comes from Michael Ende's 1973 novel *Momo* — one of the most quietly radical books about time, attention, and what it means to be present.

In the story, the Grey Gentlemen — shadowy figures carrying briefcases — visit ordinary people and convince them to "save time." They tell people to stop lingering, to cut out the things that don't produce anything: long conversations, idle afternoons, play, rest. People comply. They become efficient. They become joyless. They lose themselves.

Momo is a small, homeless girl who has a rare gift: she truly listens. And through that gift, she sees what others cannot — that the Grey Gentlemen are *stealing* people's time, not saving it. She fights them. Alone. Slowly. One step at a time.

The parallel to procrastination and avoidance is not accidental.

When anxiety or overwhelm turns every task into a wall, when the Grey Gentlemen of your own mind tell you that you're behind, that you'll never catch up, that you should just wait until tomorrow — **Momo is on your side.** She doesn't ask you to be productive. She asks you to do *one thing.* Just one. That's enough for today.

*This app is named in her honor.*

---

## 🌟 Features

- **Daily Quest** — One small task, chosen for you each day. No overwhelm, just one step forward.
- **Energy-aware Daily Quest** — Permanent check-in card on the dashboard: tell Momo whether you're at high / medium / low energy, and it auto-swaps the daily quest for a better-matching task (with Undo). Topics can set a default energy level that new tasks inherit. Quick Wins and 5-Minute Mode sort by energy fit. 14-day energy trend on `/stats`. Every check-in is logged so re-check-ins (morning HIGH, afternoon LOW) are preserved for pattern analysis.
- **Topics & Subtasks** — Break big projects (like "Moving" or "Tax Return") into tiny, manageable pieces. Drag & drop to reorder tasks within a topic.
- **Sequential Topics** — Flip a toggle on any topic to turn it into an ordered chain: only the first still-open task is eligible for the daily quest, and the drag & drop order decides what comes next. Perfect for projects where "buy the boxes" has to happen before "pack the boxes". Snoozing a task advances the chain so one paused step doesn't freeze the whole topic.
- **Topic Templates** — One-click import for curated starter topics. Pick from **Moving** (10 sequential tasks), **Tax Return** (6 sequential tasks) or **Workout Routine** (7 parallel tasks) and Momo creates a fully populated topic with icons, colours, default energy level and sensible priorities. Template titles are resolved in your current UI language at import time and become normal, editable tasks. Extend the catalogue by adding an entry to `lib/templates.ts`.
- **Recurring Tasks** — Weekly laundry, monthly cleaning, fortnightly grocery runs. Set it and forget it.
- **Habit Tracker** — A GitHub-style year heatmap per recurring task on `/habits`. Every completion lights up the day it happened; a three-pill strip shows totals for this year, the last 30 days, and the last 7 days. Browse past years with the year selector. Uses your real completion events (`task_completions`) — no fake "expected" days, no fake streaks. Pure read-path: no schema change, no new API routes.
- **Gamification** — Earn coins, build streaks, level up. Small wins deserve real celebration.
- **Wishlist & Budget** — Track things you want to buy, with a monthly budget indicator to spend more consciously.
- **Search & Filter** — Real-time text search across tasks and wishlist, plus filter chips for priority and topic. Instantly narrow your list without a server round-trip.
- **Snooze / Pause** — Hide tasks until a future date. Quick options (tomorrow, next week, month) or custom date picker. Snoozed tasks vanish from the list, Quick Wins, and Daily Quest — then reappear automatically.
- **Emotional Closure** — After completing the daily quest, a gentle Michael Ende quote or affirmation appears. Day-based selection (same quote all day, new one tomorrow). Toggleable in Settings.
- **Push Notifications** — Daily reminders via browser push. No third-party service, no subscription.
- **Calendar Subscription (iCal)** — Subscribe to your Momo tasks from Google Calendar, Apple Calendar, Outlook or Thunderbird via a private `.ics` feed URL. All-day events for every task with a due date, open-ended `RRULE` series for recurring tasks, stable UIDs so updates merge in place on every poll. One-click rotate or revoke in Settings; the token is stored only as a SHA-256 hash.
- **PWA** — Install on your phone like a native app. Works offline. The task creation form is fully usable on mobile — a corrected z-index ensures it renders above the bottom navigation bar as a proper full-height modal.
- **REST API & API Keys** — Full public REST API with personal access tokens (read-only flag, expiry dates). Interactive Swagger UI at `/api-docs`.
- **Account Linking** — Connect multiple OAuth providers to one account.
- **Multilingual** — German, English, and French UI with cookie-based locale switching. Add any language by dropping in a `messages/XX.json` file.
- **Statistics** — Personal stats dashboard showing tasks completed, coins earned, streaks, level progress, achievements unlocked, and wishlist purchases.
- **Admin Panel** — Platform-wide statistics for operators (user growth, top users, achievement distribution). Protected by `ADMIN_USER_IDS` env var — only listed user UUIDs can access `/admin`.
- **Procrastination Counter** — Every task tracks how many times it has been postponed. Tasks postponed 3 or more times award double coins on completion.
- **Daily Quest Postpone Limit** — Configurable per-user daily postpone limit (1–5, default 3) in Settings. Prevents endless deferral of the one thing that matters.
- **Task Breakdown** — Split any task into subtasks with a single button. A new Topic is created from the breakdown; the original task is removed. The `totalTasksCreated` statistics counter is correctly incremented for each generated subtask.
- **Timezone-Aware Daily Quest** — The daily quest selection respects the user's local timezone (`GET /api/daily-quest?timezone=Europe/Berlin`), ensuring the quest resets at local midnight rather than UTC.
- **Immutable Statistics Counter** — `totalTasksCreated` is a cumulative counter that only ever increases. Deleting a task never decrements it, giving an accurate lifetime picture of your output.
- **Time Estimates** — Assign a time estimate (5, 15, 30, or 60 minutes) to any task. Estimates are displayed as a badge on task cards.
- **Quick Wins** — Dashboard section that surfaces all tasks estimated at 15 minutes or less, so a short window of focus never goes to waste.
- **5-Minute Mode** — Dedicated focused view (`/quick`) showing only tasks with a 5-minute estimate. Prominent dashboard CTA, sidebar and mobile nav entry. Complete tasks directly with full animation support.
- **Focus Mode** — Distraction-free view (`/focus`) showing only the Daily Quest and Quick Wins (tasks ≤ 15 min). No stats, no links, no noise — just the quest and a few short tasks. Full completion animations. Replaces 5-Min in mobile nav for maximum impact.
- **Public Landing Page** — Atmospheric Momo-themed landing page (Lora italic, dark forest green, feather animation, Michael Ende quote) for unauthenticated visitors.
- **Dark & Light Mode** — Cozy warm tones in both themes. Because productivity shouldn't feel clinical.
- **DSGVO / GDPR Ready** — Data export (JSON), account deletion with full cascade, Impressum + Datenschutzerklärung pages, no tracking cookies.
- **Open Source & Self-Hostable** — Your data, your server, your rules. Migrations run automatically on container start.

---

## 🔐 Authentication

Sign in with the account you already have. No new password to forget.

| Provider | Live (momotask.app) | Self-hosted |
|---|---|---|
| **GitHub** | ✅ | ✅ (own OAuth App) |
| **Discord** | ✅ | ✅ (own OAuth App) |
| **Google** | ✅ | ✅ (own OAuth App) |
| **Microsoft** (private accounts only — Outlook/Hotmail/Live/Xbox) | ✅ | ✅ (own Azure App) |
| **OIDC** (Authentik, Keycloak, …) | — | ✅ |

Optional **two-factor authentication** — either **TOTP** (Aegis, 2FAS,
Google Authenticator, Authy, 1Password, …) or **Passkeys** (Touch ID,
Windows Hello, iCloud Keychain, YubiKey, …). Passkeys additionally enable
**passwordless primary login**: once registered, you can sign in with just
a fingerprint or PIN — no OAuth round-trip required. Self-hosters can
enforce a second factor for every account by setting `REQUIRE_2FA=true`.
See [Two-Factor Auth Guide](docs/two-factor-auth.md) for the technical
details and [OAuth Setup Guide](docs/oauth-setup.md) for provider setup.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router) + React 19, TypeScript, Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **Auth** | Auth.js v5 (GitHub, Discord, Google, Microsoft (private accounts), OIDC) |
| **Database** | PostgreSQL 18 + Drizzle ORM |
| **i18n** | next-intl — German, English, French (cookie-based, no URL prefix) |
| **Push Notifications** | Web Push API (VAPID, no third-party) |
| **API** | OpenAPI 3.1.0 + Personal Access Tokens (Bearer) |
| **Container** | Docker (Node.js 22 LTS) |
| **Orchestration** | Kubernetes |
| **CI/CD** | GitHub Actions (native multi-arch: amd64 + arm64) |
| **Image Registries** | GHCR, Docker Hub, Quay.io |

> **Note for React developers:** Next.js is a React framework. All UI is written in React — Next.js adds routing, server-side rendering, API routes, and PWA support on top.

---

## 🎨 Design

Momo is intentionally cozy. Both the dark and light themes use warm, earthy tones — no harsh whites, no cold blues, no sterile greys. The goal is an app you *want* to open, not one that feels like a spreadsheet.

- **Dark theme:** Deep forest greens and near-blacks with warm amber accents
- **Light theme:** Soft parchment whites and warm sand tones
- **Typography:** Lora (headings) · JetBrains Mono (tasks) · DM Sans (UI)
- **Animations:** Subtle, purposeful — a small celebration when you finish something, not a distraction

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local development only)
- A GitHub or Discord OAuth App (see [OAuth Setup](docs/oauth-setup.md))

### 1. Clone the repository

```bash
git clone https://github.com/jp1337/momo.git
cd momo
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

See [Environment Variables](docs/environment-variables.md) for a full reference.

### 3. Start with Docker Compose

```bash
docker compose up -d
```

The app is available at `http://localhost:3000`. **Database migrations run automatically** before the server starts — no manual step needed.

---

## 🧑‍💻 Local Development (WSL / Linux)

```bash
# Install dependencies
npm install

# Start PostgreSQL via Docker Compose
docker compose up db -d

# Run database migrations (local dev only)
npx drizzle-kit migrate

# Start the development server
npm run dev
```

The app runs at `http://localhost:3000`.

---

## 📦 Container Images

Momo images are published to three registries on every release for redundancy:

| Registry | Image |
|---|---|
| GitHub Container Registry | `ghcr.io/jp1337/momo` |
| Docker Hub | `docker.io/jp1337/momo` |
| Quay.io | `quay.io/jp1337/momo` |

Pull from whichever is available:

```bash
docker pull ghcr.io/jp1337/momo:latest
# or
docker pull jp1337/momo:latest
# or
docker pull quay.io/jp1337/momo:latest
```

---

## 📖 Documentation

Full documentation is available at **[jp1337.github.io/momo](https://jp1337.github.io/momo)**

| Guide | Description |
|---|---|
| [Deployment](docs/deployment.md) | Docker Compose, production checklist, Kubernetes reference |
| [Environment Variables](docs/environment-variables.md) | All configuration options |
| [OAuth Setup](docs/oauth-setup.md) | GitHub, Discord, Google, Microsoft & OIDC configuration |
| [API Reference](docs/api.md) | All REST endpoints — interactive Swagger UI at `/api-docs` |
| [Database](docs/database.md) | Schema overview, migrations, Drizzle Studio |
| [DSGVO / GDPR](docs/gdpr.md) | Compliance guide for operators |
| [SEO](docs/seo.md) | Search-engine setup: metadata, robots, sitemap, JSON-LD |

---

## 🏗️ Project Status

| Phase | Status | Description |
|---|---|---|
| Phase 1 – Foundation | ✅ Done | Next.js 16 + Auth.js v5 + Drizzle ORM + Design System |
| Phase 2 – Core Tasks | ✅ Done | Task CRUD, Topics, Recurring |
| Phase 3 – Daily Quest | ✅ Done | Quest algorithm, Dashboard |
| Phase 4 – Gamification | ✅ Done | Coins, Streaks, Animations |
| Phase 5 – Wishlist | ✅ Done | Wishlist CRUD, Budget tracking, Affordability, Coin-unlock |
| Phase 6 – PWA & Push | ✅ Done | PWA manifest, Service Worker, VAPID push, Daily quest & streak notifications, Settings page |
| Phase 7 – Deployment | ✅ Done | Multi-stage Docker, GitHub Actions (GHCR + DockerHub + Quay), Security Headers, Rate Limiting, K8s manifests |
| Phase 8 – Polish | ✅ Done | Multilingual (DE/EN/FR), DSGVO compliance, Dark mode redesign, self-hosted fonts, data export, account deletion |
| Phase 9 – API & Keys | ✅ Done | Public REST API, Personal Access Tokens, Swagger UI, Account Linking, Font Awesome icons, SVG Logo |
| Phase 10 – Statistics & Admin | ✅ Done | Personal stats page, Admin panel, Mobile bottom navigation |
| Phase 11 – UX & Anti-Procrastination | ✅ Done | Procrastination counter, postpone limit, bonus coins, task breakdown, time estimates, Quick Wins, public landing page, dashboard redesign, FA icon picker |
| Phase 11 – Bugfixes (2026-04-05) | ✅ Done | Timezone-aware daily quest selection, immutable statistics counter, task breakdown stat increment, mobile task form z-index fix |

---

## 🚢 Production Checklist

Before deploying Momo to production, verify all items below:

- [ ] **Generate AUTH_SECRET** — minimum 32 random bytes:
  ```bash
  openssl rand -base64 32
  ```
- [ ] **Set AUTH_TRUST_HOST=true** — required when running behind any reverse proxy (nginx, Caddy, Traefik) or in Kubernetes
- [ ] **Set all required environment variables** — see [Environment Variables](docs/environment-variables.md)
- [ ] **Generate VAPID keys** for push notifications:
  ```bash
  npx web-push generate-vapid-keys
  ```
- [ ] **Register OAuth apps** for your production domain with correct callback URLs
- [ ] **Set CRON_SECRET** to protect cron endpoints:
  ```bash
  openssl rand -hex 32
  ```
- [ ] **Configure TLS** — use a reverse proxy (nginx, Caddy) or cert-manager in Kubernetes
- [ ] **Configure legal pages** (for public deployments) — set `NEXT_PUBLIC_IMPRINT_NAME`, `NEXT_PUBLIC_IMPRINT_ADDRESS`, `NEXT_PUBLIC_IMPRINT_EMAIL` (see [DSGVO Guide](docs/gdpr.md))
- [ ] **Set `NEXT_PUBLIC_APP_URL` to your public HTTPS origin** — drives `metadataBase`, `robots.txt`, `sitemap.xml`, Open Graph tags and JSON-LD. If left at the default `http://localhost:3000`, search engines and social previews will index `localhost`. See [SEO Guide](docs/seo.md).
- [ ] **Set ADMIN_USER_IDS** (optional) — comma-separated UUIDs of users who can access `/admin`. If unset, the admin page is inaccessible to everyone:
  ```bash
  # Find your UUID in the database, or check the "access denied" screen at /admin
  ADMIN_USER_IDS=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  ```
- [ ] **Migrations run automatically** — the container applies all pending migrations on startup. Check `docker compose logs app` after deployment to confirm.

See the full [Deployment Guide](docs/deployment.md) for AUTH_SECRET rotation procedures and Kubernetes deployment steps.

---

## 🤝 Contributing

Momo is open source and welcomes contributions. Please open an issue or pull request on [GitHub](https://github.com/jp1337/momo).

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

*Named after Momo, by Michael Ende. For everyone whose Grey Gentlemen have been stealing their time.*
