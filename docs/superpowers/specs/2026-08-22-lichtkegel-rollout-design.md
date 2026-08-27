# Lichtkegel II — Rollout und die sechs Lücken

**Datum:** 2026-08-22
**Status:** Entwurf, zur Freigabe
**Vorgänger:** [`2026-08-21-lichtkegel-design.md`](2026-08-21-lichtkegel-design.md)

---

## 1. Ausgangslage

Lichtkegel funktioniert — auf genau einer Seite. Gemessen am 2026-08-22 im
laufenden Dev-Server, dark theme, 1440 px, mit gezählten Elementen unter
`main`:

| Seite | Amber (Regel: 1) | Fraunces (Regel: 1) | Umrahmte Inhaltsflächen (Regel: 0) |
|---|---|---|---|
| `/dashboard` | **1** | **1** | **0** |
| `/tasks` | 4 verschieden | 1 | 8 |
| `/stats` | 4 verschieden, 7 Instanzen | **16** | 20 |
| `/focus` | — | 1 | 8 |

Das Dashboard trifft die Spec exakt. Der Rest ist das alte System, das die
Spec als Krankheit benennt.

| Befund | Wert |
|---|---|
| `.tsx`-Dateien insgesamt | 136 |
| Dateien, die `components/ui/surface` importieren | **2** |
| Verstöße in `scripts/design-baseline.json` | 1934 über 115 Dateien |
| davon `inline` / `radius` / `color` | 1442 / 295 / 197 |
| Radius-Utilities außerhalb der Vier-Werte-Skala | 280 (`lg` 188 · `2xl` 46 · `xl` 45 · `3xl` 1) |

Zwei Verstöße auf `/tasks` treffen beide Hälften der Amber-Regel
gleichzeitig: `+ Neue Aufgabe` und die `Alle`-Pillen tragen Amber als
**Fläche**, die Prioritäts-Badges tragen es als **Rahmen**.

Der Light Mode führt vor, warum die Regel existiert. Dort ist `--amber`
`#8c5b00` — ein dunkles Braun, gebaut, um **als Text auf hellem Grund**
gelesen zu werden. Als Button-Fläche mit heller Schrift kippt es zu
Schlamm. Ein Token, das nur in einer Rolle funktioniert, ist in der
anderen Rolle kein Token, sondern ein Fehler.

### Der unbegrenzte Farbraum

`components/tasks/task-item.tsx` rendert eine Aufgabenzeile mit bis zu
sechs Metadaten, fünf davon farbcodiert:

| Feld | Heutige Darstellung |
|---|---|
| Priorität | Chip, amber getönt |
| Thema | Chip, `${topicColor}22` Füllung, `${topicColor}44` Rahmen |
| Fälligkeit | Text, `--accent-red` bei Überfälligkeit |
| Coins | `--coin-gold` bzw. `--accent-amber` plus Münz-Icon |
| Dauer | Chip, `--accent-green` |
| Energie | Chip, amber / grün / grau |

`topicColor` ist ein **frei vom Nutzer gewählter Hex-Wert**. Kein
Token-System fängt das ein: ein Nutzer, der Amber als Themenfarbe wählt,
bricht die Ein-Amber-Regel von außen, und zwar auf jeder Seite, die seine
Themen listet. Das ist die einzige Farbquelle in momo, die die Spec
strukturell nicht erreichen kann.

Dieselbe Datei setzt `var(--font-ui, 'DM Sans', sans-serif)` — als
Fallback also genau die Schrift, die Lichtkegel ersetzt hat.

### Widerspruch zur Projektregel

`CLAUDE.md` schreibt `--font-mono` für Zahlentext vor. `/stats` setzt
sämtliche Kennzahlen in Fraunces — 16 Vorkommen, wo die Spec eins erlaubt.

---

## 2. Die sechs Lücken

Der Rollout allein schließt sie nicht, weil die Spec auf sie keine Antwort
gibt.

| # | Lücke | Folge heute |
|---|---|---|
| 1 | Kein Spaltenmaß, kein erzwungener Rhythmus | `/dashboard` 1024 px, `/tasks` randlos, `/topics` eine Karte in einem 3-Spalten-Raster |
| 2 | Kein Listen-Primitive | vier getrennte Zeilen-Implementierungen; `/focus` streckt acht Balken über 1500 px |
| 3 | Semantische Farbe dekorativ benutzt | `--done` markiert eine Dauer und einen Navigationsbutton |
| 4 | Amber-Regel zählt nur `main` | Federlogo und Münzzähler tragen ungezählt Amber auf jeder Seite |
| 5 | Kein Muster für leere Zustände | `/progress`: gestrichelter Kasten plus grün gefüllter Button |
| 6 | Eintrittsanimation kehrt die These um | die Quest ist ~2–3 s dunkler als die Liste unter ihr |

---

## 3. Maß, Rand, Rhythmus

### Drei Tokens

```css
--measure: 40rem;   /* 640px — die Lesespalte. Jede Seite. */
--rail:    13rem;   /* 208px — die Randnotiz. Optional pro Seite. */
--gutter:   3rem;   /*  48px — dazwischen */
```

Der Block aus Spalte und Rand wird als Ganzes im Inhaltsbereich zentriert.
Auf 1440 px ergibt das 640 + 48 + 208 = 896 px Block und je ~180 px Rand.
Der Leerraum verschwindet damit nicht — er wird **verteilt statt rechts
geparkt**, und ein Teil der Breite wird tatsächlich benutzt.

**Umbruch:** unter 1100 px fällt der Rand unter den Inhalt; unter 640 px
entfällt er ganz und seine Inhalte wandern an das Seitenende.

### Die Spalte ist dein Tag, der Rand ist die Randnotiz

In die Lesespalte gehört, was der Nutzer *tut*. In den Rand gehört, was die
App *über* seinen Tag sagt. **Der Rand trägt nie Amber** — sonst wäre er
eine zweite Lichtquelle.

| Seite | Rand trägt |
|---|---|
| `/dashboard` | Serie, Coins, „noch 3× verschiebbar" |
| `/tasks` | Zähler und die Filter (Priorität, Thema) |
| `/topics`, `/progress`, `/wishlist` | Zähler, Summen, Budget |
| `/focus`, `/settings/*`, `/login`, `/onboarding` | **kein Rand** |

Der Rand ist optional, weil die Seiten wirklich verschieden sind. `/focus`
ist eine Bühne: eine Sache zählt, nichts daneben. Eine erzwungene
Randspalte auf einer Bühne wäre dieselbe Gleichmacherei, die Lichtkegel
abschafft.

### Rhythmus

Die Abstandsskala aus der Vorgängerspec bleibt **unverändert**:

```
4 · 8 · 12 · 16 · 24 · 32 · 48 · 72
```

Neu ist nicht die Skala, sondern dass sie gilt. `check:design` kennt heute
`color`, `radius` und `inline` — keine Abstandsregel. Die Skala steht
seit dem 2026-08-21 in der Spec und wird von nichts erzwungen. Eine
vierte Kategorie `spacing` verwirft jede `p-`/`m-`/`gap-`/`space-`-Utility
außerhalb der acht Werte.

Eine zweite, „bessere" Skala einzuführen wäre genau die Zersplitterung,
gegen die dieses Dokument geschrieben ist.

---

## 4. Eine Liste für die ganze App

Ein `List`/`Row`-Primitive ersetzt fünf getrennte Implementierungen:

| Datei | Verstöße |
|---|---|
| `components/tasks/task-item.tsx` | 45 |
| `components/tasks/task-list.tsx` | 46 |
| `components/focus/focus-mode-view.tsx` | 63 |
| `components/wishlist/wishlist-card.tsx` | 45 |
| `components/topics/topic-card.tsx` | 28 |

Haarlinie trennt, kein Kasten umrahmt. Damit fällt der `Card`-Rest weg, den
die Vorgängerspec bereits für abgeschafft erklärt hat.

### Die Zeile: nichts als Text

Keine Chips. Jede der sechs Metadaten bekommt eine Kodierung, die keine
Fläche braucht:

| Feld | Neu |
|---|---|
| Dauer | **die Schriftgröße des Titels** — die Aufwandsstufen der Spec, plus die Minutenzahl rechts als Mono |
| Priorität | **Gruppenüberschrift** (Mono-Eyebrow), kein Abzeichen an der Zeile |
| Thema | Mono-Eyebrow unter dem Titel, `--ink-3` |
| Themenfarbe | **ein 6-px-Punkt** — die einzige verbleibende Öffnung für Nutzerfarbe |
| Fälligkeit | rechts, Mono; `--danger` **nur** bei Überfälligkeit |
| Coins | in den Rand |

Zwei Begründungen, die tragen müssen:

**Dauer als Größe ist keine Erfindung, sondern Aufräumen.** Die
Aufwandsstufen stehen seit dem 2026-08-21 in der Spec. Heute werden sie
zusätzlich zum grünen „60 min"-Chip gerendert — dieselbe Information
zweimal. Die Zeile behält die Minutenzahl als Text, damit die Größe nicht
die einzige Kodierung ist (WCAG 1.4.1, Verwendung von Farbe bzw.
sensorischen Merkmalen).

**Priorität als Gruppierung ist Struktur statt Dekoration.** Die
Vorgängerspec verlangt, dass strukturelle Mittel etwas Wahres über den
Inhalt kodieren. Eine Gruppenüberschrift `HOCH · 2` tut das; ein
amberfarbenes Abzeichen an jeder Zeile behauptet nur Wichtigkeit.

**Der Prüfstein für Chips insgesamt:** die Spec verlangt, dass eine Fläche
beantworten kann, welche Frage sie dem Nutzer stellt. Ein Chip um „60 min"
ist eine Fläche ohne Affordanz — man kann ihn nicht drücken. Er fällt
damit unter dieselbe Regel wie der abgeschaffte `Card`.

---

## 5. Was Farbe noch darf

| Farbe | Erlaubt | Verboten |
|---|---|---|
| `--amber` | Text oder weicher Wash, **einmal pro Bildschirm** | Fläche, Rahmen |
| `--done` | ausschließlich „erledigt" | Dauer, Buttons, Energie |
| `--danger` | Zerstörung, Überfälligkeit | alles andere |
| Nutzerfarbe | ein 6-px-Punkt | Füllung, Rahmen, Text |

### Das Navbar-Schlupfloch

Die Regel zählt heute über `main` plus offenen Dialog. Federlogo und
Münzzähler liegen außerhalb und tragen Amber — auf jeder Seite,
gleichzeitig mit dem einen erlaubten Amber-Element im Inhalt. Drei
Amber-Dinge sind gleichzeitig sichtbar; das Auge kennt die `main`-Grenze
nicht.

**Entscheidung: Chrome ist ausschließlich Ink.** Die Feder bleibt eine
Feder, ohne Amber. Der Münzzähler wird `--ink-2`. Der Amber-Test zählt ab
dann über das **gesamte Dokument**, nicht über `main`.

Kosten, offen benannt: die Navigation verliert ihre einzige dauerhafte
Farbfreude. Der Gegenwert ist eine Regel, die gilt statt auf dem Papier zu
stehen.

### Zahlen sind Mono

`CLAUDE.md` schreibt `--font-mono` für Zahlentext vor. `/stats` bekommt
Mono-Kennzahlen und genau eine Fraunces-Überschrift.

---

## 6. Leere Zustände

Zwei Fälle, getrennt — die Fortschreibung des R11-Rulings aus dem Pilot
(„bei einer Serie von null nichts zeigen statt einen aufmunternden
Ersatz"):

| Fall | Darstellung |
|---|---|
| **Fehlende Kennzahl** (Serie 0, Budget nicht gesetzt) | **nichts.** Leerraum ist kein Defekt, der gefüllt werden muss. |
| **Leere Sammlung** (keine Aufgaben, keine Themen) | **eine** Mono-Zeile plus **eine** stille Handlung |

Kein Kasten, kein gestrichelter Rahmen, kein Emoji, keine Illustration.
Der Text sagt, was zu tun ist, in der Stimme der Oberfläche — nicht was
schiefging und nicht, wie schade es ist.

---

## 7. Die Ankunft

Die Quest fährt heute über ~2–3 s hoch und ist dabei dunkler als die Liste
unter ihr. Auf der Seite, deren These „eine Lichtquelle" ist, kommt das
Licht zuletzt.

**Umkehrung:** die Quest steht bei Ankunft sofort auf voller Stärke; nur
die Peripherie beruhigt sich danach. Bei `prefers-reduced-motion` ist alles
statisch.

---

## 8. Durchsetzung: Tests, nicht Review

Über 134 Dateien trägt kein Review. Die Regeln dieses Dokuments werden
Tests neben dem bestehenden ΔL\*-Test in `e2e/design-tokens.spec.ts` —
gemessen mit derselben Methode, mit der Abschnitt 1 die Ausgangslage
gezählt hat:

| Test | Behauptung |
|---|---|
| Amber-Zähler | ≤ 1 pro Seite, **über das gesamte Dokument** |
| Fraunces-Zähler | genau 1 pro Seite |
| Kastenzähler | 0 umrahmte Inhaltsflächen |
| Maß | keine Inhaltsspalte breiter als `--measure` |

Der Zähler muss `color(srgb … / α)` genauso erkennen wie `rgb()` — beim
Messen für dieses Dokument hat ein Zähler, der nur `rgb()` kannte, vier
Amber-Elemente auf `/tasks` als null gemeldet. Ein Test, der die Verstöße
nicht sieht, ist schlimmer als keiner.

`check:design` bekommt die vierte Kategorie `spacing`. Die Baseline von
1934 darf nur fallen.

---

## 9. Reihenfolge

| Phase | Umfang | Verstöße (ca.) |
|---|---|---|
| 0 | Primitives, Tokens, Tests | — |
| 1 | `/tasks`, `/focus`, `/topics`, `/progress` | 340 |
| 2 | `/stats`, `/wishlist`, `/achievements`, `/quick`, `/review` | 200 |
| 3 | `/settings/*`, `/admin`, `/api-keys` | 450 |
| 4 | Legal, Login, Onboarding, Docs | 150 |

Die Spalte summiert sich auf ~1140, nicht auf 1934. Die Differenz liegt in
geteilten Komponenten, die keiner einzelnen Seite gehören (Dialoge,
Formulare, Navigation); sie werden mit der ersten Seite migriert, die sie
benutzt. Die Zahlen ordnen die Arbeit, sie bilanzieren sie nicht — die
verbindliche Größe ist die Baseline, und sie darf nur fallen.

Phase 0 zuerst und allein: ohne die Tests migriert Phase 1 gegen keine
Zusicherung.

Jede Phase endet mit einem Chrome-Review beider Themes bei 1440 px und
375 px. Grüne Tests sind kein Beleg dafür, dass ein Entwurf funktioniert.

---

## 10. Mitzuführende Bugs

Beim Messen aufgefallen, nicht Teil des Entwurfs, aber im selben Durchgang
zu beheben:

| Fund | Ort |
|---|---|
| `FORMATTING_ERROR`: `{date}` fehlt in den Heatmap-Tooltips; wirft bei jedem Aufruf von `/progress?tab=habits` | `components/progress/progress-tabs.tsx:145` |
| Theme-Tooltip englisch („System theme — click to switch") auf deutscher UI | Theme-Umschalter in der Navbar |
| Kartentitel bricht mitten im Wort („Steuererklärun g 2025") | `/topics` |

**Korrektur (Task 12):** die ursprüngliche Diagnose für den Wortumbruch-Fund —
`word-break: break-word` sei die Ursache, weil es gemeinsam mit
`overflow-wrap: break-word` gesetzt war — war falsch und hat sich über den
Rollout-Plan (Task-10-Passage) fortgepflanzt. Gemessen in Chromium: das
Entfernen von `word-break` ändert an der Darstellung **nichts** — `min-width: 0`
auf dem Titel-Span neutralisiert den einzigen Unterschied zwischen
`break-word` und seinem modernen Äquivalent `anywhere`. Der tatsächliche Fix
ist `hyphens: auto`, das an einer echten Silbengrenze statt mitten im Wort
bricht. Die kanonische Erklärung des Mechanismus steht bei `wrapTitle` in
`components/ui/list.tsx`; das tatsächliche Bruchverhalten wird durch eine
Zeilenboxen-Assertion in `e2e/topics.spec.ts` erzwungen, nicht durch
abgeschriebene Beispielwerte hier — zwei frühere Versionen dieser Erklärung
waren falsch, ein ausführbarer Test kann das nicht sein.

---

## 11. Nicht Teil dieser Arbeit

- Keine neuen Funktionen. Der Entwurf ordnet und streicht.
- Keine Änderung an Datenmodell, API oder Gamification-Logik.
- Kein Umbau der Navigation. Die Sidebar-Gruppierung bleibt.
- Keine neue Palette, keine neuen Schriften. Lichtkegels Tokens gelten
  unverändert; dieses Dokument fügt Layout-Tokens hinzu und schließt
  Lücken.

**Neu gegenüber der Vorgängerspec:** deren Abschnitt 10 nahm
`task-item.tsx` (803 Zeilen) ausdrücklich vom Zerlegen aus. Mit dem
Listen-Primitive aus Abschnitt 4 wird das Zerlegen unvermeidlich und ist
damit **Teil** dieser Arbeit.

---

## 12. Offene Punkte

Der 6-px-Themenpunkt ist ein Kompromiss. Ganz weglassen würde die
Amber-Regel vollständig dicht machen, kostet Themen aber ihr
Erkennungsmerkmal in Listen. Entschieden für den Punkt; nach Phase 1 am
laufenden Bild zu bewerten.
