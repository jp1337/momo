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
    <p>One task per day, chosen for you. No overwhelm — just one step forward.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📁</div>
    <h3>Topics & Subtasks</h3>
    <p>Break big projects into tiny, manageable pieces.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔁</div>
    <h3>Recurring Tasks</h3>
    <p>Weekly laundry, monthly cleaning. Set it and forget it.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🪙</div>
    <h3>Gamification</h3>
    <p>Earn coins, build streaks, level up. Small wins deserve real celebration.</p>
  </div>
  <div class="feature-card">
    <div class="icon">💰</div>
    <h3>Wishlist & Budget</h3>
    <p>Track things you want to buy with a monthly budget indicator.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔔</div>
    <h3>Push Notifications</h3>
    <p>Daily reminders via browser push. No third-party service needed.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📱</div>
    <h3>PWA</h3>
    <p>Install on your phone like a native app. Works offline.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔑</div>
    <h3>REST API & API Keys</h3>
    <p>Full REST API with personal access tokens. Read-only keys, expiry dates, Swagger UI at <code>/api-docs</code>.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🌍</div>
    <h3>Multilingual</h3>
    <p>German, English, and French UI. Add any language by dropping in a messages file.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🏠</div>
    <h3>Self-Hostable</h3>
    <p>Your data, your server, your rules. Docker Compose in minutes — migrations run automatically.</p>
  </div>
  <div class="feature-card">
    <div class="icon">🔊</div>
    <h3>Alexa Skill</h3>
    <p>Add tasks and check your quest by voice. "Alexa, add dentist to Momo." Works with any Echo device.</p>
  </div>
  <div class="feature-card">
    <div class="icon">📖</div>
    <h3>Full Feature Guide</h3>
    <p>Every feature explained with practical examples — tasks, quests, gamification, wishlist, API keys, and more. <a href="/momo/features">Read the guide →</a></p>
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
| Auth | Auth.js v5 (GitHub, Discord, Google, OIDC) |
| Database | PostgreSQL 18 + Drizzle ORM |
| Push | Web Push API (VAPID) |
| API | OpenAPI 3.1.0, Personal Access Tokens |
| Container | Docker + Kubernetes |

## What's New

**Search & Filter** — The task list and wishlist now have a search bar and filter chips. Search titles (and notes for tasks) in real time, then narrow by priority or topic. Filters combine and show a live result count. [See Features →](/momo/features#search-and-filter)

**Branded error pages** — A wrong URL or server hiccup now shows a custom Momo 404 or 500 page — same warm forest aesthetic, same fonts, with a direct link back to the app. No more bare Next.js error screens.

**Swipe gestures on mobile** — On any task list, swipe right to complete a task (green) or left to delete it (red). The same works for wishlist items: swipe right to mark as bought, swipe left to discard. No need to open a menu.

**Confetti on wishlist purchases** — Marking a wishlist item as bought triggers a short celebration animation. Small wins deserve it.

**Daily Quest resets every day** — An uncompleted quest is replaced the next morning so you never wake up to the same task two days in a row. The quest title is also included in your daily push notification: "Today's mission: Call the dentist."

**Alexa Skill** — Add tasks and check your quest by voice. Supports task creation, wishlist additions, quest reading, and task listing. Account linking is automatic — no manual API key setup needed. [Learn more →](/momo/alexa-skill)

**Consistent edit and delete controls** — Every card (tasks, topics, wishlist items) now has the edit (✎) and delete (✕) buttons in the same top-right position. Full titles are always visible, never cut off.

---

## The Name

Named after **Momo** by Michael Ende — a story about a small girl who fights the Grey Gentlemen stealing people's time. When anxiety turns every task into a wall, Momo asks you to do just one thing. That's enough for today.
