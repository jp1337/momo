---
layout: default
title: Home
description: Task management for people who struggle with procrastination. Open source and self-hostable.
---

<div class="hero">
  <h1>🪶 Momo</h1>
  <p class="tagline">"Steal your time back."</p>
  <p>Momo is a task management app built for people who struggle with avoidance, procrastination, and the overwhelming weight of everyday tasks. Not a power-user productivity suite — a quiet, daily companion that asks only one thing of you: <em>one small step, today.</em></p>

  <div class="hero-buttons">
    <a href="/momo/getting-started" class="btn btn-primary">Get Started →</a>
    <a href="https://github.com/jp1337/momo" class="btn btn-secondary">View on GitHub</a>
    <a href="https://momotask.app" class="btn btn-secondary">Live Demo ↗</a>
  </div>
</div>

## Features

<div class="features-grid">
  <div class="feature-card">
    <div class="icon">🌟</div>
    <h3>Daily Quest</h3>
    <p>One task per day, picked for you — energy-aware, with an emotional closure quote on completion.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🎯</div>
    <h3>Focus Mode</h3>
    <p>Distraction-free view: only your quest and short tasks. Nothing else.</p>
  </div>
  <div class="feature-card">
    <div class="icon">⏱</div>
    <h3>5-Minute Mode</h3>
    <p>Only have a few minutes? See just the tasks you can finish right now.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📁</div>
    <h3>Topics & Subtasks</h3>
    <p>Group related tasks. Drag-and-drop reordering, break-down into smaller steps.</p>
  </div>
  <div class="feature-card">
    <div class="icon">⏰</div>
    <h3>Snooze Tasks</h3>
    <p>Pause anything you're not ready for. It comes back when you're ready.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔁</div>
    <h3>Recurring Tasks</h3>
    <p>Weekly laundry, monthly cleaning. Set it and forget it.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🪙</div>
    <h3>Gamification</h3>
    <p>Coins, streaks, levels, achievements. Small wins deserve real celebration.</p>
  </div>
  <div class="feature-card">
    <div class="icon">💰</div>
    <h3>Wishlist & Budget</h3>
    <p>Earn coins through tasks, then spend them on things you actually want.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📊</div>
    <h3>Weekly Review</h3>
    <p>A Sunday recap of completions, postponements, coins, streak, and top topics.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔔</div>
    <h3>Multi-Channel Notifications</h3>
    <p>Browser push, ntfy.sh, Pushover, Telegram, and Email — pick whatever fits your workflow.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔍</div>
    <h3>Search & Filter</h3>
    <p>Live search across tasks and wishlist with priority and topic chips.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📱</div>
    <h3>PWA & Swipe Gestures</h3>
    <p>Install on your phone like a native app. Swipe to complete or delete on mobile.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔑</div>
    <h3>REST API & API Keys</h3>
    <p>Personal access tokens, read-only keys, OpenAPI 3.1 spec, Swagger UI at <code>/api-docs</code>.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔊</div>
    <h3>Alexa Skill</h3>
    <p>Add tasks and check your quest by voice. Works with any Echo device.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🌍</div>
    <h3>Multilingual</h3>
    <p>German, English, and French UI. Drop in a JSON file to add any language.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🏠</div>
    <h3>Self-Hostable</h3>
    <p>Docker Compose or Kubernetes. Migrations run automatically. Your data, your server.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🛡</div>
    <h3>GDPR-Friendly</h3>
    <p>Full data export, account deletion, configurable legal pages — built in.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📖</div>
    <h3>Full Feature Guide</h3>
    <p>Every feature explained with practical examples. <a href="/momo/features">Read the guide →</a></p>
  </div>
</div>

## Quick Start

```bash
git clone https://github.com/jp1337/momo.git
cd momo
cp .env.example .env.local
# Edit .env.local with your credentials
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) — done. Database migrations run automatically on first start.

[Full getting started guide](/momo/getting-started) · [Explore all features →](/momo/features)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Auth | Auth.js v5 (GitHub, Discord, Google, OIDC, account linking) |
| Database | PostgreSQL 18 + Drizzle ORM (auto-migrations) |
| Notifications | Web Push (VAPID), ntfy.sh, Pushover, Telegram Bot API, SMTP via nodemailer |
| API | OpenAPI 3.1.0, Personal Access Tokens, Swagger UI at `/api-docs` |
| Voice | Alexa Skill (AWS Lambda) with automatic Account Linking |
| i18n | next-intl (German, English, French) |
| Container | Docker + Kubernetes (manifests included) |

## What's New

**Telegram & Email notification channels** — Push notifications via a personal Telegram bot (Bot Token + Chat ID, free) or by email (instance-wide SMTP). Both join ntfy.sh and Pushover under **Settings → Additional Notification Channels**. The email channel uses a stylised newsletter template with a tappable "Open Momo" button. [See Features →](/momo/features#additional-notification-channels)

**Pushover integration** — Instant push notifications to iOS, Android, and desktop via Pushover. Configure with your User Key and Application Token in the settings.

**Energy-aware Daily Quest** — Tag tasks with a high / medium / low energy level. Each morning Momo asks how you're feeling and prefers tasks that match — no more being asked to write a tax return on a 🌙 day. [See Features →](/momo/features#energy-check-in)

**Focus Mode** — A new distraction-free view at `/focus` that shows only your Daily Quest and quick wins (≤ 15 min). All celebrations and animations still fire — just without the noise around them. [See Features →](/momo/features#focus-mode)

**5-Minute Mode** — A focused page at `/quick` showing only tasks with a 5-minute estimate. Perfect for those gaps between meetings. [See Features →](/momo/features#5-minute-mode)

**Weekly Review** — Visit `/review` for a Sunday recap: completions vs last week, postponements, coins earned, streak, and top topics. An optional Sunday-evening push notification ships with the highlights. [See Features →](/momo/features#weekly-review)

**Drag-and-drop subtask reordering** — Inside any topic, grab the grip handle on a task and drag it to a new position. Mouse, touch, and keyboard all work. The order persists. [See Features →](/momo/features#reordering-tasks-drag--drop)

**Profile editing** — OAuth provider gave you a no-reply email or weird display name? Edit your name, email, and avatar directly in **Settings → Account**. Avatars are resized server-side and stored as WebP. [See Features →](/momo/features#profile-editing)

**Snooze tasks** — Click the clock icon to pause a task until tomorrow, next week, next month, or a custom date. Snoozed tasks vanish from your list and Daily Quest until the date passes. [See Features →](/momo/features#snooze--pause-a-task)

**Emotional Closure** — After completing your Daily Quest, Momo shows a short Michael-Ende quote or affirmation. Toggleable in Settings, available in all three languages. [See Features →](/momo/features#emotional-closure)

---

## The Name

Named after **Momo** by Michael Ende — a story about a small girl who fights the Grey Gentlemen stealing people's time. When anxiety turns every task into a wall, Momo asks you to do just one thing. That's enough for today.
