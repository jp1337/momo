# Momo — Feature Roadmap

Priorisierte Ideen und geplante Features. Kein Versprechen — ein lebendiges Dokument.

---

## Nächste Schritte (konkret geplant)

| Feature                          | Kategorie        | Aufwand | Notizen                                                                 |
| -------------------------------- | ---------------- | ------- | ----------------------------------------------------------------------- |
| Microsoft Sign In                | Auth             | ✅      | Auth.js `microsoft-entra-id`-Provider; Tenant hart auf `consumers` gepinnt — nur private MS-Accounts (Outlook/Hotmail/Live/Xbox), keine Work/School Accounts |
| Passkeys (WebAuthn)              | Auth             | ✅      | `@simplewebauthn/server` + `@simplewebauthn/browser` v13 auf Auth.js-DB-Sessions; passwortloser Primary-Login auf `/login` UND Passkey als Alternative zum TOTP-Code auf `/login/2fa`; `authenticators`-Tabelle, 7 Endpoints unter `/api/auth/passkey/*`, signiertes Challenge-Cookie (5 min, purpose-tag), `userHasSecondFactor()` methodenagnostisch erweitert |
| 2FA — TOTP                       | Auth             | ✅      | RFC-6238 TOTP via `otplib`; AES-256-GCM-verschlüsseltes Secret + SHA-256-gehashte Backup-Codes; Setup-Wizard, `/login/2fa`-Challenge, optionales Admin-Enforcement via `REQUIRE_2FA`; methoden-agnostischer Gate (`userHasSecondFactor`) bereit für Passkeys |
| E-Mail-Benachrichtigungen        | Notifications    | ✅      | nodemailer + SMTP_*-Env-Vars; stilisiertes Newsletter-Template; Adresse pro User |
| ntfy.sh Integration              | Notifications    | ✅      | URL-basierte Push-Benachrichtigungen; gut für Selfhoster                |
| Pushover Integration             | Notifications    | ✅      | API Token + User Key in Settings; sofortige Push-Alerts                 |
| Telegram-Bot                     | Notifications    | ✅      | Bot Token + Chat ID in Settings; HTML-Parse-Mode mit Click-Through-Link |
| Push-Benachrichtigungen debuggen | Technisch        | ✅      | 4 Bugs behoben: K8s CronJob, notificationTime-Filter, PATCH-Endpoint, Idempotenz-Guard |
| Alexa Skill                      | User + Technisch | ✅      | Lambda-Code + Interaction Model in `alexa-skill/`; Account Linking via API Key |

---

## User Features

### Hoher Impact, kleiner Aufwand

- ✅ **Custom Error Pages** — eigene 404- und 500-Seiten im Momo-Design (Lora-Schrift, Waldgrün-Ästhetik, Rücklink zur App); Next.js `not-found.tsx` + `error.tsx`
- ✅ **Swipe-to-complete auf Mobile** — Wischgeste auf Task-Items: rechts = erledigen, links = löschen; Wishlist: rechts = kaufen, links = ablegen
- ✅ **UI/UX-Konsistenz** — einheitliche Edit/Delete-Buttons (oben rechts) auf Tasks, Topics und Wishlist; vollständige Titelanzeige
- ✅ **Suche & Filter** — Volltextsuche über Tasks und Wunschliste; Filter nach Priorität, Topic, Status; nützlich ab ~20+ Einträgen
- ✅ **Snooze / Aufgabe pausieren** — "Erinnere mich ab [Datum]" für Tasks die man nicht löschen, aber auch nicht ständig sehen will
- ✅ **"Ich hab nur 5 Minuten"-Modus** — prominenter Einstiegspunkt der nur Tasks ≤5 min zeigt (über Quick Wins hinaus)
- ✅ **Emotionaler Abschluss** — nach Tagesquest-Abschluss kurze Affirmation oder Michael-Ende-Zitat (optional, abschaltbar)

### Mittlerer Aufwand

- ✅ **Wöchentlicher Rückblick** — Seite `/review` + wöchentliche Push-Benachrichtigung (Sonntag 18:00 Ortszeit) mit Zusammenfassung: Abschlüsse, Verschiebungen, Coins, Streak, Top-Themen
- ✅ **Aufgaben-Vorlagen (Templates)** — drei kuratierte Topic-Vorlagen (`moving`, `taxes`, `fitness`) als One-Click-Import. Neuer Button „📋 Aus Vorlage" auf der Topics-Seite öffnet einen Picker mit Icon, Beschreibung, Task-Count und Sequential-Badge pro Vorlage. Implementierung: Template-Katalog als TypeScript-Konstanten in `lib/templates.ts` (keine DB-Tabelle), `importTopicFromTemplate()` legt Topic + Tasks atomar in einer Drizzle-Transaction an und inkrementiert `totalTasksCreated`, Titel werden server-seitig via `next-intl` `getTranslations()` in der aktuellen UI-Sprache aufgelöst und als Plain Text gespeichert. Neue Route `POST /api/topics/import-template` (Rate-Limit 10/min), neue Komponente `TemplatePicker`, i18n-Keys in de/en/fr. Erweiterbar — weitere Templates sind ein Eintrag in `TEMPLATES` + i18n-Block.
- ✅ **Focus Mode** — reduzierte Ansicht: nur Tagesquest + Quick Wins, alles andere ausgeblendet
- ✅ **Subtask-Reihenfolge** — Drag & Drop Sortierung innerhalb eines Topics
- ✅ **Sequenzielle Topics (Reihenfolge als implizite Abhängigkeit)** — opt-in Toggle pro Topic (`topics.sequential`, Migration `drizzle/0017_hard_boomer.sql`); in sequenziellen Topics wird bei der Daily-Quest-Auswahl nur die erste noch offene Aufgabe (niedrigste `sortOrder`, nicht gesnoozed) als Kandidat zugelassen. Implementierung: blockierte Task-IDs werden einmal pro `pickBestTask()`-Aufruf berechnet und via `notInArray` aus allen vier Tiers gefiltert — ein Touchpoint, greift automatisch in `selectDailyQuest`, `forceSelectDailyQuest` und `reselectQuestForEnergy`. Snoozen rückt die Kette auf (bewusste Entscheidung, um Freeze durch Snooze zu vermeiden). UI: Toggle im TopicForm, `faListOl`-Badge auf der TopicCard, Hinweisstreifen in der TopicDetailView. i18n in de/en/fr, OpenAPI aktualisiert.
- ✅ **Profil bearbeiten** — Name, E-Mail-Adresse und Profilbild in den Einstellungen änderbar; OAuth-Provider liefern oft Wegwerf-Mail oder Pseudonym, User soll das nachträglich korrigieren können
- ✅ **Energie-Filter** — Tasks mit Energie-Level taggen (hoch/mittel/niedrig); Daily Quest berücksichtigt Tagesverfassung. Im April 2026 vollständig redesignt: Inline-Check-in oben am Dashboard (entkoppelt von `!quest`), Auto-Re-Roll der Quest beim Check-in (mit Undo), historischer Verlauf via neuer `energy_checkins`-Tabelle, Topic-Default-Energielevel das neue Tasks erben, energie-aware Quick Wins / 5-Min-Mode, Energie-Block auf `/stats`. Strukturbug (Prompt unsichtbar) und Timezone-Bug (UTC vs lokales Datum) mitgefixt.

### Größere Features

- ✅ **Alexa Skill** — "Alexa, sage Momo: füge Zahnarzt hinzu" → Task per REST API; "Alexa, was ist meine Quest?" → Daily Quest; Lambda-Code in `alexa-skill/`
- **Wiederkehrende Aufgaben Habit-Tracker** — Jahres-/Monatsraster (GitHub Contribution Graph Stil) pro Habit-Task
- ✅ **iCal-Export** — privater Kalender-Feed pro User (`/api/calendar/<token>.ics`). Settings-Sektion generiert einen 256-Bit-Token, URL wird einmalig angezeigt (Hash via SHA-256 in `users.calendar_feed_token_hash`, mirrored aus dem `api-keys`-Pattern). Feed enthält alle offenen Tasks mit `due_date` oder (bei RECURRING) `next_due_date` als Ganztages-VEVENTs; recurring Tasks bekommen ein offenes `RRULE:FREQ=DAILY;INTERVAL=N`. Token im Pfad *ist* die Auth — keine Session, keine Bearer-Header (Calendar-Clients können keine schicken); ungültige Tokens liefern 404 (kein Info-Leak). Rotate/Revoke sind 2FA-pflichtig. Implementierung via `ical-generator@10.1.0`, Rate-Limit 60/min pro Token. Migration `drizzle/0018_smiling_lester.sql`.
- **Offline-Queue** — Tasks offline erstellen/abhaken; beim Reconnect syncen (PWA Service Worker)
- **Integrationen** — Zapier/Make-Webhooks; ausgehende Events bei Task-Abschluss

---

## Technical Features

### Akut / Geplant

- ✅ **Push-Benachrichtigungen** — Daily Quest Reminder mit Task-Titel in Notification; täglicher Quest-Wechsel (daily_quest_date)
- ✅ **SEO für öffentliche Momo-Instanz** — `metadataBase` + `alternates.canonical` + Robots-Direktive im Root-Layout, Open Graph (siteName/locale/image) + Twitter Cards (`summary_large_image`), typed `app/robots.ts` und `app/sitemap.ts` (cookie-basiertes i18n → eine kanonische URL pro Route, kein hreflang nötig), `SoftwareApplication`-JSON-LD auf der Landing, Pro-Route-Metadaten (`/login` und `/api-docs` `noindex`, Legal-Seiten mit eigener `description`+`canonical`); Asset `public/og-image.png` noch ergänzen

### Stabilität

- **Automatisierte Tests** — Integrationstests für `completeTask`, `selectDailyQuest`, `updateStreak` mit echter Test-DB
- **Error-Tracking & Observability** — Sentry, Axiom oder GlitchTip in Prod für Fehler-Visibility; alternativ oder ergänzend **OpenTelemetry** (Traces, Metrics, Logs) mit Grafana/Jaeger/Loki-Backend; Next.js hat experimentelles OTel-Instrumentation (`instrumentation.ts`); ideal für Selfhoster mit bestehendem Monitoring-Stack
- **Database Backups** — automatisches `pg_dump` mit Retention in Docker Compose / K8s

### Authentifizierung erweitern

- ✅ **Passkeys (WebAuthn)** — passwortloser Primary-Login UND methodenagnostischer zweiter Faktor via `@simplewebauthn/server` + `@simplewebauthn/browser` v13; eigene Endpoints (kein Auth.js-Passkey-Provider, weil der JWT-Sessions erzwingen würde — Momo bleibt auf DB-Sessions für Revocation); `authenticators`-Tabelle, Settings-UI (`PasskeysSection`), Login-Buttons, `/login/2fa`-Alternative; Sessions aus dem passwordless-Login sind inhärent MFA-satisfied; `userHasSecondFactor()` erweitert
- ✅ **2FA — TOTP** — Authenticator-App (Aegis, 2FAS, Google Authenticator, Authy, 1Password) als zweiter Faktor *nach* dem OAuth-Login; kein Passkey-Ersatz; via `otplib` + QR-Code-Setup; 10 SHA-256-gehashte Backup-Codes; AES-256-GCM-Verschlüsselung der Secrets; optionales Admin-Enforcement via `REQUIRE_2FA=true` (Hard-Lock auf `/setup/2fa`)
- **Microsoft / Azure AD** — Auth.js `AzureAD`-Provider; relevant für Windows/Office-Nutzer; geringer Aufwand

### Benachrichtigungen erweitern

- ✅ **E-Mail-Benachrichtigungen** — SMTP via `nodemailer`, Instance-Config über `SMTP_HOST/PORT/USER/PASS/FROM/SECURE`; User-Adresse per Settings; stilisiertes Newsletter-HTML-Template + Plain-Text-Alternative
- ✅ **ntfy.sh** — Self-hosted Push via ntfy.sh-Topic-URL; kein App-Account nötig; ideal für Power-User & Selfhosters
- ✅ **Pushover** — Push-Benachrichtigungen via Pushover API; User Key + App Token pro User in Settings
- ✅ **Telegram-Bot** — Bot Token + Chat ID pro User in Settings; HTML-Parse-Mode mit "Open Momo"-Link. Task-Eingabe via `/addtask` ist ein Folge-Ticket.
- **Webhook / Custom HTTP** — generischer Outbound-Webhook bei konfigurierbaren Events (Quest bereit, Streak-Warnung, etc.)

> **Implementierungsansatz:** Alle Kanäle via nativem `fetch` — kein zusätzlicher Container, keine externe Abstraktion.
> Einheitliches Interface in `lib/notifications.ts`: `interface NotificationChannel { send(payload: { title, body, url? }): Promise<void> }`
> E-Mail via `nodemailer` (SMTP, pure Node.js). Cron iteriert alle konfigurierten Channels.
> User-Konfiguration per DB-Spalte (z.B. `ntfy_topic`, `telegram_chat_id`, `pushover_user_key`).

### Erweiterbarkeit

- **Webhook-System** — ausgehende Webhooks bei Task-erstellt / Task-abgeschlossen
- **Notification-Scheduler erweitern** — "Fällig heute"-Reminder, Weekly Review Push, konfigurierbare Uhrzeit

---

## Ideen-Backlog (noch nicht bewertet)

- Pomodoro-Timer Integration
- AI-gestützte Aufgaben-Priorisierung
- Markdown in Task-Notes
- Aufgaben-Kommentare / Tagebucheintrag pro Abschluss
