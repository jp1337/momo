# Task 12: Phase-1-Abschluss — Review, Baseline, Dokumentation

Status: dokumentiert, geprüft, bereit für PR — **kein PR geöffnet**, keine Migration
vorgenommen. Branch-Entscheidung (44 vs. 32 abweichende Commits zu
`origin/design/lichtkegel-impl`) bleibt beim Menschen.

---

## 1. Prüfspur — vollständige Kommandos und Ergebnisse

```
$ npx tsc --noEmit
(kein Output — sauber)

$ npm run lint
✖ 12 problems (0 errors, 12 warnings)
```
Alle 12 Warnungen sind `react-hooks/set-state-in-effect` in unberührtem Code
(`settings/*`, `tasks/task-form.tsx`, `tasks/task-row.tsx`, `topics/topic-form.tsx`,
`wishlist/wishlist-form.tsx`, `ui/checkbox.tsx` eine `jsx-a11y`-Warnung) — vor dieser
Task vorhanden, 0 Errors, kein CI-Gate betroffen.

```
$ npm test
 Test Files  76 passed (76)
      Tests  1741 passed (1741)
   Duration  101.46s
```

```
$ npm run check:i18n
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1037 translation key references across source files.
✓ All translation keys are present in every language file.
```

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.

$ npm run check:design -- --update
Baseline aktualisiert: 111 Dateien, 1938 Verstoesse.

$ npm run check:design
Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.
```
**Ratsche: 1938 → 1938.** `--update` änderte die Baseline-Datei nicht (byte-identischer
Diff) — der Stand war bereits der Boden aus Task 11. Task 2 lag bei 2219; dieser Task
senkt nichts weiter, weil nichts mehr zu senken war, und bestätigt zugleich, dass nichts
neu über der Baseline liegt.

```
$ DATABASE_URL=... npx playwright test
(Lauf 1, foreground → nach 600s automatisch backgroundet, KONTAMINIERT — siehe unten)
230 passed, 41 failed — Lauf 2, sauber
$ DATABASE_URL=... npx playwright test e2e/design-rules.spec.ts e2e/dashboard.spec.ts
63 passed (0 failed) — gezielter Nachlauf nach dem Wash-Fix
```

**Methodischer Fehler, offen benannt:** der erste volle Lauf lief absichtlich im
Vordergrund, wurde vom Harness nach 600s automatisch in den Hintergrund verschoben
(Tool-Verhalten, nicht meine Wahl), und ich habe **währenddessen eigene
Playwright-Skripte gegen denselben Dev-Server laufen lassen** (Chrome-Review-
Screenshots). Ergebnis: 46 Fehlschläge statt der tatsächlichen 41 — 5 Timeouts
(`landing.spec.ts:20`, `misc.spec.ts:22`, `tasks.spec.ts:87/94/106`) waren
Ressourcen-Konkurrenz, kein echter Befund. Ich habe den vollen Lauf **sauber
wiederholt** (kein eigener Traffic währenddessen) und nur den zweiten, sauberen Lauf
(41 fehlgeschlagen, 230 bestanden) für das Inventar unten verwendet.

**design-rules.spec.ts: 50/50 grün, beide Läufe.** Zusammen mit dem Setup-Test „51
Tests in 2 Dateien" (Playwrights eigene Zählung) — das harte Gate der Phase.

---

## 2. Chrome-Review — 5 Seiten × 2 Themes × 2 Breiten

**Methodik-Hinweis (Pflichtangabe laut Auftrag):** `mcp__claude-in-chrome`s
`resize_window` ist in dieser Umgebung defekt (`Invalid value for bounds` bei jeder
Zielgröße, unabhängig vom Wert — verifiziert mit 1440×900 und 1000×700). Playwrights
eigener MCP-Server verlangt den `chrome`-Kanal, der auf diesem Host
(Bazzite/Fedora Silverblue) nicht installierbar ist (`npm playwright install chrome`
bricht mit „cannot install on bazzite distribution" ab). **Tatsächlich benutzt:** ein
eigenes Node-Skript mit `playwright-core` und dem separat installierten
`chromium`-Build (`npx playwright install chromium`, funktioniert), mit derselben
`emulateMedia`/`addInitScript`-Technik wie `e2e/helpers/theme.ts`, echter
`viewport`-Größe (1440×900 bzw. 375×800) und der `e2e/.auth/user.json`- bzw.
`empty-habits.json`-Session als `storageState`. Das ist ein Playwright-kontrollierter
Viewport, kein reales Browserfenster — genau wie vom Auftrag verlangt, wenn die
Erweiterung ausfällt. 24 Screenshots erzeugt (20 Kombinationen + 2×`?tab=habits` +
2×Leerzustand-Account).

| # | Seite | Theme | Breite | Amber | Fraunces | Kästen | Spalte | Abstände | Befund |
|---|---|---|---|---|---|---|---|---|---|
| 1 | /dashboard | dark | 1440 | 1× „jetzt anfangen", Wash | 1× Quest-Titel | keine | 640px zentriert, Rand rechts | eng/locker gruppiert | sauber |
| 2 | /dashboard | light | 1440 | 1× | 1× | keine | ok | ok | sauber |
| 3 | /dashboard | dark | 375 | 1× | 1× | keine | voll, kein Rand (< 640) | ok | sauber |
| 4 | /dashboard | light | 375 | 1× | 1× | keine | ok | ok | sauber |
| 5 | /tasks | dark | 1440 | 1× „+ Neue Aufgabe" | 0 (keine Fraunces auf `/tasks` — Seitentitel ist Mono? nein, `Aufgaben` ist eine `<h1>` in Serif-artiger Schrift, siehe Anmerkung) | keine | ok | ok | sauber |
| 6 | /tasks | light | 1440 | 1× | s.o. | keine | ok | ok | sauber |
| 7 | /tasks | dark | 375 | 1× | s.o. | keine | ok | ok | **Titel schrumpft auf 1 Buchstaben („R Nächste: 5T überfällig") bei langem Trailing-Text — bereits im Code dokumentiert (task-row.tsx:364–370) als bekannt-unbehoben; hier live bestätigt, siehe §3** |
| 8 | /tasks | light | 375 | 1× | s.o. | keine | ok | ok | derselbe Befund wie #7 |
| 9 | /focus | dark | 1440 | Primäraktion (weiter unten im Fluss, außerhalb des Ausschnitts) | 1× „Was erledigst du heute?" | keine | chromeless, Bühne | ok | sauber |
| 10 | /focus | light | 1440 | s.o. | 1× | keine | ok | ok | sauber |
| 11 | /focus | dark | 375 | s.o. | 1× | keine | ok | ok | sauber (Trailing hier kurz — „5 Min" statt „Nächste: …" — Titel bricht nicht auf 1 Buchstaben, siehe §3) |
| 12 | /focus | light | 375 | s.o. | 1× | keine | ok | ok | sauber |
| 13 | /topics | dark | 1440 | 1× „+ Neues Thema" | 1× Seitentitel | keine | ok | ok | sauber; **kein sequenziell-Marker sichtbar, siehe §4** |
| 14 | /topics | light | 1440 | 1× | 1× | keine | ok | ok | sauber |
| 15 | /topics | dark | 375 | 1× | 1× | keine | ok | ok | Wortumbruch korrekt (`hyphens-auto`, kein Mitten-im-Wort-Bruch) |
| 16 | /topics | light | 375 | 1× | 1× | keine | ok | ok | sauber |
| 17 | /progress | dark | 1440 | 0 im Screenshot-Ausschnitt (Amber sitzt ggf. in einer nicht sichtbaren UI, Test bestätigt 1) | 1× „Fortschritt" | keine | Heatmap bricht bewusst aus (`data-breakout="chart"`) | ok | sauber |
| 18 | /progress | light | 1440 | s.o. | 1× | keine | ok | ok | sauber |
| 19 | /progress | dark | 375 | s.o. | 1× | keine | Heatmap-Breakout, lokal scrollbar (~44 % sichtbar) | ok | sauber, Physik akzeptiert |
| 20 | /progress | light | 375 | s.o. | 1× | keine | ok | ok | sauber |
| — | /progress?tab=habits, leerer Account | dark | 1440 | — | — | keine | — | — | Leerzustand: eine Zeile + ein Button „Zu den Aufgaben", kein Kasten |
| — | /progress?tab=habits, leerer Account | light | 375 | — | — | keine | — | — | dasselbe |

Alle Amber-/Fraunces-/Kästen-/Spalten-Zählungen sind zusätzlich durch
`e2e/design-rules.spec.ts` (50/50 grün, beide Themes, alle fünf Seiten) automatisiert
bestätigt — die Tabelle oben ist die visuelle Gegenprobe, nicht der einzige Beleg.

### Gefundene Defekte — behoben in diesem Durchgang

**Amber-Wash-Hartkante auf `/dashboard` (dark), gemeldet vom Auftraggeber während der
Bearbeitung.** Nicht durch meine eigene Chrome-Runde gefunden, sondern als expliziter
Zwischenauftrag hereingereicht, mit vorab gemessenen Werten. Drei Zustände:

1. **Original:** Wash-Box überragte ihren Container um 190% (Rest aus der 896px-Ära
   vor der 640px-Lesespalte). `main` setzt `overflow-y: auto`; `overflow-x` wird dadurch
   automatisch zu `auto` statt `visible`. Gemessen bei 1440×900 dark: Wash 192…1216px,
   `main` 224…1440px — 32px der linken Flanke unsichtbar abgeschnitten.
2. **Mein erster Fix (`width: 100%`, kein Überhang) — verschlimmbessert.** Ohne
   Überhang wurde die Box-Kante selbst (bei main NICHT geklippt, aber ohne eigenen
   Auslauf) zur harten Grenze, näher am 30%-Fokus als die alte Klip-Linie. Zurückgemeldet
   vom Auftraggeber mit neuer Messung (≈6% Amber-Alpha direkt an der Kante statt ≈0,5%
   vorher) — korrekt, meine eigene Nachrechnung bestätigte die Größenordnung.
3. **Endzustand, per Pixelvergleich verifiziert:** Überhang bleibt, aber an den
   tatsächlich verfügbaren Platz gekoppelt — unter 1100px (`--rail`-Umbruch) 14px/Seite,
   ab 1100px 140px/Seite (unter dem gemessenen 160px-Budget bei 1440px). Verlaufsradius
   verkleinert, damit er vor der jeweiligen Boxkante ausklingt. **Gemessen per
   Pixel-Sampling** (nicht Arithmetik) bei 1440px UND 375px, dark UND light: an main's
   Klip-Linie liegt der Farbwert exakt auf `--ground` (`14,16,15` dark / `236,238,229`
   light), flach über mehrere Pixel in beide Richtungen — 0 messbarer Unterschied.
   `e2e/dashboard.spec.ts` + `e2e/design-rules.spec.ts`: 63/63 grün danach.
   Unterhalb von 1100px liest die Keule dadurch enger als das ursprüngliche
   Breite-Ideal. Volle Breite auf jeder Breite bräuchte einen Scroll-Container, der
   nicht `main` selbst ist (`overflow-y` auf einen inneren Wrapper statt auf `main`) —
   **Empfehlung, nicht umgesetzt**: ändert Sticky-Positionierung, mobile
   Bottom-Nav-Polsterung und E2E-Scrollannahmen, zu großer Blast-Radius für eine
   Dokumentations-Aufgabe.

### Gefundene Defekte — aufgezeichnet, nicht behoben (strukturell)

1. **`/tasks` und `/focus`-artige Zeilen mit langem Trailing-Text schrumpfen den Titel
   auf 1 Buchstaben bei 375px.** Live bestätigt auf `/tasks` (dark UND light, 375px):
   „R Nächste: 5T überfällig" statt „Recurring 1787838471903 Nächste: 5T überfällig".
   **Bereits im Code dokumentiert** (`components/tasks/task-row.tsx:364–370`): „Titel und
   Trailing teilen sich eine Zeile … Der eigentliche Grund liegt in `Row` selbst (Task 4)
   … dieser Kommentar hält nur fest, dass das Problem unbehoben bleibt". Strukturell (die
   `Row`-Primitive selbst müsste Titel und Trailing bei schmalen Viewports auf zwei
   Zeilen erlauben) — nicht token-/spacing-/copy-Ebene, deshalb hier nicht angefasst,
   sondern für die finale Review erneut vorgelegt.

2. **`/topics`' „sequenziell"-Marker ist NICHT in der Zeile sichtbar — Korrektur einer
   angenommenen Tatsache.** Meinem Auftrag lag die Annahme zugrunde, der Marker sei
   „restauriert worden, weil er das Verhalten eines Themas ändert" (anders als Icon,
   Prioritäts-Badge, Beschreibung, Banner). Grep über `components/topics/topic-card.tsx`
   und `git log` zeigt: der Marker wurde beim Umbau auf `Row` (Task 10) fallengelassen
   wie die anderen vier und **nie zurückgeholt** — weder im initialen Commit noch in
   einer der Review-Runden. `e2e/topics.spec.ts` prüft ihn an keiner Stelle. Ich habe
   das live am Screenshot verifiziert (`Steuererklärung 2025`, ein sequenzielles Thema
   aus der Vorlage, trägt keinen sichtbaren Marker) und **CHANGELOG.md entsprechend
   korrigiert** — es behauptet nicht mehr, der Marker sei zurückgekehrt, sondern nennt
   ihn explizit als fünftes verlorenes Element mit der Anmerkung, dass er (anders als
   die anderen vier) Verhalten ändert und offen für eine bewusste Entscheidung ist,
   nicht stillschweigend nachgetragen wurde. Das ist der Fund, den Task 12 laut Auftrag
   genau für diesen Zweck vorsieht.

---

## 3. Failure-Inventar — 41 im sauberen Lauf, benannt

**Regel:** kein „bekanntes Problem" wird stillschweigend übersprungen; jeder Befund
unten wurde tatsächlich gelesen (Fehlermeldung + betroffene Zeile), nicht nur gezählt.

### A — deckt sich mit den vier in der Korrektur benannten Ursachenfamilien (22)

| Datei | Zeilen | Ursache | Deckungsgrad zur Korrektur |
|---|---|---|---|
| `navigation.spec.ts` | 34, 46 | `/500\|Interner Fehler/i` trifft echten Text: „192 / 500 🪙", „Halbtausend**500** Coins", „Ausdauerkämpfer**500** Aufgaben" | Korrektur nannte „eine" Stelle + 1 flaky — real sind es **zwei** 500-Kollisionen in dieser Datei (Wishlist- und Achievements-Navigation), nicht eine. Gleicher Mechanismus. |
| `navigation.spec.ts` | 106 | Klick+Navigation-Race, „all main navigation links" | exakt die genannte flaky Sidebar-Probe |
| `progress.spec.ts` | 24, 38, 114, 121 | dieselbe 500-Kollision, Achievements-Tab-Copy | exakt „vier … auf Errungenschafts-Text" |
| `progress.spec.ts` | 148 | `/stats`-Sichtbarkeits-Timeout | exakt „eine `/stats`-Sichtbarkeits-Timeout" |
| `tasks.spec.ts` | 14, 24, 34, 48, 60 | Quick-Add-Modal-Locator findet das Modal nicht (5 Tests im selben `describe`) | „defekter Quick-Add-Modal-Locator" |
| `tasks.spec.ts` | 176 | Strict-Mode-Verstoß: `text="…"` trifft ZWEI Elemente (Eyebrow-Span + Themen-Filter-Chip mit demselben Text) | Variante der „falschen Locator"-Familie — nicht wortwörtlich einer der vier genannten Fälle, aber derselbe Bug-Typ (Test kennt die aktuelle DOM-Form nicht) |
| `tasks.spec.ts` | 232 | `res.json()` liefert `{task: {...}}`, Test liest `task.title` direkt (`undefined`) | exakt „Test, der die falsche API-Antwortform annimmt" |
| `tasks.spec.ts` | 262 | `[role="dialog"]` nicht gefunden | exakt „`TaskForm` hatte nie `role=\"dialog\"`" |
| `focus-quick.spec.ts` | 85, 100 | (Details unten, C) | exakt die zwei genannten |
| `user-journey.spec.ts` | 68 | `createTask failed: 422 … estimatedMinutes: Invalid input` | exakt „`estimatedMinutes: 10` gegen `5\|15\|30\|60`" — **zusätzlicher Fundort**, den die Korrektur nicht auflistete (sie nannte diese Ursache nur für tasks.spec.ts/focus-quick.spec.ts) |
| `user-journey.spec.ts` | 143 | `input[placeholder*="Titel"]` nicht gefunden (Quick-Add) | dieselbe Locator-Familie wie `tasks.spec.ts` 14–60 — **zusätzlicher Fundort** |
| `wishlist.spec.ts` | 12, 116 | dieselbe 500-Kollision | **zusätzlicher Fundort** derselben Ursache, nicht in der Korrektur genannt |

Summe A: 2+1+4+1+5+1+1+1+2+1+1+2 = 22.

### B — `focus-quick.spec.ts`, Details (in A enthalten)

- `:85` „shows heading or content" — Locator-Race mit einem Next.js-internen
  `<div hidden>`, das vor `<main>` auf jeder Route steht (exakt die genannte Ursache).
- `:100` „shows quick wins section" — dieselbe Ursache, anderer Test.

### C — neue Funde, NICHT in der Korrektur benannt (19)

Jeder hier gelesen, nicht nur gezählt; keiner berührt eine der fünf migrierten Seiten
oder ist durch diese Phase verursacht — alle betroffenen Dateien sind vor Task 1
unverändert oder außerhalb des Phase-1-Scopes.

| Datei | Zeilen | Ursache | Bewertung |
|---|---|---|---|
| `api-keys.spec.ts` | 41 | `text="undefined"` — API-Key-Name undefined, dieselbe „falsche Antwortform"-Familie wie `tasks.spec.ts:232`, aber ein neuer Fundort auf einer Seite, die diese Phase nicht anfasst | pre-existing, nicht Lichtkegel |
| `daily-quest.spec.ts` | 34 | `GET /api/daily-quest`: `body.id` ist `undefined` bei nicht-`null`-Body | pre-existing API-Vertragsfrage, nicht UI |
| `landing.spec.ts` | 9 | `<h1>` sagt „Steal your time back.", nie „momo" — Test erwartet `/momo/i` im `<h1>`, das war nie der Fall (Markenname steht im Logo, nicht in der H1) | vermutlich seit Langem falscher Test, unrelated page |
| `misc.spec.ts` | 60 | derselbe Check, dupliziert in einer zweiten Datei | Duplikat von oben |
| `misc.spec.ts` | 119, 126, 133 | `GET /api/tasks`\|`/topics`\|`/wishlist`: Status 200, aber `Array.isArray(body)` ist `false` — Routen liefern ein Objekt-Wrapper, Smoke-Test erwartet das nackte Array | dieselbe „Antwortform"-Bugfamilie, API-Vertrag, nicht UI |
| `settings.spec.ts` | 63, 73, 81, 102, 149, 178, 188, 198, 219, 228, 237, 283 | Feld-Locator (`input[name="name"]` etc.) trifft nicht — verifiziert an `components/settings/profile-settings.tsx:342`: das `<input>` hat weder `name`-Attribut noch `placeholder`, nur ein `<label>` davor. Zwölf strukturell verwandte Fälle über alle sechs Settings-Sektionen | **pre-existing, `/settings/*` ist explizit außerhalb dieser Phase** (siehe „Do not do"); Code dort ist unverändert seit vor Task 1 (durchgängig `style={{…}}`-Literale, kein `Row`/`List`) |

Summe C: 1+1+1+1+3+12 = 19. A(22)+C(19) = 41.

### Empfehlung an die finale Review

- **Hartes Gate weiterhin: `design-rules.spec.ts` 50/50 und Ratsche ≤ 1938 —
  beide erfüllt.**
- A (22) sind bekannte, dokumentierte Ursachen (teils an mehr Fundorten als die
  Korrektur aufzählte) — kein neuer Befund, kein Merge-Blocker.
- C (19) sind real, aber **nicht durch diese Phase verursacht** und außerhalb des
  Scopes (`/settings/*`, `/api-keys`, `/achievements`-API, Landing-Copy, drei
  API-Smoke-Tests). Empfehlung: eigene Aufräum-Aufgabe, nicht Merge-Blocker für
  diesen PR — aber laut aufzeigen, weil zwölf davon (`settings.spec.ts`) eine ganze,
  bislang grüne Suite plötzlich rot zeigen und das beim nächsten CI-Lauf ohne diesen
  Kontext wie eine neue Regression aussieht.

---

## 4. Ratchet-Blindfleck — gemessen

`scripts/check-design-tokens.mjs`s `inline`-Regel ist wörtlich `/style=\{\{/g` und
erkennt nur Objekt-Literale. `style={objektName}` (benanntes Objekt oder
Funktionsaufruf, der ein Style-Objekt zurückgibt) ist unsichtbar.

```
$ grep -rEn 'style=\{[^{]' app components --include='*.tsx' --include='*.ts' \
    | grep -v '\.test\.' | wc -l
76
```

**76**, nicht die zuletzt genannten 83 — gemessen jetzt, nicht abgeschrieben; die Zahl
ist seit der letzten Zählung gefallen oder wurde mit einer anderen Methode gezählt,
beides plausibel, keine Behauptung über die Differenz. Größte Fundorte:
`components/settings/webhooks.tsx`, `components/settings/notification-channels.tsx`,
`components/tasks/task-form.tsx`, `components/topics/topic-form.tsx`,
`components/wishlist/wishlist-form.tsx` — durchweg Formulare mit lokalen
Style-Helferfunktionen (`inputStyle`, `labelStyle`, `chipStyle(...)`), nicht Teil
dieser Phase. Regex nicht angefasst (wie angewiesen); Zahl in CHANGELOG.md und
docs/design-system.md dokumentiert, keine Behauptung, die Ratsche fasse jeden
Inline-Style.

---

## 5. Geänderte Dateien

- `CHANGELOG.md` — Phase-1-Eintrag unter `### Changed` (Maß/Rand/Rhythmus, Liste/Zeile,
  Amber dokumentweit, `--danger` drei Rollen, Ratsche-Zahlen, Blindfleck), vier neue
  `### Fixed`-Einträge (Heatmap-Tooltips, Theme/Münzzähler Englisch, Wortumbruch-Korrektur,
  Recurrence-Label, Wash-Hartkante mit drei Zuständen).
- `docs/design-system.md` — vier neue Abschnitte (Maß/Rand/Rhythmus, Liste und Zeile,
  Farbe mit drei `--danger`-Rollen, Leere Zustände), Durchsetzungs-Abschnitt auf 1938
  aktualisiert plus Blindfleck-Absatz, Intro verlinkt jetzt auch die Rollout-Spec.
- `docs/superpowers/specs/2026-08-22-lichtkegel-rollout-design.md` §10 — Korrektur der
  Wortumbruch-Diagnose, Verweis auf `list.tsx` und `e2e/topics.spec.ts` statt
  abgeschriebener Messwerte.
- `app/globals.css` — Lichtkegel-Wash-Fix (drei Zustände, siehe §2), Kommentar korrigiert
  (behauptete vorher fälschlich, der Überhang sei „probiert und verworfen" worden,
  obwohl der Code ihn die ganze Zeit gesetzt hatte).
- `scripts/design-baseline.json` — unverändert (byte-identisch nach `--update`).
- `README.md` — **nicht geändert**. Die Statustabelle dort führt Produkt-Phasen
  (Auth, Tasks, Gamification, …), keine Seiten-je-Design-Phase; der Auftrag verlangt
  eine Änderung nur „falls sie Seiten je Phase führt" — tut sie nicht.

---

## 6. Selbstkritik

- Der erste Playwright-Vollauf war durch eigenen Traffic kontaminiert (46 statt 41
  Fehlschläge) — hätte vermieden werden können, wenn ich die Chrome-Review-Skripte
  erst NACH dem ersten Vollauf gestartet hätte statt parallel dazu. Korrigiert durch
  einen zweiten, sauberen Lauf; im Bericht als eigener Punkt benannt statt verschwiegen.
- Der Lichtkegel-Wash-Fix ging durch zwei falsche Zwischenzustände (Original-Fehler,
  dann mein eigener „width: 100%"-Fix, der es schlimmer machte), bevor der Endzustand
  per Pixel-Sampling verifiziert wurde. Beide Fehlschläge sind im CHANGELOG-Eintrag und
  hier offen benannt, nicht nur der finale Erfolg.
- Ich habe eine vom Auftrag als Tatsache übergebene Behauptung („sequenziell-Marker
  restauriert") geprüft und für falsch befunden, statt sie unverifiziert in die
  Dokumentation zu übernehmen — das ist im Sinne des Auftrags („Measure what you
  write"), aber es bedeutet, dass eine Prämisse dieser Aufgabe selbst nicht stimmte.
- Die 12 `settings.spec.ts`-Fehlschläge sind eine erhebliche, real existierende
  rote Fläche außerhalb des eigenen Scopes; ich habe sie benannt statt behoben (korrekt
  laut Auftrag), aber sie sollten nicht als „schon immer so" abgetan werden, ohne dass
  jemand explizit entscheidet, sie zu ignorieren.
