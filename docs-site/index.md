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
    <div class="icon">🏠</div>
    <h3>Self-Hostable</h3>
    <p>Your data, your server, your rules. Docker Compose in minutes.</p>
  </div>
</div>

## Quick Start

```bash
git clone https://github.com/jp1337/momo.git
cd momo
cp .env.example .env.local
# Edit .env.local with your credentials
docker compose up -d
docker compose exec app npx drizzle-kit migrate
```

Open [http://localhost:3000](http://localhost:3000) — done.

[Full getting started guide](/momo/getting-started)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Auth | Auth.js v5 (GitHub, Discord, Google, OIDC) |
| Database | PostgreSQL 18 + Drizzle ORM |
| Push | Web Push API (VAPID) |
| Container | Docker + Kubernetes |

## The Name

Named after **Momo** by Michael Ende — a story about a small girl who fights the Grey Gentlemen stealing people's time. When anxiety turns every task into a wall, Momo asks you to do just one thing. That's enough for today.
