# 🪶 Momo – Projekt- & Entwicklungsplan

> *"Steal your time back."*
>
> Momo ist eine Task-Management-App für Menschen mit Vermeidungstendenzen und Prokrastination –
> inspiriert von Michael Endes Roman. Kleine Aufgaben. Jeden Tag ein Schritt. Deine Zeit gehört dir.

**Repository:** [github.com/jp1337/momo](https://github.com/jp1337/momo)  
**Live-Version:** [momotask.app](https://momotask.app)  
**Dokumentation (GitHub Pages):** `https://jp1337.github.io/momo`  
**Lizenz:** MIT

---

## Inhaltsverzeichnis

1. [Vision & Ziele](#1-vision--ziele)
2. [Tech Stack](#2-tech-stack)
3. [Design-System](#3-design-system)
4. [Feature-Spezifikation](#4-feature-spezifikation)
5. [Datenbank-Schema](#5-datenbank-schema)
6. [Architektur & Deployment](#6-architektur--deployment)
7. [CI/CD & Multi-Registry Image Publishing](#7-cicd--multi-registry-image-publishing)
8. [Authentication Setup-Anleitung](#8-authentication-setup-anleitung)
9. [Umgebungsvariablen](#9-umgebungsvariablen)
10. [Umsetzungsplan (Phasen)](#10-umsetzungsplan-phasen)
11. [Projektstruktur](#11-projektstruktur)
12. [GitHub Pages Dokumentation](#12-github-pages-dokumentation)
13. [Offene Entscheidungen & Backlog](#13-offene-entscheidungen--backlog)

---

## 1. Vision & Ziele

### Kernidee

Momo ist **keine klassische To-Do-App**. Sie ist ein täglicher Begleiter für Menschen, die:
- Dazu neigen, Aufgaben aufzuschieben oder zu vermeiden
- Sich von großen Projekten überwältigt fühlen
- Kleine Erfolge brauchen, um Schwung zu bekommen
- Ihren Alltag strukturieren möchten, ohne sich dabei zu überfordern

### Designprinzipien der App

- **Eine Aufgabe pro Tag** – nicht überfordern, sondern ermutigen
- **Klein denken** – große Projekte in winzige Schritte aufbrechen
- **Belohnen, nicht bestrafen** – Gamification motiviert, Fehler schmerzen nicht
- **Überall verfügbar** – PWA, installierbar, offline-fähig
- **Open Source & Self-hosted** – keine Vendor-Lock-ins, volle Datenkontrolle

---

## 2. Tech Stack

### Frontend

| Technologie | Version | Begründung |
|---|---|---|
| **Next.js** | 15 (App Router) | Modern, SSR/SSG, TypeScript-first, PWA-kompatibel, **React-basiert** |
| **TypeScript** | 5.x | Typsicherheit im gesamten Stack |
| **Tailwind CSS** | v4 | Utility-first, kein CSS-Overhead |
| **Framer Motion** | latest | Animationen, Gamification-Effekte, Page Transitions |
| **shadcn/ui** | latest | Komponenten-Basis (stark angepasst) |
| **next-themes** | latest | Light/Dark Mode mit System-Präferenz |

### Backend

| Technologie | Version | Begründung |
|---|---|---|
| **Next.js API Routes** | (integriert) | Kein separater Server nötig |
| **Auth.js (NextAuth)** | v5 | GitHub, Discord, Google, OIDC (Authentik etc.) OAuth |
| **Drizzle ORM** | latest | Typesafe, PostgreSQL-nativ, leichtgewichtig |
| **PostgreSQL** | 16 | Robuste relationale Datenbank |
| **web-push** | latest | VAPID-basierte Browser-Notifications (kostenlos) |

### Infrastruktur & DevOps

| Technologie | Begründung |
|---|---|
| **Docker** | Containerisierung der App |
| **Docker Compose** | Lokale Entwicklungsumgebung (App + PostgreSQL) |
| **Kubernetes** | Produktiv-Deployment im eigenen Cluster |
| **GitHub Actions** | CI/CD Pipeline |
| **GHCR + DockerHub + Quay.io** | Multi-Registry Image Publishing (Redundanz) |
| **GitHub Pages** | Öffentliche Projektdokumentation |

---

## 3. Design-System

### Konzept

**Ästhetik: Cozy & Warm – in Dark und Light gleichermaßen einladend.**

Momo soll sich anfühlen wie ein Abend am Kaminfeuer mit einem guten Buch. Keine sterilen Blautöne, keine harten Kontraste, kein klinisches Weiß. Die App soll ein Ort sein, den man gerne aufmacht – nicht ein weiteres Tool, das sich nach Arbeit anfühlt.

> *"Cozy productivity"* – warm, geerdet, menschlich.

### Farbpalette

```css
/* === Dark Mode – Waldnacht & Laternenschein === */
--bg-primary:     #0f1410;   /* Tiefstes Waldgrün-Schwarz */
--bg-surface:     #161d18;   /* Karten, Panels */
--bg-elevated:    #1e2922;   /* Hover-States, Dropdowns */
--border:         #2e4035;   /* Subtile Trennlinien */
--text-primary:   #ede0c8;   /* Warmes Pergament-Weiß */
--text-muted:     #7a907f;   /* Dezente Texte */
--accent-amber:   #f0a500;   /* Primärer Akzent – warmes Laternenlicht */
--accent-green:   #4a8c5c;   /* Erledigte Aufgaben, Erfolg */
--accent-red:     #b85450;   /* Fehler, Überfällig */
--coin-gold:      #ffd060;   /* Coins, Gamification */

/* === Light Mode – Morgensonne & warmes Papier === */
--bg-primary:     #f7f2e8;   /* Warmes Pergament */
--bg-surface:     #fdf9f2;   /* Karten – fast weiß aber nicht kalt */
--bg-elevated:    #ede5d5;   /* Hover */
--border:         #d6c9b2;   /* Subtile Trennlinien */
--text-primary:   #1e2922;   /* Tiefes Waldgrün statt Schwarz */
--text-muted:     #6b7d6e;
--accent-amber:   #c98a00;   /* Etwas dunkler für Kontrast auf Hell */
--accent-green:   #2e7048;
--accent-red:     #9e3b38;
--coin-gold:      #b8960a;
```

### Typografie

```css
/* Google Fonts / Selbst gehostet */
--font-display: 'Lora', Georgia, serif;         /* Headlines, App-Name */
--font-body:    'JetBrains Mono', monospace;    /* Tasks, Body-Text */
--font-ui:      'DM Sans', sans-serif;          /* UI-Elemente, Buttons */
```

**Begründung:**
- **Lora** – Warm, literarisch, Buch-Charakter passend zur Momo-Referenz
- **JetBrains Mono** – Gibt Tasks einen "Checkliste auf Terminalebene"-Vibe, passend für Sysadmin-Herz
- **DM Sans** – Moderne, gut lesbare UI-Schrift ohne generic zu wirken

### Animationen & Gamification-Effekte

| Effekt | Trigger | Implementierung |
|---|---|---|
| Task-Completion Feuerwerk | Aufgabe abhaken | Canvas-basiert (tsparticles oder custom) |
| Coin-Animation | Coins verdient | Framer Motion, goldene Münze fliegt zu Counter |
| Task "fällt heraus" | Beim Abhaken | Framer Motion `exit` Animation |
| Streak-Puls | Streak > 1 | CSS Pulse-Animation auf dem Flame-Icon |
| Page-Load Stagger | App-Start | Framer Motion `staggerChildren` |
| Level-Up Effekt | Neues Level | Fullscreen-Overlay mit Animation |

---

## 4. Feature-Spezifikation

### 4.1 Authentication

Zwei Kontexte, unterschiedliche Provider-Sets:

| Provider | Live (momotask.app) | Self-hosted |
|---|---|---|
| **GitHub OAuth** | ✅ | ✅ |
| **Discord OAuth** | ✅ | ✅ |
| **Google OAuth** | ✅ | ✅ |
| **OIDC** (Authentik, Keycloak, Zitadel) | — | ✅ (optional) |

- Einmalige globale Registrierung aller OAuth-Apps durch den Betreiber
- Self-Hoster tragen eigene Credentials als Umgebungsvariablen ein
- OIDC wird nur aktiviert wenn `OIDC_ISSUER` gesetzt ist
- Alle Auth-Credentials ausschließlich als Umgebungsvariablen (nie im Repository)

### 4.2 Daily Quest (Tagesaufgabe)

- Jeden Tag wird **eine einzige Aufgabe** vorgeschlagen
- Auswahl-Algorithmus (Priorität absteigend):
  1. Älteste überfällige Aufgabe
  2. Hochpriorisierte Topic-Subtask
  3. Fällige wiederkehrende Aufgabe
  4. Zufällige offene Aufgabe aus dem Pool
- "Heute nicht machbar" → auf morgen verschieben, kein Streak-Verlust beim ersten Mal pro Woche
- Tägliche Push-Notification (Web Push via VAPID) mit der Aufgabe des Tages
- Anzeige auf dem Dashboard als prominente "Hero-Card"

### 4.3 Topics & Subtasks

- **Topic** = Großes Projekt/Thema (z.B. "Umzug", "Steuer 2025")
- Jedes Topic hat:
  - Titel
  - Optionale Beschreibung
  - Farbe/Icon (zur visuellen Unterscheidung)
  - Priorität: `HOCH` / `NORMAL` / `IRGENDWANN`
  - Fortschrittsbalken (erledigte Subtasks / Gesamt)
- **Subtasks** innerhalb eines Topics:
  - Titel
  - Optionales Fälligkeitsdatum
  - Als One-Time oder zur Daily-Quest-Rotation hinzufügbar
- Topics können auch ohne Subtasks existieren (für einzelne Aufgaben mit Kontext)

### 4.4 Wiederkehrende Aufgaben

- Intervalle: `täglich` / `wöchentlich` / `alle 2 Wochen` / `monatlich` / `custom (N Tage)`
- Nach Erledigung: automatisches Zurücksetzen zum nächsten Fälligkeitsdatum
- Verlaufsprotokoll: wann wurde die Aufgabe die letzten X Male erledigt
- Beispiele: Wäsche waschen, Bad putzen, Einkaufen, Sport

### 4.5 Wunschliste & Budget

- Artikel mit:
  - Name
  - Preis (€)
  - Priorität: `Wirklich wollen` / `Nice to have` / `Irgendwann`
  - Optionaler Link (z.B. Amazon, Kleinanzeigen)
  - Status: `Offen` / `Gekauft` / `Verworfen`
- **Monatsbudget** einstellen (in User-Einstellungen)
- Indikator: "Diesen Monat leistbar?" basierend auf Preis vs. verbleibendem Budget
- **Coin-Integration:** Ab einem bestimmten Coin-Level wird ein Artikel als "freigeschaltet" markiert (optionale Gamification-Verknüpfung)
- Gekaufte Artikel werden archiviert (nicht gelöscht) für Ausgabenhistorie

### 4.6 Gamification

| System | Details |
|---|---|
| **Coins** | 1 Coin für normale Aufgabe, 5 für Daily Quest, Bonus bei Streak |
| **Streak** | Tagesstreak: mindestens 1 Aufgabe täglich erledigt |
| **Level** | Basierend auf Gesamt-Coins: Momo-Level mit Titeln (z.B. "Zeitlehrling" → "Zeitwächter") |
| **Feuerwerk** | Canvas-Animation bei Task-Completion (Intensität skaliert mit Coin-Wert) |
| **Achievements** | Meilensteine: "Erste Aufgabe", "7-Tage-Streak", "10 Topics erstellt" etc. |

**Level-Tabelle (Entwurf):**

| Level | Titel | Coins |
|---|---|---|
| 1 | Zeitlehrling | 0 |
| 2 | Aufgabenträger | 50 |
| 3 | Alltagsmeister | 150 |
| 5 | Zeitwächter | 500 |
| 10 | Grauer-Herren-Besieger | 2000 |

### 4.7 PWA & Notifications

- `manifest.json` mit App-Icon, Splashscreen, Shortcut-Links
- Installierbar auf iOS (Safari → "Zum Home-Bildschirm") und Android (Chrome)
- **Offline-Modus:** Tasks können offline gelesen werden (Service Worker Cache)
- **Web Push Notifications:**
  - Tägliche Erinnerung für Daily Quest (konfigurierbare Uhrzeit)
  - Erinnerung für überfällige Aufgaben
  - Streak-Erinnerung ("Du verlierst deinen 5-Tage-Streak!")
  - Technologie: VAPID (kostenlos, kein Drittanbieter)

---

## 5. Datenbank-Schema

### ERD (vereinfacht)

```
users
  ├── id (uuid, PK)
  ├── provider_id (string, unique) -- z.B. "github:12345"
  ├── name (string)
  ├── avatar_url (string, nullable)
  ├── coins (integer, default 0)
  ├── level (integer, default 1)
  ├── streak_current (integer, default 0)
  ├── streak_max (integer, default 0)
  ├── streak_last_date (date, nullable)
  ├── monthly_budget (decimal, nullable)
  ├── notification_enabled (boolean, default false)
  ├── notification_time (time, default '08:00')
  ├── push_subscription (jsonb, nullable) -- VAPID Push-Subscription-Object
  ├── theme (enum: 'light'|'dark'|'system', default 'system')
  └── created_at (timestamp)

topics
  ├── id (uuid, PK)
  ├── user_id (uuid, FK → users)
  ├── title (string)
  ├── description (text, nullable)
  ├── color (string, nullable) -- Hex-Farbe
  ├── icon (string, nullable) -- Emoji oder Icon-Name
  ├── priority (enum: 'HIGH'|'NORMAL'|'SOMEDAY', default 'NORMAL')
  ├── archived (boolean, default false)
  └── created_at (timestamp)

tasks
  ├── id (uuid, PK)
  ├── user_id (uuid, FK → users)
  ├── topic_id (uuid, FK → topics, nullable) -- null = standalone task
  ├── title (string)
  ├── notes (text, nullable)
  ├── type (enum: 'ONE_TIME'|'RECURRING'|'DAILY_ELIGIBLE')
  ├── priority (enum: 'HIGH'|'NORMAL'|'SOMEDAY', default 'NORMAL')
  ├── recurrence_interval (integer, nullable) -- in Tagen, z.B. 7 für wöchentlich
  ├── due_date (date, nullable)
  ├── next_due_date (date, nullable) -- für Recurring Tasks
  ├── completed_at (timestamp, nullable)
  ├── coin_value (integer, default 1)
  ├── is_daily_quest (boolean, default false) -- heute als Daily Quest ausgewählt
  └── created_at (timestamp)

task_completions
  ├── id (uuid, PK)
  ├── task_id (uuid, FK → tasks)
  ├── user_id (uuid, FK → users)
  └── completed_at (timestamp)

wishlist_items
  ├── id (uuid, PK)
  ├── user_id (uuid, FK → users)
  ├── title (string)
  ├── price (decimal, nullable)
  ├── url (string, nullable)
  ├── priority (enum: 'WANT'|'NICE_TO_HAVE'|'SOMEDAY')
  ├── status (enum: 'OPEN'|'BOUGHT'|'DISCARDED', default 'OPEN')
  ├── coin_unlock_threshold (integer, nullable) -- ab welchem Level/Coins "freigeschaltet"
  └── created_at (timestamp)

achievements
  ├── id (uuid, PK)
  ├── key (string, unique) -- z.B. 'first_task', 'streak_7'
  ├── title (string)
  ├── description (string)
  └── icon (string)

user_achievements
  ├── id (uuid, PK)
  ├── user_id (uuid, FK → users)
  ├── achievement_id (uuid, FK → achievements)
  └── earned_at (timestamp)
```

---

## 6. Architektur & Deployment

### Lokale Entwicklung (Docker Compose)

```yaml
# docker-compose.yml (im Repository, keine sensiblen Daten)
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env.local
    depends_on:
      - db

  db:
    image: postgres:18-alpine
    environment:
      POSTGRES_DB: momo
      POSTGRES_USER: momo
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Produktions-Kubernetes-Architektur

```
Kubernetes Cluster (privat, nicht im Repository)
│
├── Namespace: momo
│
├── Deployment: momo-app
│   ├── Image: ghcr.io/jp1337/momo:latest
│   ├── Replicas: 2
│   ├── Resources: 256Mi RAM, 100m CPU (request)
│   └── EnvFrom: Secret/momo-secrets
│
├── Service: momo-app (ClusterIP)
│
├── Ingress: momo.pylypiw.com (Traefik/NGINX)
│   └── TLS: cert-manager (Let's Encrypt)
│
├── StatefulSet: postgres (oder externe DB)
│   └── PVC: 10Gi
│
└── Secret: momo-secrets
    ├── DATABASE_URL
    ├── NEXTAUTH_SECRET
    ├── GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
    ├── DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET
    └── VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
```

> ⚠️ **Wichtig:** Kubernetes-Manifeste mit domain-spezifischen oder privaten Konfigurationen
> werden **nicht** im öffentlichen Repository gespeichert. Das Repository enthält nur
> generische Beispiel-Manifeste in `deploy/examples/`.

---

## 7. CI/CD & Multi-Registry Image Publishing

### Strategie

Um Abhängigkeit von einer einzelnen Container Registry zu vermeiden, wird das Docker Image
bei jedem Release automatisch in drei Registries gepusht:

| Registry | Image-URL | Beschreibung |
|---|---|---|
| **GitHub Container Registry** | `ghcr.io/jp1337/momo` | Primär (eng an GitHub Actions) |
| **Docker Hub** | `jp1337/momo` | Weite Verbreitung, Fallback |
| **Quay.io** | `quay.io/jp1337/momo` | Red Hat-betrieben, stabiler Fallback |

### GitHub Actions Workflow

```yaml
# .github/workflows/build-and-publish.yml
name: Build & Publish

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          registry: docker.io
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Log in to Quay.io
        uses: docker/login-action@v3
        with:
          registry: quay.io
          username: ${{ secrets.QUAY_USERNAME }}
          password: ${{ secrets.QUAY_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ghcr.io/jp1337/momo
            docker.io/jp1337/momo
            quay.io/jp1337/momo
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=sha-

      - name: Build and push to all registries
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64,linux/arm64
```

### GitHub Actions Secrets (einmalig einrichten)

Unter `github.com/jp1337/momo → Settings → Secrets and variables → Actions`:

| Secret | Beschreibung |
|---|---|
| `DOCKERHUB_USERNAME` | Dein Docker Hub Username |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token (nicht Passwort!) |
| `QUAY_USERNAME` | Dein Quay.io Username |
| `QUAY_TOKEN` | Quay.io Robot Account Token |

`GITHUB_TOKEN` wird automatisch von GitHub bereitgestellt.

---

## 8. Authentication Setup-Anleitung

### Überblick

Auth.js (NextAuth v5) wird für alle OAuth-Logins verwendet. Als Betreiber der App registrierst
du die OAuth-Apps **einmal** – alle User können sich dann damit einloggen.

Andere Self-Hoster können eigene Credentials in ihrer `.env` eintragen.

---

### 8.1 GitHub OAuth App registrieren

1. Gehe zu: [github.com/settings/developers](https://github.com/settings/developers)
2. Klicke auf **"New OAuth App"**
3. Fülle aus:
   - **Application name:** `Momo`
   - **Homepage URL:** `https://jp1337.github.io/momo` (GitHub Pages)
   - **Authorization callback URL:** `https://DEINE_DOMAIN/api/auth/callback/github`
     - Für lokale Entwicklung zusätzlich: `http://localhost:3000/api/auth/callback/github`
4. Klicke **"Register application"**
5. Kopiere **Client ID** → `GITHUB_CLIENT_ID`
6. Klicke **"Generate a new client secret"** → `GITHUB_CLIENT_SECRET`

> 💡 Für mehrere Domains (lokal + Produktion) kannst du entweder zwei separate OAuth Apps
> anlegen oder eine App mit mehreren Callback-URLs verwenden (GitHub erlaubt nur eine –
> also zwei Apps: `Momo (Dev)` und `Momo (Prod)` empfohlen).

---

### 8.2 Discord OAuth App registrieren

1. Gehe zu: [discord.com/developers/applications](https://discord.com/developers/applications)
2. Klicke **"New Application"**, Name: `Momo`
3. Gehe zu **OAuth2 → General**
4. Kopiere **Client ID** → `DISCORD_CLIENT_ID`
5. Klicke **"Reset Secret"** → `DISCORD_CLIENT_SECRET`
6. Unter **Redirects** hinzufügen:
   - `https://DEINE_DOMAIN/api/auth/callback/discord`
   - `http://localhost:3000/api/auth/callback/discord`
7. Speichern

---

### 8.3 Google OAuth App registrieren

1. Gehe zu: [console.cloud.google.com](https://console.cloud.google.com)
2. Neues Projekt anlegen: `momo` (oder bestehendes nutzen)
3. Navigiere zu **APIs & Services → Credentials**
4. Klicke **"+ Create Credentials" → "OAuth client ID"**
5. Application type: **Web application**, Name: `Momo`
6. Unter **Authorized redirect URIs** hinzufügen:
   - `https://momotask.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
7. Klicke **"Create"**
8. Kopiere **Client ID** → `GOOGLE_CLIENT_ID`
9. Kopiere **Client Secret** → `GOOGLE_CLIENT_SECRET`

> 💡 Unter **OAuth consent screen** muss die App konfiguriert werden:
> - User Type: **External** (damit alle sich einloggen können)
> - App Name: `Momo`, Support Email, Logo
> - Scopes: `email`, `profile` (reicht aus)
> - Für die Live-Version muss die App aus dem Test-Modus in den Produktiv-Modus verschoben werden (Verification durch Google bei >100 Usern)

### 8.4 OIDC für Self-Hoster (Authentik, Keycloak, Zitadel)

Für Self-Hoster, die einen eigenen Identity Provider (IdP) wie Authentik betreiben:

**Umgebungsvariablen:**
```env
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_ISSUER=https://auth.your-domain.com/application/o/momo/
```

**In Authentik:**
1. Neue OAuth2/OpenID Provider Applikation anlegen
2. Redirect URI: `https://DEINE_MOMO_DOMAIN/api/auth/callback/oidc`
3. Client ID und Secret in `.env` eintragen

Auth.js wird so konfiguriert, dass OIDC nur aktiviert wird, wenn `OIDC_ISSUER` gesetzt ist.

---

### 8.5 VAPID Keys für Web Push generieren

VAPID-Keys werden lokal generiert – kein Dienst, keine Kosten:

```bash
# Im Projekt-Verzeichnis (Node.js muss installiert sein)
npx web-push generate-vapid-keys
```

Output:
```
Public Key: BExample...
Private Key: example...
```

Beide Keys in `.env` eintragen:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BExample...
VAPID_PRIVATE_KEY=example...
VAPID_CONTACT=mailto:deine@email.com
```

---

## 9. Umgebungsvariablen

### Vollständige `.env.example` (im Repository)

```env
# ==========================================
# Momo – Environment Variables
# Kopiere diese Datei als .env.local
# ==========================================

# --- Database ---
DATABASE_URL=postgresql://momo:password@localhost:5432/momo

# --- Auth.js ---
# Zufälliger 32-Zeichen-String: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# --- GitHub OAuth ---
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# --- Discord OAuth ---
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# --- Google OAuth ---
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# --- OIDC (optional, z.B. Authentik) ---
# Wird nur aktiviert wenn OIDC_ISSUER gesetzt ist
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
OIDC_ISSUER=

# --- Web Push (VAPID) ---
# Generieren mit: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CONTACT=mailto:admin@example.com

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

> `.env.local` und alle Dateien mit echten Werten sind in `.gitignore` eingetragen.
> **Niemals** echte Credentials committen.

---

## 10. Umsetzungsplan (Phasen)

### Phase 1 – Fundament & Setup

**Ziel:** Lauffähige App-Basis mit Auth und DB-Verbindung

- [ ] GitHub Repository `momo` anlegen (MIT Lizenz, README, .gitignore)
- [ ] Next.js 15 + TypeScript + Tailwind v4 initialisieren
- [ ] Projekt-Struktur anlegen (siehe Abschnitt 11)
- [ ] Docker Compose Setup (App + PostgreSQL)
- [ ] Drizzle ORM konfigurieren + erstes Schema + Migration
- [ ] Auth.js v5 einrichten (GitHub + Discord Provider)
- [ ] OIDC-Provider als optionalen dritten Provider einbinden
- [ ] Design-System implementieren (CSS-Variablen, Dark/Light Mode, Fonts)
- [ ] Basis-Layout: Navigation, Dashboard-Shell, Theme-Toggle

**Abnahmekriterium:** Login mit GitHub/Discord funktioniert, User wird in DB gespeichert,
Dark/Light Mode Toggle funktioniert.

---

### Phase 2 – Core Task Features

**Ziel:** Aufgaben erstellen, verwalten, abhaken

- [ ] Task CRUD (erstellen, bearbeiten, löschen)
- [ ] Topics erstellen mit Subtasks
- [ ] Aufgaben abhaken mit Completion-Logik
- [ ] Wiederkehrende Aufgaben mit Auto-Reset
- [ ] Prioritäten und Fälligkeitsdaten
- [ ] Einfache Listenansicht + Topic-Detailansicht

**Abnahmekriterium:** Vollständiger Task-Lifecycle funktioniert.

---

### Phase 3 – Daily Quest Algorithmus

**Ziel:** Tagesaufgabe auswählen und prominent anzeigen

- [ ] Daily Quest Algorithmus implementieren (Prioritätslogik)
- [ ] Tägliche Auswahl (einmal pro Tag, reset um Mitternacht)
- [ ] "Heute nicht" Button mit Verschiebe-Logik
- [ ] Daily Quest Hero-Card auf dem Dashboard
- [ ] Cron-Job / Scheduled Function für tägliche Auswahl

**Abnahmekriterium:** Jeden Tag wird eine passende Aufgabe vorgeschlagen.

---

### Phase 4 – Gamification

**Ziel:** Belohnungssystem motiviert zur täglichen Nutzung

- [ ] Coin-System (verdienen bei Task-Completion)
- [ ] Streak-Tracking (täglicher Streak-Counter)
- [ ] Level-System mit Titeln
- [ ] Achievements mit Unlock-Logic
- [ ] Feuerwerk-Animation (Canvas/tsparticles) bei Task-Completion
- [ ] Coin-Flug-Animation (Framer Motion)
- [ ] Level-Up Effekt
- [ ] Streak-Puls-Animation

**Abnahmekriterium:** Coins, Streaks und Levels funktionieren, Animationen laufen flüssig.

---

### Phase 5 – Wunschliste & Budget

**Ziel:** Bewusstes Ausgaben-Management

- [ ] Wishlist CRUD
- [ ] Preis und Priorität
- [ ] Monatliches Budget in User-Einstellungen
- [ ] "Diesen Monat leistbar?"-Indikator
- [ ] Coin-Unlock Verknüpfung (optional)
- [ ] Ausgabenhistorie (gekaufte Items)

---

### Phase 6 – PWA & Push Notifications

**Ziel:** App auf dem Handy installierbar, Notifications funktionieren

- [ ] `manifest.json` mit Icons (alle Größen)
- [ ] Service Worker (next-pwa oder custom)
- [ ] Offline-Caching für Dashboard
- [ ] VAPID Push Setup (Server-seitig)
- [ ] Notification Permission Flow (UI)
- [ ] Push-Subscription in DB speichern
- [ ] Daily Quest Notification (Cron-gesteuert)
- [ ] Streak-Reminder Notification
- [ ] Konfigurierbare Notification-Uhrzeit in Einstellungen

---

### Phase 7 – Deployment & Hardening

**Ziel:** Produktionsreife App, sicher im Internet hostbar

- [ ] Dockerfile optimieren (Multi-stage Build, non-root User)
- [ ] GitHub Actions: Build + Multi-Registry Push (GHCR + DockerHub + Quay)
- [ ] Generische Kubernetes Beispiel-Manifeste (`deploy/examples/`)
- [ ] Security Headers (CSP, HSTS, X-Frame-Options via Next.js Config)
- [ ] Rate Limiting auf API Routes
- [ ] Input-Validierung (Zod) auf allen API Routes
- [ ] `NEXTAUTH_SECRET` Rotation-Doku
- [ ] Produktions-Checklist im README

---

### Phase 8 – GitHub Pages Dokumentation

**Ziel:** Öffentliche Projektseite für andere Self-Hoster

- [ ] GitHub Pages aktivieren (Branch `gh-pages` oder Ordner `docs/`)
- [ ] Landing Page für das Projekt
- [ ] Installations- und Deployment-Anleitung
- [ ] Umgebungsvariablen-Referenz
- [ ] OAuth App Registrierungs-Guide
- [ ] Kubernetes Deployment Guide (generisch)
- [ ] Contributing Guide

---

### Backlog / Zukunft

- [ ] **SEO** – Meta-Tags, Open Graph, sitemap.xml, robots.txt
- [ ] **i18n** – Mehrsprachigkeit (DE/EN als Start)
- [ ] **API** – REST/tRPC API für externe Integrationen
- [ ] **iOS/Android App** – Capacitor oder React Native Wrapper
- [ ] **Import** – Tasks aus Textdatei, Notion, Todoist importieren
- [ ] **Sharing** – Topics/Tasks mit anderen teilen (kollaborativ)
- [ ] **Statistics** – Auswertung der erledigten Aufgaben über Zeit
- [ ] **Smart Suggestions** – KI-gestützte Aufgaben-Vorschläge

---

## 11. Projektstruktur

```
momo/
├── .github/
│   └── workflows/
│       ├── build-and-publish.yml   # CI/CD Multi-Registry
│       └── deploy-docs.yml         # GitHub Pages
│
├── app/                            # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   ├── tasks/
│   │   ├── topics/
│   │   │   └── [id]/
│   │   ├── recurring/
│   │   ├── wishlist/
│   │   ├── settings/
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── tasks/
│   │   ├── topics/
│   │   ├── wishlist/
│   │   ├── daily-quest/
│   │   ├── push/
│   │   │   ├── subscribe/
│   │   │   └── send/
│   │   └── cron/
│   │       ├── daily-quest/        # Täglich: Daily Quest auswählen
│   │       └── push-notifications/ # Täglich: Notifications senden
│   ├── globals.css
│   ├── layout.tsx
│   └── manifest.ts                 # PWA Manifest
│
├── components/
│   ├── ui/                         # shadcn/ui Basis-Komponenten
│   ├── tasks/
│   ├── topics/
│   ├── gamification/
│   │   ├── Fireworks.tsx
│   │   ├── CoinAnimation.tsx
│   │   ├── StreakCounter.tsx
│   │   └── LevelBadge.tsx
│   ├── daily-quest/
│   ├── wishlist/
│   └── layout/
│       ├── Sidebar.tsx
│       ├── Header.tsx
│       └── ThemeToggle.tsx
│
├── lib/
│   ├── db/
│   │   ├── schema.ts               # Drizzle Schema
│   │   ├── index.ts                # DB-Verbindung
│   │   └── migrations/
│   ├── auth/
│   │   └── config.ts               # Auth.js Config
│   ├── daily-quest/
│   │   └── algorithm.ts            # Quest-Auswahl-Logik
│   ├── gamification/
│   │   └── index.ts                # Coins, Streak, Level
│   ├── push/
│   │   └── index.ts                # Web Push / VAPID
│   └── validators/
│       └── *.ts                    # Zod-Schemas
│
├── public/
│   ├── icons/                      # PWA Icons (alle Größen)
│   └── fonts/                      # Self-hosted Fonts (optional)
│
├── docs/                           # GitHub Pages Inhalt
│   ├── index.md
│   ├── deployment.md
│   ├── environment-variables.md
│   ├── oauth-setup.md
│   └── kubernetes.md
│
├── deploy/
│   └── examples/                   # Generische K8s Beispiel-Manifeste
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       └── secret.example.yaml
│
├── .env.example                    # Vorlage ohne echte Werte
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── LICENSE
└── README.md
```

---

## 12. GitHub Pages Dokumentation

Die öffentliche Dokumentation wird unter `https://jp1337.github.io/momo` gehostet.

**Inhalt:**

- **Landing Page** – Was ist Momo, Features, Screenshots
- **Getting Started** – Quickstart mit Docker Compose
- **Self-Hosting** – Vollständige Deployment-Anleitung
- **Kubernetes** – Generischer Guide (ohne domain-spezifische Infos)
- **Umgebungsvariablen** – Vollständige Referenz aller ENV-Variablen
- **OAuth Setup** – Schritt-für-Schritt für GitHub, Discord, OIDC
- **Contributing** – Wie man zum Projekt beitragen kann

**Technologie:** GitHub Pages mit [Jekyll](https://jekyllrb.com/) oder einfachem Markdown + `just-the-docs`-Theme.

**Deployment:** Automatisch via GitHub Actions bei Push auf `main` (Ordner `docs/`).

---

## 13. Offene Entscheidungen & Backlog

### Zu klären vor Phase 1

| # | Thema | Status |
|---|---|---|
| 1 | GitHub OAuth App registrieren (Dev + Prod) | ⬜ Anleitung in Abschnitt 8.1 |
| 2 | Discord OAuth App registrieren | ⬜ Anleitung in Abschnitt 8.2 |
| 3 | Docker Hub Account anlegen (falls nicht vorhanden) | ⬜ hub.docker.com |
| 4 | Quay.io Account anlegen | ⬜ quay.io |
| 5 | GitHub Actions Secrets einrichten | ⬜ nach OAuth App Setup |
| 6 | VAPID Keys generieren | ⬜ Anleitung in Abschnitt 8.4 |
| 7 | PostgreSQL: Im Cluster als StatefulSet oder separat? | ⬜ Empfehlung: StatefulSet in Namespace `momo` |

### Technische Entscheidungen (können später getroffen werden)

| Thema | Optionen | Empfehlung |
|---|---|---|
| Cron für Daily Quest | Vercel Cron / Kubernetes CronJob / externe Lösung | Kubernetes CronJob |
| Font-Hosting | Google Fonts CDN / Self-hosted | Self-hosted (Datenschutz) |
| Icon-Set | Lucide / Phosphor / Heroicons | Phosphor (mehr Charakterstil) |
| Animationen | Framer Motion / CSS-only / Hybrid | Framer Motion + CSS für einfache |

---

*Dokument erstellt: März 2026*  
*Autor: jp1337*  
*Status: Phase 1 – Bereit zum Start 🚀*
