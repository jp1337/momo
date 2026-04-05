# Momo — Feature Roadmap

Priorisierte Ideen und geplante Features. Kein Versprechen — ein lebendiges Dokument.

---

## Nächste Schritte (konkret geplant)

| Feature | Kategorie | Aufwand | Notizen |
|---------|-----------|---------|---------|
| Google Auth auf Live-Version | Technisch | XS | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in Prod-Env setzen |
| Microsoft Sign In | Auth | S | Auth.js `AzureAD`-Provider; braucht App-Registrierung in Azure |
| Apple Sign In | Auth | M | Auth.js `Apple`-Provider; erfordert Apple Developer Account (99 $/Jahr) |
| Passkeys (WebAuthn) | Auth | M | `@simplewebauthn`-Adapter für Auth.js; keine externen Provider nötig |
| E-Mail-Benachrichtigungen | Notifications | M | Resend oder SMTP; täglicher Quest-Reminder + Streak-Warnung |
| ntfy.sh Integration | Notifications | S | URL-basierte Push-Benachrichtigungen; gut für Selfhoster |
| Pushover Integration | Notifications | S | API Token + User Key in Settings; sofortige Push-Alerts |
| Telegram-Bot | Notifications | M | Bot Token + Chat ID in Settings; Benachrichtigungen + ggf. Task-Eingabe |
| Push-Benachrichtigungen debuggen | Technisch | S | Daily Quest Reminder kommt nicht an; VAPID / Service Worker prüfen |
| Alexa Skill | User + Technisch | L | Account Linking via API Key; `POST /api/tasks` aus Lambda |

---

## User Features

### Hoher Impact, kleiner Aufwand

- **Swipe-to-complete auf Mobile** — Wischgeste auf Task-Items statt Checkbox tippen; senkt Hemmschwelle
- **Snooze / Aufgabe pausieren** — "Erinnere mich ab [Datum]" für Tasks die man nicht löschen, aber auch nicht ständig sehen will
- **"Ich hab nur 5 Minuten"-Modus** — prominenter Einstiegspunkt der nur Tasks ≤5 min zeigt (über Quick Wins hinaus)
- **Emotionaler Abschluss** — nach Tagesquest-Abschluss kurze Affirmation oder Michael-Ende-Zitat (optional, abschaltbar)

### Mittlerer Aufwand

- **Wöchentlicher Rückblick** — Seite / Push mit "Diese Woche: 12 erledigt, 3 verschoben, längster Streak X"
- **Aufgaben-Vorlagen (Templates)** — vordefinierte Topic-Vorlagen ("Umzug", "Steuern", "Sport-Routine") als One-Click-Import
- **Focus Mode** — reduzierte Ansicht: nur Tagesquest + Quick Wins, alles andere ausgeblendet
- **Subtask-Reihenfolge** — Drag & Drop Sortierung innerhalb eines Topics
- **Energie-Filter** — Tasks mit Energie-Level taggen (hoch/mittel/niedrig); Daily Quest berücksichtigt Tagesverfassung
- **Geteilte Topics / Collaboration** — ein Topic mit einer anderen Person teilen; beide können Aufgaben abhaken

### Größere Features

- **Alexa Skill** — "Alexa, füge Zahnarzt zu Momo hinzu" → Task per REST API; "Alexa, was ist meine Quest?" → `GET /api/daily-quest`
- **Wiederkehrende Aufgaben Habit-Tracker** — Jahres-/Monatsraster (GitHub Contribution Graph Stil) pro Habit-Task
- **iCal-Export** — fällige Aufgaben als Kalender-Feed (`.ics`) für Google/Apple Calendar
- **Offline-Queue** — Tasks offline erstellen/abhaken; beim Reconnect syncen (PWA Service Worker)
- **Integrationen** — Zapier/Make-Webhooks; ausgehende Events bei Task-Abschluss

---

## Technical Features

### Akut / Geplant

- **Google Auth auf Live** — Auth.js config ist vorbereitet; braucht nur Prod-Credentials
- **Push-Benachrichtigungen fixen** — Daily Quest Reminder debuggen (VAPID, Service Worker, Subscription-Persistenz)

### Stabilität

- **Automatisierte Tests** — Integrationstests für `completeTask`, `selectDailyQuest`, `updateStreak` mit echter Test-DB
- **Error-Tracking** — Sentry oder Axiom in Prod; aktuell läuft alles ohne Fehler-Visibility
- **Database Backups** — automatisches `pg_dump` mit Retention in Docker Compose / K8s

### Authentifizierung erweitern

- **Passkeys (WebAuthn)** — passwordloser Login ohne externen Provider; Auth.js hat `@simplewebauthn`-Adapter; ideal für PWA-Nutzer
- **Microsoft / Azure AD** — Auth.js `AzureAD`-Provider; relevant für Windows/Office-Nutzer; geringer Aufwand
- **Apple Sign In** — Auth.js `Apple`-Provider; wichtig für iOS/macOS-Nutzer; erfordert Apple Developer Account

### Benachrichtigungen erweitern

- **E-Mail-Benachrichtigungen** — Tagesquest-Reminder, Streak-Warnung per E-Mail; via Resend oder SMTP; konfigurierbar in Settings
- **ntfy.sh** — Self-hosted Push via ntfy.sh-Topic-URL; kein App-Account nötig; ideal für Power-User & Selfhosters
- **Pushover** — Push-Benachrichtigungen via Pushover API; einfache Integration über `PUSHOVER_USER_KEY` + `PUSHOVER_APP_TOKEN`
- **Telegram-Bot** — Benachrichtigungen + ggf. Task-Eingabe per Telegram-Bot (`/addtask Zahnarzt`); via Bot Token + Chat ID
- **Webhook / Custom HTTP** — generischer Outbound-Webhook bei konfigurierbaren Events (Quest bereit, Streak-Warnung, etc.)

### Erweiterbarkeit

- **Webhook-System** — ausgehende Webhooks bei Task-erstellt / Task-abgeschlossen
- **Notification-Scheduler erweitern** — "Fällig heute"-Reminder, Weekly Review Push, konfigurierbare Uhrzeit
- **CLI-Tool** — `momo add "Aufgabe"` aus dem Terminal (nutzt API Keys)

---

## Alexa Skill — Architektur

```
Nutzer: "Alexa, sage Momo: füge Aufgabe Zahnarzt hinzu"
         ↓
Alexa Skills Kit (Amazon Developer Console)
         ↓
AWS Lambda (Node.js) — Account Linking via API Key
         ↓
POST https://momotask.app/api/tasks
Authorization: Bearer momo_live_...
{ "title": "Zahnarzt", "type": "ONE_TIME" }
```

**Benötigt:**
1. Alexa Skill im Amazon Developer Console registrieren (Invocation: "Momo")
2. Account Linking: User gibt API Key einmalig in der Alexa App ein
3. Lambda-Funktion (Node.js/TypeScript) mit Intent-Handling
4. Intents: `AddTaskIntent`, `GetQuestIntent`, `ListTasksIntent`
5. Optional: Momo OAuth-Flow statt API Key (komplexer, aber nahtloser)

---

## Ideen-Backlog (noch nicht bewertet)

- Watch companion app (WearOS / Apple Watch)
- Desktop App (Tauri)
- Pomodoro-Timer Integration
- AI-gestützte Aufgaben-Priorisierung
- Markdown in Task-Notes
- Aufgaben-Kommentare / Tagebucheintrag pro Abschluss
