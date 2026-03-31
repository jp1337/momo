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
- **Topics & Subtasks** — Break big projects (like "Moving" or "Tax Return") into tiny, manageable pieces.
- **Recurring Tasks** — Weekly laundry, monthly cleaning, fortnightly grocery runs. Set it and forget it.
- **Gamification** — Earn coins, build streaks, level up. Small wins deserve real celebration.
- **Wishlist & Budget** — Track things you want to buy, with a monthly budget indicator to spend more consciously.
- **Push Notifications** — Daily reminders via browser push. No third-party service, no subscription.
- **PWA** — Install on your phone like a native app. Works offline.
- **Dark & Light Mode** — Cozy warm tones in both themes. Because productivity shouldn't feel clinical.
- **Open Source & Self-Hostable** — Your data, your server, your rules.

---

## 🔐 Authentication

Sign in with the account you already have. No new password to forget.

| Provider | Live (momotask.app) | Self-hosted |
|---|---|---|
| **GitHub** | ✅ | ✅ (own OAuth App) |
| **Discord** | ✅ | ✅ (own OAuth App) |
| **Google** | ✅ | ✅ (own OAuth App) |
| **OIDC** (Authentik, Keycloak, …) | — | ✅ |

See [OAuth Setup Guide](docs/oauth-setup.md) for configuration instructions.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router) + React 19, TypeScript, Tailwind CSS v4 |
| **Animations** | Framer Motion |
| **Auth** | Auth.js v5 (GitHub, Discord, Google, OIDC) |
| **Database** | PostgreSQL 16 + Drizzle ORM |
| **Push Notifications** | Web Push API (VAPID, no third-party) |
| **Container** | Docker |
| **Orchestration** | Kubernetes |
| **CI/CD** | GitHub Actions |
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
- Node.js 20+ (for local development)
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

The app will be available at `http://localhost:3000`.

### 4. Run database migrations

```bash
docker compose exec app npx drizzle-kit migrate
```

---

## 🧑‍💻 Local Development (WSL / Linux)

```bash
# Install dependencies
npm install

# Start PostgreSQL via Docker Compose
docker compose up db -d

# Run database migrations
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
| [Getting Started](docs/getting-started.md) | Quick setup guide |
| [Self-Hosting](docs/deployment.md) | Full deployment instructions |
| [Kubernetes](docs/kubernetes.md) | Deploying to a Kubernetes cluster |
| [Environment Variables](docs/environment-variables.md) | All configuration options |
| [OAuth Setup](docs/oauth-setup.md) | GitHub, Discord & OIDC configuration |
| [Contributing](docs/contributing.md) | How to contribute |

---

## 🏗️ Project Status

| Phase | Status | Description |
|---|---|---|
| Phase 1 – Foundation | ✅ Done | Next.js 15 + Auth.js v5 + Drizzle ORM + Design System |
| Phase 2 – Core Tasks | ✅ Done | Task CRUD, Topics, Recurring |
| Phase 3 – Daily Quest | ✅ Done | Quest algorithm, Dashboard |
| Phase 4 – Gamification | ✅ Done | Coins, Streaks, Animations |
| Phase 5 – Wishlist | ✅ Done | Wishlist CRUD, Budget tracking, Affordability, Coin-unlock |
| Phase 6 – PWA & Push | ✅ Done | PWA manifest, Service Worker, VAPID push, Daily quest & streak notifications, Settings page |
| Phase 7 – Deployment | ✅ Done | Multi-stage Docker, GitHub Actions (GHCR + DockerHub + Quay), Security Headers, Rate Limiting, K8s manifests |
| Phase 8 – Docs | ⬜ Planned | GitHub Pages documentation |

---

## 🚢 Production Checklist

Before deploying Momo to production, verify all items below:

- [ ] **Generate AUTH_SECRET** — minimum 32 random bytes:
  ```bash
  openssl rand -base64 32
  ```
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
- [ ] **Configure Kubernetes secrets** — copy `deploy/examples/secret.example.yaml`, fill in real values, apply it, then delete the file (never commit real secrets)
- [ ] **Set up cert-manager** for automatic TLS certificate provisioning
- [ ] **Run database migrations** after every deployment:
  ```bash
  docker compose exec app npx drizzle-kit migrate
  # or in Kubernetes:
  kubectl exec -n momo deployment/momo-app -- npx drizzle-kit migrate
  ```

See the full [Deployment Guide](docs/deployment.md) for AUTH_SECRET rotation procedures and Kubernetes deployment steps.

---

## 🤝 Contributing

Momo is open source and welcomes contributions. Please read [CONTRIBUTING.md](docs/contributing.md) before submitting a pull request.

---

## 📜 License

MIT — see [LICENSE](LICENSE) for details.

---

*Named after Momo, by Michael Ende. For everyone whose Grey Gentlemen have been stealing their time.*
