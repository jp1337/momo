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

- ✅ **Per-Habit-Streak auf /habits** — individueller Streak-Zähler pro Recurring Task auf der `/habits`-Seite („Wäsche: 8 Wochen in Folge"); ergänzt den globalen Streak. Implementierung: neue reine Funktion `computeHabitStreak()` in `lib/habits.ts` arbeitet mit Perioden von `recurrenceInterval ?? 1` Tagen, zählt aufeinanderfolgende erfolgreiche Perioden rückwärts ab „heute" in der User-Timezone und gewährt der laufenden Periode eine Grace (ein wöchentlicher Habit setzt nicht sofort zurück, nur weil der Montag gerade erst begonnen hat). Zusätzlich wird der All-Time-Bestwert (`best`) aus dem gesamten `task_completions`-Historienpfad berechnet (zweite, unbegrenzte Query — ein Scan, keine Schema-Änderung). Neue Flammen-Pill auf `HabitCard` mit Bestwert-Sub-Label in `--accent-amber`; Periodenlänge bestimmt die Einheit (Tage/Wochen/Monate) via neue i18n-Keys `habits.stat_streak*` und `habits.streak_unit_*` in de/en/fr. Mitgefixt: latenter Timezone-Bug in `getHabitsWithHistory` — das Grid-Bucketing lief bislang auf Server-Lokalzeit, jetzt wird die User-Timezone aus `users.timezone` durchgereicht.
- ✅ **Streak Shield** — einmal pro Kalendermonat schützt ein automatisches Schild den Streak bei exakt einem verpassten Tag. `updateStreak()` prüft vor dem Reset ob `streakShieldUsedMonth !== currentMonth` und `streakLastDate === dayBeforeYesterday`; bei Shield-Aktivierung bleibt der Streak erhalten (kein +1, kein Reset), `streakShieldUsedMonth` wird auf den aktuellen Monat gesetzt, und der User wird per Push/Notification informiert. Dashboard zeigt 🛡️-Verfügbarkeits-Indikator. DB: `streak_shield_used_month` (text, nullable) auf `users` (Migration `0020`). Multi-Day-Gaps resetten weiterhin normal.
- ✅ **Stats-Seite ausbauen** — drei neue Auswertungen: Completion-Rate pro Topic (sortiert aufsteigend, Farbkodierung nach Rate, 30d-Completions), beste Wochentage für Abschlüsse (7-Spalten-Balkenchart mit Highlight), Streak-Verlauf als SVG-Sparkline (90 Tage). Alle Labels i18n-isiert (de/en/fr). Quest-Ablehnungs-Gründe folgen sobald "Quest ablehnen" implementiert ist. Neue Komponenten: `WeekdayChart`, `StreakSparkline`. Neue Funktion: `computeStreakHistory()`. Keine Schema-Änderung.
- ✅ **Bulk-Aktionen auf Tasks** — Mehrfachauswahl per Checkbox; Aktionsleiste erscheint sobald ≥1 Task ausgewählt: Löschen, Topic wechseln, Priorität setzen, alle erledigen. Nützlich beim Aufräumen nach einem Import oder beim Triage der Inbox. Rein client-seitiger State + ein neuer `PATCH /api/tasks/bulk`-Endpoint. Bulk-Complete überspringt Gamification (Coins, Streak, Achievements) bewusst — Cleanup-Tool, keine Coin-Inflation. Max 100 Tasks/Aktion, Rate-Limit 10/min.
- ✅ **Custom Error Pages** — eigene 404- und 500-Seiten im Momo-Design (Lora-Schrift, Waldgrün-Ästhetik, Rücklink zur App); Next.js `not-found.tsx` + `error.tsx`
- ✅ **Swipe-to-complete auf Mobile** — Wischgeste auf Task-Items: rechts = erledigen, links = löschen; Wishlist: rechts = kaufen, links = ablegen
- ✅ **UI/UX-Konsistenz** — einheitliche Edit/Delete-Buttons (oben rechts) auf Tasks, Topics und Wishlist; vollständige Titelanzeige
- ✅ **Suche & Filter** — Volltextsuche über Tasks und Wunschliste; Filter nach Priorität, Topic, Status; nützlich ab ~20+ Einträgen
- ✅ **Snooze / Aufgabe pausieren** — "Erinnere mich ab [Datum]" für Tasks die man nicht löschen, aber auch nicht ständig sehen will
- ✅ **"Ich hab nur 5 Minuten"-Modus** — prominenter Einstiegspunkt der nur Tasks ≤5 min zeigt (über Quick Wins hinaus)
- ✅ **Emotionaler Abschluss** — nach Tagesquest-Abschluss kurze Affirmation oder Michael-Ende-Zitat (optional, abschaltbar)

### Mittlerer Aufwand

- ✅ **Onboarding-Flow** — geführter Erststart nach erster Anmeldung: 4 Schritte (Konzepte kennenlernen → erstes Topic anlegen → erste Tasks → Notification einrichten), jeder Schritt überspringbar, einmalig. State in `users.onboarding_completed` (boolean). Wizard-Shell mit Framer-Motion-Step-Transitions, 4-Dot-Progress-Indikator, eigenes Layout außerhalb `(app)` (analog `/setup/2fa`). Gate in `app/(app)/layout.tsx` leitet neue User auf `/onboarding` um. Bestehende User per Backfill-Migration nicht betroffen. Neue Route `POST /api/onboarding/complete`. Komponenten unter `components/onboarding/`. i18n in de/en/fr.
- ✅ **Benachrichtigungshistorie** — Liste der letzten 50 gesendeten Notifications in den Settings: Zeitstempel, Kanal (Push / Telegram / Email / …), Titel, Zustellstatus. Primärnutzen: Debugging wenn Pushes nicht ankommen. DB: neue Tabelle `notification_log` mit `userId`, `channel`, `title`, `sentAt`, `status` (sent/failed). Ältere Einträge werden nach 30 Tagen automatisch gelöscht (Cron).
- ✅ **Morgen-Briefing (Daily Digest)** — opt-in tägliche Zusammenfassung statt mehrerer Einzel-Pushes: Quest des Tages + heute fällige Recurring Tasks + aktueller Streak + ggf. frisch freigeschaltetes Achievement — alles in einer Nachricht über den bevorzugten Kanal. Eigene Uhrzeit (Default: 08:00), eigener `morning-briefing`-Cron-Job. Ersetzt für viele User den einzelnen Quest-Reminder + Due-Today-Reminder. Settings-Toggle sichtbar sobald ein Kanal konfiguriert ist. DB: `morning_briefing_enabled` + `morning_briefing_time` auf `users` (Migration `0023`). Immer-senden-Prinzip: auch an leeren Tagen kommt eine motivierende Nachricht.
- ✅ **Wunschliste mit Coins freischalten** — Wishlist-Items mit `coinUnlockThreshold` erfordern eine ausreichende Coin-Balance vor dem Kauf; beim Klick werden Coins atomar in einer DB-Transaction abgezogen, Undo refunded sie. Buy-Button zeigt Coin-Kosten und ist deaktiviert bei unzureichendem Guthaben; Swipe-to-buy auf Mobile wird ebenfalls geblockt. API: `POST /api/wishlist/:id/buy` → `{ item, coinsSpent }` (422 bei zu wenig Coins), `DELETE` → `{ item, coinsRefunded }`. Keine Schema-Änderung — `coinUnlockThreshold` existierte bereits. Schließt den Gamification-Loop: Coins sind Währung für echte Wünsche.
- ✅ **Recurring Tasks pausieren (Urlaubsmodus)** — Recurring Task für N Tage einfrieren ohne ihn zu löschen oder zu snoozen; `next_due_date` wird um die Pausendauer verschoben; verhindert dass die Habits-Statistik durch Urlaub/Krankheit verzerrt wird. DB: neue Felder `paused_at` + `paused_until` auf `tasks` und `vacation_end_date` auf `users` (Migration `0024`). Globaler Toggle in Settings mit Enddatum. Cron-Job `vacation-mode-auto-end` deaktiviert abgelaufene Urlaube. Streak-Algorithmus überspringt pausierte Perioden. Pausierte Tasks aus Daily Quest, Fällig-heute-Benachrichtigungen und iCal-Feed ausgeblendet. Habit-Card zeigt `faPause`-Badge.
- ✅ **Recurring Fälligkeits-Benachrichtigung** — dedizierter, opt-in Push-Reminder für wiederkehrende Aufgaben die heute fällig sind. Sendet **individuelle Benachrichtigungen pro Task** (bei ≤3) oder eine gebündelte Zusammenfassung (bei >3). Eigener Cron-Job `recurring-due` (5-Min-Bucket), unterdrückt bei aktiviertem Morgen-Briefing. Neuer Toggle in den Settings. DB: `recurring_due_reminder_enabled` auf `users` (Migration `0025`). i18n in de/en/fr.
- ✅ **Wöchentlicher Rückblick** — Seite `/review` + wöchentliche Push-Benachrichtigung (Sonntag 18:00 Ortszeit) mit Zusammenfassung: Abschlüsse, Verschiebungen, Coins, Streak, Top-Themen
- ✅ **Aufgaben-Vorlagen (Templates)** — drei kuratierte Topic-Vorlagen (`moving`, `taxes`, `fitness`) als One-Click-Import. Neuer Button „📋 Aus Vorlage" auf der Topics-Seite öffnet einen Picker mit Icon, Beschreibung, Task-Count und Sequential-Badge pro Vorlage. Implementierung: Template-Katalog als TypeScript-Konstanten in `lib/templates.ts` (keine DB-Tabelle), `importTopicFromTemplate()` legt Topic + Tasks atomar in einer Drizzle-Transaction an und inkrementiert `totalTasksCreated`, Titel werden server-seitig via `next-intl` `getTranslations()` in der aktuellen UI-Sprache aufgelöst und als Plain Text gespeichert. Neue Route `POST /api/topics/import-template` (Rate-Limit 10/min), neue Komponente `TemplatePicker`, i18n-Keys in de/en/fr. Erweiterbar — weitere Templates sind ein Eintrag in `TEMPLATES` + i18n-Block.
- ✅ **Focus Mode** — reduzierte Ansicht: nur Tagesquest + Quick Wins, alles andere ausgeblendet
- ✅ **Subtask-Reihenfolge** — Drag & Drop Sortierung innerhalb eines Topics
- ✅ **Sequenzielle Topics (Reihenfolge als implizite Abhängigkeit)** — opt-in Toggle pro Topic (`topics.sequential`, Migration `drizzle/0017_hard_boomer.sql`); in sequenziellen Topics wird bei der Daily-Quest-Auswahl nur die erste noch offene Aufgabe (niedrigste `sortOrder`, nicht gesnoozed) als Kandidat zugelassen. Implementierung: blockierte Task-IDs werden einmal pro `pickBestTask()`-Aufruf berechnet und via `notInArray` aus allen vier Tiers gefiltert — ein Touchpoint, greift automatisch in `selectDailyQuest`, `forceSelectDailyQuest` und `reselectQuestForEnergy`. Snoozen rückt die Kette auf (bewusste Entscheidung, um Freeze durch Snooze zu vermeiden). UI: Toggle im TopicForm, `faListOl`-Badge auf der TopicCard, Hinweisstreifen in der TopicDetailView. i18n in de/en/fr, OpenAPI aktualisiert.
- ✅ **Profil bearbeiten** — Name, E-Mail-Adresse und Profilbild in den Einstellungen änderbar; OAuth-Provider liefern oft Wegwerf-Mail oder Pseudonym, User soll das nachträglich korrigieren können
- ✅ **Energie-Filter** — Tasks mit Energie-Level taggen (hoch/mittel/niedrig); Daily Quest berücksichtigt Tagesverfassung. Im April 2026 vollständig redesignt: Inline-Check-in oben am Dashboard (entkoppelt von `!quest`), Auto-Re-Roll der Quest beim Check-in (mit Undo), historischer Verlauf via neuer `energy_checkins`-Tabelle, Topic-Default-Energielevel das neue Tasks erben, energie-aware Quick Wins / 5-Min-Mode, Energie-Block auf `/stats`. Strukturbug (Prompt unsichtbar) und Timezone-Bug (UTC vs lokales Datum) mitgefixt.

### Größere Features

- ✅ **Alexa Skill** — "Alexa, sage Momo: füge Zahnarzt hinzu" → Task per REST API; "Alexa, was ist meine Quest?" → Daily Quest; Lambda-Code in `alexa-skill/`
- ✅ **Wiederkehrende Aufgaben Habit-Tracker** — neue Seite `/habits` mit GitHub-Style Jahres-Raster (53 Wochen × 7 Tage, montags beginnend) pro `RECURRING`-Task; 4 Farbstufen via `color-mix` auf `var(--accent-green)` (funktioniert in Light/Dark Mode ohne Theme-Switch), drei Zähl-Pills (Jahr/30d/7d), Jahres-Selector dynamisch abgeleitet aus der frühesten User-Completion. Keine Schema-Änderung — `task_completions` wird bereits für jede (auch recurring) Completion durch `completeTask()` befüllt. Implementierung: `lib/habits.ts`, `app/(app)/habits/page.tsx`, `components/habits/{contribution-grid,habit-card,year-selector}.tsx`, Sidebar-Eintrag mit `faSeedling`, i18n `habits.*` in de/en/fr. Reines Read-Path-Feature — keine neuen API-Routen, keine neuen Env-Vars.
- ✅ **iCal-Export** — privater Kalender-Feed pro User (`/api/calendar/<token>.ics`). Settings-Sektion generiert einen 256-Bit-Token, URL wird einmalig angezeigt (Hash via SHA-256 in `users.calendar_feed_token_hash`, mirrored aus dem `api-keys`-Pattern). Feed enthält alle offenen Tasks mit `due_date` oder (bei RECURRING) `next_due_date` als Ganztages-VEVENTs; recurring Tasks bekommen ein offenes `RRULE:FREQ=DAILY;INTERVAL=N`. Token im Pfad *ist* die Auth — keine Session, keine Bearer-Header (Calendar-Clients können keine schicken); ungültige Tokens liefern 404 (kein Info-Leak). Rotate/Revoke sind 2FA-pflichtig. Implementierung via `ical-generator@10.1.0`, Rate-Limit 60/min pro Token. Migration `drizzle/0018_smiling_lester.sql`.
- **Erweiterte Wiederholungsregeln (Wochentag / Monat / Jahr)** — aktuell unterstützt Momo nur rollierende Intervalle ("alle N Tage ab letzter Erledigung"); für Haushaltsroutinen braucht man kalenderbasierte Regeln: **wochentag-basiert** ("jeden Montag", "jeden Di + Fr"), **monatlich** ("am 1. jedes Monats"), **jährlich** ("am 15. März"). Zusätzlich: Wahl zwischen *rollend* (nächste Fälligkeit ab Abschluss-Datum) und *fest* (nächste Fälligkeit immer am nächsten definierten Termin unabhängig vom Abschluss). Schema: neues Enum `recurrence_type` (INTERVAL | WEEKDAY | MONTHLY | YEARLY) + `recurrence_weekdays` (integer array, 0=Mo…6=So) + `recurrence_fixed` (boolean). iCal-Export und Habit-Tracker müssen entsprechend angepasst werden (`RRULE:FREQ=WEEKLY;BYDAY=MO,WE`).
- ✅ **Haushalt-Vorlage** — vierte Template-Option im `TemplatePicker` mit sechs `RECURRING`-Aufgaben und sinnvollen Standardintervallen (Wäsche 7d, Staubsaugen 7d, Küche 3d, Bad 14d, Fenster 30d, Bettwäsche 14d). `TemplateTask` wurde um optionale `type`/`recurrenceInterval`-Felder erweitert (abwärtskompatibel — ohne Angabe bleibt es `ONE_TIME`); `importTopicFromTemplate()` zieht jetzt die User-Timezone und setzt `nextDueDate = getLocalDateString(tz)` für RECURRING-Tasks (spiegelt `createTask()` in `lib/tasks.ts`). Keine Schema-Änderung, keine neue API-Route — nur ein Eintrag in `TEMPLATES`, ein Eintrag in `CLIENT_TEMPLATES` und ein `templates.household.*`-Block in `messages/{de,en,fr}.json`. Icon `broom`, Farbe `#5c8ab8`. Nach dem Import landen die Aufgaben sofort im `/habits`-Tracker und im Daily-Quest-Pool.
- **Achievements & Gamification ausbauen** — das bestehende System hat 13 Achievements und einen In-App-Toast. Das ist die Basis — folgendes fehlt noch:
  - **Viel mehr Achievements**: Streak 14/60/100/365 Tage; Quest-Streak (7/30 Tage Daily Quest in Folge); Habit-Konstanz (4/12 Wochen Habit ohne Lücke); Wunschliste (erstes Item gekauft, 10 Items gekauft); Energie-Check-in-Serie (7 Tage in Folge eingecheckt); Topic-Meilensteine (5 Topics erstellt, erstes sequenzielles Topic); Task-Menge 200/500/1000; erste HIGH-Priorität-Task erledigt
  - **Secret Achievements**: erst nach Freischaltung sichtbar — z.B. "Nachtaktiv" (Task nach 23:00 erledigt), "Frühaufsteher" (Task vor 07:00), "Doppelschicht" (2 Quests an einem Tag)
  - **Rarity-System**: Common / Rare / Epic / Legendary — beeinflusst Coin-Belohnung und visuelle Darstellung
  - **Coin-Belohnung pro Achievement**: jedes Achievement gibt beim Freischalten Coins (Common: 10, Rare: 25, Epic: 50, Legendary: 100)
  - **Achievement-Galerie `/achievements`**: alle Achievements anzeigen — freigeschaltete mit Datum, noch gesperrte mit Lock-Icon und Fortschrittsbalken (z.B. "42/100 Aufgaben")
  - **Push-Benachrichtigung bei Achievement**: Achievement-Unlock via allen konfigurierten Kanälen senden (nicht nur Toast) — optional deaktivierbar
  - **Achievement-Coins**: `checkAndUnlockAchievements()` gibt Coins zurück → `completeTask()` und andere Trigger buchen sie direkt
- **Offline-Queue** — Tasks offline erstellen/abhaken; beim Reconnect syncen (PWA Service Worker)
- **Integrationen** — Zapier/Make-Webhooks; ausgehende Events bei Task-Abschluss

---

## Technical Features

### Akut / Geplant

- ✅ **Push-Benachrichtigungen** — Daily Quest Reminder mit Task-Titel in Notification; täglicher Quest-Wechsel (daily_quest_date)
- ✅ **SEO für öffentliche Momo-Instanz** — `metadataBase` + `alternates.canonical` + Robots-Direktive im Root-Layout, Open Graph (siteName/locale/image) + Twitter Cards (`summary_large_image`), typed `app/robots.ts` und `app/sitemap.ts` (cookie-basiertes i18n → eine kanonische URL pro Route, kein hreflang nötig), `SoftwareApplication`-JSON-LD auf der Landing, Pro-Route-Metadaten (`/login` und `/api-docs` `noindex`, Legal-Seiten mit eigener `description`+`canonical`); Asset `public/og-image.png` noch ergänzen

### Internationalisierung

- ✅ **Zeitzone in den Settings** — User kann seine Zeitzone explizit in den Settings setzen statt sie implizit aus dem Browser zu ziehen; relevant für alle server-seitigen Cron-Jobs (Morning-Briefing, Due-Today, Weekly Review) wenn der User per VPN unterwegs ist oder auf Reisen. DB: vorhandene Spalte `timezone` auf `users` wird zum editierbaren Feld; Settings-UI mit IANA-Timezone-Picker (Dropdown mit häufigen Zonen + freie Eingabe).
- **i18n: Spanisch (es) und Niederländisch (nl)** — zwei neue Sprachdateien `messages/es.json` und `messages/nl.json`; LOCALES-Array in `i18n/locales.ts` erweitern; alle bestehenden i18n-Keys (tasks, topics, habits, auth, settings, …) übersetzen. Framework steht komplett — reine Übersetzungsarbeit + Sprachauswahl in den Settings ergänzen.

### Selfhoster

- **Update-Checker** — Admin-Panel zeigt ein Banner wenn eine neuere Version auf GitHub verfügbar ist ("Version 1.2.0 verfügbar — Changelog ansehen"). Prüfung via GitHub Releases API, gecacht für 24h um kein Rate-Limit zu treffen. Opt-out via `DISABLE_UPDATE_CHECK=true` für Air-Gap-Installationen.

### Stabilität

- **Automatisierte Tests** — Integrationstests für `completeTask`, `selectDailyQuest`, `updateStreak` mit echter Test-DB
- **Error-Tracking & Observability** — Sentry, Axiom oder GlitchTip in Prod für Fehler-Visibility; alternativ oder ergänzend **OpenTelemetry** (Traces, Metrics, Logs) mit Grafana/Jaeger/Loki-Backend; Next.js hat experimentelles OTel-Instrumentation (`instrumentation.ts`); ideal für Selfhoster mit bestehendem Monitoring-Stack
- **Database Backups** — automatisches `pg_dump` mit Retention in Docker Compose / K8s

### Sicherheit

- **Session-Übersicht ("Aktive Geräte")** — User sieht alle aktiven Sessions (Browser, IP-Region, letzter Zugriff) in den Settings und kann einzelne oder alle anderen auf einmal invalidieren. Die `sessions`-Tabelle existiert bereits in der DB — Aufwand liegt in einem neuen `GET /api/auth/sessions`-Endpoint + `DELETE /api/auth/sessions/[id]` + einer Settings-Sektion. Bekanntes UX-Pattern aus GitHub/Google.
- **Login-Benachrichtigung bei neuem Gerät** — opt-in Push/Email wenn sich jemand von einem bisher unbekannten Browser oder Gerät einloggt. Implementierung im Auth.js-Callback: Session-Fingerprint (User-Agent + IP-Hash) gegen bekannte Sessions prüfen; bei Neugerät sofort über alle konfigurierten Kanäle benachrichtigen.

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
- ✅ **Notification-Scheduler: „Fällig heute"-Reminder** — opt-in Push/Channel-Reminder zur täglichen Notification-Time, listet Tasks mit `due_date = heute` bzw. RECURRING-Tasks mit `next_due_date = heute` (snoozed ausgeschlossen). **Silent on empty** — kein Ping, wenn nichts fällig ist. Eigener `due-today`-Cron-Job (5-Min-Bucket vor `daily-quest`), neue `users.due_today_reminder_enabled`-Spalte (Migration `drizzle/0019_low_mattie_franklin.sql`), Settings-Toggle sichtbar sobald Web Push *oder* ein Notification-Channel konfiguriert ist. Weekly Review Push + konfigurierbare Uhrzeit sind Teil früherer Iterationen
- **Notification-Scheduler erweitern** — weitere Ausbaustufen: Overdue-Reminder, konfigurierbare Uhrzeit *pro* Reminder-Typ, benutzerdefinierte Jobs

---

## Ideen-Backlog (noch nicht bewertet)

- Pomodoro-Timer Integration
- AI-gestützte Aufgaben-Priorisierung
- Markdown in Task-Notes
- Aufgaben-Kommentare / Tagebucheintrag pro Abschluss
