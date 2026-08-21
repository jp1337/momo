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

### Flächen — zwei Werte, keine Leiter

**Revidiert am 2026-08-21**, nachdem der Entwurf zum ersten Mal im Browser
angesehen wurde. Die ursprüngliche vierstufige Leiter (`--s1` `--s2` `--s3`)
ist gestrichen. Warum, und was stattdessen gilt:

Die Leiter war selbst das Problem, das dieser Entwurf abschaffen wollte. Eine
Leiter *lädt dazu ein*, Dinge auf verschiedene Sprossen zu stellen — das ist
„acht gleich wichtige Panels" in anderer Verkleidung. Und gemessen trug sie
ohnehin nichts: die Nachbarstufen lagen bei ΔL\* 3, wo ein wahrnehmbarer
Flächenschritt ΔL\* 8–9 braucht.

Die maßgebliche Frage ist nicht *wie machen wir Flächen sichtbar*, sondern
**was würde eine Kante aussagen**:

| Kante um … | Aussage | Folge |
|---|---|---|
| eine Inhaltsgruppe | keine — Abstand und Typografie gruppieren schon | keine Kante, meist auch keine Fläche |
| ein Eingabefeld, einen Button | „hier kannst du tippen / drücken" — eine Affordanz | Fläche **und** Haarlinie |
| einen Dialog | leistet der Scrim plus `--shadow-overlay` | Fläche, keine Haarlinie |

```css
/* Dark (Standard) */
--ground:   #0e100f;  /* die Seite — und der Körper von Dialogen */
--raised:   #202623;  /* NUR echte Affordanzen: Eingabe, Button, Hover */
--hairline: #3d463f;  /* die eine Linie, nur wo sie Information ist */

/* Light */
--ground:   #eceee5;
--raised:   #d3d9c9;
--hairline: #b9c2ab;
```

Die Richtung des Schritts unterscheidet sich pro Theme, und das ist
konsequent statt inkonsequent: im Dunkeln ist eine Eingabe heller, im Hellen
ist sie ein Trog, in den man tippt — also dunkler. Die Invariante ist **ein
klarer Schritt weg vom Grund**, nicht „immer heller". Damit kann die Leiter
auch nicht mehr die Richtung wechseln, wie sie es im Light Mode tat
(`--s1` lag über dem Grund, `--s2` darunter — „angehoben" wirkte vertieft).

Der Grund bleibt `#0e100f`. Die Waldtiefe bleibt damit erhalten, weil die
aufgehellte Fläche nur noch dort erscheint, wo man tippt, und nicht mehr
unter jedem Textblock.

Light Mode ist bewusst **kein Creme** (`#f7f2e8` heute), sondern blasses
Salbei-Papier. Warme Serif auf Creme mit Amber ist die verbreitetste
Vorlagen-Optik überhaupt; `#eceee5` liest als Tageslicht im Wald und passt
besser zu den Grüntönen.

### Wie Flächenabstand gemessen wird

Nicht mit WCAG-Kontrastverhältnis. Das ist für Textlesbarkeit gebaut und
komprimiert bei hoher Helligkeit, sodass es im Light Mode Abstände als
katastrophal ausweist, die das Auge klar sieht. Für große Flächen gilt der
perzeptuelle Helligkeitsabstand **ΔL\*** (CIE L\*), Zielwert **≥ 8**.

Kontrastverhältnis bleibt die Metrik für **Text** — dort mit dem
AA-Mindestwert 4,5:1 für Fließtext und Meta.

### Schrift und Akzent

| Token | Dark | Light | Rolle |
|---|---|---|---|
| `--ink` | `#f2e9d8` | `#1b241e` | Primärtext |
| `--ink-2` | `#a4b0a7` | `#55635a` | Sekundärtext |
| `--ink-3` | `#828f86` | `#666f68` | Meta, Eyebrow — **AA-fest**, siehe unten |
| `--amber` | `#f0a500` | `#a86f00` | Licht, die eine Handlung |
| `--on-amber` | `#171408` | `#fffaf0` | Text auf Amber — **das fehlende Token** |
| `--done` | `#5ec47e` | `#2e7048` | ausschließlich „erledigt" |
| `--danger` | `#d06460` | `#9e3b38` | ausschließlich Zerstörung |

`--rarity-legendary` bleibt unverändert bestehen (Achievements).

**`--ink-3` wurde am 2026-08-21 angehoben.** Die ursprünglichen Werte
(`#6c7a71` / `#7d8a80`) ergaben bei 11 px nur 4,24:1 im Dark Mode und
**3,08:1** im Light Mode — beide unter dem AA-Mindestwert von 4,5:1 für
kleinen Text. Der Token war als Flüsterton für Eyebrows gedacht, trägt aber
inzwischen echten Inhalt (Wochentag, Energie, Streak in der Metazeile). Ein
Eyebrow ist Text und muss lesbar sein. Die neuen Werte erreichen 4,5:1 in
beiden Themes.

Regel daraus: **kein Token unter 4,5:1 gegen seinen Grund**, wenn darin Text
steht. „Dekorativ" ist keine Ausnahme — was man lesen soll, muss lesbar sein.

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
3. **Eine Kante nur, wo sie etwas aussagt.** *(Revidiert 2026-08-21 — die
   ursprüngliche Regel „kein Rahmen als Abgrenzung, Flächen grenzen sich
   durch ihre Farbe ab" war zu absolut und hat gemessen nicht funktioniert.)*
   Um eine Inhaltsgruppe gehört keine Kante: Abstand und Typografie
   gruppieren schon, alles darüber ist Dekoration. Um eine Affordanz —
   Eingabefeld, Button — gehört eine: sie sagt „hier kannst du tippen oder
   drücken", und das ist Information. Ein Dialog braucht keine, weil Scrim
   und `--shadow-overlay` das leisten.
4. **Kein Schatten** außer `--shadow-overlay`.
   **Keine Fläche ohne Anlass.** Inhalt liegt auf `--ground`. `--raised`
   erscheint nur bei Affordanzen. Wer eine Fläche setzt, muss sagen können,
   welche Frage sie dem Nutzer beantwortet.
5. **Fraunces einmal groß pro Seite.** Sonst nirgends.
6. **Keine Farbe im Komponentencode.** Kein Hex, kein `rgb()`, kein
   Tailwind-Farbname — nur Tokens.

## 5. Konsequenz für die Komponenten

Die Primitives existieren und werden nicht benutzt. Zwei Wege, und ich
empfehle den ersten:

*Revidiert 2026-08-21:* `Surface` hat **zwei** Stufen, nicht vier — `raised`
(Fläche plus Haarlinie, für Affordanzen) und `overlay` (Fläche plus
`--shadow-overlay`, für Dialog und Popover). Es gibt keine Stufe für
gewöhnlichen Inhalt, weil gewöhnlicher Inhalt direkt auf dem Grund liegt und
gar keine `Surface` braucht. Jede Stufe hat genau eine Aufgabe.

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

### Und was kein Test leisten kann

*Ergänzt 2026-08-21.* Jede optische Änderung wird **im Browser angesehen**,
bevor sie als fertig gilt. Grüne Tests sind kein Beleg dafür, dass ein Design
funktioniert.

Der Beleg dafür ist diese Spec selbst: fünf ihrer Festlegungen waren falsch,
alle fünf gingen durch Reviews mit sauberem Ergebnis, und alle fünf fielen
innerhalb von Minuten auf, als die Seite zum ersten Mal geöffnet wurde — die
unsichtbare Flächenleiter, die richtungswechselnde Light-Leiter, `--ink-3`
unter AA, die doppelte Energie-Anzeige und ein pauschaler 48-px-Abstand, der
nichts gruppiert. Ein Test kann bestätigen, dass ein Schatten weg ist. Dass
die Seite dadurch besser wurde, kann er nicht.

Worauf dabei zu achten ist: **Abstände** (gruppiert die Rhythmik, oder ist
alles gleich weit weg?), Gesamtoptik und Bedienbarkeit — in beiden Themes.

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
