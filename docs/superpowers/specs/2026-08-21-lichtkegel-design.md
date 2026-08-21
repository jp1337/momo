# Lichtkegel — Momos visuelles System, neu aufgesetzt

**Datum:** 2026-08-21
**Status:** Entwurf, zur Freigabe
**Entwurf zum Ansehen:** https://claude.ai/code/artifact/0e181a3d-5eb4-44f9-985c-e8c692fa8b28

---

## 1. Ausgangslage

`docs/design-system.md` beschreibt ein System, das der Code nicht benutzt.

| Befund | Wert |
|---|---|
| Inline-`style={{…}}` in 134 `.tsx`-Dateien | 1521 |
| Dateien, die `<Card>` importieren | 1 — `app/(docs)/design-system/page.tsx` |
| Dateien, die `<Button>`, `<Badge>`, `<Input>`, `<Checkbox>`, `<Label>` importieren | je 1 — dieselbe Datei |
| Tatsächlich genutzte Primitives | `confirm-button` (10), `tooltip` (5), `dialog` (4) |
| Verschiedene hartkodierte Hex-Werte in Komponenten | 50 |
| Rottöne für dieselbe Rolle | 6 — `#ef4444` `#c95151` `#e53e3e` `#e74c3c` `#e05555` `#b85450` |
| „Text auf Amber" handgetippt | `#1a1a0a` 13×, dazu `#0f1410`, `#fff`, `white`, `var(--bg-primary)` |
| Border-Radius-Werte im Einsatz | 6 — `lg` 198× · `xl` 57× · `full` 55× · `2xl` 50× · `md` 15× · `3xl` 1× |
| `--radius-*`-Definitionen in `globals.css` | 0 — die App erbt still Tailwinds Defaults |
| Amber-Elemente auf dem Dashboard | 7, bei einer dokumentierten Obergrenze von 1 |

Die 50 Hex-Werte sind nicht nur ein Stilproblem: sie reagieren nicht auf den
Theme-Wechsel. Jede Farbe, die im Code steht statt in einem Token, ist im
Light Mode falsch.

## 2. Die Designthese

Das heutige Dashboard besteht aus acht gestapelten Flächen — jede
`bg-surface`, 1 px Rahmen, gerundet, mit Schatten. Die Daily Quest hat
dieselbe Form wie „Enter Focus Mode", wie „I only have 5 minutes", wie die
Wishlist-Budgetzeile.

Das visuelle System sagt: *hier sind acht gleich wichtige Panels.* Zu einem
Nutzer, dessen ganzes Problem ist, dass alles gleich wichtig und gleich
überwältigend wirkt.

**Die Entscheidung: Hierarchie entsteht aus Beleuchtung, nicht aus
Umrandung.** Eine Lichtquelle pro Seite. Was zählt, liegt im Licht; alles
andere liegt im Halbdunkel und hat keine Kontur. Amber ist nur noch Licht —
nie Fläche, nie Rahmen.

Was bleibt: der Forest-Charcoal-Grund, Amber als einzige Autorität,
JetBrains Mono für Aufgabentext. Was fällt: Lora, die acht gleichen Kästen,
die Schatten, die 50 Hex-Werte.

## 3. Tokens

Vollständig in `app/globals.css`. Keine Farbe, kein Radius, kein Abstand
entsteht künftig außerhalb dieser Liste.

### Flächen — Dark (Standard)

```css
--ground:   #0e100f;  /* Grund */
--s1:       #151917;  /* unbeleuchteter Inhalt */
--s2:       #1b201d;  /* angehoben */
--s3:       #222826;  /* Eingabe, Hover */
--hairline: #2a322e;  /* die eine Linienfarbe */
```

### Flächen — Light

```css
--ground:   #eceee5;
--s1:       #f5f6f0;
--s2:       #e3e7db;
--s3:       #d8ddce;
--hairline: #c9d0be;
```

Light Mode wird bewusst **kein Creme** (`#f7f2e8` heute), sondern blasses
Salbei-Papier. Warme Serif auf Creme mit Amber ist die verbreitetste
Vorlagen-Optik überhaupt; `#eceee5` liest als Tageslicht im Wald und passt
besser zu den Grüntönen.

### Schrift und Akzent

| Token | Dark | Light | Rolle |
|---|---|---|---|
| `--ink` | `#f2e9d8` | `#1b241e` | Primärtext |
| `--ink-2` | `#a4b0a7` | `#55635a` | Sekundärtext |
| `--ink-3` | `#6c7a71` | `#7d8a80` | Meta, Eyebrow |
| `--amber` | `#f0a500` | `#a86f00` | Licht, die eine Handlung |
| `--on-amber` | `#171408` | `#fffaf0` | Text auf Amber — **das fehlende Token** |
| `--done` | `#5ec47e` | `#2e7048` | ausschließlich „erledigt" |
| `--danger` | `#d06460` | `#9e3b38` | ausschließlich Zerstörung |

`--rarity-legendary` bleibt unverändert bestehen (Achievements).

### Radius, Abstand, Schatten

```css
--radius-sm:   7px;   /* Chip, Badge, Eingabe */
--radius-md:  11px;   /* Fläche, Panel */
--radius-lg:  14px;   /* Dialog, Bühne */
--radius-pill: 999px; /* Pille, Avatar */
```

Abstände: Basis 4 px, Skala `4 · 8 · 12 · 16 · 24 · 32 · 48 · 72`.

**Schatten fallen weg.** Elevation entsteht aus der Farbe der Fläche.
Einzige Ausnahme: `--shadow-overlay` für Dialog und Popover, also für
Flächen, die tatsächlich über scrollendem Inhalt schweben. Die
`inset`-Highlights verschwinden mit; sie waren der Grund, warum acht Kästen
gleich schwer wirkten.

### Schriften

| Rolle | Familie | Einsatz |
|---|---|---|
| `--font-display` | **Fraunces** (variabel, `SOFT 50 / WONK 1`) | **einmal** pro Seite groß — die Quest, die Seitenüberschrift |
| `--font-ui` | **Instrument Sans** | Handlungen, Labels, Fließtext |
| `--font-mono` | **JetBrains Mono** | Aufgabentext, Zahlen, Meta |

Lora und DM Sans entfallen. Alle drei neuen Familien liegen auf Google
Fonts, bleiben also über `next/font/google` selbst gehostet — keine
externen Requests zur Laufzeit.

`--font-body` wird zu `--font-mono` umbenannt. Der alte Name behauptete,
JetBrains Mono sei die Fließtextschrift; das ist `--font-ui`. Die
Umbenennung zieht eine Änderung in `CLAUDE.md` nach sich, wo die drei
Rollen beschrieben sind.

Fraunces erscheint pro Seite **genau einmal in großer Größe**: auf dem
Dashboard die Quest, auf allen anderen Seiten die Seitenüberschrift.
Abschnittsüberschriften innerhalb einer Seite sind Mono-Eyebrows, nicht
Fraunces.

Typo-Stufen (rem, damit Zoom greift):

```
0.6875  Eyebrow, mono, versal, tracking .16em
0.8125  Meta
0.875   Listenzeile klein
1.0     Fließtext, Listenzeile mittel
1.25    Listenzeile groß
1.75    Abschnittsüberschrift
clamp(1.75, 4.1vw, 2.85)  Quest
```

### Die drei Aufwandsstufen in Listen

Aus der Richtung „Das Gewicht" übernommen, aber gezähmt: **drei Stufen,
nicht stufenlos, keine Animation.**

| Geschätzte Dauer | Stufe |
|---|---|
| ≤ 5 min | `0.875rem` |
| ≤ 30 min | `1rem` |
| > 30 min | `1.25rem` |

Der Aufwand ist damit sichtbar, bevor man liest. Ohne Schätzung gilt die
mittlere Stufe.

*Bekannter Konflikt:* die größte Zeile in der Liste ist die visuell
lauteste, was gegen „die Quest ist das eine laute Ding" arbeiten kann.
Abgesichert durch zwei Regeln: die Liste liegt außerhalb des Lichts, und
`1.25rem` bleibt deutlich unter der Quest-Größe. Falls sich im Pilot zeigt,
dass es trotzdem konkurriert, fällt die große Stufe weg und es bleiben zwei.

## 4. Regeln

1. **Ein Amber-Element pro Seite.** Amber erscheint als Wash, als Glow oder
   als Textfarbe der *einen* Handlung. Nie als Button-Fläche, nie als
   Rahmen. Braucht eine Seite zwei gleich wichtige Dinge, ist keins davon
   das eine — dann trägt keins Amber.
2. **`--done` ist nur „erledigt", `--danger` ist nur Zerstörung.** Kein
   zweiter Akzent, keine grüne CTA.
3. **Kein Rahmen als Abgrenzung.** Flächen grenzen sich durch ihre Farbe
   ab. `--hairline` ist für echte Trennlinien da, sparsam.
4. **Kein Schatten** außer `--shadow-overlay`.
5. **Fraunces einmal groß pro Seite.** Sonst nirgends.
6. **Keine Farbe im Komponentencode.** Kein Hex, kein `rgb()`, kein
   Tailwind-Farbname — nur Tokens.

## 5. Konsequenz für die Komponenten

Die Primitives existieren und werden nicht benutzt. Zwei Wege, und ich
empfehle den ersten:

**Empfohlen — Primitives auf das reduzieren, was trägt.** `Card` in der
heutigen Form ist im Lichtkegel-System das falsche Konzept: sie *ist* der
Kasten, den wir abschaffen. Sie wird ersetzt durch `Surface`
(Flächenstufe + Radius, kein Rahmen, kein Schatten). `Button` bleibt, wird
aber auf drei Varianten eingekürzt — `primary` (die eine Handlung, Amber als
Text), `quiet`, `danger` — statt heute sechs. `Badge` bleibt. Die
Design-System-Seite wird zur echten Referenz statt zum Museum.

**Verworfen — alles auf die bestehenden Primitives ziehen.** Würde 1521
Inline-Styles auf ein Kartensystem abbilden, das der Entwurf gerade
abschafft. Doppelte Arbeit.

## 6. Dashboard, konkret

| Element | Entscheidung |
|---|---|
| Greeting | bleibt, wird klein und mono statt Lora-Kursiv |
| Energie-Check-in | verschmilzt in die Metazeile über der Quest |
| Insight-Chip („bester Tag") | verschmilzt in dieselbe Metazeile |
| Daily Quest | wird die Lichtquelle: kein Kasten, kein Rahmen, Fraunces groß |
| Focus-CTA (grün) | wird Textlink in der Handlungszeile der Quest |
| „I only have 5 minutes" (amber) | ebenso — die zwei konkurrierenden Banner werden eine Zeile |
| Quick Wins | nackte Liste mit den drei Aufwandsstufen, Minuten rechts in mono |
| 4 Stat-Tiles | **gestrichen** — Coins und Level stehen in der Navbar, Streak zieht in die Metazeile |
| Quick links („All tasks/topics") | **gestrichen** — dupliziert die Sidebar |

Aus acht gleich lauten Flächen werden ein lautes und zwei leise Elemente.

Der bestehende Streak- und Coin-Stand verschwindet nicht aus dem Produkt —
nur aus dem Dashboard, wo er doppelt stand. `/progress` und `/stats` bleiben
die Orte, an denen Zahlen ausführlich vorkommen.

## 7. Was das Auseinanderlaufen künftig verhindert

Ohne Durchsetzung steht dieselbe Analyse in einem Jahr wieder da. Zwei
Tests, die im normalen `npm test` mitlaufen:

1. **`no-hardcoded-colors`** — scannt `components/` und `app/` auf `.tsx`.
   Verboten: Hex-Literale (`#fff`, `#rrggbb`, `#rrggbbaa`), `rgb(`/`rgba(`,
   `hsl(`/`hsla(`, die Schlüsselwörter `white`/`black`, und
   Tailwind-Farbutilities mit Palettenname und Stufe (Regex
   `\b(?:text|bg|border|ring|from|via|to)-(?:red|green|blue|amber|yellow|orange|purple|indigo|violet|slate|gray|zinc|neutral|stone|emerald|teal|cyan|sky|rose|pink|fuchsia|lime)-\d{2,3}\b`).
   Erlaubt sind ausschließlich `var(--…)`-Referenzen und die
   Momo-Token-Utilities. Startwert der Ausnahmeliste: 0.
2. **`radius-scale-only`** — erlaubt in `.tsx` nur
   `rounded-[var(--radius-sm|md|lg|pill)]`; jedes `rounded-lg`, `rounded-xl`
   und `rounded-2xl` schlägt fehl.

Ein dritter Test wäre eine Obergrenze für Inline-Styles pro Datei, die mit
jeder migrierten Datei sinkt. Das ist eine Ratsche, kein Verbot — sie
verhindert nur, dass neue dazukommen.

## 8. Reihenfolge

| Schritt | Inhalt |
|---|---|
| 1 | Tokens in `globals.css`, Schriften in `layout.tsx` tauschen, `Surface`/`Button`/`Badge` neu, Design-System-Seite als Referenz |
| 2 | Die zwei Tests aus Abschnitt 7 |
| 3 | **Dashboard als Pilot** — dort ist der Effekt am größten und jede Token-Frage steckt schon drin |
| 4 | Tasks, Topics |
| 5 | Wishlist, Progress, Stats, Focus, Habits |
| 6 | Settings, Admin, Auth, Legal — die Dateien mit den meisten Inline-Styles (`admin/page.tsx` 91, `progress-tabs.tsx` 89, `datenschutz/page.tsx` 80) |

**Der Implementierungsplan umfasst nur die Schritte 1 bis 3.** Schritte 4
bis 6 werden nach dem Pilot eigenständig geplant — erst dann steht fest, ob
die Aufwandsstufen tragen und wie viel Arbeit eine Seite wirklich ist.
Nicht 134 Dateien in einem Rutsch.

## 9. Mitzuführende Dokumentation

- `docs/design-system.md` — komplett neu; beschreibt heute ein System, das
  der Code nicht benutzt
- `app/(docs)/design-system/page.tsx` — zeigt künftig `Surface`, die
  Flächenleiter, die Amber-Regel, die drei Aufwandsstufen
- `CLAUDE.md` — die drei Schriftrollen (`--font-body` → `--font-mono`,
  Lora → Fraunces, DM Sans → Instrument Sans) und die Radius-Regel
- `CHANGELOG.md` unter `[Unreleased]`
- `public/screenshots/*` — in derselben Änderung neu aufnehmen, die die
  Oberfläche ändert. Nebenbefund: `03-habits.png` zeigt heute die
  Topics-Seite, nicht Habits.
- `docs-site/features.md`, falls sich beschriebene Bedienschritte ändern

## 10. Nicht Teil dieser Arbeit

- Keine neuen Funktionen. Der Entwurf streicht und ordnet, er baut nichts
  dazu.
- Keine Änderung an Datenmodell, API oder Gamification-Logik. Coins,
  Streak und Level rechnen weiter wie heute, sie werden nur anders gezeigt.
- `task-item.tsx` (803 Zeilen) und `daily-quest-card.tsx` (526 Zeilen) sind
  zu groß, werden hier aber nur so weit angefasst, wie die Optik es
  verlangt. Ein Zerlegen ist eigene Arbeit.
- Kein Umbau der Navigation. Sidebar-Gruppierung (TODAY / PLAN / REWARD)
  bleibt wie sie ist.

## 11. Offene Punkte

Keine. Die Aufwandsstufen-Frage aus Abschnitt 3 ist mit einem
Rückfallpfad entschieden und wird nach dem Pilot bewertet.
