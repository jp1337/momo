# Momo — Feature Roadmap

Priorisierte Ideen und geplante Features. Kein Versprechen — ein lebendiges Dokument.
Was bereits gebaut wurde, steht im [CHANGELOG](CHANGELOG.md).

---

## Nächste Schritte (konkret geplant)

| Feature                        | Kategorie     | Aufwand | Notizen |
| ------------------------------ | ------------- | ------- | ------- |
| Keyboard Shortcut: Quick Add   | UX            | S       | Globaler Shortcut (z.B. `N` oder `/`) öffnet sofort ein minimales Task-Eingabefeld — ohne Navigation, ohne Klicken. Wichtigste Funktion für ADHS-Nutzer: Gedanken sofort festhalten bevor sie verschwinden. |
| Kalender-Ansicht               | UX            | M       | Tasks mit Fälligkeitsdatum in einer Monats-/Wochenansicht. Kein externer Kalender nötig — iCal-Export existiert bereits, jetzt auch inline in der App. |
| Pomodoro-Timer                 | Produktivität | M       | Integrierter 25/5-min Timer direkt bei der aktiven Aufgabe. Start-Button auf Task-Items, Countdown im Navbar-Bereich, optionaler Push bei Ablauf. Kein separates Tool mehr nötig. |
| Quest-Verlauf                  | Statistiken   | S       | Seite `/quest-history` zeigt alle vergangenen Daily Quests mit Datum, ob erledigt oder verschoben und wie oft postponed. Gibt ein Gefühl für Muster ("immer montags unerledigte Quests"). |
| Tages-Ziel (Daily Goal)        | Gamification  | S       | User setzt morgens ein Ziel: "Ich will heute X Aufgaben erledigen." Fortschrittsbalken auf dem Dashboard, Confetti bei Erreichen. Motiviert ohne zu stressen. |

---

## User Features

### Kleiner Aufwand, hoher Impact

- **Drag & Drop zwischen Topics** — Task per Drag aus einem Topic in ein anderes verschieben, statt Edit → TopicId ändern → Speichern. Dnd-kit ist bereits eingebunden.
- **Quick-Edit Fälligkeitsdatum** — Datum direkt auf dem Task-Item ändern ohne das Formular zu öffnen (z.B. Klick auf das Datum → Datepicker-Popover). Besonders hilfreich beim Triage.
- **Topic-Farbe als Streifen auf Task-Items** — kleiner farbiger Balken links auf jedem Task-Item wenn das Task zu einem Topic gehört. Gibt sofortigen visuellen Kontext auf der Task-Übersicht.
- **"Erinnere mich an"-Shortcut** — Snooze-Auswahl vereinfachen: statt Datepicker zuerst schnelle Optionen "Heute Abend", "Morgen", "Nächste Woche", "In einem Monat" — mit Datepicker als Fallback.
- **Offene Aufgaben zählen im Sidebar-Badge** — kleine Zahl hinter "Aufgaben" in der Sidebar zeigt wie viele nicht erledigte Tasks existieren. Motiviert aber lenkt nicht ab.

### Mittlerer Aufwand

- **Aufgaben-Import (CSV / JSON)** — Migration aus Todoist, Things, OmniFocus oder einfach einer Excel-Liste. Minimales Schema: Titel + optional Priorität/Topic/Fälligkeitsdatum. Nützlich beim Onboarding neuer Nutzer.
- **Multi-Theme-Support** — zwei bis drei alternative Farbpaletten (z.B. "Ozean", "Sonnenuntergang") wählbar in den Settings neben Dark/Light/System. CSS-Variablen sind bereits abstrakt genug — nur neue `:root[data-palette="ocean"]`-Blöcke nötig.
- **Streaks für einzelne Topics** — wie viele Tage in Folge wurde in diesem Topic eine Aufgabe erledigt. Kleiner Streak-Counter auf der TopicCard. Motiviert bei laufenden Projekten.
- **Emoji-Reaktion auf Daily Quest** — nach Quest-Abschluss kurze Reaktionsmöglichkeit (😊😤😴 war es leicht/schwer/erschöpfend?). Drei Klicks, keine Pflicht. Liefert langfristig Daten für "was fällt dir schwer".
- **Shared Topics (Read-only Link)** — öffentlicher, read-only Link zu einem einzelnen Topic mit seinen Aufgaben. Nützlich um jemandem zu zeigen was man gerade treibt, oder als öffentliche To-Do-Liste.

### Größere Features

- **Kalender-Ansicht** — Tasks mit Fälligkeitsdatum in einer Monats-/Wochenansicht innerhalb der App. iCal-Export existiert bereits, gibt eine gute Datengrundlage.
- **Multi-User / Shared Workspace** — Topics und Tasks mit einer anderen Person teilen (z.B. Haushaltsliste mit Partner). Größtes Feature auf der Liste — erfordert Rollen, Einladungen, Datenisolations-Refactoring.
- **Mobile PWA verbessern** — App-Shortcuts im Manifest (direkt zu "Neue Aufgabe", "Heutige Quest"), bessere Offline-Fehler-States, Share-Target (Text aus anderem App → neue Aufgabe).

---

## Technical Features

### Stabilität & Betrieb

- **Error-Tracking** — Sentry oder GlitchTip (self-hostbar!) für Produktionsfehler-Visibility. `instrumentation.ts` in Next.js wäre der Einstiegspunkt. Alternativ OpenTelemetry mit eigenem Grafana-Stack.
- **Automatische DB-Backups** — `pg_dump`-Cronjob in Docker Compose und Kubernetes-Manifest mit Retention (7 Tage daily, 4 Wochen weekly). Einfachste Verbesserung für Selfhoster.
- **Offline-Queue (PWA)** — Tasks offline erstellen/abhaken; beim Reconnect syncen via Service Worker Background Sync API. Technisch aufwändig, aber für Mobile-first-Nutzer wichtig.
- **E2E-Tests (Playwright)** — automatisierter Browser-Testlauf für die wichtigsten User Journeys: Registrierung → Onboarding → Task anlegen → Quest erledigen → Stats anschauen.

### Authentifizierung

- **Microsoft / Azure AD** — Auth.js `microsoft-entra-id`-Provider; Tenant auf `consumers` pinnen für private Outlook/Hotmail/Xbox-Accounts. Geringer Aufwand, deckt eine relevante Nutzergruppe ab.

---

## Ideen-Backlog (noch nicht bewertet)

- **Pomodoro-Timer** — integrierter 25/5-Timer direkt bei der aktiven Aufgabe
- **Zeittracking** — wie lange hat man wirklich an einer Aufgabe gearbeitet (vs. Schätzung)
- **AI-Priorisierung** — Aufgaben automatisch nach Energie, Dringlichkeit und persönlichem Muster sortieren; Anthropic Claude API wäre die naheliegende Wahl
- **Quest-Ablehnen** — "Diese Quest passt heute nicht" mit Grund-Auswahl (zu groß / falsche Energie / Abhängigkeit); liefert Daten für bessere Quest-Auswahl
- **Gamification: Leagues / Ranglisten** — opt-in Wochenvergleich mit anonymen anderen Nutzern (Coins/Quests diese Woche)
- **Benutzerdefinierte Achievements** — User definiert selbst "Wenn ich 10 Aufgaben im Topic Sport erledigt habe, schalte X frei"
- **Aufgaben-Abhängigkeiten** — Task A blockiert Task B (über sequenzielle Topics hinaus; explizite "blocked by"-Relation)
- **Keyboard-Navigation (Vim-ähnlich)** — `j/k` navigiert Tasks, `Space` erledigt, `e` editiert — für Power-User
