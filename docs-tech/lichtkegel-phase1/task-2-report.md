# Task 2 Report — Die vierte Kategorie `spacing` in der Ratsche

## Was umgesetzt wurde

Alle sieben Schritte des Briefs, plus zwei notwendige Korrekturen (siehe
„Zwei zusätzliche Funde" unten):

1. Neun neue Selbsttest-Fälle für `spacing` in `selftest()` angefügt (exakt
   wie im Brief vorgegeben).
2. RED bestätigt (siehe TDD-Evidenz).
3. Kategorie implementiert:
   - `SPACING_OK`, `SPACING_GUARD` hinter `TAILWIND_PALETTES` eingefügt.
   - `PATTERNS.spacing` mit den drei Regexen (p/m, gap, space-x/y).
   - `CATEGORIES = ["color", "radius", "inline", "spacing"]` als einzige
     Aufzählung; `scan()`, `ZERO_COUNTS`, `findRaised()`, die beiden
     `total`-Reduces und der Haupt-Vergleichsloop (`allowed[k]`) darauf
     umgestellt. Ein vierter, im Brief nicht genannter Fundort kam dazu:
     der `allowed`-Fallback im Hauptlauf (`{ color: 0, radius: 0, inline: 0 }`)
     — ebenfalls durch `ZERO_COUNTS` ersetzt.
   - Kopfkommentar von „Drei Kategorien" auf „Vier Kategorien" erweitert,
     inkl. der beiden Stellen, die noch das alte `{color:0,radius:0,inline:0}`
     zitierten (Zeile 9 und im `findRaised()`-Docstring).
4. GREEN bestätigt: 28 Fälle (19 alt + 9 neu).
5. Baseline neu gelegt — siehe „Zwei zusätzliche Funde" für den Umweg dahin.
6. CHANGELOG unter `### Added` ergänzt, mit den tatsächlich gemessenen Zahlen
   (281/70/115 statt der im Brief geschätzten 285/69/104 — die Anweisung war
   ausdrücklich, die gemessene Zahl zu verwenden).
7. Commit folgt nach diesem Report.

## Zwei zusätzliche Funde (nicht im Brief, aber nötig für Schritt 5)

### Fund 1: `rm baseline && --update` funktionierte nicht wie dokumentiert

Der Kopfkommentar (Zeilen 30–41, unverändert seit Commit `83ced1f`) behauptet:
„mit alter Baseline = {} greift keine Steigerungspruefung". Das stimmte nicht
mehr — `findRaised()` behandelt seit Task B10 (selber Commit) jeden fehlenden
Datei-Eintrag als `ZERO_COUNTS`. Löscht man die ganze Baseline-Datei, hat
JEDE Datei keinen Eintrag mehr — der ehemals harmlose Reset-Weg löste also
für jede einzelne Datei jede bestehende Farbe-/Radius-/Inline-Verletzung als
„neu gestiegen" aus, nicht nur die frisch erfassten Spacing-Verstöße. Erster
`--update`-Lauf brach entsprechend mit ~190 Zeilen Fehlermeldungen ab (siehe
TDD-Evidenz unten).

Bestätigt: Kopfkommentar und B10-Härtung stammen aus demselben Commit — der
Reset-Pfad wurde nie tatsächlich ausgeführt, seit B10 ihn stillschweigend
brach. Kein Regressionsfund aus dieser Aufgabe, sondern ein latenter,
unbenutzter Widerspruch im Skript selbst.

**Fix:** `baselineExisted = existsSync(BASELINE)` vor dem Lesen festgehalten;
die Steigerungsprüfung läuft nur noch, wenn die Datei vorher existierte.
Fehlt sie komplett (der bewusste, sichtbare `rm`-Schritt), entfällt die
Prüfung vollständig — deckungsgleich mit dem Kopfkommentar. Die B10-Härtung
für „Datei vorhanden, aber Eintrag fehlt" (echte neue/vorher-saubere Datei)
bleibt unverändert aktiv. Ausgelagert in eine eigene Funktion
`raisedForUpdate()`, damit `selftest()` genau diese Unterscheidung ohne
Dateisystemzugriff prüfen kann — zwei neue Fälle ergänzt (28 → 30).

### Fund 2: `gap-x-`/`gap-y-` mit Regex-Backtracking-Falschmeldung

Beim Präzisions-Check (siehe unten) fiel auf: `gap-x-1` und `gap-y-1`
(4px, auf der Skala, sollten 0 Verstöße sein) wurden fälschlich als 1
Verstoß gezählt — mit dem Phantom-Match `"gap-x"` bzw. `"gap-y"` (ohne
Ziffer!). Ursache: Der Regex-Motor scheitert korrekt am `SPACING_GUARD` für
den vollen Pfad `gap-x-1`, backtrackt aber auf die optionale
`(?:-[xy])?`-Gruppe, fällt auf die Basisform `gap-` zurück und das
ursprüngliche `[\w./]+` frisst dann das rohe `x`/`y` als vermeintlichen Wert.

**Fix:** Der Wertteil ist jetzt `SPACING_VALUE = "(?:\\[[^\\]]*\\]|\\d[\\w./]*|px|auto)"`
statt `[\w./]+` — ein Wert muss mit einer Ziffer beginnen oder exakt `px`/
`auto`/ein Klammerausdruck sein. `x`/`y` allein matcht nicht mehr. Verifiziert
per gezieltem Regex-Test (siehe unten) und erneut per vollem
`--selftest`-Lauf (weiterhin grün).

Dieser zweite Fund senkte die neu gelegte Baseline von 2220 auf 2215
Verstöße (5 Phantomtreffer entfernt: 3× `gap-x`, 2× `gap-y`).

## TDD-Evidenz

### RED

```
$ node scripts/check-design-tokens.mjs --selftest
```
```
file:///…/scripts/check-design-tokens.mjs:75
  for (const re of PATTERNS[category]) {
                           ^
TypeError: PATTERNS[category] is not iterable
    at countCategory (…/scripts/check-design-tokens.mjs:75:28)
    at selftest (…/scripts/check-design-tokens.mjs:147:17)
```

Erwarteter Fehlschlag — die Kategorie `spacing` existiert noch nicht, daher
ist `PATTERNS["spacing"]` `undefined` und die `for…of`-Schleife wirft statt
`0` zurückzugeben. Das weicht vom Brief-Text („→ 0, erwartet 1" pro Fall") in
der genauen Fehlerform ab (Crash statt gezählter Einzelfehlschläge), aber die
Ursache ist identisch: die Kategorie fehlt. Bestätigt den RED-Zustand.

### GREEN

```
$ node scripts/check-design-tokens.mjs --selftest
Selbsttest: 28 Faelle in Ordnung.
```

Nach den beiden zusätzlichen Fällen für `raisedForUpdate()` (Fund 1):

```
$ node scripts/check-design-tokens.mjs --selftest
Selbsttest: 30 Faelle in Ordnung.
```

### Baseline-Relay — erster Versuch (vor Fund 1)

```
$ rm scripts/design-baseline.json && npm run check:design -- --update
Die Baseline ist eine Ratsche — sie darf nicht steigen:

  app/(app)/admin/page.tsx (color: 0 → 9)
  app/(app)/admin/page.tsx (radius: 0 → 17)
  app/(app)/admin/page.tsx (inline: 0 → 91)
  app/(app)/admin/page.tsx (spacing: 0 → 10)
  … [~190 weitere Zeilen, jede bestehende Datei mit jedem Kategorie-Zähler]

Eine neue, bewusst akzeptierte Ausnahme braucht --admit <pfad> bei
genau diesem Aufruf …
```

Exit 1 — das ist Fund 1 (siehe oben), nicht mein Regelwerk. Nach dem Fix in
`--update`:

```
$ npm run check:design -- --update
Baseline aktualisiert: 121 Dateien, 2220 Verstoesse.
```

### Präzisions-Check nach dem ersten grünen Lauf

Gezielter Regex-Test außerhalb der Baseline ergab die Fund-2-Phantomtreffer
(`gap-x-1 gap-y-1` → `["gap-x","gap-y"]` statt `[]`). Nach dem `SPACING_VALUE`-
Fix:

```
"gap-x-1 gap-y-1" -> null
"gap-x-4 gap-y-0.5" -> [ 'gap-y-0.5' ]
"gap-x-1.5" -> [ 'gap-x-1.5' ]
"gap-6" -> null
```

Erneuter Selftest nach dem Fix: weiterhin `Selbsttest: 30 Faelle in
Ordnung.` (danach die Baseline erneut mit `rm` + `--update` neu gelegt, siehe
unten).

### GREEN — finaler Baseline-Lauf

```
$ rm scripts/design-baseline.json && npm run check:design -- --update
Baseline aktualisiert: 121 Dateien, 2215 Verstoesse.

$ npm run check:design
Design-Token-Ratsche in Ordnung — 2215 Verstoesse, keiner neu.

$ npm run check:design   # zweiter Lauf, wie gefordert
Design-Token-Ratsche in Ordnung — 2215 Verstoesse, keiner neu.
```

## Die gemessenen Zahlen

| | Dateien | Verstöße gesamt | davon `spacing` |
|---|---|---|---|
| Alte Baseline | 115 | 1934 | 0 (Kategorie existierte nicht) |
| Neue Baseline | 121 | **2215** | **281** in 70 Dateien |
| Delta | +6 | **+281** | — |

Plan-Schätzung war ~285/69 — die tatsächliche Zahl (281/70) liegt nahe daran;
die Differenz erklärt sich vollständig durch die 5 in Fund 2 entfernten
Phantomtreffer plus eine geringfügig andere Dateizuordnung.

Die 6 neuen Dateien sind erwartungsgemäß Task-1-Artefakte
(`components/ui/page-frame.tsx`, `/design-system`-Seite und Begleitdateien) —
`page-frame.tsx` selbst trägt nur 1 `spacing`-Verstoß, keine anderen
Kategorien, konsistent mit „Task 1 introduced no new violations" für die
ursprünglichen drei Kategorien.

### Top offending utilities (spacing, nach beiden Fixes)

| Utility | Anzahl | 6px-Erklärung |
|---|---|---|
| `py-1.5` | 39 | 6px |
| `gap-1.5` | 38 | 6px |
| `py-0.5` | 29 | 2px |
| `p-5` | 22 | 20px |
| `py-2.5` | 21 | 10px |
| `gap-0.5` | 15 | 2px |
| `px-1.5` | 14 | 6px |
| `px-5` | 13 | 20px |
| `p-1.5` | 13 | 6px |
| `mt-0.5` | 12 | 2px |
| `gap-5` | 12 | 20px |
| `px-2.5` | 7 | 10px |
| `p-16` | 6 | 64px |
| `mb-5` | 6 | 20px |

Summe aller `*-1.5`-Utilities (6px): **115** — deckungsgleich mit der Zahl,
die der Skript-eigene Kommentar zu `SPACING_GUARD` bereits nennt („6px, 115
Vorkommen"). Summe aller `*-0.5`-Utilities (2px): 59. Gesamt: 281.

Alle Top-Treffer stichprobenartig im echten Code verifiziert, z. B.:
- `components/ui/tooltip.tsx:54` — `px-2.5 py-1.5` (10px/6px, beides
  off-scale, echter Verstoß)
- `components/topics/topics-grid.tsx:49` — `p-12 sm:p-16` (64px, off-scale)
- `app/(app)/admin/page.tsx:66` — `mt-20` (80px, off-scale)

### Präzisions-Suite (zusätzlich zu den Selbsttest-Fällen)

```
p-2                       -> 0   (8px, auf der Skala)
p-[var(--space-4)]        -> 0   (Token-Zugriff erlaubt)
p-[13px]                  -> 1   (arbiträrer Wert, off-scale)
gap-x-4                   -> 0   (16px, auf der Skala — Fund 2 behoben)
space-x-4                 -> 0
-mt-2                     -> 0   (negativer Margin, auf der Skala)
-mt-5                     -> 1   (negativer Margin, off-scale)
py-1.5                    -> 1
m-0 / max-w-prose /
placeholder-slate-400 /
pointer-events-none /
important-thing / prose   -> 0   (Lookalikes, korrekt ignoriert)
```

Alle wie erwartet.

## Dateien geändert

- `scripts/check-design-tokens.mjs` — vierte Kategorie, `CATEGORIES`-Liste,
  Kopfkommentar, zwei Bugfixes (Baseline-Reset-Erkennung, `gap-x`/`gap-y`-
  Backtracking), zwei zusätzliche Selbsttest-Fälle für den ersten Bugfix.
- `scripts/design-baseline.json` — neu gelegt: 121 Dateien, 2215 Verstöße.
- `CHANGELOG.md` — Eintrag unter `## [Unreleased]` → `### Added`, mit den
  gemessenen Zahlen (281/70/115).

## Selbstüberprüfung

- **Vollständigkeit:** Alle sieben Schritte umgesetzt. Alle Aufzählungsstellen
  kollabiert (`grep -n '"color"'` zeigt nur noch die `CATEGORIES`-Definition).
  Kopfkommentar aktualisiert. CHANGELOG ergänzt. Zusätzlich: der `allowed`-
  Fallback im Hauptlauf, den der Brief nicht erwähnt, aber der eine vierte
  Stelle war, die sonst "inline: 0" statt aller vier Kategorien geliefert
  hätte.
- **Qualität:** Regex jetzt präzise (Fund 2 behoben); Kommentare erklären
  sowohl `\b` vs. `(?![\w./])` (aus dem Brief übernommen) als auch die neue
  `SPACING_VALUE`-Begründung mit konkretem Fehlerbeispiel.
- **Disziplin:** Keine konfigurierbare Regel-Engine gebaut — eine Konstante
  (`SPACING_VALUE`), eine Hilfsfunktion (`raisedForUpdate`), beide minimal
  und nur zur Behebung der zwei gefundenen Fehler.
- **Tests:** Neun neue Fälle decken sowohl Verstoß- als auch
  Nicht-Verstoß-Formen ab (inkl. arbiträre Werte, negative Margins, Token-
  Zugriff, Lookalike-Präfixe). Zwei zusätzliche Fälle decken den
  Baseline-Reset-Fix ab. `Selbsttest`-Ausgabe ist sauber (kein Rauschen).

## Bedenken

- `docs/design-system.md:153–159` beschreibt die Ratsche noch mit drei
  Kategorien und einer veralteten Verstoßzahl (1947 — bereits vor dieser
  Aufgabe falsch, die echte alte Zahl war 1934). Nicht Teil der im Brief
  genannten Dateien (nur `scripts/check-design-tokens.mjs`,
  `scripts/design-baseline.json`, `CHANGELOG.md`); nicht angefasst, um nicht
  über den Auftrag hinauszugehen. Sollte in einer Doku-Nachziehschritt
  korrigiert werden.
- Fund 1 und Fund 2 sind reale Fehler im bestehenden Skript, keine
  Erfindungen zur Absicherung — beide mit Reproduktion, Ursache und Fix
  oben dokumentiert. Falls das Review anderer Ansicht ist, sind beide Fixes
  klein und lokal genug, um bei Bedarf einzeln zurückzudrehen.

---

## Fix-Runde (Review-Feedback)

Review auf dem stärksten Modell bestätigte beide selbst gefundenen Bugfixes
(Regex-Präzision an 120 Grenzfällen ohne Abweichung; Baseline-Reset laut
per-Datei-Vergleich mit `a2dccc2` exakt 1934 für color+radius+inline, 0
Anhebungen/Absenkungen). Kein Critical. Fünf Punkte zu beheben.

### Important 1 — Kopfkommentar beschrieb den falschen Mechanismus

**Fund:** Zeilen 41–44 sagten weiterhin „mit alter Baseline = {} greift
keine Steigerungspruefung" — nach dem vorherigen Fix ist die tatsächliche
Bedingung aber das FEHLEN der Datei, nicht ihr Inhalt. `echo '{}' >
scripts/design-baseline.json && --update` hätte laut Wortlaut den Reset-Weg
genommen, wäre aber in die Ratsche gelaufen (der eigene Selbsttest
`updateRaiseCases[1]` behauptet das Gegenteil).

**Fix:** Kommentar umformuliert auf `existsSync(BASELINE)` als
Bedingung, mit explizitem Hinweis, dass eine vorhandene, aber leere Datei
NICHT als fehlend zählt.

**Test:** `node scripts/check-design-tokens.mjs --selftest` → weiterhin
`Selbsttest: 31 Faelle in Ordnung.` (Kommentaränderung, keine
Verhaltensänderung — abgedeckt durch dieselben `updateRaiseCases`, die den
Unterschied schon vorher prüften).

### Important 2 — Reset-Pfad war stumm

**Fund:** Bei fehlender Baseline-Datei wurde die Steigerungsprüfung
übersprungen, aber die Ausgabe sah identisch zu einer gewöhnlichen Senkung
aus — nichts im Terminal/CI-Log unterschied „Ratsche übersprungen" von
„Zähler gesunken".

**Fix:** Eine Zeile `console.log("Baseline-Datei fehlte —
Steigerungspruefung uebersprungen, neuer Boden wird ungeprueft
geschrieben.")` direkt beim Überspringen, mit Kommentar, der explizit auf
die --admit-Sichtbarkeits-Begründung im Kopfkommentar verweist.

**Test:** Manuell reproduziert:
```
$ rm scripts/design-baseline.json && node scripts/check-design-tokens.mjs --update
Baseline-Datei fehlte — Steigerungspruefung uebersprungen, neuer Boden wird ungeprueft geschrieben.
Baseline aktualisiert: 120 Dateien, 2214 Verstoesse.
```
Anschließend die echte Baseline wiederhergestellt und per normalem
`--update` neu erzeugt (siehe R7-Abschnitt).

### Important 3 — Fehlermeldung erwähnte die neue Regel nicht

**Fund:** Die Ausgabe bei Ratschen-Verstoß nannte nur Farbe (`var(--…)`)
und die vier Radius-Token, nicht die Abstandsskala.

**Fix:** Zwei Zeilen ergänzt: „Abstand (p-/m-/gap-/space-) nur aus der
Skala 4·8·12·16·24·32·48·72px — in Tailwind
0|px|auto|1|2|3|4|6|8|12|18 oder [var(--space-N)]."

**Test:** Nicht separat automatisiert (reiner Text im Fehlerpfad, wie die
bestehenden Farb-/Radius-Zeilen auch); durch Lesen der geänderten Zeilen
verifiziert.

### Ruling R7 — `[var(--gutter)]` in `SPACING_OK` zugelassen

**Fund (Review):** `components/ui/page-frame.tsx:42` —
`rail:gap-[var(--gutter)]` zählte als Verstoß, obwohl `--gutter: 3rem` =
48px auf der Skala liegt. Gleiche Fehlerklasse wie der bereits behobene
`gap-x-1`-Fund, nur über einen benannten Custom-Property-Zugriff statt
einer harten Zahl.

**Fix:** `SPACING_GUARD` um `\[var\(--gutter\)\]` als exakte (nicht
präfixartige) Ausnahme erweitert, mit Kommentar, warum dies kein
Freibrief für beliebige Custom Properties ist: `--gutter` ist ein einzelner
benannter Token, dessen Wert extern durch
`e2e/design-tokens.spec.ts:284` (`expect(t["--gutter"]).toBe("3rem")`)
fixiert ist — eine künftige Abweichung von der Skala fiele dort auf, nicht
hier.

**Test:**
```
"gap-[var(--gutter)]"          -> null   (jetzt erlaubt)
"rail:gap-[var(--gutter)]"     -> null   (jetzt erlaubt)
"gap-[var(--space-4)]"         -> null   (unverändert erlaubt)
"gap-[var(--other)]"           -> ['gap-[var(--other)]']  (weiterhin Verstoss — Tür bleibt zu)
"gap-[13px]"                   -> ['gap-[13px]']          (weiterhin Verstoss)
```

**Baseline neu gelegt — mit normalem `--update`, nicht `rm`:**
```
$ npm run check:design -- --update
Baseline aktualisiert: 120 Dateien, 2214 Verstoesse.
```
Akzeptiert ohne Widerstand (echte Senkung 2215 → 2214, kein `--admit`
nötig). `components/ui/page-frame.tsx` hatte nur diesen einen
`spacing`-Verstoß und fällt jetzt komplett aus der Baseline (121 → 120
Dateien), exakt wie erwartet.

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 2214 Verstoesse, keiner neu.
$ npm run check:design   # zweiter Lauf
Design-Token-Ratsche in Ordnung — 2214 Verstoesse, keiner neu.
```

### Ruling R8(a) — CHANGELOG-Widerspruch

**Fund:** `CHANGELOG.md` behauptete eine Zeile über meinem neuen Eintrag
„aktuell 1947 Verstöße" — die reale alte Zahl war 1934 (nie 1947, auch
schon vor dieser Aufgabe falsch, aber jetzt im selben Diff sichtbar
widersprüchlich neben „2215").

**Fix:** „1947" → „1934" korrigiert; eigener Bullet auf die finalen Zahlen
nach dem R7-Fix aktualisiert (280 Utilities in 69 Dateien statt 281/70;
Baseline-Sprung explizit als „1934 → 2214" benannt statt nur „steigt
einmalig").

### Ruling R8(b) — `raiseCases`-Fixtures ungetestet für `spacing`

**Fund:** Alle fünf bestehenden `raiseCases` benutzten Fixtures mit nur
`color/radius/inline` — `counts.spacing` war in jedem Fall `undefined`,
und `undefined > 0` ist immer `false`. Die Erkennung eines steigenden
`spacing`-Zählers war dadurch nie durch einen Selbsttest belegt, nur durch
den Bau der gemeinsamen `for (const k of CATEGORIES)`-Schleife.

**Fix:** Allen fünf bestehenden Fixtures `spacing: 0` ergänzt, plus ein
neuer Fall, der ausschließlich `spacing` steigen lässt
(`{…, spacing: 2}` → `{…, spacing: 3}`, `want: 1`).

**Test:**
```
$ node scripts/check-design-tokens.mjs --selftest
Selbsttest: 31 Faelle in Ordnung.
```
(28 aus dem Brief + 1 neuer raiseCase + 2 `updateRaiseCases` aus der
vorherigen Runde = 31.)

## Finale Verifikation dieser Runde

```
$ node scripts/check-design-tokens.mjs --selftest
Selbsttest: 31 Faelle in Ordnung.

$ npm run check:design
Design-Token-Ratsche in Ordnung — 2214 Verstoesse, keiner neu.

$ npm run check:design   # zweiter Lauf
Design-Token-Ratsche in Ordnung — 2214 Verstoesse, keiner neu.
```

`grep -n '"color"' scripts/check-design-tokens.mjs` weiterhin nur die
`CATEGORIES`-Definition (Zeile 122) — keine neue Aufzählungsstelle durch
diese Runde eingeführt.

## Finale Baseline-Zahl

**2214** Verstöße in 120 Dateien (1934 Basis + 280 `spacing`, davon 115 auf
6px). Commit `a5f3f1d`.

## Offene Punkte (bewusst nicht in dieser Runde)

Laut Koordinator für die Schlussreview vorgemerkt, hier nicht angefasst:
- Ungetestete Verdrahtung, die `baselineExisted` an `raisedForUpdate()`
  übergibt (Minor).
- `docs/design-system.md:153–159` (veraltete Drei-Kategorien-Beschreibung),
  bereits zu Task 12 geroutet.
