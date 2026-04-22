---
layout: default
title: Momo – Kostenlose Aufgaben-App für Prokrastination & ADHS
description: >-
  Momo ist eine kostenlose, selbst-hostbare Aufgaben-App für Menschen mit Prokrastination,
  ADHS und Vermeidungstendenzen. Daily Quest, Gamification, Habit Tracker, Streaks,
  Fokus-Modus, Push-Benachrichtigungen. Open Source (Next.js, Docker, TypeScript).
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
    <div class="icon">⛓</div>
    <h3>Sequential Topics</h3>
    <p>Turn a topic into an ordered chain: only the first still-open task is quest-eligible. Drag & drop sets the order.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📋</div>
    <h3>Topic Templates</h3>
    <p>Skip the blank page: import Moving, Tax Return, Workout Routine or the Household chores as a fully populated topic in one click.</p>
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
    <div class="icon">🌱</div>
    <h3>Habit Tracker</h3>
    <p>A GitHub-style year grid for every recurring task. Every green square is a completion, and a per-habit streak counter shows how long you have been consistent — in days, weeks, or months. <a href="/momo/features#habit-tracker">Read the guide →</a></p>
  </div>
  <div class="feature-card">
    <div class="icon">🪙</div>
    <h3>Gamification</h3>
    <p>Coins, streaks (with monthly Cassiopeia protection), levels, and 31 achievements across four rarity tiers (Common → Legendary). Secret achievements, coin rewards on unlock, and a dedicated Achievement Gallery. Small wins deserve real celebration.</p>
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
    <div class="icon">📅</div>
    <h3>Calendar Subscription</h3>
    <p>Subscribe to your Momo tasks from Google, Apple or Outlook Calendar via a private iCal feed. All-day events, recurring series, one-click rotate or revoke. <a href="/momo/features#calendar-subscription-ical-feed">Read the guide →</a></p>
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
    <div class="icon">🔐</div>
    <h3>Two-Factor Auth</h3>
    <p>Optional TOTP via any authenticator app plus 10 single-use backup codes, or <strong>passkeys</strong> (Face ID, Touch ID, Windows Hello, YubiKey). Instance-wide enforcement. <a href="/momo/two-factor-auth">TOTP</a> · <a href="/momo/passkeys">Passkeys</a></p>
  </div>
  <div class="feature-card">
    <div class="icon">🗝️</div>
    <h3>Passwordless Login</h3>
    <p>Register a passkey and sign in with just your fingerprint, face or device PIN — no OAuth round-trip required. <a href="/momo/passkeys">Read the guide →</a></p>
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
    <p>German, English, French, Spanish, and Dutch UI. Drop in a JSON file to add any language.</p>
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
| Auth | Auth.js v5 (GitHub, Discord, Google, Microsoft (private accounts), OIDC, account linking) |
| Database | PostgreSQL 18 + Drizzle ORM (auto-migrations) |
| Notifications | Web Push (VAPID), ntfy.sh, Pushover, Telegram Bot API, SMTP via nodemailer |
| API | OpenAPI 3.1.0, Personal Access Tokens, Swagger UI at `/api-docs` |
| Voice | Alexa Skill (AWS Lambda) with automatic Account Linking |
| i18n | next-intl (German, English, French, Spanish, Dutch) |
| Container | Docker + Kubernetes (manifests included) |

## What's New

**Settings reorganised into sub-pages** — The settings area is now divided into six clearly labelled tabs: **Account**, **Notifications**, **Quest & Tasks**, **Security**, **Integrations**, and **Data & Privacy**. On desktop a persistent sidebar shows your current section; on mobile it collapses to a horizontal scrollable tab strip. Each tab loads only the data it needs, and `/settings` now redirects to `/settings/account` automatically. [See Features →](/momo/features#settings-navigation)

**Cassiopeia** — The "Streak Shield" has been renamed to **Cassiopeia** ✨. Same protection, new name: once per calendar month, Cassiopeia automatically saves your streak when you miss exactly one day. The dashboard shows ✨ next to your streak when Cassiopeia is still available this month. [See Features →](/momo/features#cassiopeia)

**Daily Quest consistency fix** — The morning briefing and the app dashboard now always show the same Daily Quest. Previously, users in non-UTC timezones could see a different quest in their notification than in the app after UTC midnight. Fixed by passing the user's stored timezone to the quest selection algorithm on every call.

**Individual Recurring-Task Reminders** — each recurring task that is due today gets its own notification instead of being bundled into a single "due today" list. If three or fewer recurring tasks are due, each one pops up separately so you can act on them individually. More than three? They're bundled into a summary to keep your notification shade clean. Opt in under **Settings → Notifications**. [See Features →](/momo/features#individual-recurring-task-reminders)

**Onboarding Wizard** — new users are greeted by a short 4-step guided setup: learn the core concepts (Quest, Energy, Coins, Streaks), create a first topic, add a few tasks, and optionally enable push notifications. Every step can be skipped, and the wizard never appears again once completed. Existing accounts are not affected. [See Features →](/momo/features#onboarding)

**Vacation Mode** — going on holiday or feeling under the weather? Pause all recurring tasks at once from **Settings → Vacation Mode**. Your habit streaks stay protected, due dates shift automatically when you return, and paused tasks vanish from quests, notifications, and your calendar feed. A daily background job ends vacation on the chosen date — or end it early with one click. [See Features →](/momo/features#vacation-mode--pause-all-recurring-tasks)

**Bulk Actions** — select multiple tasks at once, then batch-delete, complete, move to a topic, or set priority from a floating action bar at the bottom of the screen. Useful for cleanup after a template import or inbox triage. Bulk-complete deliberately skips gamification — it's a cleanup tool, not a coin shortcut. [See Features →](/momo/features#bulk-actions)

**Morning Briefing** — one daily digest instead of many pings. Opt in under **Settings → Morning Briefing** to receive your quest, due tasks, streak, and new achievements in a single message at your chosen time (default 08:00). Replaces the individual quest and due-today reminders automatically. [See Features →](/momo/features#morning-briefing-daily-digest)

**"Due today" reminder** — an optional push that fires at your normal daily notification time and lists the tasks actually due today. Snoozed tasks are excluded, recurring tasks are covered via their next occurrence, and — most importantly — the reminder is **silent on empty days**: no "all clear" pings that train you to swipe notifications away. Works via Web Push, ntfy.sh, Pushover, Telegram, or Email. Toggle it on under **Settings → Notifications**. [See Features →](/momo/features#due-today-reminder)

**Passkeys (WebAuthn)** — sign in to Momo *without* a password. Register your Face ID, Touch ID, Windows Hello, Android biometrics or a YubiKey from **Settings → Two-factor authentication → Passkeys**, and the next time you visit `/login` just tap **Sign in with a passkey**. The same passkey doubles as your second factor — pick whichever is more convenient at sign-in time. Methods can be mixed: TOTP, passkey, both, neither. [Read the guide →](/momo/passkeys)

**Two-Factor Authentication (TOTP)** — optional second factor via any authenticator app (Aegis, 2FAS, Google Authenticator, Authy, 1Password, Bitwarden, …). Setup wizard with QR code, 10 single-use backup codes, encrypted at rest with AES-256-GCM. Self-hosters can require a second factor for everyone with `REQUIRE_2FA=true`. [Read the guide →](/momo/two-factor-auth)

**Active Sessions** — see every device that is currently signed in to your account under **Settings → Active Sessions**. Each entry shows browser, OS, IP address, and timestamps. Revoke individual sessions or sign out all other devices with one click. [See Features →](/momo/features#active-sessions)

**Login notifications for new devices** — opt-in security alert that fires on all your configured channels the moment a login from an unknown device is detected. Uses a fingerprint of the browser's User-Agent and IP — no external service required. Enable the **"Notify on new devices"** toggle under **Settings → Active Sessions**. [See Features →](/momo/features#login-notifications-for-new-devices)

**Microsoft Sign In** — log in with your personal Microsoft account (Outlook.com, Hotmail, Live, Xbox). Work / school / Microsoft 365 accounts are intentionally not supported — Momo pins the tenant to `consumers`. [Setup guide →](/momo/oauth-setup#microsoft-private-accounts-only)

**Outbound Webhooks** — connect Momo to Zapier, Make, n8n, Home Assistant, or any custom backend. Configure up to 10 HTTPS endpoints and receive task lifecycle events (`task.created`, `task.completed`, `task.deleted`, `task.updated`) as signed JSON POSTs. Each endpoint can subscribe to specific events and optionally verify requests with HMAC-SHA256 signatures. [See Features →](/momo/features#outbound-webhooks-task-automation)

**Alexa Skill** — "Alexa, open Momo. Add dentist appointment." Add tasks, hear your Daily Quest, manage your wishlist by voice. Account linking is automatic — tap "Link Account" in the Alexa app and an API key is created for you. Lambda code lives in `alexa-skill/`. [Read the guide →](/momo/alexa-skill)

**Telegram & Email notification channels** — Push notifications via a personal Telegram bot (Bot Token + Chat ID, free) or by email (instance-wide SMTP). Both join ntfy.sh and Pushover under **Settings → Additional Notification Channels**. The email channel uses a stylised newsletter template with a tappable "Open Momo" button. [See Features →](/momo/features#additional-notification-channels)

**Energy-aware Daily Quest — now with auto re-roll** — the "How are you feeling today?" check-in is back where it belongs: a permanent card at the top of your dashboard. When you tell Momo your energy, it can automatically swap the daily quest for a better-matching task (with an Undo link in case you liked the original). Topics can define a default energy level that new tasks inherit, Quick Wins and 5-Minute Mode both sort by energy fit, and a new block on `/stats` shows your weekly energy pattern. [See Features →](/momo/features#energy-check-in)

**Focus Mode** — A distraction-free view at `/focus` that shows only your Daily Quest and quick wins (≤ 15 min). All celebrations and animations still fire — just without the noise around them. [See Features →](/momo/features#focus-mode)

**5-Minute Mode** — A focused page at `/quick` showing only tasks with a 5-minute estimate. Perfect for those gaps between meetings. [See Features →](/momo/features#5-minute-mode)

**Weekly Review** — Visit `/review` for a Sunday recap: completions vs last week, postponements, coins earned, streak, and top topics. An optional Sunday-evening push notification ships with the highlights. [See Features →](/momo/features#weekly-review)

**Snooze tasks** — Click the clock icon to pause a task until tomorrow, next week, next month, or a custom date. Snoozed tasks vanish from your list and Daily Quest until the date passes. [See Features →](/momo/features#snooze--pause-a-task)

**Emotional Closure** — After completing your Daily Quest, Momo shows a short Michael-Ende quote or affirmation. Toggleable in Settings, available in all three languages. [See Features →](/momo/features#emotional-closure)

---

## The Name

Named after **Momo** by Michael Ende — a story about a small girl who fights the Grey Gentlemen stealing people's time. When anxiety turns every task into a wall, Momo asks you to do just one thing. That's enough for today.
