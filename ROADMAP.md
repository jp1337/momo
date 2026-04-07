# Momo — Feature Roadmap

Priorisierte Ideen und geplante Features. Kein Versprechen — ein lebendiges Dokument.

---

## Nächste Schritte (konkret geplant)

| Feature                          | Kategorie        | Aufwand | Notizen                                                                 |
| -------------------------------- | ---------------- | ------- | ----------------------------------------------------------------------- |
| Microsoft Sign In                | Auth             | ✅      | Auth.js `microsoft-entra-id`-Provider; Tenant hart auf `consumers` gepinnt — nur private MS-Accounts (Outlook/Hotmail/Live/Xbox), keine Work/School Accounts |
| Passkeys (WebAuthn)              | Auth             | M       | `@simplewebauthn`-Adapter für Auth.js; keine externen Provider nötig    |
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
- **Aufgaben-Vorlagen (Templates)** — vordefinierte Topic-Vorlagen ("Umzug", "Steuern", "Sport-Routine") als One-Click-Import
- ✅ **Focus Mode** — reduzierte Ansicht: nur Tagesquest + Quick Wins, alles andere ausgeblendet
- ✅ **Subtask-Reihenfolge** — Drag & Drop Sortierung innerhalb eines Topics
- ✅ **Profil bearbeiten** — Name, E-Mail-Adresse und Profilbild in den Einstellungen änderbar; OAuth-Provider liefern oft Wegwerf-Mail oder Pseudonym, User soll das nachträglich korrigieren können
- ✅ **Energie-Filter** — Tasks mit Energie-Level taggen (hoch/mittel/niedrig); Daily Quest berücksichtigt Tagesverfassung

### Größere Features

- ✅ **Alexa Skill** — "Alexa, sage Momo: füge Zahnarzt hinzu" → Task per REST API; "Alexa, was ist meine Quest?" → Daily Quest; Lambda-Code in `alexa-skill/`
- **Wiederkehrende Aufgaben Habit-Tracker** — Jahres-/Monatsraster (GitHub Contribution Graph Stil) pro Habit-Task
- **iCal-Export** — fällige Aufgaben als Kalender-Feed (`.ics`) für Google/Apple Calendar
- **Offline-Queue** — Tasks offline erstellen/abhaken; beim Reconnect syncen (PWA Service Worker)
- **Integrationen** — Zapier/Make-Webhooks; ausgehende Events bei Task-Abschluss

---

## Technical Features

### Akut / Geplant

- ✅ **Push-Benachrichtigungen** — Daily Quest Reminder mit Task-Titel in Notification; täglicher Quest-Wechsel (daily_quest_date)
- **SEO für öffentliche Momo-Instanz** — `<meta>` Tags (OG, Twitter Cards), `sitemap.xml`, `robots.txt`, strukturierte Daten (JSON-LD); wichtig für Sichtbarkeit der gehosteten Demo auf `momotask.app`

### Stabilität

- **Automatisierte Tests** — Integrationstests für `completeTask`, `selectDailyQuest`, `updateStreak` mit echter Test-DB
- **Error-Tracking & Observability** — Sentry, Axiom oder GlitchTip in Prod für Fehler-Visibility; alternativ oder ergänzend **OpenTelemetry** (Traces, Metrics, Logs) mit Grafana/Jaeger/Loki-Backend; Next.js hat experimentelles OTel-Instrumentation (`instrumentation.ts`); ideal für Selfhoster mit bestehendem Monitoring-Stack
- **Database Backups** — automatisches `pg_dump` mit Retention in Docker Compose / K8s

### Authentifizierung erweitern

- **Passkeys (WebAuthn)** — passwordloser Login ohne externen Provider; Auth.js hat `@simplewebauthn`-Adapter; ideal für PWA-Nutzer
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
