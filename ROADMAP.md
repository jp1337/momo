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

### 1. Vereinfachen — Friction raus

Das Versprechen muss sich in jedem Klick anfühlen. Nicht nur im Tagline.

**Task-Erfassung radikal vereinfachen**
Eine neue Aufgabe soll in unter fünf Sekunden erfasst sein — Titel eintippen, Enter, fertig.
Typ, Priorität, Energielevel, Zeitschätzung, Topic: alles optional, alles versteckt hinter
einem "Mehr"-Klick. Heute fragt die App zu viel bevor sie zuhört.

Ein globaler Keyboard-Shortcut (`N` oder `/`) öffnet ein minimales Eingabefeld überall in der App —
ohne Navigation, ohne Kontextwechsel. Für ADHS-Nutzer: Gedanken festhalten bevor sie verschwinden.

**Navigation konsolidieren**
Die Sidebar hat zu viele Einträge. Habits, Review und Achievements könnten unter einem
"Übersicht"-Dach leben statt als separate Toplevel-Seiten. Weniger Entscheidungen, welche
Seite man jetzt öffnet.

**Letzte window.confirm-Dialoge ersetzen**
Topics-Seite hat noch native Browser-Dialoge beim Löschen. Die blockieren Browser-Extensions
und fühlen sich 2012 an. Inline-Bestätigung wie auf der Wishlist-Seite.

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

**Daily Quest Algorithm**
Der Quest-Algorithmus ist das Herzstück. Wird er regelmäßig hinterfragt?
Fühlt sich die ausgewählte Quest immer sinnvoll an — oder manchmal zufällig?
Keine Code-Änderung nötig, aber: bewusst testen und beobachten.

**Insights statt Daten**
Die Stats-Seite zeigt Zahlen. Aber: "Du erledigst Aufgaben am häufigsten dienstagmorgens"
ist mehr wert als ein Balkenchart. Kleine, kontextuelle Hinweise auf dem Dashboard
("Dein stärkster Wochentag ist Dienstag — guter Tag für die große Aufgabe") machen
bestehende Daten nützlicher ohne neue Seiten zu bauen.

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

**GitHub-Präsenz pflegen**
README ist gut. Aber: Topics, Good-First-Issues, Contributors-Guide.
Wer Momo auf GitHub findet, soll sofort wissen wie er mitmachen kann.

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

- **Automatische DB-Backups** — pg_dump-Cronjob in Docker Compose für Selfhoster
- **Error-Tracking** — GlitchTip (self-hostbar) oder Sentry für Produktionsfehler-Visibility
- **E2E-Tests** — Playwright für die wichtigsten User Journeys als Regressions-Sicherung
- **Offline-Queue** — Tasks offline erfassen via PWA Service Worker Background Sync

---

*Momo ist für die Menschen die zu viel im Kopf haben und zu wenig auf der Liste erledigt bekommen.
Der nächste Schritt ist nicht ein neues Feature — es ist sicherzustellen dass das was da ist,
wirklich für diese Menschen funktioniert.*
