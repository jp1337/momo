---
layout: default
title: Getting Started
description: How to set up and run Momo using Docker Compose or local development.
---

# Getting Started

This guide will get Momo running on your machine in under 10 minutes using Docker Compose.

## Prerequisites

- **Docker Engine 24+** and **Docker Compose v2** — [Install Docker](https://docs.docker.com/get-docker/)
- **At least one OAuth app** — you need GitHub, Discord, Google, Microsoft (private accounts only), or an OIDC provider configured so you can log in. See the [OAuth Setup guide](/momo/oauth-setup).
- A terminal on Linux, macOS, or WSL on Windows.

---

## Option 1: Docker Compose (Recommended)

This is the fastest way to run Momo. Docker Compose starts the app and a PostgreSQL database together.

### Step 1 — Clone the repository

```bash
git clone https://github.com/jp1337/momo.git
cd momo
```

### Step 2 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in the required values:

```env
# Required
DATABASE_URL=postgresql://momo:password@db:5432/momo
AUTH_SECRET=your-secret-here  # openssl rand -base64 32

# At least one OAuth provider
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret

# Public URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

> **Production / reverse proxy:** If you deploy behind nginx, Caddy, or any Kubernetes ingress, also set `AUTH_TRUST_HOST=true`. Auth.js v5 requires this to accept proxied requests.

See the [Environment Variables reference](/momo/environment-variables) for all available options.

### Step 3 — Generate a secret

```bash
openssl rand -base64 32
```

Paste the output as the value for `AUTH_SECRET` in `.env.local`.

### Step 4 — Start all services

```bash
docker compose up -d
```

This starts:
- **app** — the Momo Next.js application on port 3000
- **db** — PostgreSQL 18 on port 5432

### Step 5 — Open Momo

Visit [http://localhost:3000](http://localhost:3000) in your browser and sign in with your OAuth provider.

> **Migrations run automatically.** The container applies all pending database migrations before the server starts — no manual step needed.

---

## Option 2: Local Development

Use this if you want to edit the code and see changes live.

### Prerequisites

- **Node.js 20+** — [Install Node.js](https://nodejs.org/)
- **npm** (included with Node.js)
- **Docker** (for the PostgreSQL database)

### Step 1 — Clone and install dependencies

```bash
git clone https://github.com/jp1337/momo.git
cd momo
npm install
```

### Step 2 — Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

For local development, use:

```env
DATABASE_URL=postgresql://momo:password@localhost:5432/momo
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

### Step 3 — Start the database

```bash
docker compose up db -d
```

### Step 4 — Run migrations

```bash
npx drizzle-kit migrate
```

### Step 5 — Start the development server

```bash
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000) with hot reload enabled.

---

## First Login

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Sign in** and choose your OAuth provider
3. You'll be redirected to your dashboard

On first login, a user account is created automatically in the database.

## Creating Your First Task

1. From the dashboard, click **New Task**
2. Enter a title and optionally assign it to a **Topic**
3. Save — your task appears in the list
4. Click the task to mark it complete and earn your first coins

## Enabling Notifications (Optional)

Momo supports five notification channels and you can use as many as you like in parallel:

1. **Browser Push** — go to **Settings → Notifications**, click **Enable Notifications**, allow the browser permission prompt, and pick your reminder time. Requires VAPID keys on the server (see [Environment Variables](/momo/environment-variables)).
2. **ntfy.sh, Pushover, Telegram, Email** — open **Settings → Additional Notification Channels** and click the channel you want. Each has a one-page configuration form and a **Send test** button. The **Email** channel only appears if your instance has SMTP configured ([SMTP env vars](/momo/environment-variables#email-notifications-smtp)).

See the [Features guide](/momo/features#additional-notification-channels) for setup details on each channel.

## Voice Control with Alexa (Optional)

Momo has an Alexa skill that lets you add tasks, manage your wishlist, and hear your Daily Quest without touching your phone.

Example commands:

- "Alexa, ask Momo to add call the dentist"
- "Alexa, ask Momo to add milk to the shopping list"
- "Alexa, ask Momo what is my quest?"
- "Alexa, ask Momo to list my tasks"

Account linking is handled automatically — when you tap "Link Account" in the Alexa app, you log in to Momo and an API key is created for you. No manual copy-paste required.

The skill runs on AWS Lambda (free tier) and connects to your self-hosted Momo instance via the REST API. Full setup takes about 30 minutes.

[Full Alexa Skill guide →](/momo/alexa-skill)

---

## Stopping Momo

```bash
docker compose down
```

To also remove the database volume (all data):

```bash
docker compose down -v
```

---

## Next Steps

- [Explore Features →](/momo/features) — a complete guide to everything Momo can do
- [Full Deployment Guide](/momo/deployment) — production setup with TLS and reverse proxy
- [Environment Variables](/momo/environment-variables) — all configuration options
- [OAuth Setup](/momo/oauth-setup) — register OAuth apps for your domain
- [Kubernetes](/momo/kubernetes) — deploy to a Kubernetes cluster
