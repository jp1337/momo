# Changelog

All notable changes to Momo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

- **Cassiopeia** — Das "Streak Shield" Feature wurde vollständig zu **Cassiopeia** umbenannt (Idee der Schwester). Alle UI-Labels, Onboarding-Texte, Push-Notifications und Übersetzungen (DE/EN/FR/ES/NL) verwenden jetzt den Namen "Cassiopeia". Das Sternzeichen-Emoji ✨ ersetzt 🛡️ in der Dashboard-Streak-Anzeige. Interne Code- und DB-Namen bleiben unverändert (`streakShieldAvailable`, `streakShieldUsedMonth`).

- **Integrationstests vollständig: 29 → 491 Tests** — Die Test-Suite deckt jetzt die gesamte `lib/`-Schicht ab. Phase 1 (144 Tests): Daily Quest Mutations, Task Mutations, Habit Streaks, Vacation Mode, Gamification. Phase 2 (294 Tests): Task CRUD, Topics CRUD, Wishlist, Energy Check-ins, Sessions, API Keys, Calendar Feeds, Weekly Review, User Account Management. Phase 3 (366 Tests): statistics, habits, templates, onboarding. Phase 4 (437 Tests): TOTP (35 Tests: Setup, Code-Verifikation, enable/disable, Backup-Code Single-Use-Garantie, signed Setup-Token-Cookie), DSGVO-Export, Email-Templates (XSS-Escaping), Rate-Limiter. Phase 5 (491 Tests): `date-utils.ts` (17 Tests: reine Timezone-Arithmetik), `webhooks.ts` (22 Tests: Endpoint-CRUD, Secret-Verschlüsselung, Cleanup-Cron), `notification-log.ts` (4 Tests: Cleanup-Cron), plus Verbesserungen an bestehenden Tests (`coinsEarnedAllTime`-Werttest, `completionsByWeekday`-Indextest, `postponementsThisWeek`-Wochentest, stärkerer TOTP-Verifikationstest). 28 Test-Dateien, vollständige `lib/`-Abdeckung.

### Fixed

- **Daily Quest: Briefing und App zeigen unterschiedliche Quest** — Das Morning Briefing übergab die User-Timezone korrekt an `selectDailyQuest`, das Dashboard jedoch nicht (UTC-Fallback). Dadurch konnte das Dashboard die Quest des Briefings als "gestern" einstufen und eine neue Quest auswählen — besonders für User in nicht-UTC-Zeitzonen nach Mitternacht UTC. Fix: Das Dashboard liest die gespeicherte User-Timezone (`users.timezone`) vor der Quest-Auswahl und übergibt sie an `selectDailyQuest`.

## [0.3.0] - 2026-04-18

### Added

- **Outbound Webhook System** — User-configurable HTTP POST endpoints for automation integrations (Zapier, Make, n8n, custom backends). Four task lifecycle events: `task.created`, `task.completed`, `task.deleted`, `task.updated`. Payload includes full task metadata as a stable JSON envelope. Optional HMAC-SHA256 request signing (`X-Momo-Signature` header). Secrets stored encrypted at rest (AES-256-GCM, reusing `TOTP_ENCRYPTION_KEY`). Up to 10 endpoints per user, per-endpoint event subscriptions (or subscribe to all). Delivery is fire-and-forget with a 5-second timeout. Delivery history (last 50 attempts per endpoint) with HTTP status, duration, and error messages. 30-day log retention via daily cron job. New DB tables: `webhook_endpoints` and `webhook_deliveries` (migration `0031_bumpy_star_brand.sql`). New API routes: `GET/POST /api/settings/webhooks`, `PATCH/DELETE/GET /api/settings/webhooks/:id`, `POST /api/settings/webhooks/:id/test`. New Settings section with full UI. All translation keys added to de/en/fr/es/nl.

- **Automatisierte Integrationstests (Vitest)** — 29 Integrationstests für die drei kritischsten Business-Logic-Funktionen `completeTask`, `selectDailyQuest` und `updateStreak`. Tests laufen gegen eine echte PostgreSQL-Test-Datenbank (`momo_test`) ohne Mocks. Setup: `docker compose up db -d && npm test`. Dokumentation in `docs/testing.md`. Test-Infrastruktur: globaler Setup mit Auto-Migration, per-Test DB-Reset, Fixture-Helpers für User/Topic/Task.

- **i18n: Spanish (es) and Dutch (nl)** — Two new UI languages added. Spanish and Dutch translations cover all 21 namespaces (tasks, topics, habits, achievements, settings, auth, onboarding, …). Language switcher in Settings now shows 🇪🇸 Español and 🇳🇱 Nederlands alongside the existing German, English, and French options.

- **Per-Reminder-Type Notification Times** — Each opt-in reminder now has its own configurable notification time, independent of the global `notificationTime`. New time pickers appear in Settings under each enabled toggle:
  - "Due today" reminder: `dueTodayReminderTime` (default `08:00`)
  - Recurring-due reminder: `recurringDueReminderTime` (default `08:00`)
  - Overdue reminder: `overdueReminderTime` (default `08:00`)
  - Weekly review (Sundays): `weeklyReviewTime` (default `18:00`, previously hardcoded)
  All four fields are accepted by `PATCH /api/push/subscribe`. Migration `0030_broken_xorn.sql` adds the four `time` columns to `users`.

### Fixed

- **Daily Quest: Verschobene Quest wurde sofort wieder ausgewählt** — Beim Klick auf „Nicht heute" wurde die Quest zwar abgewählt, aber nicht als gesperrt markiert. Die Auswahllogik (`pickBestTask`) wählte dieselbe HIGH-Priority-Aufgabe sofort wieder als neue Quest aus, weil Priority-2 keinen Fälligkeits-Filter hat. Fix: `postponeDailyQuest` setzt jetzt zusätzlich `snoozedUntil = morgen`, sodass alle vier Prioritätsstufen die Aufgabe für den Rest des Tages ignorieren. Die Aufgabe erscheint morgen automatisch wieder.

- **Topic-Fortschrittsbalken aktualisiert sich jetzt live** — Der Fortschrittsbalken im Topic-Detail wurde nur beim Seiten-Laden berechnet und zeigte nach dem Erledigen von Aufgaben veraltete Werte bis zum Reload. Balken und Zähler (X/Y) werden jetzt im Client-State gepflegt und aktualisieren sich beim Erledigen oder Rückgängigmachen sofort ohne Neuladen.

- **Build-Fix: `rateLimitResponse` TypeScript-Fehler behoben** — `rateLimitResponse()` in `lib/rate-limit.ts` gab `Response` zurück, obwohl alle 82 API-Routen `NextResponse` erwarten (`TS2739`). Das brach den Docker-Build. Fix: Rückgabetyp auf `NextResponse` geändert, zentral für alle Call-Sites.

- **Vacation Mode: `enabled` → `active` umbenannt** — `PATCH /api/settings/vacation-mode` akzeptiert jetzt `active` statt `enabled` im Request-Body, passend zum `active`-Feld in der GET-Antwort. Frontend-Komponente und Validator aktualisiert.
- **OpenAPI Spec: fehlender `requestBody` bei Postpone** — `POST /api/daily-quest/postpone` erfordert `{ taskId: UUID, timezone?: string }`, was bisher nicht dokumentiert war. API-Konsumenten bekamen 422 ohne Erklärung.
- **OpenAPI Spec: `requestBody` für Task Complete dokumentiert** — `POST /api/tasks/{id}/complete` akzeptiert optionalen `{ timezone?: string }` Body für korrekte Streak-Berechnung, jetzt im Spec erfasst.
- **Streak-Reminder feuerte bei jedem Container-Neustart** — der Idempotenz-Guard war nur in-memory und wurde bei jedem Watchtower-Deployment zurückgesetzt. Außerdem fehlte eine Uhrzeit-Prüfung, weshalb der Reminder beim UTC-Mitternachts-Reset (= 02:00 CEST) und nach jedem Neustart sofort feuerte. Fix: `sendStreakReminders` verwendet jetzt denselben SQL-Zeitfenster-Filter wie alle anderen Notification-Funktionen (`notificationTime` 5-Minuten-Bucket in der User-Zeitzone). Cron-Guard geändert von `daily` (in-memory) auf `5min-bucket` (SQL-gesteuert). Morning-Briefing-User werden jetzt korrekt ausgeschlossen (erhalten Streak-Info bereits im Digest).
- **Push-Benachrichtigungen vollständig auf Deutsch** — Daily-Quest-Fallback, Fällig-heute-Body, Streak-Reminder und Streak-Schutzschild-Meldungen waren teilweise auf Englisch; alle Texte sind jetzt einheitlich auf Deutsch.
- **SSRF-Lücke im Webhook-Kanal geschlossen** — Der Webhook-Validator akzeptierte bisher auch `http://`-URLs (inkl. `http://localhost`, `http://192.168.x.x`), was Server-Side Request Forgery ermöglichte. Validator-Schema (`WebhookConfigSchema`) und Runtime-Check (`WebhookChannel.send()`) erzwingen jetzt HTTPS als einziges erlaubtes Protokoll.
- **422-Fehlerformat vereinheitlicht** — Alle öffentlichen API-Routen liefern bei Validierungsfehlern jetzt konsistent `{ error: "Validation failed", details: { field: [...] } }` statt dem vollständigen Zod-Flatten-Objekt mit `formErrors`-Anteil. API-Clients können damit direkt auf die relevanten Feldnamen zugreifen.
- **IDOR: Task-Topic-Zuweisung ohne Ownership-Check** — `createTask`, `updateTask` und `bulkUpdateTasks (changeTopic)` akzeptierten beliebige `topicId`-Werte ohne Prüfung, ob das Topic dem authentifizierten User gehört. Ein Angreifer konnte eigene Tasks einem fremden Topic zuordnen, was durch den FK `onDelete: set null` zu stiller Datenkorruption führte. Alle drei Stellen prüfen nun Ownership via `eq(topics.userId, userId)`. API-Routen geben korrekt 404 zurück.
- **Privilege Escalation: Read-only API-Keys konnten neue Keys anlegen** — `POST /api/user/api-keys` fehlte der `readonly`-Check. Ein read-only Key konnte sich damit selbst zu einem vollwertigen Key eskalieren. Fix: Readonly-Keys erhalten jetzt 403 auf diesem Endpoint.
- **Rate Limit auf `PATCH /api/settings/quest` ergänzt** — alle anderen Settings-Mutationen waren bereits limitiert (10/min), quest-Settings fehlte. Nun einheitlich.
- **OpenAPI Spec: Response-Schemas korrigiert** — mehrere Endpunkte hatten falsche oder unvollständige Response-Definitionen:
  - `DailyQuest`-Schema: Feld `task` → `quest` (entspricht tatsächlicher API-Antwort)
  - `POST /api/tasks/{id}/complete`: `coinsAwarded`/`newBalance` → `coinsEarned`/`newLevel`/`unlockedAchievements`/`streakCurrent` + fehlender 409-Status dokumentiert
  - `POST /api/daily-quest/postpone`: Spec zeigte fälschlicherweise `DailyQuest`; korrektes Schema `{ ok, postponesToday, postponeLimit }` + fehlende 404/422-Statuscodes ergänzt
  - `POST /api/energy-checkin`: Spec zeigte `DailyQuest`; korrektes Schema `{ quest, swapped, previousQuestId?, previousQuestTitle? }` dokumentiert
  - `POST /api/daily-quest` (Force-Reselect): Endpoint war komplett undokumentiert — nachgetragen

### Added

- **Überfällig-Erinnerung** — neuer opt-in Notification-Typ: täglicher Push/Channel-Reminder für Aufgaben, die ihr Fälligkeitsdatum überschritten haben (bis zu 30 Tage zurück). Sendet eine Einzel-Benachrichtigung bei einer überfälligen Aufgabe oder eine Zusammenfassung bei mehreren. Silent on empty — kein Ping, wenn nichts überfällig ist. Unterdrückt für Morgen-Briefing-Nutzer. Neuer Cron-Job `overdue-reminder`, Toggle in den Notification-Settings, neues DB-Feld `overdue_reminder_enabled` (Migration `0030`). Alle konfigurierten Kanäle (Web Push, ntfy, Pushover, Telegram, E-Mail, Webhook) unterstützt.
- **Webhook-Benachrichtigungskanal** — neuer generischer Outbound-Webhook-Kanal in den Notification-Settings. Sendet einen HTTP-POST mit JSON-Payload (`event`, `title`, `body`, `url`, `tag`, `timestamp`) an eine beliebige URL. Optionale HMAC-SHA256-Signierung via `X-Momo-Signature`-Header. Nützlich für Integrationen mit Home Assistant, n8n, Zapier, Make oder eigenen Servern. Kein Schema-Migration nötig — `config` ist bereits JSONB.
- **GET /api/user** — liefert jetzt Gamification-Stats (`coins`, `level`, `streakCurrent`, `streakShieldAvailable`); bisher war nur DELETE dokumentiert.
- **GET /api/user/profile** — liefert `name`, `email`, `image`; bisher fehlte der lesende Endpunkt.
- **GET /api/settings/quest** — liefert aktuelle Quest-Einstellungen (`postponeLimit`, `emotionalClosureEnabled`); bisher nur PATCH vorhanden.
- **GET + PATCH /api/settings/login-notification** — GET liefert den aktuellen Toggle-Wert; PATCH war bisher vollständig undokumentiert im OpenAPI-Spec.
- **OpenAPI-Spec** — 7 fehlende Endpunkte nachgetragen: `POST /api/tasks/{id}/breakdown`, `POST /api/tasks/{id}/promote-to-topic`, `POST /api/daily-quest/restore`, `POST/PATCH/DELETE /api/push/subscribe`, `POST /api/push/test`, `GET+PATCH /api/settings/login-notification`.

## [0.2.0] - 2026-04-12

### Added

- **Update-Checker** — das Admin-Panel zeigt jetzt einen Banner, wenn eine neuere Momo-Version auf GitHub verfügbar ist. Die Prüfung erfolgt einmal alle 24 Stunden via GitHub Releases API (In-Memory-Cache, kein Redis). Für Air-Gap-Installationen ohne Internet-Zugang kann die Prüfung per `DISABLE_UPDATE_CHECK=true` deaktiviert werden. Neue Env-Var in `.env.example` und `docs/environment-variables.md` dokumentiert.

## [0.1.0] - 2026-04-12

### Added

- **Login-Benachrichtigung bei neuem Gerät** — opt-in Sicherheits-Feature in den Settings: Erhalte eine Benachrichtigung auf allen konfigurierten Kanälen (Web Push, ntfy, Pushover, Telegram, Email), wenn eine Anmeldung von einem bisher unbekannten Gerät erkannt wird. Die Erkennung basiert auf einem SHA-256-Fingerprint aus User-Agent + IP-Adresse; existierende Sessions werden als Vergleichsbasis herangezogen. Beim allerersten Login (keine Vergleichsdaten) wird keine Benachrichtigung ausgelöst. Der Check feuert nur beim ersten authentifizierten Request nach einer neuen Session (First-Touch-Mechanismus in `touchSessionMetadata`) — nie mehr als einmal pro Session. Neuer Toggle im Settings-Bereich „Aktive Sitzungen". Neuer Endpoint `PATCH /api/settings/login-notification` (Rate-Limit 10/min). DB: neue Spalte `users.login_notification_new_device` (boolean, default false, Migration `0029`). i18n in de/en/fr.

- **Erweiterte Wiederholungsregeln** — Recurring Tasks unterstützen jetzt vier Regeltypen: **Intervall** (weiterhin N Tage rollend, bisheriges Verhalten), **Wochentag** (z. B. jeden Montag + Mittwoch), **Monatlich** (jeden Monat am gleichen Tag) und **Jährlich** (jedes Jahr am gleichen Datum). Wochentag-Tasks werden in der Habit-Statistik als Wochenstreaks (statt rollende Tagesperioden) ausgewertet; Monatlich/Jährlich entsprechend als Monats-/Jahresstreaks. Zusätzlicher **Fester Kalendertermin**-Toggle für Monatlich/Jährlich: bei aktiviertem Toggle wird `nextDueDate` immer vom geplanten Fälligkeitsdatum aus vorgerückt (gleicher Tag unabhängig vom Erledigungszeitpunkt); deaktiviert verhält sich der Typ rollend ab Erledigungsdatum. iCal-Export generiert jetzt typgerechte RRULEs (`FREQ=WEEKLY;BYDAY=MO,WE`, `FREQ=MONTHLY;BYMONTHDAY=N`, `FREQ=YEARLY;BYMONTH=M;BYMONTHDAY=D`). DB: neues Enum `recurrence_type` (INTERVAL/WEEKDAY/MONTHLY/YEARLY), neue Spalten `recurrence_weekdays` (JSON-Array) und `recurrence_fixed` (boolean) auf `tasks` (Migration `0027`). i18n in de/en/fr.

- **Achievements & Gamification ausgebaut** — 31 Achievements (vorher 13) mit Rarity-System (Common/Rare/Epic/Legendary), Coin-Belohnungen bei Freischaltung (10/25/50/100 Coins je Tier) und 3 geheimen Achievements (Nachtaktiv 🦉, Frühaufsteher 🐦, Doppelschicht ⚡). Neue dedizierte `/achievements`-Galerie mit Rarity-Sektionen (Legendary zuerst), Fortschrittsbalken für alle zählbaren Achievements, Secret-Masking bis zur Freischaltung und Gesamtübersichts-Balken. Achievement-Coins werden nach dem Task-Abschluss atomar in den Coin-Saldo gebucht. Push-Benachrichtigung bei Freischaltung über alle konfigurierten Kanäle (max. 3 pro Batch). Neue Achievement-Trigger: nach Topic-Erstellung (`first_topic`, `topics_5`, `first_sequential_topic`), Wishlist-Kauf (`first_wishlist_buy`, `wishlist_10_bought`) und Energy-Checkin (`energy_checkin_7`). Neues Quest-Streak-Tracking (`quest_streak_7`, `quest_streak_30`) auf `users`. Neue `getEnergyCheckinStreak()`-Funktion. DB: `rarity`, `coin_reward`, `secret` auf `achievements`; `quest_streak_current`, `quest_streak_last_date` auf `users` (Migration `0026_magical_havok`). Neue CSS-Variable `--rarity-legendary` (Violett). i18n in de/en/fr.

- **Session-Übersicht ("Aktive Geräte")** — neue Sicherheits-Sektion in den Settings: alle aktiven Login-Sessions werden mit Gerät/Browser, Betriebssystem, IP-Adresse, Login-Zeitpunkt und letzter Aktivität angezeigt. Einzelne Sessions können per Klick widerrufen werden (= sofortiger Logout auf dem betreffenden Gerät); „Alle anderen abmelden" entfernt alle Sessions außer der aktuellen in einem Schritt. Die aktuelle Session ist grün markiert und nicht widerrufbar (kein Self-Lockout). Session-Tokens werden nie an den Client exponiert — ein getrunkter SHA-256-Hash dient als öffentlicher Identifier. Geräteinformationen (User-Agent, IP) werden beim Login (Passkey) bzw. beim ersten authentifizierten Request (OAuth, verzögert via 1h-Throttle in `resolveApiUser`) erfasst. Legacy-Sessions ohne Metadaten zeigen „Unbekanntes Gerät". Drei neue API-Endpunkte: `GET /api/auth/sessions` (30/min), `DELETE /api/auth/sessions/:id` (10/min, blockiert aktuelle Session), `POST /api/auth/sessions/revoke-others` (5/min). DB: vier neue Spalten auf `sessions` (`created_at`, `last_active_at`, `user_agent`, `ip_address` — alle nullable, Migration `0026`). Kein neues npm-Paket — User-Agent-Parsing via einfache Regex. i18n in de/en/fr.
- **Recurring Fälligkeits-Benachrichtigung** — dedizierter, opt-in Push-Reminder für wiederkehrende Aufgaben die heute fällig sind. Sendet **individuelle Benachrichtigungen pro Task** (bei ≤3) oder eine gebündelte Zusammenfassung (bei >3) — so bekommt jeder Recurring Task seine eigene Aufmerksamkeit, unabhängig von der Daily Quest und dem allgemeinen „Fällig heute"-Reminder. Eigener Cron-Job `recurring-due` (5-Min-Bucket), unterdrückt bei aktiviertem Morgen-Briefing. Neuer Toggle in den Settings unter Web Push / Channels. DB: `recurring_due_reminder_enabled` auf `users` (Migration `0025`). i18n in de/en/fr.
- **Zeitzone in den Settings** — User kann seine IANA-Zeitzone jetzt explizit in den Einstellungen setzen statt sich auf die implizite Browser-Erkennung zu verlassen. Neue Settings-Sektion „Zeitzone" (nach Sprache) mit gruppiertem Dropdown aller IANA-Zeitzonen, automatischer Browser-Erkennung und „Browser-Zeitzone verwenden"-Button zum Zurücksetzen. Auto-Save bei Änderung. Relevant für User, die per VPN unterwegs sind oder auf Reisen — alle server-seitigen Cron-Jobs (Morning Briefing, Due-Today, Daily Quest, Weekly Review) verwenden `COALESCE(users.timezone, 'UTC')` und profitieren sofort. Neuer Endpoint `GET/PATCH /api/settings/timezone` (10/min Rate-Limit, IANA-Validierung via `Intl.DateTimeFormat`). Keine DB-Migration nötig — die Spalte `users.timezone` existiert seit Migration `0006`. i18n in de/en/fr.
- **Urlaubsmodus (Vacation Mode)** — pausiert alle wiederkehrenden Aufgaben für einen festgelegten Zeitraum. Verhindert, dass Urlaub oder Krankheit den Habit-Streak zerstört oder die Statistik verzerrt. In den Settings unter „Urlaubsmodus" aktivieren mit Enddatum — alle RECURRING Tasks erhalten `pausedAt`/`pausedUntil` und sind von Daily Quest, Fällig-heute-Benachrichtigungen und iCal-Feed ausgeblendet. Der Streak-Algorithmus (`computeHabitStreak`) überspringt pausierte Perioden. Beim Deaktivieren (manuell oder automatisch via täglichem Cron-Job `vacation-mode-auto-end`) wird `nextDueDate` pro Task um die tatsächliche Pausendauer verschoben. Vorzeitiges Beenden verschiebt nur um die tatsächlich pausierten Tage. Neuer Endpoint `GET/PATCH /api/settings/vacation-mode` (10/min Rate-Limit). Guard in `completeTask()` verhindert Abschluss pausierter Tasks. Habit-Card zeigt `faPause`-Badge mit Enddatum. DB: `paused_at` + `paused_until` auf `tasks`, `vacation_end_date` auf `users` (Migration `0024`). i18n in de/en/fr.
- **Morgen-Briefing (Daily Digest)** — opt-in tägliche Zusammenfassung statt einzelner Push-Nachrichten: Quest des Tages, fällige Tasks, aktueller Streak und neu freigeschaltete Achievements — alles in einer kompakten Nachricht. Eigene Briefing-Uhrzeit (Default: 08:00), unabhängig von der regulären Benachrichtigungszeit. Ersetzt bei aktivierten Usern die einzelnen Quest- und Fällig-heute-Erinnerungen automatisch. Settings-Toggle sichtbar sobald ein Kanal konfiguriert ist. Immer-senden-Prinzip: auch an ruhigen Tagen kommt eine motivierende Nachricht. Neuer Cron-Job `morning-briefing` (5-Min-Bucket). DB: `morning_briefing_enabled` + `morning_briefing_time` auf `users` (Migration `0023`). i18n in de/en/fr.
- **Benachrichtigungshistorie** — neue Settings-Sektion zeigt die letzten 50 gesendeten Benachrichtigungen mit Zeitstempel, Kanal (Web Push / ntfy / Pushover / Telegram / Email), Titel und Zustellstatus (Gesendet / Fehlgeschlagen). Bei fehlgeschlagenen Einträgen ist die Fehlermeldung per Klick aufklappbar. Primärnutzen: Debugging wenn Notifications nicht ankommen. Jeder individuelle Kanalversuch wird als eigene Zeile in die neue `notification_log`-Tabelle geschrieben (fire-and-forget — Logging blockiert niemals die Zustellung). Einträge älter als 30 Tage werden automatisch vom neuen `notification-log-cleanup` Cron-Job gelöscht. Neuer Endpoint `GET /api/settings/notification-history` (Auth: Session oder API Key). DB: neue Tabelle `notification_log` (Migration `0022`). GDPR-Export um Notification-Log erweitert. i18n in de/en/fr.
- **Onboarding-Flow für neue Nutzer** — geführter 4-Schritt-Wizard nach erster Anmeldung: (1) Konzepte kennenlernen (Tagesquest, Energie, Münzen, Streaks als animierte Karten), (2) erstes Topic anlegen (Inline-Formular mit Icon-Picker + Farbwahl), (3) erste Aufgaben hinzufügen (Quick-Add mit Enter-Shortcut), (4) Push-Benachrichtigungen aktivieren + Timezone-Erkennung. Jeder Schritt überspringbar, Wizard einmalig pro User. Gate in `app/(app)/layout.tsx` leitet neue User automatisch auf `/onboarding` um — eigenes Layout außerhalb der `(app)`-Routengruppe (analog `/setup/2fa`), kein Sidebar/Navbar. Bestehende User per Backfill-Migration (`UPDATE users SET onboarding_completed = true`) nicht betroffen. Framer-Motion-Step-Transitions (Slide + Spring), 4-Dot-Fortschrittsanzeige, staggered Concept-Card-Entrance. DB: neue Spalte `users.onboarding_completed` (boolean, default false, Migration `0021`). Neuer Endpoint `POST /api/onboarding/complete` (Rate-Limit 10/min). Business-Logic in `lib/onboarding.ts`. Komponenten unter `components/onboarding/` (Wizard-Shell, Progress, 4 Step-Komponenten). i18n-Keys `onboarding.*` in de/en/fr.
- **Bulk-Aktionen auf Tasks** — Mehrfachauswahl per Checkbox auf der Aufgabenliste. Aktionsleiste am unteren Bildschirmrand erscheint sobald ≥1 Task ausgewählt: Löschen, Topic wechseln, Priorität setzen, alle erledigen. Neuer `PATCH /api/tasks/bulk`-Endpoint mit Zod-validierter discriminated union. Bulk-Complete überspringt Gamification (Coins, Streak, Achievements) bewusst — das Feature ist ein Cleanup/Triage-Tool. Wiederkehrende Tasks werden beim Bulk-Erledigen ignoriert. Max 100 Tasks pro Aktion, Rate-Limit 10/min.

### Fixed

- **Migration 0025 fehlte im Journal** — `drizzle/meta/_journal.json` enthielt keinen Eintrag für `0025_recurring_due_reminder` (SQL-Datei existierte, Journal sprang von idx 24 direkt zu idx 25 mit dem Tag `0026_active_sessions`). Drizzle's `migrate()` liest ausschließlich das Journal — die Migration wurde daher nie angewendet, die Spalte `users.recurring_due_reminder_enabled` fehlte in der DB und verhinderte jede Anmeldung (`42703 errorMissingColumn`). Fix: Journal-Eintrag für idx 25 nachgetragen, folgende Einträge auf idx 26–28 verschoben.

- **Migration-Runner: Frühzeitiger Break bei pending Migration behoben** — `scripts/migrate.mjs` unterbrach die Reconciliation-Schleife beim ersten genuinen pending-Migration-Eintrag und überprüfte nachfolgende Migrationen nicht mehr. War eine spätere Migration bereits in der DB vorhanden (z. B. durch einen manuellen `ALTER TABLE` oder einen partiellen früheren Lauf), wurde sie nicht als „applied" geseedet, und `migrate()` versuchte sie erneut anzuwenden — das schlug mit „column already exists" fehl und verhinderte den Container-Start in einer Crash-Loop. Fix: Die Schleife läuft nun vollständig durch; `!tracked && appliedInDb`-Einträge werden auch nach einer pending Migration korrekt geseedet.

- **Migration-Runner: Out-of-order Migrationen werden jetzt direkt angewendet** — Drizzle's `migrate()` verwendet intern einen Timestamp-Watermark: Es werden nur Migrationen angewendet, deren `folderMillis` **größer** als der `MAX(created_at)`-Wert in der Tracking-Tabelle ist. Migrationen, die nachträglich in die Mitte einer bestehenden Sequenz eingefügt werden (z. B. ein fehlender Journal-Eintrag der später ergänzt wird), werden von `migrate()` **still ignoriert**, weil ihr Timestamp unterhalb des Watermarks liegt. `scripts/migrate.mjs` hat sich bisher auf `migrate()` verlassen, was diese Migrationen dauerhaft auslässt — Ergebnis: fehlende Spalten trotz „All migrations applied successfully". Fix: Vor der Reconciliation-Schleife wird der aktuelle Watermark (`MAX(created_at)`) eingelesen. Einträge mit `!tracked && !appliedInDb && entry.when ≤ watermark` gelten als Out-of-order und werden direkt über den Pool-Client mit Statement-by-Statement-Ausführung angewendet; „already exists"-Fehler (42701, 42P07, 42P06, 42710) werden toleriert um idempotente Wiederholbarkeit zu gewährleisten. Anschließend wird der Eintrag geseedet. Nur in-order Migrationen (`entry.when > watermark`) werden weiterhin `migrate()` überlassen.

- **Login-Seite: Fehlermeldung bei Auth.js-Fehlern** — bei einem Fehler (z. B. `SessionTokenError`, `AccessDenied`) leitete Auth.js zur Login-Seite mit `?error=`-Parameter weiter, ohne dass der User eine Rückmeldung erhielt. Die Login-Seite zeigt jetzt einen roten Fehler-Banner mit einer lokalisierten Meldung (`de`/`en`/`fr`). Bekannte Fehlercodes: `SessionTokenError` → „Sitzung konnte nicht geladen werden", `AccessDenied`, `Configuration`, Fallback für alle anderen.

- **Impressum und Datenschutzerklärung nicht länger indexierbar oder archivierbar** — beide Seiten tragen den Klarnamen und die Postadresse des Betreibers; aus Datenschutzgründen dürfen sie weder bei Google erscheinen noch im Internet Archive (archive.org / Wayback Machine) gespiegelt werden. Vorher waren sie explizit via `robots: { index: true, follow: true }` indexiert und sowohl in der `sitemap.xml` als auch im `allow`-Block von `robots.txt` gelistet. Fix: Beide Page-Komponenten in `app/(legal)/*/page.tsx` setzen jetzt `robots: { index: false, follow: false, noarchive: true, nosnippet: true, noimageindex: true }` (inkl. identischem `googleBot`-Block). Die Routen sind aus `app/sitemap.ts` entfernt und in `app/robots.ts` in die `disallow`-Liste verschoben. Zusätzlich setzt `robots.ts` für die bekannten Archiv-Crawler (`ia_archiver`, `archive.org_bot`, `Wayback Machine`) eine explizite `Disallow: /`-Regel als Best-Effort-Layer — der Internet Archive ignoriert robots.txt zwar offiziell seit 2017, respektiert aber den `noarchive`-Meta-Tag, der die primäre Verteidigung bildet. Die Seiten bleiben über Direktaufruf erreichbar (Pflicht laut § 5 DDG / DSGVO), werden aber nicht mehr gecrawlt.
- **Favicon zeigt nicht länger das Next.js-Logo** — `app/favicon.ico` war seit dem initialen `create-next-app`-Commit die Next.js-Default-Favicon und wurde nie durch die Momo-Feder ersetzt. Google Search Console, Browser-Tabs und jeder legacy-Client, der explizit `/favicon.ico` anfordert, haben deshalb weiterhin das Next.js-Symbol geliefert bekommen, obwohl `app/icon.svg` und `app/apple-icon.svg` bereits das Momo-Logo trugen. Neu: `app/favicon.ico` ist jetzt ein 2378-Byte Multi-Size-ICO (16/32/48 px, PNG-embedded), das direkt aus `app/icon.svg` via `sharp` gerendert wird. Die veralteten Next.js-Demo-Assets `public/{next,vercel,file,globe,window}.svg` wurden ebenfalls entfernt.
- **NEXT_PUBLIC_APP_URL in SEO-Output steht nicht mehr auf `localhost:3000`** — `sitemap.xml`, `robots.txt`, Open-Graph-Tags, JSON-LD und die iCal-Feed-Absolut-URLs zeigten in der Live-Version auf `http://localhost:3000`, weil der Dockerfile-Build-Stage `NEXT_PUBLIC_APP_URL="http://localhost:3000"` als inline-Platzhalter gesetzt hat. Next.js inlined `NEXT_PUBLIC_*`-Variablen zur **Build-Zeit** statisch in das Client-Bundle und in alle statisch gerenderten HTML-Seiten — eine Runtime-Override via `docker run -e` oder docker-compose ist wirkungslos. Behoben auf mehreren Ebenen:
  - `Dockerfile` verwendet jetzt `ARG NEXT_PUBLIC_APP_URL=http://localhost:3000` mit `ENV`-Durchreichung. Der Build-Arg wird von `docker-compose.yml` aus dem gleichnamigen Env weitergereicht, so dass `docker compose build` den Wert aus `.env` oder der Shell übernimmt.
  - Die GitHub-Actions-Pipeline `build-and-publish.yml` reicht `NEXT_PUBLIC_APP_URL` als Build-Arg durch, mit Default `https://momotask.app` (oder Override via Repo-Variable `vars.NEXT_PUBLIC_APP_URL`). Die publizierten `ghcr.io/jp1337/momo`-Images tragen damit die korrekte öffentliche URL im HTML.
  - `app/sitemap.ts` und `app/robots.ts` sind zusätzlich auf `export const dynamic = "force-dynamic"` gesetzt — als Safety-Net, falls ein Self-Hoster das Image mit dem Default-URL-Build-Arg pullt aber zur Runtime trotzdem einen anderen Wert im Env hat. Damit lesen diese beiden Routen immer den aktuellen Runtime-Wert.
  - `app/page.tsx::buildSoftwareAppJsonLd()` normalisiert die URL (trailing-slash-Stripping) und ergänzt `logo: /icon.svg` und `image: /og-image.png` als absolute URLs, damit Google Rich Results, Bing und Mastodon-Previews das Momo-Logo statt eines Fallbacks zeigen.
  - `public/og-image.png` (1200×630, 45 KB, Momo-Feder + „Steal your time back" in Lora-Italic auf Waldgrün-Gradient) wird jetzt mitgeliefert — vorher war die Referenz in `app/layout.tsx:86` ein 404.
  - Dokumentiert in `docs/seo.md` (inklusive Vergleichstabelle „welche Surface respektiert Runtime-Env, welche nicht") und in `docs-site/deployment.md`. Die K8s-`secret.example.yaml` erklärt die Limitation explizit, inklusive Handlungsanweisung für Self-Hoster.

### Added

- **Stats-Seite ausgebaut** — drei neue Auswertungen auf `/stats`: (1) **Completion-Rate pro Topic** — Topics werden jetzt nach Completion-Rate aufsteigend sortiert (vermiedene Topics zuerst), mit Farbkodierung (rot < 25%, grün > 75%) und neuer „Abschlüsse letzte 30 Tage"-Metrik pro Topic. (2) **Beste Wochentage** — neues 7-Spalten-Balkenchart zeigt, an welchen Wochentagen der User am produktivsten ist; bester Tag wird hervorgehoben. (3) **Streak-Verlauf als Sparkline** — SVG-Sparkline der letzten 90 Tage zeigt den Streak-Verlauf mit aktuellem Wert und Peak. Zusätzlich: alle ~50 Labels der Stats-Seite wurden von hardcoded Deutsch auf i18n (`stats.*`-Namespace) migriert — die Seite funktioniert jetzt vollständig in de/en/fr. Keine Schema-Änderung, keine neue API-Route — reine Auswertungs- und Render-Arbeit auf Basis bestehender `task_completions`-Daten. Neue Komponenten: `WeekdayChart`, `StreakSparkline`. Neue Funktion: `computeStreakHistory()` in `lib/statistics.ts`.
- **Wunschliste mit Coins freischalten** — Wishlist-Items mit einem `coinUnlockThreshold` erfordern jetzt eine ausreichende Münz-Balance vor dem Kauf. Beim Klick auf „Gekauft" werden die Coins atomar in einer DB-Transaction abgezogen; der CoinCounter in der Navbar aktualisiert sich sofort. Der Buy-Button zeigt die Coin-Kosten (z.B. „🪙 Kaufen (50 Münzen)") und ist deaktiviert wenn der User nicht genug Coins hat — ein Lock-Indikator zeigt wie viele Coins noch fehlen, ein „Freischaltbar"-Badge erscheint sobald das Guthaben reicht. Rückgängigmachen eines Kaufs refunded die Coins atomar. Items ohne Threshold funktionieren wie bisher. Swipe-to-buy auf Mobile wird ebenfalls blockiert wenn Coins fehlen. API: `POST /api/wishlist/:id/buy` gibt jetzt `{ item, coinsSpent }` zurück und liefert `422 INSUFFICIENT_COINS` bei zu wenig Guthaben; `DELETE` gibt `{ item, coinsRefunded }` zurück. Keine Schema-Änderung — `coinUnlockThreshold` existierte bereits. Schließt den Gamification-Loop: Coins sind jetzt echte Währung für Wünsche, nicht nur Punkte.
- **Streak Shield** — einmal pro Kalendermonat schützt ein automatisches Schild den Streak bei exakt einem verpassten Tag. Statt eines Resets auf 0 bleibt der Streak erhalten und der User wird per Push/Notification informiert („Dein Schild hat deinen Streak gerettet 🛡️"). Kein Opt-in nötig — das Shield ist immer aktiv. Auf dem Dashboard zeigt ein 🛡️-Indikator neben dem Streak an, ob das Shield diesen Monat noch verfügbar ist. DB: neue Spalte `streak_shield_used_month` auf `users` (Migration `0020`). Bei Gaps von 2+ Tagen greift das Shield nicht — nur ein einzelner verpasster Tag wird geschützt.
- **Per-Habit-Streak auf `/habits`** — jede wiederkehrende Aufgabe bekommt eine eigene Streak-Zählung, unabhängig vom globalen User-Streak. Neue Flammen-Pill (🔥 in `--accent-amber`) auf jeder `HabitCard` zeigt die laufende Serie in der passenden Einheit zur Recurrence („8 Wochen in Folge" für ein 7-Tages-Intervall, „5 Tage in Folge" für ein tägliches Habit) plus den All-Time-Bestwert als dezentes Sub-Label. Hat der User gerade einen neuen Rekord aufgestellt, zeigt das Label „Neuer Rekord" statt der Zahl. Algorithmus: eine *Periode* ist ein rollierendes Fenster von `recurrenceInterval ?? 1` Tagen, die laufende Periode erhält eine Grace (ein wöchentliches Habit setzt nicht sofort zurück, nur weil der Montag begonnen hat), mehrfach-Abschlüsse in einer Periode zählen als einer. Implementierung: neue reine Funktion `computeHabitStreak()` in `lib/habits.ts` (vollständig getestet mit 10 Edge-Case-Szenarien), `HabitWithHistory` um ein `streak`-Feld erweitert, `getHabitsWithHistory()` lädt zusätzlich *alle* Completion-Daten des Users (eine zweite unbegrenzte Query, ein Scan — keine Schema-Änderung), `HabitCard` um die Streak-Pill ergänzt, neue i18n-Keys `habits.stat_streak`, `habits.stat_streak_empty`, `habits.stat_streak_best`, `habits.stat_streak_best_current` und `habits.streak_unit_{days,weeks,biweeks,months,generic}` mit ICU-Plurals in de/en/fr. Dokumentierte Limitation: bei sehr langen Intervallen (Monat/Jahr) drifted das rollierende Fenster gegenüber dem Kalender — der Roadmap-Punkt „Erweiterte Wiederholungsregeln" (WEEKDAY/MONTHLY/YEARLY) behebt das an der Quelle, bis dahin sind 1- und 7-Tages-Intervalle die verlässlichen Fälle.
- **Timezone-Durchschleifung auf `/habits`** — mitgefixter latenter Bug: das Grid-Bucketing in `getHabitsWithHistory` lief bislang auf Server-Lokalzeit, weil die Habits-Page die Funktion ohne `timezone`-Argument aufgerufen hat. User in UTC+2, die eine Aufgabe um 23:50 lokal abschließen, hätten das Quadrat am *nächsten* UTC-Tag grün gesehen. Fix: `app/(app)/habits/page.tsx` lädt jetzt `users.timezone` analog zu `/review` und reicht den Wert durch. Der Code in `lib/habits.ts` akzeptierte den Parameter bereits, er wurde nur nie gesetzt.
- **Haushalt-Vorlage im TemplatePicker** — vierte kuratierte Topic-Vorlage mit sechs wiederkehrenden Haushaltsroutinen und sinnvollen Standardintervallen: Wäsche waschen (7 Tage), Staubsaugen (7 Tage), Küche reinigen (3 Tage), Bad putzen (14 Tage), Fenster putzen (30 Tage), Bettwäsche wechseln (14 Tage). Alle Aufgaben werden als `RECURRING` importiert und erscheinen sofort im `/habits`-Tracker sowie im Daily-Quest-Pool. Da die bisherigen Templates nur `ONE_TIME`-Tasks erzeugt haben, wurde `TemplateTask` in `lib/templates.ts` um die optionalen Felder `type` und `recurrenceInterval` erweitert (abwärtskompatibel — ohne Angabe bleibt es ONE_TIME); `importTopicFromTemplate()` zieht jetzt die IANA-Timezone des Users und setzt `nextDueDate = getLocalDateString(tz)` für RECURRING-Tasks, exakt wie `createTask()` in `lib/tasks.ts`. Keine Schema-Änderung, keine neue API-Route, keine neuen Env-Vars — ein neuer Eintrag in `TEMPLATES`, ein Eintrag in `CLIENT_TEMPLATES` der `TemplatePicker`-Komponente und ein `templates.household.*`-Block in `messages/{de,en,fr}.json`. Icon: `broom`, Farbe: `#5c8ab8` (gedämpftes Blau zur Abgrenzung vom orangen Umzugs-Template).
- **"Fällig heute"-Reminder (Due-Today Reminder)** — neuer opt-in Cron-Job `due-today` in `lib/cron.ts`, der zur gleichen Uhrzeit wie die Daily-Quest-Benachrichtigung feuert und alle Tasks auflistet, deren `due_date` (bzw. `next_due_date` bei RECURRING) heute in der Timezone des Users liegt. **Silent on empty** — an Tagen ohne fällige Aufgaben wird *nichts* verschickt, was „leere" Reminder verhindert, die User daran gewöhnen wegzuwischen. Snoozed Tasks sind ausgeschlossen. Die Benachrichtigung fasst bei einer einzelnen fälligen Aufgabe den Titel direkt in den Notification-Title; bei mehreren wird ein Count-Titel mit Preview der ersten drei Titel im Body gezeigt. Implementierung: neue `users.due_today_reminder_enabled`-Spalte (default false, Migration `drizzle/0019_low_mattie_franklin.sql`), neuer Handler `sendDueTodayNotifications()` in `lib/push.ts` (folgt 1:1 dem `sendDailyQuestNotifications`-Muster inkl. 5-Min-Bucket-SQL in User-TZ, Pro-User-Cache, parallele Web-Push- und Channel-Fan-outs), Registrierung im `CRON_JOBS`-Array **vor** `daily-quest` damit beide Pings nicht kollidieren, neue Checkbox + Hint in `NotificationSettings` (sichtbar, sobald Web Push aktiv ist *oder* mindestens ein Notification-Channel konfiguriert ist — dafür nimmt die Komponente neue Props `initialDueTodayEnabled` und `hasAnyChannel` entgegen), erweiterte `PATCH /api/push/subscribe`-Route (alle Felder optional, mindestens eines Pflicht). Reines Add-on — keine neuen API-Routen, keine neuen Env-Vars, keine neuen Dependencies. Doku in `docs/api.md`, `docs/database.md`, `docs-site/features.md`. i18n-Keys `notif_due_today`/`notif_due_today_hint`/`notif_due_today_saved` in de/en/fr.
- **Gewohnheits-Tracker (Habit-Tracker)** — neue Seite `/habits`, die jede wiederkehrende Aufgabe (`type = 'RECURRING'`) mit einem GitHub-Style Jahres-Raster visualisiert (53 Wochen × 7 Tage, montags beginnend, ISO-Wochen). Jede Zelle wird anhand der Anzahl der Abschlüsse an diesem lokalen Kalendertag eingefärbt (4 Stufen via `color-mix` auf `var(--accent-green)` — funktioniert in Light und Dark Mode ohne Theme-Switch). Pro Habit werden drei Zähl-Pills angezeigt (dieses Jahr, letzte 30 Tage, letzte 7 Tage) sowie Topic-Icon + Recurrence-Intervall als Subtitle. Ein Jahres-Selector oberhalb der Liste erlaubt es, zurückliegende Jahre zu durchstöbern — der Range wird dynamisch aus der frühesten Completion des Users abgeleitet, sodass niemand durch leere Pre-Account-Jahre scrollen muss. **Keine Schema-Änderung und keine Migration** — die Tabelle `task_completions` wird bereits heute von `completeTask()` für jede (inklusive recurring) Completion befüllt; dieses Feature ist ein reines Read-Path-Addon. Implementierung: neues Modul `lib/habits.ts` (`getHabitsWithHistory`, `getEarliestCompletion`, `buildYearOptions` — eine einzige Completion-Query deckt alle drei Zeitfenster ab, Timezone-Handling analog zu `lib/date-utils.ts`), neue Route `app/(app)/habits/page.tsx` (SSR, `?year=`-Query), drei neue Komponenten unter `components/habits/` (`contribution-grid.tsx` — reines CSS-Grid ohne Charting-Lib, `habit-card.tsx`, `year-selector.tsx`), neuer Sidebar-Eintrag „Gewohnheiten" (`faSeedling`) zwischen Themen und Wunschliste. i18n-Keys `habits.*` in de/en/fr (inklusive lokalisierter Monats- und Wochentags-Kürzel). Keine neuen API-Routen, keine neuen Env-Vars.
- **iCal-Export (Kalender-Abonnement)** — User können ihre Momo-Aufgaben als privaten iCalendar-Feed in Google Calendar, Apple Calendar, Outlook oder Thunderbird abonnieren. In den Settings unter „Kalender-Abonnement“ generiert ein Klick auf „Feed-URL erstellen“ einen 256-Bit-Token, die resultierende URL (`/api/calendar/<token>.ics`) wird einmalig angezeigt und kopiert — der Server persistiert nur den SHA-256-Hash. Der Feed enthält alle nicht erledigten Aufgaben mit `due_date` oder (bei `RECURRING`) `next_due_date` als Ganztages-`VEVENT`s; wiederkehrende Aufgaben bekommen ein offenes `RRULE:FREQ=DAILY;INTERVAL=<recurrenceInterval>` und erscheinen als Serie. UIDs sind stabil (`task-<id>@momo`), sodass Updates bei jedem Poll sauber gemerged werden. Snoozed und sequenziell-blockierte Aufgaben sind bewusst enthalten — der Kalender zeigt den Plan, nicht die Aktionsliste. Der Feed-Endpunkt ist öffentlich; die Auth ist allein der Token im Pfad (Calendar-Clients können keine Custom-Header schicken), ungültige Tokens liefern **404** (nicht 401), um keine Existenz-Leaks zu erzeugen. Rotate und Revoke sind 2FA-pflichtig (analog zu API-Keys). Implementierung: neue Spalte `users.calendar_feed_token_hash` + `calendar_feed_token_created_at` (Migration `drizzle/0018_smiling_lester.sql`), neues Modul `lib/calendar.ts` (Token-Gen nach dem `api-keys`-Muster + `buildIcsForUser()` über `ical-generator@10.1.0`), neue Routen `GET /api/calendar/[token]` und `GET/POST/DELETE /api/settings/calendar-feed`, neue Komponente `components/settings/calendar-feed-section.tsx` mit One-Time-URL-Display und Kopier-Button. OpenAPI in `lib/openapi.ts` ergänzt, Doku in `docs/api.md` + `docs/database.md`, i18n-Keys `calendar_feed_*` in de/en/fr.
- **Aufgaben-Vorlagen (Topic Templates)** — One-Click-Import für kuratierte Topic-Vorlagen. Auf der Topics-Seite gibt es neben „+ Neues Thema" einen zweiten Button „📋 Aus Vorlage" der einen Modal mit drei Vorlagen öffnet: **Umzug** (10 Aufgaben, sequenziell), **Steuererklärung** (6 Aufgaben, sequenziell) und **Sport-Routine** (7 Aufgaben, parallel). Klick auf „Importieren" legt in einer einzigen Drizzle-Transaction ein vollständiges Topic mit allen Subtasks an — inklusive Icon, Farbe, `defaultEnergyLevel`, optionalen Priority/Energy/EstimatedMinutes-Overrides pro Subtask und korrekter `sortOrder`. Titel und Beschreibungen werden beim Import in der aktuellen UI-Sprache (de/en/fr) über `next-intl` aufgelöst und als Plain Text gespeichert — der importierte Content ist danach entkoppelt von der i18n-Schicht und frei editierbar. Implementierung: neue Datei `lib/templates.ts` (Template-Katalog + `importTopicFromTemplate()` nach dem Muster von `breakdownTask`), neue Route `POST /api/topics/import-template` (Rate-Limit 10/min, Readonly-API-Keys geblockt), neuer `ImportTemplateInputSchema` in `lib/validators/index.ts`, neue Komponente `components/topics/template-picker.tsx`, Integration in `components/topics/topics-grid.tsx`. OpenAPI-Schema in `lib/openapi.ts` registriert, Doku in `docs/api.md`. i18n-Keys `templates.*` + `topics.from_template` in de/en/fr. Keine DB-Migration nötig — Templates sind Code, keine User-Daten.
- **Sequenzielle Topics** — Topics lassen sich per Toggle im Topic-Form als *sequenziell* markieren. In einem sequenziellen Topic ist bei der Daily-Quest-Auswahl nur die erste noch offene Aufgabe (niedrigste `sortOrder`, nicht gesnoozed) wählbar; alle dahinter liegenden Aufgaben sind implizit blockiert, bis die vorherige erledigt ist. Die bestehende Drag-&-Drop-Reihenfolge (`SortableTaskList` + `/api/topics/[id]/reorder`) ist die Eingabe — keine expliziten Task-Dependencies nötig. Snoozen einer Aufgabe rückt die Kette auf (bewusst, damit ein Snooze die Kette nicht einfriert). Implementierung: neue Spalte `topics.sequential` (boolean, default false, Migration `drizzle/0017_hard_boomer.sql`), blockierte Task-IDs werden in `pickBestTask()` (`lib/daily-quest.ts`) einmal pro Aufruf berechnet und via `notInArray(tasks.id, blockedTaskIds)` aus allen vier Tiers (Overdue, High-Priority, Recurring, Random Pool) herausgefiltert — ein einziger Touchpoint, greift automatisch auch bei `forceSelectDailyQuest` und `reselectQuestForEnergy`. UI: Toggle im `TopicForm`, neuer `faListOl`-Badge auf der `TopicCard`, dezenter Hinweisstreifen in `TopicDetailView` oberhalb der Task-Liste. OpenAPI-Schema und i18n (de/en/fr) mit ergänzt. Doku in `docs/database.md`, `docs/api.md`, `docs-site/features.md`.
- **Energie-Feature: Redesign mit Auto-Re-Roll, Verlauf, Topic-Defaults und Stats** — der Energie-Check-in war zwei strukturelle Bugs lang praktisch unsichtbar (`!quest`-Kopplung in `daily-quest-card.tsx`, UTC↔Local-Vergleich in `dashboard/page.tsx`) und hat selbst nach erfolgreichem Check-in nichts Sichtbares getan. Komplett überarbeitet:
  - **Inline-Karte oben am Dashboard** (`components/dashboard/energy-checkin-card.tsx`): permanent sichtbar, kollabiert nach Check-in zu einer Statusleiste mit „Ändern"-Button. Wechsel-Window: jederzeit, solange die Quest noch nicht erledigt ist.
  - **Auto-Re-Roll der Daily Quest**: neue Funktion `reselectQuestForEnergy()` in `lib/daily-quest.ts` — wenn die aktuelle Quest energetisch nicht zum Check-in passt und ein besserer Kandidat existiert, tauscht Momo automatisch und zeigt einen kleinen „Quest auf deine Energie angepasst"-Banner mit Undo-Link. Idempotent in allen anderen Fällen (untagged Quest, schon passend, schon erledigt). Undo via neuer `POST /api/daily-quest/restore`-Route.
  - **Bugfix Bug A** — `EnergyCheckinCard` ist vom Quest-Zustand entkoppelt und erscheint für jeden User mit oder ohne Quest.
  - **Bugfix Bug B** — der „heute schon eingecheckt?"-Vergleich passiert jetzt im Browser gegen `new Date().toLocaleDateString("en-CA")` statt server-seitig gegen einen UTC-String. Damit verlieren User östlich/westlich von UTC ihren Check-in nicht mehr um Mitternacht.
  - **Historischer Verlauf**: neue Tabelle `energy_checkins(user_id, date, energy_level, created_at)` mit Index `(user_id, date)`. Mehrere Einträge pro Tag erlaubt — Re-Check-ins (morgens HIGH, abends LOW) werden voll persistiert. Die alte `users.energyLevel`/`energyLevelDate` bleibt als Cache.
  - **Topic-Default-Energie**: neue Spalte `topics.default_energy_level`. Tasks im Topic erben den Wert beim Erstellen, wenn der User keinen expliziten Wert wählt (`undefined` → Inheritance, expliziter `null` → "egal" gewinnt). Picker im Topic-Form, dezenter Hinweis im Task-Form wenn ein Default greifen würde.
  - **Quick Wins (Dashboard) & 5-Min-Mode** sortieren energie-bewusst: Tasks mit passender oder leerer Energie zuerst, Mismatches zuletzt. Reine Sortierung, kein Hard-Filter.
  - **Stats-Block "Energie diese Woche"** auf `/stats` — drei Zähler-Pillen + 14-Tage-Mini-Chart aus den `energy_checkins`-Daten. Empty-State-Hinweis wenn der User noch nie eingecheckt hat.
  - **Migration** `drizzle/0016_melted_black_cat.sql` (CREATE TABLE + ALTER TABLE).
  - **API**: `POST /api/energy-checkin` antwortet jetzt zusätzlich mit `{ swapped, previousQuestId, previousQuestTitle }`. Neuer `POST /api/daily-quest/restore`-Endpoint für den Undo-Pfad.
  - **i18n**: neue Keys `energy_card_*`, `form_label_default_energy`, `form_default_energy_*`, `form_energy_topic_default_hint` in DE/EN/FR.
- **SEO für die öffentliche Momo-Instanz** — vollständige Suchmaschinen- und Social-Preview-Unterstützung für `momotask.app` und jede selfhostete Instanz. `app/layout.tsx` setzt jetzt `metadataBase` (aus `NEXT_PUBLIC_APP_URL`), `alternates.canonical`, eine Robots-Direktive, ein erweitertes `openGraph`-Objekt (siteName, locale, image) und Twitter Cards (`summary_large_image`). Neu: `app/robots.ts` (typed `MetadataRoute.Robots` — erlaubt `/`, `/login`, `/impressum`, `/datenschutz`, blockt das gesamte App-Shell, `/api/*` und `/api-docs`) und `app/sitemap.ts` (typed `MetadataRoute.Sitemap` mit den vier öffentlichen Routen, eine Entry pro Route, kein Locale-Fan-Out weil next-intl cookie-basiert läuft). Auf der Landing (`app/page.tsx`) liegt ein `SoftwareApplication`-JSON-LD-Schema im `<head>` für Google Rich Results. Pro-Route-Metadaten ergänzt: `/login` und `/api-docs` sind `noindex`, `/impressum` und `/datenschutz` haben jetzt eigene `description` + `canonical`. Doku in `docs/seo.md`. **Hinweis:** `public/og-image.png` (1200×630) ist noch nicht committed — bis dahin fallen Link-Previews auf das Standard-Icon zurück.
- **Passkeys (WebAuthn)** — passwortloser Primary-Login *und* methodenagnostischer zweiter Faktor. Registrierung in den Settings unter der 2FA-Sektion; `/login` zeigt oberhalb der OAuth-Buttons einen prominenten „Mit Passkey anmelden"-Eintrag; `/login/2fa` bietet Passkey als Alternative zum TOTP-Code (oder einzige Option, wenn der User keinen TOTP eingerichtet hat). Implementiert auf Basis von `@simplewebauthn/server` + `@simplewebauthn/browser` v13, **ohne** den Auth.js-Passkey-Provider (der `session: "jwt"` erzwingen würde) — stattdessen eigene Endpoints unter `/api/auth/passkey/*` (register/login/second-factor/[id]: 7 Routen) die Auth.js-Datenbanksessions direkt erzeugen, sodass der DrizzleAdapter sie beim nächsten Request transparent aufgreift. Neue Tabelle `authenticators` (Auth.js-kompatibel + Momo-Displaylabel), neues Business-Logic-Modul `lib/webauthn.ts`, neue Env-Vars `WEBAUTHN_RP_ID` (Default: Hostname aus `NEXT_PUBLIC_APP_URL`) und `WEBAUTHN_RP_NAME`. Challenges werden in einem kurzlebigen signierten httpOnly-Cookie gespeichert (5-Min-TTL, HMAC-SHA256 über `AUTH_SECRET`, purpose-tag `reg`/`login`/`sf` gegen Cross-Flow-Replay). `userHasSecondFactor()` wurde um den Passkey-Check erweitert — eine einzige Touchpoint, alle Gates (Layout, Settings, API-Auth) profitieren automatisch. Sessions aus dem passwordless Login werden mit `second_factor_verified_at = now()` angelegt, da ein Passkey inhärent MFA ist. Neue UI-Komponenten `PasskeysSection`, `PasskeyLoginButton`, `PasskeySecondFactorButton`. i18n-Keys in de/en/fr. Siehe `docs/two-factor-auth.md` + `docs/api.md` + neue User-Doc `docs-site/passkeys.md`.
- **DB-Rename `sessions.totp_verified_at` → `sessions.second_factor_verified_at`** — die Spalte ist jetzt methodenagnostisch. Helper-Funktionen entsprechend umbenannt (`markSessionTotpVerified` → `markSessionSecondFactorVerified`, `isSessionTotpVerified` → `isSessionSecondFactorVerified`). Migration `drizzle/0015_passkeys.sql` nutzt `ALTER TABLE … RENAME COLUMN`, keine Datenverluste für in-flight Sessions.

- **Zwei-Faktor-Authentifizierung (TOTP)** — neuer optionaler zweiter Faktor zusätzlich zum OAuth-Login. Funktioniert mit jeder RFC-6238-Authenticator-App (Aegis, 2FAS, Google Authenticator, Authy, 1Password, …). Setup-Wizard mit QR-Code in den Settings, 10 einmalig nutzbare Backup-Codes, Login-Challenge unter `/login/2fa`, Re-Verifikation für Disable und Backup-Code-Regenerate. TOTP-Secrets werden mit AES-256-GCM verschlüsselt (`TOTP_ENCRYPTION_KEY`-Env-Var), Backup-Codes mit SHA-256 gehasht. Personal Access Tokens (API-Keys) sind bewusst von der 2FA-Pflicht ausgenommen — sie gelten als eigener Faktor. Implementierung in `lib/totp.ts`, fünf neue Routen unter `/api/auth/2fa/*`, neue Settings-Sektion und i18n in de/en/fr.
- **Admin-Enforcement: `REQUIRE_2FA=true`** — neue Env-Var, die alle Konten zwingt, vor dem Zugriff auf irgendeine geschützte Route einen zweiten Faktor einzurichten. Hard-Lock auf `/setup/2fa` (eigenes Layout außerhalb des `(app)`-Trees, kein Redirect-Loop). Bestehende User ohne 2FA werden beim nächsten Login direkt gegated. Disable-Endpoint blockt mit `403 TOTP_REQUIRED_BY_ADMIN`. Methoden-agnostischer Gate via `userHasSecondFactor()` — vorbereitet auf das zukünftige Passkey-Feature ohne weitere Codeänderungen.

### Security

- **nodemailer auf 8.0.4 angehoben** — adressiert [GHSA-c7w3-x93f-qmm8](https://github.com/advisories/GHSA-c7w3-x93f-qmm8) (low severity, SMTP command injection via unsanitized `envelope.size`-Parameter in nodemailer < 8.0.4). In Momo nicht ausnutzbar (wir setzen das `envelope`-Option in `transporter.sendMail` nirgendwo, und next-auths Email-Provider ist nicht aktiviert), aber der Bump schließt den Dependabot-Alert. Da next-auth einen `peerOptional`-Pin auf nodemailer ^7 hat, wird der v8-Bump per `npm overrides` durchgesetzt.

- **HTML-Attribut-Escaping in TelegramChannel vervollständigt** — CodeQL [`js/incomplete-html-attribute-sanitization`](https://codeql.github.com/codeql-query-help/javascript/js-incomplete-html-attribute-sanitization/) (medium). Die `escapeHtml`-Helper-Funktion in `lib/notifications.ts` escaped jetzt zusätzlich `"` und `'`, sodass Payload-URLs in `<a href="...">` sicher sind, falls jemals ein `"` in einer Notification-URL auftaucht. Praktisch nicht ausnutzbar (URLs kommen nur aus Momos eigenen Settings/Dashboard-Links, nie aus User-Input), aber Defense-in-Depth.

- **GitHub-Workflow `cleanup-images.yml` mit Top-Level `permissions: contents: read`** — CodeQL [`actions/missing-workflow-permissions`](https://codeql.github.com/codeql-query-help/actions/actions-missing-workflow-permissions/) (medium). Der `cleanup-registries`-Job hatte keinen `permissions`-Block; er redet nur mit Docker Hub und Quay.io und braucht von GitHub gar nichts. `cleanup-ghcr` behält sein `packages: write` Override.

### Changed

- **npm install und Build sind jetzt warnungsfrei** — alle 11 npm-Warnungen (3 ERESOLVE wegen React 19 vs swagger-ui-react-Transitives, 8 Deprecation-Warnings aus Workbox-/Drizzle-/Swagger-Subtrees) per `npm overrides` und `.npmrc legacy-peer-deps=true` adressiert. Konkret:
  - `react-copy-to-clipboard` → ^5.1.1 (drops React 18 cap)
  - `react-inspector` → ^9.0.0 (R18+19)
  - `react-debounce-input` → bleibt 3.3.0 (abandoned, hard React 18 cap), kompensiert via `legacy-peer-deps=true` in `.npmrc`
  - `workbox-build` → ^7.4.0 (drops glob@7 + inflight)
  - `glob` → ^13.0.0 (latest)
  - `magic-string` → ^0.30.21 (uses @jridgewell/sourcemap-codec)
  - `source-map` → ^0.7.6 (replaces workbox' abandoned 0.8.0-beta.0)
  - `node-domexception` → npm:@nolyfill/domexception@^1.0.28 (no-op stub; on Node 17+ globalThis.DOMException ist nativ verfügbar)
  - `@esbuild-kit/esm-loader` + `@esbuild-kit/core-utils` → npm:noop-package@^1.0.0 (drizzle-kit deklariert sie als Deps, importiert sie aber nirgendwo — Phantom-Dependencies, sicher zu stubben). `drizzle-kit check` läuft trotzdem sauber durch.
  - Verifiziert: `npm install` 0 warnings, `npm audit` 0 vulnerabilities, `npm run build` success, `tsc --noEmit` clean, `drizzle-kit check` "Everything's fine 🐶🔥".

- **GitHub Actions auf Node 24 migriert** — Vorbereitung auf das Node 20 Sunset (forced default 2026-06-02, removal 2026-09-16). Konkret: `actions/cache@v4 → @v5`, `actions/checkout@v4 → @v6` und `actions/configure-pages@v5 → @v6` in `docs.yml`. Der Pages-Deploy-Job nutzt zusätzlich `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` als dokumentierten Workaround, weil `actions/upload-pages-artifact@v4` und `actions/deploy-pages@v5` intern noch ein Node-20 `upload-artifact` bündeln (beide bereits an ihren neuesten Tags — keine neuere Version verfügbar).

### Fixed

- **Docker-Build kopiert jetzt `.npmrc` in den `deps`-Stage** — vorher hat `npm ci` im Container im strikten Modus ohne `legacy-peer-deps` gelaufen und mit ~40 fehlenden Lockfile-Einträgen abgebrochen (z.B. `webpack@5.105.4` aus `workbox-webpack-plugin`'s Peers). Local lief `npm ci` sauber, weil `.npmrc` im Repo-Root war — im Container nicht vorhanden. Fix: `COPY package.json package-lock.json .npmrc ./` im Dockerfile. `lint`-Job in `build-and-publish.yml` war nicht betroffen, weil er außerhalb von Docker im Repo-Root läuft.

- **Dockerfile Build-Time Env Stubs nicht mehr in Image-Layer** — der `dockerfile-rules SecretsUsedInArgOrEnv`-Lint hatte `ENV "AUTH_SECRET"`, `ENV "DATABASE_URL"`, `ENV "NEXT_PUBLIC_APP_URL"` flagged. Die drei Placeholder müssen nur existieren, damit `next build` `lib/env.ts` beim Modul-Load auswerten kann. Sie sind jetzt inline auf der `RUN npm run build`-Zeile gesetzt — existieren also nur für die Dauer dieses Build-Steps und werden nie in eine Image-Layer-Metadaten gebrannt.

### Added

- **Microsoft Sign-In (private accounts only)** — Login via persönlichem Microsoft-Account (Outlook.com, Hotmail, Live, Xbox, Skype). Aktiviert über `MICROSOFT_CLIENT_ID` + `MICROSOFT_CLIENT_SECRET`. Der Tenant ist hart auf `consumers` gepinnt (`https://login.microsoftonline.com/consumers/v2.0/`) — Work / School / Microsoft 365 Accounts werden bewusst nicht unterstützt, weil Auth.js den Consumer-Endpoint erzwingt. Button erscheint automatisch auf `/login` und in Settings → Connected Accounts (Account Linking funktioniert über die bestehende `linking_requests`-Flow). Keine DB-Migration. Setup-Anleitung in [docs/oauth-setup.md](docs/oauth-setup.md#microsoft-private-accounts-only) und [docs-site/oauth-setup.md](docs-site/oauth-setup.md). Damit ist der "Microsoft Sign In"-Eintrag aus `ROADMAP.md` (Nächste Schritte) abgehakt.

- **Telegram Benachrichtigungskanal** — Push-Benachrichtigungen über einen Telegram-Bot. User trägt Bot Token (von @BotFather) und Chat ID (z.B. via @userinfobot) in den Einstellungen ein. Nutzt die Telegram Bot API mit HTML-Parse-Mode und einem "Open Momo"-Click-Through-Link. Robustes HTML-Escaping für Sonderzeichen in Task-Titeln. Test-Button in den Einstellungen. Dreisprachig (DE/EN/FR). Keine DB-Migration — die Multi-Channel-Architektur trägt den neuen Kanal automatisch.

- **E-Mail Benachrichtigungskanal** — Tagesquest-Reminder, Streak-Warnung und Wochenrückblick per E-Mail. SMTP-Credentials sind eine Instance-Konfiguration über Env-Vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`); jeder User trägt nur die Ziel-Adresse ein (Default = Account-Mail). Stilisiertes Newsletter-HTML-Template (table-based, Outlook-kompatibel, Lora-Heading, Waldgrün-Akzent, CTA-Button) plus Plain-Text-Alternative für bessere Spam-Reputation. Singleton-Transporter via `nodemailer`. UI verbirgt den "+ E-Mail"-Button automatisch, wenn die Instanz kein SMTP konfiguriert hat. Test-Button verifiziert die Zustellung. Dreisprachig (DE/EN/FR). Keine DB-Migration nötig.

- **Pushover Benachrichtigungskanal** — Push-Benachrichtigungen über die Pushover API (iOS, Android, Desktop). Konfigurierbar in den Einstellungen unter "Zusätzliche Benachrichtigungskanäle" mit User Key und App Token. Test-Button zum Verifizieren. Nutzt die bestehende Multi-Channel-Architektur — keine DB-Migration nötig. Dreisprachig (DE/EN/FR).

- **ntfy.sh Benachrichtigungskanal** — Zusätzlicher Benachrichtigungskanal über ntfy.sh (öffentlich oder self-hosted). Konfigurierbar in den Einstellungen unter "Zusätzliche Benachrichtigungskanäle". Unterstützt Topic-Name und optionalen Server-URL. Test-Button zum Verifizieren der Konfiguration. Benachrichtigungen werden für Daily Quest, Streak-Erinnerungen und Wochenrückblick gesendet — unabhängig von Web-Push. Neue `notification_channels`-Tabelle mit JSONB-Config und Multi-Channel-Architektur: Neue Kanäle (Pushover, Telegram, E-Mail, Webhook) benötigen keine DB-Migration. Neues `NotificationChannel`-Interface in `lib/notifications.ts`. Dreisprachig (DE/EN/FR). API-Endpoints: `GET/PUT /api/settings/notification-channels`, `DELETE /api/settings/notification-channels/:type`, `POST /api/settings/notification-channels/:type/test`.

- **Profil bearbeiten** — Name, E-Mail-Adresse und Profilbild können in den Einstellungen geändert werden. OAuth-Provider liefern oft Wegwerf-Mails oder Pseudonyme — User können das jetzt nachträglich korrigieren. Profilbild-Upload mit serverseitigem Resize (200×200, WebP) und Speicherung als Data-URL in der DB. Neuer API-Endpoint `PATCH /api/user/profile`. Dreisprachig (DE/EN/FR).

- **Subtask-Reihenfolge (Drag & Drop)** — Aufgaben innerhalb eines Topics können per Drag & Drop umsortiert werden. Neue `sortOrder`-Spalte auf Tasks. Dedizierter Drag-Handle (6-Punkt Grip-Icon) links neben jeder Aufgabe — kein Konflikt mit Swipe-to-Complete. Touch-Support (200ms Delay), Tastatur-Support (Space + Pfeiltasten), optimistisches UI-Update mit automatischem Revert bei Fehler. Neuer API-Endpoint `PUT /api/topics/:id/reorder`. Neue Tasks erscheinen am Ende der Liste. Snoozed/Completed Sektionen bleiben unsortierbar. Dreisprachig (DE/EN/FR).

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

- **Profilbild-Ladeprobleme (CSP)** — Profilbilder von OAuth-Providern (GitHub, Discord, Google) wurden vom Service Worker blockiert (`connect-src 'self'`). Fix: Remote-URLs werden jetzt über `next/image` proxied (same-origin), Data-URLs (hochgeladene Bilder) verwenden `<img>`.
- **Cron-Fehlerdiagnose** — Der Cron-Container loggt jetzt den HTTP-Statuscode und die Response bei Fehlern (z.B. `FAILED (HTTP 401)`). Vorher wurde der Fehlergrund von `curl -sf` verschluckt.
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

[Unreleased]: https://github.com/jp1337/momo/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/jp1337/momo/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/jp1337/momo/releases/tag/v0.1.0
