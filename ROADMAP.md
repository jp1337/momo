# Momo — Roadmap

Kein Feature-Backlog. Ein ehrlicher Blick auf das Projekt und was als nächstes wirklich zählt.
Was bereits gebaut wurde, steht im [CHANGELOG](CHANGELOG.md).

---

## Wo Momo heute steht

Momo hat eine starke Seele: *eine Aufgabe pro Tag, kein Overwhelm, du schaffst das.*
Das technische Fundament ist solide — Self-hostable, GDPR-ready, multi-lingual, full API.

**Das Problem:** Das Projekt ist schneller gewachsen als nötig. Zehn Seiten in der Navigation,
sechs Entscheidungen um eine Aufgabe zu erstellen, Habits + Stats + Review + Achievements +
Focus + Quick + Wishlist... Das ist Todoist-Komplexität mit Anti-Procrastination-Branding.
Es untergräbt genau das, was Momo verspricht.

Die nächste Phase heißt nicht "mehr bauen". Sie heißt **vereinfachen, polieren, verbreiten.**

---

## Die drei Themen

### 1. Vereinfachen — Friction raus ✅ (2026-04-26)

Das Versprechen muss sich in jedem Klick anfühlen. Nicht nur im Tagline.

**Task-Erfassung radikal vereinfachen** ✅
Ein globaler Keyboard-Shortcut (`N` oder `/`) öffnet ein minimales Eingabefeld überall in der App.
Titel, Enter, fertig. Thema, Priorität, Energie-Level versteckt hinter „Mehr Optionen".

**Navigation konsolidieren** ✅
Habits, Errungenschaften und Wochenrückblick leben jetzt unter `/progress` mit Tab-Navigation.
Sidebar und Mobile-Nav: ein „Progress"-Eintrag statt drei separate Toplevel-Seiten.

**Letzte window.confirm-Dialoge ersetzen** ✅
Alle 12 `window.confirm()`-Aufrufe im gesamten Projekt durch `ConfirmButton` ersetzt.
Inline-Bestätigung (Ja/Abbrechen) direkt am auslösenden Button.

---

### 2. Polieren — Den Kern besser machen

Neue Features bringen nichts wenn das Bestehende nicht überzeugt. Diese Bereiche
verdienen mehr Aufmerksamkeit:

**Der Aha-Moment für neue Nutzer**
Was erlebt jemand in den ersten 10 Minuten? Das Onboarding existiert, aber:
Sieht ein neuer Nutzer die komplette Schleife — Quest → Energy-Check-in → Task erledigt →
Coins verdient → Wishlist — noch am ersten Tag? Wenn nicht, kommt er nicht zurück.

Die Lücke: nach dem Onboarding landen Nutzer auf einem leeren Dashboard ohne klare
nächste Aktion. Bessere Empty States die erklären *warum* man was tun soll, nicht nur *dass*
noch nichts da ist.

→ Dashboard Empty State mit CTA zu /topics hinzugefügt ✅ (seit 0.4.0)

**Daily Quest Algorithm**
Der Quest-Algorithmus ist das Herzstück. Wird er regelmäßig hinterfragt?
Fühlt sich die ausgewählte Quest immer sinnvoll an — oder manchmal zufällig?
Keine Code-Änderung nötig, aber: bewusst testen und beobachten.

**Insights statt Daten**
Die Stats-Seite zeigt Zahlen. Aber: "Du erledigst Aufgaben am häufigsten dienstagmorgens"
ist mehr wert als ein Balkenchart. Kleine, kontextuelle Hinweise auf dem Dashboard
("Dein stärkster Wochentag ist Dienstag — guter Tag für die große Aufgabe") machen
bestehende Daten nützlicher ohne neue Seiten zu bauen.

→ Best-Day Insight Chip auf dem Dashboard ✅ (seit 0.4.0, ab ≥10 Erledigungen)

---

### 3. Verbreiten — Momo bekannt machen

Mehr Features bringen nichts wenn niemand Momo kennt. Das ist die größte Hebel.

**awesome-selfhosted**
Die bekannteste kuratierte Liste für Self-Hosting. Ein erfolgreicher PR dort bringt mehr
echte Nutzer als jedes Feature. Frühestmöglich einreichen (aktuell: August 2026 nach
Richtlinien-Anforderungen).

**alternativeto.net**
Kostenloses Listing als Alternative zu Todoist, Things, TickTick, Habitica.
Jemand der googelt "Todoist Alternative self-hosted" soll Momo finden.

**Ein kurzes Video**
Kein Marketing-Video — eine echte 3-Minuten-Demo: Momo installieren mit Docker,
erste Task anlegen, Daily Quest erledigen. Auf YouTube, verlinkt von der Doku-Seite.
Senkt die Hürde für Selbsthosting massiv.

**GitHub-Präsenz pflegen** ✅
README ist gut. Aber: Topics, Good-First-Issues, Contributors-Guide.
Wer Momo auf GitHub findet, soll sofort wissen wie er mitmachen kann.

→ CONTRIBUTING.md hinzugefügt, README Contributing-Sektion erweitert ✅ (seit 0.4.0)

---

## Was wir bewusst nicht tun

- Keine neuen Toplevel-Seiten bis Navigation vereinfacht ist
- Keine weiteren Notification-Typen oder -Kanäle
- Keine weiteren Auth-Provider
- Keine KI-Features ohne klaren Nutzen für procrastination-geplagte User
- Kein Feature das eine weitere Entscheidung vom Nutzer verlangt

Das ist keine Freeze — neue Features sind willkommen wenn sie *Friction reduzieren*,
nicht wenn sie Funktionsumfang erhöhen.

---

## Offene technische Schulden

Kleine Dinge die irgendwann erledigt werden sollten — kein eigenes Feature, aber wichtig:

- **Automatische DB-Backups** ✅ — pg_dump-Cronjob in Docker Compose (`profiles: [backup]`), aktiviert via `BACKUP_ENABLED=true` (seit 0.4.0)
- **E2E-Tests** ✅ — Playwright für kritische User Journeys: Task-Lifecycle, Quest-Flow, Quick-Add-Shortcut, Topic-Scope (seit 0.4.0)
- **Error-Tracking** — GlitchTip (self-hostbar) oder Sentry für Produktionsfehler-Visibility
- **Offline-Queue** — Tasks offline erfassen via PWA Service Worker Background Sync

---

*Momo ist für die Menschen die zu viel im Kopf haben und zu wenig auf der Liste erledigt bekommen.
Der nächste Schritt ist nicht ein neues Feature — es ist sicherzustellen dass das was da ist,
wirklich für diese Menschen funktioniert.*
