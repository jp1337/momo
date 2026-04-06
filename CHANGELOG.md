# Changelog

All notable changes to Momo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

- **Focus Mode** — Neue Seite (`/focus`) zeigt eine ablenkungsfreie Ansicht mit nur zwei Elementen: Tagesquest + Quick Wins (Aufgaben ≤ 15 Minuten). Volle Completion-Animationen (Konfetti, Coins, Level-Up, Achievements). "Alles geschafft"-Feierzustand wenn Quest und alle Quick Wins erledigt. Atmosphärischer Header mit grünem Glow. Neuer Einstiegspunkt auf dem Dashboard (grüner CTA-Banner). Navigation: Sidebar (Desktop), Mobile-Nav (ersetzt 5-Min), User-Menü. Dreisprachig (DE/EN/FR).
- **Energie-Filter** — Tasks können mit einem Energielevel (Hoch / Mittel / Niedrig) getaggt werden. Vor der täglichen Quest fragt das Dashboard "Wie fühlst du dich heute?" — die Quest-Auswahl bevorzugt dann passende Tasks. Soft Preference: wenn keine energy-passenden Tasks existieren, wird trotzdem eine Quest gewählt. Ungetaggte Tasks passen zu jedem Energielevel. Neues Formularfeld im Task-Erstellen/Bearbeiten-Dialog, Energy-Badge auf Task-Items, Match-Badge auf der Quest-Karte. Neuer API-Endpoint `POST /api/energy-checkin`. Dreisprachig (DE/EN/FR). Refactoring: `forceSelectDailyQuest()` nutzt jetzt den gemeinsamen `pickBestTask()`-Algorithmus (eliminiert ~60 Zeilen Duplikat-Code).
- **Wöchentlicher Rückblick** — Dedizierte Seite (`/review`) zeigt die wöchentliche Performance-Zusammenfassung: Abschlüsse (mit Vergleich zur Vorwoche), Verschiebungen, verdiente Coins, Streak, neu erstellte Aufgaben und Top-Themen. Motivierende Nachricht basierend auf der Wochenleistung. Wöchentliche Push-Benachrichtigung jeden Sonntag um 18:00 Uhr (lokale Zeit des Nutzers). Neue `quest_postponements`-Tabelle für präzise Verschiebungs-Analyse. Dreisprachig (DE/EN/FR). Zugang über User-Menü (Avatar-Dropdown).
- **Unified Cron Dispatcher** — Alle Cron-Jobs (daily-quest, streak-reminder, weekly-review) laufen jetzt über einen einzigen Endpoint `POST /api/cron` und einen zentralen Dispatcher in `lib/cron.ts`. Neue Jobs erfordern nur noch einen Eintrag im `CRON_JOBS`-Array — keine Docker-Compose-Änderungen nötig. Jeder Job hat eigene Idempotenz-Guards (5-Minuten-Bucket oder täglich). Der Docker-Cron-Container ruft nur noch eine URL auf.
- **Emotionaler Abschluss** — Nach Abschluss der Tagesquest erscheint ein sanftes Zitat (Michael Ende) oder eine Aufmunterung. Tagesbasierte Auswahl (jeden Tag ein anderes Zitat, stabil bei Refresh). 12 Zitate pro Sprache (6 Michael-Ende-Zitate + 6 Affirmationen). Abschaltbar in den Einstellungen. Dreisprachig (DE/EN/FR). Framer-Motion-Animation mit verzögertem Fade-in.
- **"Ich hab nur 5 Minuten"-Modus** — Dedizierte Seite (`/quick`) zeigt nur Aufgaben mit Zeitschätzung ≤ 5 Minuten. Aufgaben sind direkt abschließbar mit Konfetti, Coins, Level-Up und Achievements. Prominenter CTA-Banner auf dem Dashboard (nur sichtbar wenn 5-Min-Aufgaben existieren). Neuer Eintrag in Sidebar und mobiler Navigation (Blitz-Icon). Leerer Zustand mit Hinweis, Zeitschätzungen hinzuzufügen. Dreisprachig (DE/EN/FR).
- **Snooze / Aufgabe pausieren** — Tasks können bis zu einem Datum pausiert werden ("Erinnere mich ab [Datum]"). Pausierte Tasks verschwinden aus der Aufgabenliste, Quick Wins und Tagesquest. Schnelloptionen: Morgen, Nächste Woche, In einem Monat, oder eigenes Datum. Tasks tauchen automatisch wieder auf, wenn das Datum erreicht ist. Neue API-Endpunkte: `POST/DELETE /api/tasks/:id/snooze`. Pausierte Tasks erscheinen in einer kollabierbaren "Pausiert"-Sektion. Wird die aktive Tagesquest pausiert, wird automatisch eine neue Quest gewählt.
- **Suche & Filter** — Volltextsuche und Filter-Chips auf der Tasks- und Wunschlisten-Seite. Tasks können nach Priorität und Thema gefiltert werden, Wishlist-Items nach Priorität. Die Suche durchsucht Titel und Notizen (Tasks) bzw. Titel (Wishlist). Alles client-seitig, kein API-Roundtrip.
- **Custom Error Pages** — eigene 404- und 500-Seite im Momo-Design (Lora-Schrift, Amber-Akzent, Waldgrün-Ästhetik, fliegende Animationsziffer). Beide Seiten unterstützen Dark- und Light-Mode vollständig. Die 500-Seite zeigt in der Entwicklungsumgebung den Fehlertext an und bietet "Neu laden" + "Zurück zur App".
- **Alexa Skill** — Spracheingabe für Momo via Amazon Echo: Tasks hinzufügen ("füge Zahnarzt hinzu"), Daily Quest abfragen ("was ist meine Quest?"), Aufgaben auflisten ("liste meine Aufgaben"), Wunschliste befüllen ("füge Milch zur Einkaufsliste hinzu"). Lambda-Code und Interaction Models in `alexa-skill/`.
- **Alexa Account Linking** — Alle Momo-User können ihren Account über die Alexa-App verknüpfen. Neuer OAuth 2.0 Implicit Grant Endpoint `GET /api/alexa/auth`: User wird eingeloggt, Momo erstellt automatisch einen API-Schlüssel "Alexa" und übergibt ihn an Amazon.
- **Swipe-Gesten auf Mobile** — Wischgeste auf Task-Items: rechts = erledigen (grüner Hintergrund), links = löschen (roter Hintergrund). Wishlist-Items (Status OPEN): rechts = kaufen, links = ablegen. Vertikales Scrollen bleibt unberührt.
- **Confetti beim Wishlist-Kauf** — Konfetti-Animation beim Markieren eines Wunschlisten-Artikels als gekauft, analog zu Task-Abschlüssen.
- **Daily Quest wechselt täglich** — Eine nicht abgeschlossene Quest wird am nächsten Tag zurückgesetzt und neu vergeben. Neue DB-Spalte `daily_quest_date` auf `tasks` verhindert, dass dieselbe Quest mehrere Tage in Folge erscheint.
- **Task-Titel in Push-Benachrichtigungen** — Die tägliche Quest-Benachrichtigung enthält jetzt den Namen der Quest, z. B. "Heutige Mission: Zahnarzt anrufen".

### Changed

- **Einheitliche Edit/Delete-Buttons** — Tasks, Topics und Wishlist-Kacheln zeigen Edit (✎) und Delete (✕) jetzt an derselben Position (oben rechts) mit derselben Stilistik. Lange Titel werden nicht mehr abgeschnitten und laufen nicht in die Icons.
- **CI/CD Pipeline ~25 s schneller** — Registry-Pushes (GHCR, Docker Hub, Quay.io) laufen jetzt parallel im merge-Job. `node_modules` wird gecacht und `npm ci` bei unverändertem Lock-File übersprungen. TypeScript-Check und ESLint laufen im lint-Job parallel.

### Fixed

- **Cron-Status auf Admin-Seite**: Status-Banner (grün/rot) und History-Tabelle mit den letzten 20 Push-Cron-Läufen (Zeitpunkt, Gesendet, Fehler, Dauer). Rot wenn letzter Lauf älter als 15 Minuten.
- **Cron-Status im Health-Endpoint**: `GET /api/health` enthält jetzt ein nicht-blockierendes `cron`-Objekt mit `lastRunAt` und `minutesSinceLastRun`.
- **PATCH /api/push/subscribe**: Neuer Endpoint zum Aktualisieren der Benachrichtigungszeit ohne erneutes Subscriben.
- **Google OAuth** auf der Live-Version aktiviert.

### Fixed

- **Push-Benachrichtigungen**: Vier Bugs behoben — kein Cron-Service, `notificationTime` wurde ignoriert, Zeitänderung wurde silently verworfen (Zod 422), Idempotenz-Guard war falsch konfiguriert.
- **Cron-Intervall 5 Minuten**: Beliebige Zeiten in 5-Minuten-Schritten (z.B. 06:30, 08:00) werden korrekt getriggert.
- **Docker Compose `cron`-Service**: Neuer Container (`alpine:3` + curl) startet automatisch mit dem Stack und ruft alle 5 Minuten `POST /api/cron/daily-quest` auf.
- **Cron-History**: Letzte 30 Tage werden in der `cron_runs`-Tabelle gespeichert, ältere Rows werden automatisch bereinigt.

#### Code-Qualität & Robustheit (2026-04-05)

- **Wiederkehrende Tasks erstellen korrektes Fälligkeitsdatum**: `nextDueDate` bei wiederkehrenden Aufgaben wird jetzt in der lokalen Zeitzone des Nutzers berechnet, nicht mehr in UTC. Ein Task, der um Mitternacht in UTC+2 erstellt wird, erhält den richtigen lokalen Folgetag als Fälligkeitsdatum.
- **Task Breakdown zählt alle Subtasks**: Der globale `totalTasksCreated`-Zähler wird beim Aufteilen einer Aufgabe korrekt um die Anzahl der erstellten Subtasks erhöht (nicht nur um 1).
- **Daily Quest berücksichtigt Zeitzone überall**: Tagesquest-Auswahl, beste Task-Auswahl und erzwungene Quest-Auswahl verwenden jetzt einheitlich die Zeitzone des Nutzers. Die Zeitzone kann per Query-Parameter (`?timezone=`) bzw. Request-Body übergeben werden.
- **Coin-Event-System stabilisiert**: Das clientseitige Coin-Event wird nicht mehr im Server-Side-Rendering ausgelöst (SSR-Guard). Toter TypeScript-Code wurde entfernt.
- **Timezone-Validierung zentralisiert**: Die `TimezoneSchema`-Validierung in der Postpone-Route verwendet jetzt das gemeinsame Schema aus `lib/validators/` statt einer lokalen Inline-Definition.
- **Achievement-Fehler blockieren nicht mehr den Task-Abschluss**: Schlägt die Errungenschaftsprüfung beim Abschließen einer Aufgabe fehl, wird der Fehler abgefangen und protokolliert — der Abschluss selbst bleibt davon unberührt.
- **Datenbank-Migrationsskript mit Verbindungs-Timeout**: Alle Datenbankverbindungen im Migrationsskript setzen jetzt einen `statement_timeout` von 30 Sekunden, einschließlich der Drizzle-ORM-Migration selbst.

#### Statistikseite — Topic-Icons (2026-04-05)

- **Topic-Icons in der Statistikseite werden korrekt dargestellt**: Statt des rohen Icon-Namens (z. B. "house", "camera") wird jetzt das tatsächliche FontAwesome-Icon gerendert.

#### Formular-Darstellung auf Mobilgeräten (2026-04-05)

- **Task-Formular-Modal überlappt nicht mehr die Navigation**: Das Speichern/Abbrechen-Buttons im Task-Formular werden auf Mobilgeräten nicht mehr von der unteren Navigationsleiste verdeckt. Das Modal nutzt jetzt die volle Bildschirmhöhe (`100dvh`) auf Mobilgeräten und eine begrenzte Höhe auf dem Desktop.

---

### Fixed

**Timezone-aware streak & postpone (2026-04-04)**

- **Timezone-korrekte Streak-Berechnung**: Streak und Verschiebungs-Datum werden jetzt in der lokalen Zeitzone des Nutzers berechnet. Ein Task-Abschluss um 23:50 Uhr in UTC+2 wird korrekt dem lokalen Tag gutgeschrieben, nicht dem nächsten UTC-Tag. Die Zeitzone wird vom Browser mitgesendet (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- **Coin-Counter im Navbar aktualisiert sich sofort**: Beim Abhaken einer Aufgabe steigt der Coin-Zähler oben sofort. Beim Rückgängigmachen (Uncomplete) sinkt er entsprechend.
- **Task-Zähler in der Aufgabenliste aktualisiert sich live**: Der "X aktiv · Y erledigt"-Untertitel in der Aufgabenliste reagiert jetzt direkt auf Abschlüsse — kein Seiten-Reload nötig.
- **Topic-Detailseite: vollständige Abschluss-Animationen**: Konfetti, Coin-Counter-Update, Level-Up-Overlay und Achievement-Toasts funktionieren jetzt auch beim Abhaken von Aufgaben innerhalb eines Topics.
- **Topic-Detailseite: Aufgabe bearbeiten zeigt alle Felder**: Beim Bearbeiten einer Subtask werden jetzt `estimatedMinutes`, `notes` und `recurrenceInterval` korrekt vorgeladen.
- **Konfetti-CSP-Fix**: `canvas-confetti` verwendet intern einen Web Worker aus einer Blob-URL — `worker-src blob:` wurde in der Content-Security-Policy ergänzt.
- **Produktions-Migration fix**: `scripts/migrate.mjs` erkennt jetzt auch `ALTER TABLE ADD COLUMN`-Migrationen, die außerhalb von Drizzle angewendet wurden. Verhindert den Container-Start-Fehler "column already exists".

---

### Added

**Phase 11 — Neue Features + UI-Redesign (2026-04-03)**

- **Prokrastinations-Zähler**: `postponeCount` auf Tasks trackt wie oft eine Aufgabe verschoben wurde
- **Quest-Verschiebe-Limit**: User können in den Einstellungen konfigurieren, wie oft sie täglich verschieben dürfen (1–5, default 3)
- **Bonus-Coins**: Tasks mit 3+ Verschiebungen geben beim Abschließen doppelte Coins
- **Task Breakdown**: "Aufteilen"-Button auf jedem Task erstellt ein neues Topic mit Subtasks (Original wird gelöscht)
- **Zeitschätzung**: `estimatedMinutes` (5/15/30/60 min) auf Tasks; Badge im Task-Item
- **Quick Wins**: Dashboard-Sektion zeigt Tasks mit Zeitschätzung ≤ 15 Minuten
- **Öffentliche Landing Page**: Atmosphärische Startseite im Momo-Stil (Lora italic, Waldgrün, Feather-Animation, Michael-Ende-Zitat)
- **Dashboard Redesign**: Kursive Lora-Begrüßung, atmosphärische Hintergrund-Glows, Stat-Karten mit Tier-Indikatoren

**Nutzer- und Admin-Statistiken (2026-04-03)**

- `lib/statistics.ts` — `getUserStatistics()` und `getAdminStatistics()` mit parallelen Drizzle-Abfragen
- `/stats` — Nutzerstatistiken-Seite (Server Component):
  - Übersichtskarten: Aufgaben, Abschlüsse, Streak, Bester Streak
  - Fortschrittsbereich: Level-Badge mit deutschem Titel, Coin-Guthaben, Fortschrittsbalken zum nächsten Level
  - Aktivitätsbereich: Abschlüsse letzte 7 und 30 Tage, offene Aufgaben
  - Aufgaben nach Typ (Einmalig / Wiederkehrend / Tagesquest-fähig) mit Prozentstabs
  - Aufgaben nach Priorität (Hoch / Normal / Irgendwann)
  - Topics mit Fortschrittsbalken pro Topic
  - Errungenschaften: verdiente mit Datum, gesperrte mit Schloss-Icon und reduzierter Opacity
  - Wunschliste: Gekauft, Ausgegeben (€), Offen, Verworfen
- `/admin` — Admin-Statistiken-Seite (Server Component):
  - Zugriffschutz via `ADMIN_USER_IDS` Umgebungsvariable (kein Redirect, zeigt "Zugriff verweigert")
  - System-Übersicht: Nutzer, Aufgaben, Abschlüsse, Topics
  - Nutzerwachstum (7d/30d), Aktivität (7d/30d), Durchschnittswerte (Level, Coins, Streak)
  - OAuth-Provider-Tabelle mit Anteilen
  - Top-10-Nutzer-Tabelle nach Abschlüssen
  - Errungenschaften-Verteilung mit Anteilen
  - Wunschliste-Aggregat (Total gekauft, Total ausgegeben)
- `components/layout/user-menu.tsx` — "Statistiken"-Link (faChartBar) + optionaler "Admin"-Link (faShieldHalved) für Admins
- `components/layout/navbar.tsx` — `isAdmin?: boolean` prop durchgereicht
- `app/(app)/layout.tsx` — Admin-Prüfung via `ADMIN_USER_IDS`, `isAdmin` an Navbar übergeben
- `ADMIN_USER_IDS` Umgebungsvariable dokumentiert in `.env.example` und `docs/environment-variables.md`

**Public REST API + Personal Access Tokens + Swagger UI (2026-04-03)**

- `lib/openapi.ts` — vollständige OpenAPI 3.1.0 Spezifikation (29 Endpunkte, 8 Tags, alle Schemas)
- `GET /api/openapi.json` — Maschinenlesbare Spec (öffentlich, Cache 5 Min.)
- `/api-docs` — Interaktive Swagger UI (öffentlich, kein Auth nötig)
  - Authorize via Bearer Token oder Session Cookie
  - "Try it out" für alle Endpunkte direkt im Browser
- `api_keys`-Tabelle — Mehrere Keys pro User, Read-Only-Option, Ablaufdatum
- `lib/api-keys.ts` — `generateApiKey()` (256-bit Entropie), `createApiKey()`, `listApiKeys()`, `revokeApiKey()`, `resolveApiKeyUser()`
- `lib/api-auth.ts` — `resolveApiUser()` — Bearer Token + Session Cookie, `readonlyKeyResponse()`
- Alle ~18 API-Routen auf `resolveApiUser()` migriert (Bearer Token + Session Cookie)
- Read-Only-Keys erhalten `403 Forbidden` auf POST/PATCH/DELETE-Routen
- `GET /api/user/api-keys` — Liste aktiver Keys (ohne Hash)
- `POST /api/user/api-keys` — Erstellt neuen Key (Klartext wird einmalig zurückgegeben, rate limit: 10/h)
- `DELETE /api/user/api-keys/:id` — Widerruft Key
- `/api-keys` Seite — API Key Verwaltung mit Formular, einmaliger Klartextanzeige + Copy-Button
- `components/layout/user-menu.tsx` — Avatar-Dropdown (Einstellungen / API Keys / Abmelden)

**Logo SVG + Favicon (2026-04-03)**

- `public/icon.svg` — Stilisiertes Feder-Icon in Amber (#f0a500)
- `app/icon.svg` — Next.js Favicon auto-discovery
- `app/apple-icon.svg` — Apple Touch Icon
- `public/logo.svg` — Wortmarke: Feder + "momo" in Lora-Schrift
- `public/manifest.json` — SVG als primäres PWA-Icon
- Navbar: Feder-SVG + "momo" in Lora statt 🪶 Emoji-Text
- Login: `logo.svg` als `<Image>` statt Text-H1

**Font Awesome Icons (lokal, kein CDN) (2026-04-03)**

- `@fortawesome/fontawesome-svg-core` + `free-solid-svg-icons` + `free-brands-svg-icons` + `react-fontawesome` installiert
- `config.autoAddCss = false` in `app/layout.tsx` — verhindert doppeltes Stylesheet
- Sidebar: faHouse / faListCheck / faFolderOpen / faStar / faGear
- ThemeToggle: faMoon / faSun / faDesktop
- CoinCounter: faCoins
- Dashboard-Stats: faCoins / faFire / faTrophy / faCircleCheck
- Login-Provider: faGithub / faDiscord / faGoogle / faKey

**Account Linking — mehrere OAuth-Provider verbinden (2026-04-03)**

- `linking_requests`-Tabelle — Short-lived tokens für OAuth-Account-Linking (5 Min. TTL)
- `POST /api/auth/link-request` — Erstellt Linking-Token, gibt OAuth-Redirect-URL zurück
- `GET /api/auth/link-callback` — Mergt neuen OAuth-Account auf Original-User nach OAuth-Flow
- `components/settings/linked-accounts.tsx` — Provider-Liste mit Status-Badges + "Verbinden"-Button
- Settings-Seite: Neue Sektion "Verbundene Konten" (vor Gefahrenzone)
- i18n: `section_linked_accounts` + `linked_accounts_hint` in DE/EN/FR

**DSGVO Compliance + Performance (2026-04-03)**

- Self-hosted Google Fonts via `next/font/google` — no more CDN requests to `fonts.googleapis.com` at runtime (DSGVO + performance)
- `GET /api/user/export` — personal data export as JSON download (DSGVO Art. 15/20, rate limit: 5/hour)
- `DELETE /api/user` — account deletion with full CASCADE across all tables (DSGVO Art. 17)
- `/impressum` and `/datenschutz` legal pages — env-var driven, publicly accessible, no auth required
- Login page footer with Impressum and Datenschutz links
- "Daten exportieren" button in Settings page (section above Danger Zone)
- "Konto löschen" two-step confirmation in Settings page Danger Zone
- `docs/gdpr.md` — DSGVO compliance guide for operators
- `NEXT_PUBLIC_IMPRINT_*` environment variables added to `.env.example` and all docs
- CSP headers updated: `fonts.googleapis.com` and `fonts.gstatic.com` removed (no longer needed)

**Multilingual Support (2026-04-03)**

- `next-intl` integration — cookie-based locale detection, no URL prefix changes
- Three supported languages: German (`de`, default), English (`en`), French (`fr`)
- All UI strings extracted into `messages/de.json`, `messages/en.json`, `messages/fr.json`
- Language switcher in Settings (🇩🇪 / 🇬🇧 / 🇫🇷 buttons)
- `POST /api/locale` — sets the `locale` cookie
- Locale resolution order: cookie → `Accept-Language` header → default `de`
- Adding new languages requires only a `messages/XX.json` file — no code changes

**Dark Mode Redesign — "Warme Dämmerung" (2026-04-03)**

- Background lightness raised from L 7–14% to L 12–20% — no longer oppressively dark
- Improved layer separation: `bg-primary` / `bg-surface` / `bg-elevated` now clearly distinguishable
- Border opacity increased (L 22% → L 30%) for better visibility
- Shadow opacity reduced (0.40–0.60 → 0.30–0.45) for a softer feel
- Light mode unchanged

**CI/CD Improvements (2026-04-01)**

- Native multi-arch CI build: `linux/amd64` on `ubuntu-latest`, `linux/arm64` on `ubuntu-24.04-arm` — eliminates slow QEMU emulation
- Per-registry conditional guards in merge job (Docker Hub, Quay.io only push when secrets are configured)
- Per-registry isolated `imagetools create` steps for better failure visibility

### Changed

- `package.json` — npm override `serialize-javascript` pinned to `^7.0.5` (CVE fix, constrained to 7.x major)
- `package.json` — npm override `lodash` pinned to `4.17.21` (fixes broken 4.18.0 release where `assignWith` was undefined in `template.js`)
- `.github/workflows/build-and-publish.yml` — digest artifact retention increased from 1 to 7 days; 45-minute timeout on build jobs; explicit `permissions: read` on lint job
- `.github/workflows/docs.yml` — fixed non-existent action versions (`checkout@v6` → `@v4`, `configure-pages@v6` → `@v5`)

### Fixed

- `app/api/wishlist/[id]/buy/route.ts` — `DELETE /buy` now returns HTTP 409 Conflict (instead of 404) when the item exists but is not in BOUGHT state
- `app/(app)/dashboard/page.tsx` — replaced `<a>` with `<Link>` to fix Next.js no-html-link-for-pages lint rule
- `lib/auth.ts` — Keycloak provider changed from dynamic `require()` to static import
- API error messages in wishlist buy/discard routes no longer leak internal `error.message` strings

---

**Phase 7 – Deployment & Hardening**

- `app/api/health/route.ts` — unauthenticated health check endpoint (`GET /api/health`) returning `{ status: "ok", timestamp }` for Docker, Kubernetes, and load balancer probes
- `lib/rate-limit.ts` — in-memory sliding-window rate limiter (`checkRateLimit`, `rateLimitResponse`) applied to all mutation API routes
- Rate limiting applied to mutation routes: `POST /api/tasks` (60/min), `POST /api/tasks/:id/complete` (30/min), `POST /api/topics` (30/min), `POST /api/wishlist` (30/min), `POST /api/daily-quest/postpone` (10/min)
- `next.config.ts` — security headers on all routes: CSP, HSTS (2-year preload), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- `.github/workflows/build-and-publish.yml` — GitHub Actions CI/CD pipeline: multi-platform Docker build (amd64 + arm64) with push to GHCR, Docker Hub, and Quay.io on every push to `main` and on version tags
- `deploy/examples/namespace.yaml` — Kubernetes namespace manifest
- `deploy/examples/deployment.yaml` — Kubernetes Deployment (2 replicas, liveness/readiness probes, pod anti-affinity, non-root securityContext)
- `deploy/examples/service.yaml` — ClusterIP Service for the app
- `deploy/examples/ingress.yaml` — Ingress with TLS placeholder (cert-manager + ingress-nginx)
- `deploy/examples/secret.example.yaml` — Secret template with all required keys and generation instructions
- `deploy/examples/postgres-statefulset.yaml` — PostgreSQL 18 StatefulSet with PVC (10Gi) for self-hosted database

### Changed

- `Dockerfile` — added `HEALTHCHECK` instruction hitting `/api/health` every 30s
- `docker-compose.yml` — updated app healthcheck to use `/api/health` endpoint
- `docs/deployment.md` — added production checklist, AUTH_SECRET rotation procedure, and Kubernetes deployment steps
- `README.md` — added Production Checklist section; Phase 7 marked as Done in status table

---

**Phase 6 – PWA & Push Notifications**

- `public/manifest.json` — PWA web app manifest (name, short_name, description, start_url, display, theme_color, orientation, icons, shortcuts)
- `worker/index.js` — Custom service worker push + notificationclick handlers (merged into next-pwa generated SW)
- `next-pwa` integration — service worker generated at `public/sw.js`, auto-registered at startup, disabled in development
- `@types/web-push` TypeScript types, `types/next-pwa.d.ts` manual type declaration for next-pwa v5
- PWA meta tags in root layout: `<link rel="manifest">`, `theme-color`, Apple mobile web app meta tags
- `lib/push.ts` — server-side VAPID push logic:
  - `sendPushNotification` — sends to a single subscriber, auto-cleans expired (410) subscriptions
  - `sendDailyQuestNotifications` — fan-out to all users with notifications enabled
  - `sendStreakReminders` — fan-out to streak users who haven't completed a task today
- `app/api/push/subscribe` — `POST` (save subscription + enable notifications) / `DELETE` (remove + disable)
- `app/api/push/test` — `POST` sends a test push notification to the current user
- `app/api/cron/daily-quest` — `POST` triggers daily quest notifications (protected by `CRON_SECRET`)
- `app/api/cron/streak-reminder` — `POST` triggers streak reminder notifications (protected by `CRON_SECRET`)
- `components/settings/notification-settings.tsx` — client component for full permission/subscribe/unsubscribe flow
- `app/(app)/settings/page.tsx` — Settings page with Account section (name, avatar, email, provider badge) and Push Notifications section
- Settings link added to Sidebar navigation
- `CRON_SECRET` environment variable added to `lib/env.ts` and `.env.example`
- `docs/environment-variables.md` updated with `CRON_SECRET` documentation
- `docs/api.md` updated with push notification and cron routes
- Build script updated to use `--webpack` flag (required for next-pwa compatibility with Next.js 16 + Turbopack default)

**Phase 1 – Foundation**

- Next.js 15 (App Router) + React 19 + TypeScript strict mode project setup
- Tailwind CSS v4 with custom design system CSS variables
- Design system: dark/light mode with warm earthy colour palette
  - Dark theme: deep forest greens (`#0f1410`) with warm amber accents
  - Light theme: soft parchment whites (`#f7f2e8`) with sand tones
- Typography: Lora (headings), JetBrains Mono (task text), DM Sans (UI)
- `next-themes` integration for dark/light/system theme switching
- `ThemeToggle` component — cycles dark → light → system
- Auth.js v5 (next-auth@beta) with Drizzle adapter
  - GitHub, Discord, and Google OAuth providers (configurable)
  - Generic OIDC provider support (Authentik, Keycloak, Zitadel)
  - Database sessions stored in PostgreSQL
- Drizzle ORM schema for all core tables:
  - `users`, `accounts`, `sessions`, `verification_tokens` (Auth.js adapter)
  - `topics`, `tasks`, `task_completions`
  - `wishlist_items`
  - `achievements`, `user_achievements`
- PostgreSQL 18 integration via `pg` driver + Drizzle ORM
- Zod-validated environment variable wrapper (`lib/env.ts`)
- `Navbar` component with app name (Lora font), theme toggle, user avatar, sign-out
- `Sidebar` component with navigation links and active state highlighting
- Login page with styled OAuth provider buttons
- Dashboard shell with greeting, daily quest placeholder, quick stats
- Placeholder pages for Tasks, Topics, Wishlist
- Docker Compose setup (app + PostgreSQL 18)
- Multi-stage Dockerfile with non-root user (`nextjs:1001`)
- `drizzle.config.ts` — Drizzle Kit configuration
- `.env.example` with all environment variables documented
- `docs/environment-variables.md` — full env var reference
- `docs/database.md` — schema overview and migration instructions
- `docs/oauth-setup.md` — provider setup guide (GitHub, Discord, Google, OIDC)
- `docs/api.md` — API route reference (Auth.js routes)
- `docs/deployment.md` — Docker Compose deployment guide

**Phase 5 – Wishlist & Budget**

- `lib/wishlist.ts` — full wishlist business logic:
  - `getUserWishlistItems` — list all items (OPEN first by priority, then history)
  - `createWishlistItem` — create new wishlist item
  - `updateWishlistItem` — partial update (ownership-gated)
  - `markAsBought` — set status to BOUGHT (purchase history)
  - `unmarkAsBought` — revert BOUGHT → OPEN (undo)
  - `discardWishlistItem` — set status to DISCARDED (archive)
  - `deleteWishlistItem` — permanent delete (ownership-gated)
  - `getBudgetSummary` — monthly budget + spent this month + remaining
  - `updateMonthlyBudget` — update or clear the user's monthly budget
- Zod validators for wishlist (CreateWishlistItemInputSchema, UpdateWishlistItemInputSchema, UpdateBudgetInputSchema)
- API routes:
  - `GET/POST /api/wishlist` — list items + budget / create item
  - `PATCH/DELETE /api/wishlist/:id` — update / permanently delete item
  - `POST/DELETE /api/wishlist/:id/buy` — mark bought / undo
  - `POST /api/wishlist/:id/discard` — archive item
  - `GET/PATCH /api/settings/budget` — get or update monthly budget
- UI components:
  - `WishlistCard` — item card with price, priority badge, affordability indicator, coin-unlock indicator, action buttons
  - `WishlistForm` — modal for create/edit (title, price, URL, priority, coin threshold)
  - `BudgetBar` — animated (Framer Motion) budget progress bar with inline edit
  - `WishlistView` — full interactive page client component managing all state
- Wishlist page (`/wishlist`) fully implemented, replacing Phase 5 placeholder
- Affordability indicator (green/red based on remaining monthly budget)
- Coin-unlock indicator (shows coins needed when threshold is set)
- Purchase history section (collapsed by default, shows bought + discarded items)
- Bought items shown with green left border and "Bought" badge
- Discarded items shown with 50% opacity and strikethrough title
