---
layout: default
title: Distribution & Listing Guide
---

# Distribution & Listing Guide

Übersicht aller Plattformen auf denen Momo gelistet werden soll/ist, mit vorbereiteten Texten und Checklisten.

---

## 1. alternativeto.net — ab 29. April 2026

Account `jp1337` erstellt am 22. April 2026. Einreichung möglich ab 29. April 2026.

**URL:** <https://alternativeto.net/manage-item/>

### Felder

| Feld | Wert |
|---|---|
| Name | Momo |
| URL | https://momotask.app |
| Kategorie | Task Management |
| Plattform | Web, Self-Hosted |
| Lizenz | Open Source (MIT) |

### Kurzbeschreibung (für das Listing)

```
Momo is a task management app for people with procrastination and ADHD.
One Daily Quest per day, energy-aware task selection, coins & streaks,
habit tracker, and wishlist rewards. Self-hostable via Docker.
```

### "Alternative zu" eintragen

- Todoist
- TickTick
- Microsoft To Do
- Habitica
- Things 3
- Any.do

---

## 2. awesome-selfhosted — ab 12. August 2026

4-Monate-Regel ab v0.1.0 (12. April 2026). Frühestmögliches Einreichen: **12. August 2026**.

**Ziel-Repo:** <https://github.com/awesome-selfhosted/awesome-selfhosted-data>  
**Datei anlegen:** `software/momo.yml`  
**PR-Titel:** `Add Momo - task management for procrastination & ADHD`

Die fertige YAML-Datei liegt unter `.github/awesome-selfhosted-entry.yml` im Momo-Repo.

### Checkliste vor dem Einreichen

- [ ] Letzter Commit nicht älter als 6 Monate
- [ ] momotask.app erreichbar und stabil
- [ ] README hat Screenshots der App
- [ ] Beschreibung unter 250 Zeichen (kein "open-source", "free", "self-hosted" — ist schon so)
- [ ] MIT-Lizenz-Datei vorhanden ✅
- [ ] Docker-Deployment dokumentiert ✅

### PR-Beschreibung (Template)

```markdown
## Add Momo

**What is it?**
Momo is a task management app specifically designed for people who struggle
with procrastination and ADHD. Instead of showing overwhelming task lists,
it picks one "Daily Quest" per day — matched to the user's current energy
level (high / medium / low). Completing tasks earns coins that can be spent
on a personal wishlist, closing a motivational loop.

**Why does it belong on awesome-selfhosted?**
- Fully self-hostable via Docker or Kubernetes
- No cloud dependencies, no third-party accounts required
- PostgreSQL database, all data stays on your server
- MIT license
- Active development (regular releases since April 2026)

**Links**
- Website / demo: https://momotask.app
- Source: https://github.com/jp1337/momo
- Docs: https://jp1337.github.io/momo
- Docker: ghcr.io/jp1337/momo
```

---

## 3. Product Hunt — Timing: parallel zu awesome-selfhosted (August 2026)

Kein Mindestalter. Timing nach erstem nachweisbaren Google-Traffic empfohlen.

### Vorbereitung

- [ ] 5–8 App-Screenshots (1270×760px oder 630×480px)
- [ ] Kurzes Demo-GIF (Dashboard → Quest → Complete → Coins)
- [ ] Tagline (unter 60 Zeichen)
- [ ] Beschreibung (250 Zeichen)
- [ ] Hunter finden (jemand mit PH-Follower-Basis)

### Tagline-Entwürfe

```
Steal your time back — one task a day, no overwhelm.
```
```
Task management for ADHD brains — one quest, one day, no guilt.
```
```
The todo app that doesn't judge you for not finishing everything.
```

### Beschreibung (250 Zeichen)

```
Momo picks one task per day based on your energy — your Daily Quest.
Complete it, earn coins, spend them on your wishlist. Self-hostable,
open source, built for procrastination and ADHD.
```

---

## 4. GitHub-Repo-Zustand (aktuell)

| Feld | Status |
|---|---|
| Description | ✅ Englisch, klar |
| Homepage | ✅ https://momotask.app |
| Topics | ✅ 15 relevante Tags |
| README Screenshots | ❌ Fehlt — höchste Priorität |
| Demo GIF | ❌ Fehlt |
| Releases | ✅ Vorhanden |
| License | ✅ MIT |

### Screenshots die gebraucht werden

1. **Dashboard** — Daily Quest + Energy Check-in
2. **Topics** — Grid mit Karten + Archivierung
3. **Habits** — GitHub-Style Heatmap
4. **Stats** — Sparklines + Energie-Heatmap
5. **Wishlist** — Items mit Coin-Preisen
6. **(optional) Mobile** — Bottom-Nav, Focus Mode

Format: PNG, 1280×800px (Desktop) oder 390×844px (Mobile).
Ablageort: `public/screenshots/` im Repo, dann im README einbinden.
