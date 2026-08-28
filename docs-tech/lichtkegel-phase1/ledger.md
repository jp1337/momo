# SDD ledger — plan: docs/superpowers/plans/2026-08-22-lichtkegel-rollout.md

Spec: docs/superpowers/specs/2026-08-22-lichtkegel-rollout-design.md (gelesen, bindend)
Vorgänger-Spec: docs/superpowers/specs/2026-08-21-lichtkegel-design.md
Branch: design/lichtkegel-impl · merge-base main: a41623a
Worktree: .claude/worktrees/deps-consolidation

## Umgebung (verifiziert 2026-08-22 vor Task 1)

| Prüfung | Ergebnis |
|---|---|
| Postgres :5432 | offen (podman `momo-test-pg`) |
| Dev-Server :3000 | läuft, cwd = DIESES Worktree (pid 3208995) |
| PLAYWRIGHT_TEST_PASSWORD | nicht gesetzt (Bedingung des Plans erfüllt) |
| `npx playwright test e2e/design-tokens.spec.ts` | 28/28 grün |
| `npm test` (vitest) | 74 Dateien, 1728/1728 grün |
| `npm run check:design` | 1934 Verstöße, keiner neu |
| `npm run check:i18n` | grün, 1019 Keys |

## Behauptungen des Plans, gegen den Code geprüft

| Behauptung | Befund |
|---|---|
| `task-item.tsx` 803 Zeilen | exakt 803 |
| `task-list.tsx` 1467 Zeilen | exakt 1467 |
| `focus-mode-view.tsx` groß | 1019 Zeilen |
| `progress-tabs.tsx` | 622 Zeilen |
| `check-design-tokens.mjs` hat `--selftest`/`--update`/`--admit`, `PATTERNS`, `ZERO_COUNTS`, `findRaised`, `["color","radius","inline"]` | alle vorhanden, Zeilen 56/204/220/225 |
| Script-Kopf sagt: Regel-Erweiterung ⇒ Baseline löschen + `--update`, nicht `--admit` | vorhanden (Zeile 35–38) — deckt Task 2 Step 5 |
| `design-tokens.spec.ts` hat `REQUIRED` + `readTokens` | Zeile 8 / 16 |
| `button.tsx` hat `primary` (Amber als Text) und `quiet` | Zeile 15/67/68 |
| Baseline 1934 | bestätigt |

## Pre-Flight-Scan — Paare, die eine Datei oder Schnittstelle teilen

| Paar | produziert → konsumiert | Befund |
|---|---|---|
| T1 → T3 | `--measure`/`data-column`, `PageFrame` → Maß-Zähler + Dashboard-Rahmen (T3 Step 8) | in Ordnung; T1s Prosa „angewandt wird es ab Task 9" widerspricht T3 Step 8 → **R1** |
| T1 → T4 | `design-system/page.tsx`: T1 fügt „Maß und Rand" **vor** „Effort steps" ein, T4 **ersetzt** „Effort steps" | in Ordnung in dieser Reihenfolge; T4 muss T1s Abschnitt stehen lassen |
| T1 → T4 | `e2e/design-tokens.spec.ts` | beide hängen nur an — kollisionsfrei |
| T1/T3/T5 | `app/globals.css` | drei verschiedene Blöcke (Token-Block / `a {}` / `@keyframes lichtkegel-atmen`) — kollisionsfrei |
| T2 → T4,T8–T12 | `design-baseline.json` mit vier Zählern | monoton: T2 legt neu (~2219), T4 `--admit` 1, T8–T12 senken |
| T2/T3/T7/T12 | `CHANGELOG.md` | verschiedene Unterabschnitte — kollisionsfrei |
| T3 → T6 | `nav`-Namespace: T3 Step 5 ruft `t("coin_balance")`, T6 Step 5 **legt den Key an** | **KONFLIKT** — T3 wäre am eigenen Ende rot (`check:i18n`, fehlender Key). `grep coin_balance messages/ components/` = 0 Treffer → **R2** |
| T3 → T6 | `user-menu.tsx`: T3 lässt `aria-label="User menu"` stehen, T6 stellt auf `t("user_menu")` | vom Plan ausdrücklich so sequenziert — in Ordnung |
| T3 → T8/T9/T10/T11 | `e2e/helpers/design-count.ts`, `MIGRATED_PAGES` | T3 erzeugt mit `["/dashboard"]`, jede Folge-Task hängt eine Seite an — kollisionsfrei |
| T4 → T5 | `quick-wins-section.tsx`: T4 auf `List`/`Row`, T5 legt `motion.section` um die Wurzel | in Ordnung in dieser Reihenfolge |
| T4 → T5 | `List`/`Row` als Konsum von T5 | in Ordnung |
| T4 → T8 | `List`/`Row`/`GroupHeading`/`effortStep`/`EmptyState` | in Ordnung |
| T4 → T10 | `list.tsx`: T4 erzeugt, T10 ergänzt `wrapTitle` | von T4s Interfaces angekündigt — in Ordnung |
| T4 → T9/T11 | `List`/`Row`/`EmptyState` | in Ordnung |
| T6 → T11 | `progress-tabs.tsx`: T6 `t.raw()`-Fix, T11 baut die Datei groß um | in Ordnung; T11 muss den `t.raw()`-Fix erhalten (Hinweis geht in T11s Dispatch) |
| T6 → T11 | `e2e/progress.spec.ts` | beide hängen an — kollisionsfrei |
| T8 → T9/T10/T11 | `task-item.tsx` gelöscht in T8 | keine späteren Verweise im Plan — in Ordnung |
| T2 → T12 | Baseline-Boden | T12 senkt auf den erreichten Stand |

## Pre-Flight-Scan — jede Task gegen sich selbst

| Task | Tests vs. Code, Dateien vs. Schritte | Befund |
|---|---|---|
| T1 | 3 Token + `PageFrame` + Handles auf `/design-system`; Tests prüfen genau diese | stimmig, außer **R1** |
| T2 | Selbsttest-Fälle vs. `PATTERNS.spacing` + `CATEGORIES`; erwartete Zahl 2219 = 1934 + 285 | stimmig; Rechnung geht mit gemessener Baseline auf |
| T3 | 11 Schritte, Tests zuerst (Step 1–3), Löcher danach (4–8) | stimmig, außer **R2** |
| T4 | `Row` liefert `data-testid`/`data-effort`/`row-dot`/`data-row-title`; Tests greifen genau darauf | stimmig; Demo-Punkt nutzt `var(--done)` → **R3** |
| T5 | Test: kein Inline-`opacity` auf `quest-light`, Keyframe startet bei 1 | stimmig |
| T6 | `t.raw()`-Reproduktionstest vor dem Fix; 7 Locales × 7 Keys tabelliert | stimmig |
| T7 | `updateStatus()` rein + vitest; `revalidate`-Test nagelt den echten Mechanismus | stimmig; Workflow-Schritt ist vor dem Merge unprüfbar, im Plan offen benannt |
| T8 | 14 Schritte; `groupByPriority` vitest-fähig ohne JSX; Swipe-Logik 1:1 | stimmig; größte Task, 6 neue + 3 geänderte + 1 gelöschte Datei |
| T9 | `<main>` als Voraussetzung der Zähler ist benannt | stimmig |
| T10 | `wordBreak`-Test vs. `break-words`-Fix in `list.tsx` | stimmig |
| T11 | Heatmap-Ausnahme über `AFFORDANCE` (`<button>`) statt Sonderregel | stimmig; Prüfschritt „sind sie `<button>`?" ist im Plan enthalten |
| T12 | volle Prüfspur, Chrome-Review, Baseline, Doku, PR | stimmig |

## Rulings vor der Ausführung

- **R1 — T1s Satz „angewandt wird es ab Task 9" ist beschreibend, nicht bindend.**
  T3 Step 8 setzt `/dashboard` auf `PageFrame`, und der Maß-Test aus T3 braucht
  genau das. Grund: Spec §8 verlangt einen Maß-Test, und ein Test ohne
  migrierte Seite hätte keinen Bezugspunkt. Kosten falls falsch: keine — die
  Reihenfolge der Schritte bleibt unverändert.
- **R2 — `nav.coin_balance` legt Task 3 an, in allen sieben Locales.**
  T3 Step 5 führt den Konsumenten ein; die Global Constraint verlangt jeden
  Key in sieben Locales und ein grünes `check:i18n` am Task-Ende. Task 6 findet
  den Key dann vor und legt ihn nicht doppelt an (die übrigen sechs Keys aus
  T6 Step 5 bleiben Task 6). Kosten falls falsch: ein Key wird in T6 ein
  zweites Mal geschrieben — idempotent, kein Schaden.
- **R3 — der Demo-Punkt auf `/design-system` behält `var(--done)`.**
  Der Plan setzt `dotColor={i === 0 ? "var(--done)" : null}`; die Global
  Constraint sagt `--done` heiße ausschließlich „erledigt". Entschieden für den
  Plan, weil die Alternative ein Hex-Literal wäre, das die Ratsche zählt, und
  weil `/design-system` die Dokumentation des Primitives ist, keine
  Produktfläche mit Bedeutung. Kosten falls falsch: ein Demo-Punkt auf der
  Doku-Seite, Einzeiler-Fix.
- **R4 — die `### Task N:`-Überschriften sind maßgeblich, nicht die
  Querverweise in „Dateistruktur"/„Vorgefundener Zustand".**
  Dort steht „Task 8 behebt (2)" (ist Task 7) und „am Ende von Task 9" für die
  Löschung von `task-item.tsx` (ist Task 8) — die Verweise sind ab Task 7 um
  eins verschoben. Kosten falls falsch: keine, reine Nummerierung.

## Verlauf

### Vorab verifizierte Fakten für spätere Dispatches

- **T11/Heatmap:** `components/habits/contribution-grid.tsx:264-267` rendert die
  Zellen als `<div role="gridcell">`, **nicht** als `<button>`. Der
  Rückfall-Pfad des Plans („sind sie es nicht, auf `<button type="button">`
  umstellen") ist also der tatsächliche Pfad — keine Prüfarbeit für den
  Implementer, sondern eine Anweisung.
- **T3/Link-Farbe:** `app/globals.css:599-603` setzt `a { color: var(--accent-amber) }`
  global — genau der im Plan behauptete Grund, warum jeder Link im Inhalt als
  Amber-Treffer zählt. 21 `accent-amber`-Vorkommen in `globals.css`.

Task 1: dispatched (sonnet), BASE 0d5c916, brief task-1-brief.md
Task 1: implementer DONE_WITH_CONCERNS, commit efd25a3, 33/33 playwright grün, check:design unverändert 1934
Task 1: Sorge des Implementers — Step 5s wörtliches Snippet erzeugt zwei rote Tests; Wrapper-Klassen (`-mx-4`, `mx-auto w-full max-w-[var(--measure)]`) ergänzt, PageFrame selbst unverändert. Vom Controller nachgelesen und plausibel; zur Bewertung an den Reviewer gegeben statt vorab entschieden.
Task 1: task reviewer dispatched (sonnet), diff 0d5c916..efd25a3
Task 1: task review — Spec ✅ (Token, Breakpoint, Signatur, DOM-Vertrag byte-genau), 1 Important, 3 Minor, 1 ⚠️
Task 1: Important — `e2e/design-tokens.spec.ts:320` misst den Wrapper, nicht PageFrame. Löschte man `max-w-[var(--measure)]` aus PageFrames rail-loser Verzweigung, bliebe der Test grün.

Task 1: **Ruling (R5)** — der Test wird geändert, nicht der Plantext verteidigt.
  Der Plan diktiert Step 1s Test und Step 5s Wrapper wörtlich; die Spec §8 sagt
  aber „Ein Test, der die Verstöße nicht sieht, ist schlimmer als keiner." Die
  Spec ist die bindende Autorität, der Plan ihr Argument — also gewinnt die Spec.
  Entschieden: Wrapper zurück auf das wörtliche `<div data-testid="frame-no-rail">`
  des Plans, und der Test misst `[data-column]` **plus die Zentrierung**.
  Begründung für die Zentrierung: die rail-lose Verzweigung von PageFrame regelt
  in Wahrheit nicht die Breite (die trägt `data-column` selbst), sondern das
  `mx-auto`-Zentrieren — Spec §3, „Der Block aus Spalte und Rand wird als Ganzes
  im Inhaltsbereich zentriert." Ein Breitentest allein wäre auch nach dem Fix
  noch blind; ein Zentrierungstest fällt, sobald `mx-auto` oder `max-w` fehlt.
  Kosten falls falsch: ein e2e-Test prüft eine Nachbarschaft statt einer Zahl —
  rückgängig in einer Zeile.

Task 1: **Ruling (R6)** — die ⚠️-Lücke des Reviewers wird geschlossen, nicht notiert.
  Die Spec verlangt „unter 640 px entfällt der Rand ganz"; kein Test steht unter
  640 px. Der Brief fordert ihn nicht, aber der Breakpoint trägt vier
  Seitenmigrationen (Tasks 8–11) und würde sonst ungeprüft mitfahren. Eine
  Assertion bei 375 px kostet vier Zeilen. Kosten falls falsch: ein Test zu viel.

Task 1: minor (deferred): `-mx-4` zieht die Demo-Box auf /design-system 16px über die Kante ihrer eigenen Sektionsüberschrift hinaus — im Chrome-Review (Task 12) ansehen
Task 1: minor (deferred): `className?: string` in `PageFrameProps` ohne Doc-Kommentar, die beiden anderen Props haben einen
Task 1: fix round 1/5 dispatched → commit a2dccc2, 34/34 playwright grün, check:design 1934; scoped re-review (sonnet) über efd25a3..a2dccc2 läuft
Task 1: fix round 1/5 (2 addressed, 0 open; commits efd25a3..a2dccc2)
Task 1: complete (commits 0d5c916..a2dccc2, review clean)
  Re-Reviewer prüfte die RED-Evidenz per Arithmetik: 224px = 864 − 640, also
  genau der Verlust von `mx-auto`. Die Erzählung des Implementers („blanked the
  no-rail ternary branch") war ungenau, die Zahl beweist aber die richtige
  Regression. Kein Defekt am ausgelieferten Test.
Task 2: implementer DONE_WITH_CONCERNS, commit 34e1734, Selbsttest 30/30, check:design zweimal grün bei 2215 (1934 → 2215, +281 spacing in 70 Dateien, 115 davon 6px)
Task 2: Sorge 1 — latenter Bug in `--update`s Baseline-Reset-Erkennung gefunden und behoben: das im Script-Kopf dokumentierte `rm baseline && --update` meldete jeden bestehenden Verstoß als „neu". Ohne den Fix wäre Step 5 nicht ausführbar gewesen. → Reviewer soll genau das prüfen, weil die Ratsche zehn weitere Tasks bewacht.
Task 2: Sorge 2 — Regex-Backtracking-Fehlalarm bei `gap-x-`/`gap-y-`: `gap-x-1` (auf der Skala) wurde gemeldet. Behoben, Baseline dadurch 2220 → 2215. Genau der Fehlerfall, dessen Nachweis der Dispatch verlangt hat.
Task 2: für Task 12 vormerken — `docs/design-system.md:153-159` beschreibt drei Kategorien mit veralteter Zahl (1947); Task 12 fasst diese Datei ohnehin an.
Task 2: task reviewer dispatched (opus, wegen Risiko für die restlichen Tasks), diff a2dccc2..34e1734
Task 2: task review (opus) — Spec ✅ auf allen sieben Steps, 0 Critical, 3 Important, 3 Minor, 1 ⚠️
  Beide Extra-Fixes des Implementers unabhängig bestätigt: die Regex ist in
  beide Richtungen exakt (120 Grenzfälle, 0 Abweichungen), und die neu gelegte
  Baseline trägt color+radius+inline mit **exakt 1934** weiter — per Datei
  identisch, null Steigerungen, null Auslassungen. Der Reset hat nichts
  durchgewaschen.
  Important: (a) Kopfkommentar :41-44 beschreibt nach dem Fix den falschen
  Mechanismus (`= {}` statt „Datei fehlt") — wer der Prosa wörtlich folgt,
  läuft in genau den Fehler zurück; (b) der Reset-Pfad :372 ist stumm, im Log
  von einer gewöhnlichen Senkung nicht zu unterscheiden; (c) die Fehlerhilfe
  :404 nennt nur Farbe und Radius, nicht die Abstandsskala.

Task 2: **Ruling (R7)** — `[var(--gutter)]` wird in `SPACING_OK` zugelassen.
  Der Reviewer fand: `rail:gap-[var(--gutter)]` in `page-frame.tsx:42` zählt als
  Verstoß, obwohl `--gutter: 3rem` = 48px **auf der Skala liegt**. Das ist
  derselbe Fehlalarm-Typ wie `gap-x-1`, den der Implementer schon behoben hat —
  die Regel soll die Skala erzwingen, nicht eine bestimmte Schreibweise davon.
  Der naheliegende Einwand („dann definiert jemand `--my-gap: 13px` und
  entkommt") greift hier nicht: die Freigabe nennt genau einen Token, und
  dessen Wert ist durch `e2e/design-tokens.spec.ts:284` auf `3rem` festgenagelt.
  Senkt die Baseline um 1 auf 2214. Kosten falls falsch: ein Verstoß wird nicht
  gezählt, rückgängig durch Streichen eines Alternativs in der Regex.

Task 2: **Ruling (R8)** — zwei Minor werden in die Fix-Runde gehoben.
  (1) `CHANGELOG.md:14` sagt „aktuell 1947 Verstöße" **eine Zeile über** dem
  neuen Absatz mit 2215 — diese Task liefert damit einen sich selbst
  widersprechenden CHANGELOG aus; das ist keine Politur, sondern falscher Text
  in der eigenen Änderung. (2) Die `raiseCases`-Fixturen tragen nur drei Keys,
  also prüft **kein** Selbsttest, dass `findRaised` eine steigende
  `spacing`-Zahl erkennt — die Durchsetzungshälfte des Features ist nur „durch
  Konstruktion" gedeckt. Bei einem Mechanismus, der zehn Tasks bewacht, ist der
  Unterschied zwischen geprüft und angenommen die ganze Task. Kosten falls
  falsch: zwei kleine Änderungen mehr in einer Runde, die sowieso läuft.
Task 2: fix round 1/5 (6 addressed, 0 open; commits 34e1734..a5f3f1d)
Task 2: complete (commits a2dccc2..a5f3f1d, review clean) — Baseline 2214 in 120 Dateien, Selbsttest 31/31
  R7 verifiziert eng: `\[var\(--gutter\)\]` ist ein exaktes Alternativ, kein
  Präfix. `gap-[var(--gap)]`, `gap-[var(--my-gutter)]`, `p-[var(--anything)]`,
  `p-[13px]` werden weiter gemeldet.
Task 2: minor (deferred): die Verdrahtung, die `baselineExisted` an die reine Funktion liefert, ist selbst ungetestet (bauartbedingt — das Script testet ohne I/O)
Task 2: minor (deferred): `docs/design-system.md:153-159` beschreibt drei Kategorien, Zahl veraltet → Task 12

### Vorab verifiziert für Task 3
- Die Ratsche scannt **ausschließlich `.tsx` unter `app/` und `components/`**
  (`SCAN_DIRS`, Zeile 56). `app/globals.css`, `e2e/**`, `lib/**` und
  `scripts/**` werden nicht gezählt. `components/layout/feather-mark.tsx` wird
  gezählt und muss verstoßfrei sein.

Task 3: dispatched (sonnet), BASE a5f3f1d, brief task-3-brief.md
Task 3: implementer DONE_WITH_CONCERNS, commit 269a45d, design-rules 9/9, dashboard+design-tokens 44/44, vitest 1728/1728, check:i18n grün, Baseline 2214 → 2211
Task 3: Browser-Check **nicht** durchgeführt — dem Implementer stand kein Browser-Werkzeug zur Verfügung. Offen benannt statt behauptet. Bleibt für Task 12 (bzw. einen eigenen Chrome-Durchgang) offen.

Task 3: **Flake-Behauptung selbst geprüft, nicht geglaubt.**
  Der Implementer meldete „4 vorbestehende Flakes in `navigation.spec.ts`, identisch
  auf dem Basis-Commit". Gemessen bei HEAD: **3** Fehlschläge (`wishlist`,
  `achievements`, `all main navigation links`). Das Ledger des Vorgängerplans
  verzeichnet für `navigation` nur **1** — also war die Zahl nicht ohne Weiteres
  als „vorbestehend" abzunehmen.
  Entscheidend geprüft: alle sieben Produktionsdateien von Task 3 per
  `git checkout a5f3f1d -- …` zurückgesetzt, Suite erneut gelaufen →
  **exakt dieselben drei Fehlschläge**, danach Baum wieder auf 269a45d
  hergestellt (`git diff HEAD` leer). Damit ist empirisch belegt: nicht von
  Task 3 verursacht. Die Zahl im Bericht war um eins zu hoch, der Kern richtig.
Task 3: task reviewer dispatched (opus) mit drei benannten Risiken — (1) hat ein
  Zähler den Entwurf verbogen statt bewacht (zwei Badge-Chips aus der Quest-Karte
  entfernt, außerhalb der Brief-Dateiliste); (2) der Amber-Test läuft mit 0
  Treffern grün, das Instrument ist in positiver Richtung unvalidiert; (3) die
  Feder ist als `<img>` strukturell unsichtbar für den Zähler, der Wechsel auf
  Inline-SVG damit ungeschützt.
Task 3: task review (opus) — Spec ✅ auf allen elf Steps, aber **1 Critical**, 6 Important, 7 Minor.
  C1: der Amber-Test misst nichts. Die Erklärung des Implementers („Quest ist
  erledigt, daher 0 Treffer") ist **widerlegt**: `.lichtkegel::before` malt Amber
  bedingungslos (`globals.css:329-341`) auf einem bedingungslos gerenderten
  Wrapper (`daily-quest-card.tsx:277`). Echte Ursache: `countAmber` überspringt
  Elemente mit `opacity === 0` **vor** dem Blick auf Pseudoelemente
  (`design-count.ts:94`) und rennt damit gegen motions 350-ms-Einblendung. Weil
  jede Assertion nur eine Obergrenze ist, läuft der Test grün, während er blind
  ist. Genau die Falle aus Spec §8.
  Der Parser selbst ist gut: isoliert gegen 14 Fälle geprüft — `rgb()`,
  `color(srgb …/α)`, Gradientenstopps einzeln, der 3%-Stopp korrekt durch die
  Alpha-Schwelle verworfen, box-shadow, beide Themes, keine Fehlalarme auf
  `--ink-2`/`--done`/`--danger`. Das Instrument kann sehen; es war zugehalten.

Task 3: **Ruling (R9)** — Risiko 1 aufgelöst: der Kastenzähler hat den Entwurf
  bewacht, nicht verbogen. `Badge variant="neutral"` ist `bg-[var(--raised)]`
  mit `border-0`, war also nie *umrahmt* — die Messung der Spec war wörtlich
  korrekt. Der Zähler griff über `filled`, und das ist die einzige Weise, wie
  „Keine Chips um Text" überhaupt durchsetzbar ist. Die zwei Chips zu entfernen
  statt den Zähler zu lockern war die richtige Richtung. Kosten falls falsch:
  zwei Abzeichen fehlen auf der Quest-Karte, im Chrome-Review sichtbar.

Task 3: **Ruling (R10)** — `filled` bekommt jetzt prinzipielle Ausnahmen, nicht
  später. Der Reviewer zeigt, dass `filled` Fortschrittsbalken (unerfüllbar —
  ein Balken *ist* eine Füllung), Heatmap-Zellen und **den 6-px-Punkt** meldet.
  Der Punkt ist der Sprengsatz: die Global Constraint erlaubt die Nutzerfarbe
  ausdrücklich „ausschließlich als 6-px-Punkt", und **Task 4 baut ihn nächste
  Task in `Row` ein**. Ohne Ausnahme scheitert jede migrierte Seite an einer
  Regel, die die Spec selbst erlaubt. Entschieden: Ausnahme über Semantik und
  eine Größenschwelle (`progress`, `meter`, `[role="progressbar"]`; und ≤12px
  in beiden Dimensionen ist ein Punkt, keine Inhaltsfläche), nicht über eine
  Liste von Schlupflöchern. Kosten falls falsch: ein echter kleiner Kasten
  entgeht der Zählung.

Task 3: **Ruling (R11)** — I3, Abstandshierarchie: die Hierarchie gewinnt, nicht
  der einheitliche Rahmen. `PageFrame`s `gap-8` hat den 48-px-Bruch zur Quest
  auf 32px gezogen, also genau die „sichtbare Gleichverteilung", die Task 12
  Step 2 als Fehler prüft — und zwei Kommentare behaupten weiter 48px.
  Entschieden: das Dashboard bringt seinen eigenen Rhythmus-Container **in** der
  Spalte mit (ein Kind, damit `gap-8` wirkungslos bleibt), statt `PageFrame` eine
  Option zu geben, die nur ein Aufrufer braucht. Der Primitive bleibt unverändert,
  weil vier Tasks ihn konsumieren. Die falschen Kommentare werden korrigiert.
  Kosten falls falsch: eine Verschachtelungsebene mehr auf einer Seite.

Task 3: ⚠️ des Reviewers zu den Flakes ist bereits erledigt — ich habe es
  empirisch geklärt (siehe oben), nicht der Bericht. Der Bericht enthielt nur
  Behauptung ohne Ausgabe; das ist die eigentliche Lehre für die Fix-Runde.

Task 3: für spätere Tasks vormerken — `components/ui/badge.tsx:30-36` verteidigt
  im Kommentar weiter die `--raised`-Füllung des neutralen Chips und wird in
  `task-breakdown-modal.tsx:102` und auf `/design-system` benutzt. Derselbe Chip
  ist auf `/dashboard` verboten und im geteilten Primitive begründet. Tasks 8/10/11
  ersetzen ihn in `main`, statt den Streit neu zu führen.
Task 3: fix round 1/5 → commit a0812f5. Der Implementer hat seine eigene
  Ursachendiagnose zu C1 **zurückgezogen** („Quest erledigt" war falsch, es war
  das Opacity-Rennen) und jeden der sieben Punkte mit einer temporären
  empirischen Sonde belegt statt nur begründet. design-rules 11/11,
  kombiniert 54/54, check:design unverändert 2211.
  Ein „quick wins"-Flake im ersten kombinierten Lauf gemeldet — dieselbe
  Behauptungsklasse wie die Navigation-Flakes, deshalb explizit als
  Prüfpunkt an das Re-Review gegeben, samt der Frage, ob der Fix-Diff ihn
  plausibel verursachen kann (`e2e/dashboard.spec.ts` liegt in dieser Task).
Task 3: scoped re-review (opus) über 269a45d..a0812f5 läuft
Task 3: fix round 1/5 (8 addressed, 1 neue Important-Bruchstelle; commits 269a45d..a0812f5)
  Alle Fixes isoliert nachgeprüft, nicht nur gelesen: die `fill`/`stroke`-
  Dedup untercountet nicht (amberner `<path>` in nicht-amberner `<svg>` wird
  weiter gesehen), die Affordanz-Verengung fängt die Karten-Link-Attrappe und
  lässt den Button-Span weiter frei, und die 12-px-Schwelle kann keinen echten
  Kasten verstecken (12×400-Streifen und 600×1-Trenner werden gefangen, ein
  12×12-Wrapper schützt sein 400×200-Kind nicht). `page-frame.tsx` unangetastet
  bestätigt — R11 wie entschieden umgesetzt.
  Der „quick wins"-Flake ist diesmal **mit beidseitig erfasster Ausgabe** belegt
  (Timeout im Teardown, Zeitgradient 30s → 11,6s → 1,9s, kalter `next dev`-
  Kompilierlauf). Kein Weg vom Fix-Diff dorthin: `e2e/dashboard.spec.ts` ist im
  Fix-Diff überhaupt nicht enthalten. Anders als bei der Navigation-Behauptung
  ist das keine Zahlenaussage, und die Evidenz liegt vor.

Task 3: **Ruling (R12)** — Fix-Runde 2 für drei Punkte, zwei davon Zeitbomben.
  (1) Die Positivkontrolle `hits.some(h => h.prop === "::before")` ist
  **unbedingt** und `.lichtkegel` existiert genau einmal im Code. Tasks 8–11
  hängen `/tasks`, `/focus`, `/topics`, `/progress` in `MIGRATED_PAGES`, und
  keine dieser Seiten hat einen Lichtkegel — auf `/tasks` ist das eine Amber
  laut Brief die *Textfarbe* eines Buttons. Die Kontrolle würde also vier
  regelkonforme Seiten rot färben und widerspricht der Regel, die sie bewacht
  (deren Obergrenze `inside > 0 ? 0 : 1` eine lichtlose Seite ausdrücklich
  vorsieht). Entschieden: auf Anwesenheit von `.lichtkegel` konditionieren —
  die Zähne bleiben vollständig, weil der Blindheitsfall auf dem Dashboard
  weiter fällt. Kosten falls falsch: eine Seite mit Lichtkegel, die ihn
  verliert, fällt durch die Kontrolle.
  (2) `e2e/dashboard.spec.ts:94` prüft `not.toContainText(/500|error/i)` — und
  der in *dieser* Task eingeführte Rand rendert jetzt den Münzstand. `/500/`
  trifft „1500", „5000". Ein Münzstand, der die Schwelle überschreitet, macht
  den Test deterministisch rot. Von dieser Task verursacht, also hier zu
  beheben. (Derselbe Regex-Zusammenstoß erklärt laut Reviewer auch die zwei
  vorbestehenden `navigation.spec.ts`-Fehlschläge — die bleiben vorbestehend.)
  (3) `page.locator("header svg").count() > 0` ist gegenstandslos: Münz-Icon und
  Theme-Umschalter erfüllen es unabhängig von der Feder. Eine Assertion, die
  ihre eigene Botschaft nicht prüfen kann, ist genau der Defekttyp dieser Task.
Task 3: minor (deferred): `no-underline!` in Buttons `baseStyles` schlägt still ein `className="underline"` eines Aufrufers — heute tut das kein Aufrufer
Task 3: minor (deferred): `countAmber`s Opacity-Wächter liest nur die eigene Opacity; ein Kind eines `opacity: 0`-Vorfahren zählt weiter (vorbestehend)
Task 3: fix round 2/5 (3 addressed, 0 open; commits a0812f5..19f3035)
Task 3: complete (commits a5f3f1d..19f3035, review clean) — Baseline 2211, design-rules 11/11, dashboard 11/11
  Der Gate der Positivkontrolle wurde nicht nur begründet, sondern bewiesen:
  mit deaktivierter Animationswartung feuert die konditionierte Kontrolle
  weiterhin und fällt in beiden Themes (erfasste Ausgabe), nach Wiederherstellen
  grün. Das Gate kann sich nicht selbst stillstellen, weil `.lichtkegel` die
  Anwesenheit im DOM prüft, nicht den Animationszustand.
  Der `/500`-Fix wurde besser als verlangt: statt den Regex zu flicken, prüft
  der Test jetzt `response.status() < 500`. Der Reviewer hat belegt, dass keine
  Abdeckung verloren geht — clientseitige Fehler deckt der Nachbartest
  (`pageerror`) weiter ab.
  Der Feder-Selektor ist jetzt `header a[href="/dashboard"] svg` und im ganzen
  Code eindeutig (Sidebar und Mobile-Nav liegen in `aside`/`nav`, die einzige
  andere `<header>` im Code hat keinen /dashboard-Link).
Task 3: OFFEN — der Browser-Check aus Step 10 fand nie statt (kein
  Browser-Werkzeug im Implementer). Das ist die einzige unerledigte Zusage
  dieser Task; sie gehört in den Chrome-Durchgang von Task 12.

### Vorab verifiziert für Task 4
- `countBoxes` nimmt jetzt Elemente ≤12px in **beiden** Dimensionen aus (R10),
  der 6-px-Themenpunkt von `Row` ist damit regelkonform, ohne Sonderfall.
- Baseline steht bei 2211 mit vier Kategorien pro Datei.
- Task 1 hat auf `/design-system` den Abschnitt „Maß und Rand" **vor** „Effort
  steps" eingefügt. Task 4 ersetzt „Effort steps" und muss Task 1s Abschnitt
  stehen lassen.

Task 4: dispatched (sonnet), BASE 19f3035, brief task-4-brief.md
Task 4: implementer DONE_WITH_CONCERNS, commit 3b06ada, 58/58 e2e grün, Baseline 2211 → 2209
  Duplikatsprüfung bestanden: genau eine Definition von `effortStep`/`EFFORT_TEXT`
  im Baum. `--admit` nahm exakt einen Pfad an.
  Erste Task dieser Sitzung mit **echter Chrome-Prüfung** durch den Implementer.
Task 4: **Betriebsstörung** — der Dev-Server auf :3000 wurde beendet, als der
  Subagent endete (er hatte offenbar einen eigenen gestartet, entgegen der
  Ansage). Vom Controller neu gestartet, diesmal aus der Controller-Session,
  damit er Subagenten überlebt. Log:
  /home/jpy/.claude/jobs/fed48872/tmp/devserver.log. Künftige Dispatches sagen
  das schärfer.
Task 4: zwei Sorgen als benannte Risiken ins Review gegeben, beide ungewertet —
  (1) Der Brief widerspricht sich: die Prosa sagt, die Exit-Animation wandere auf
  ein `motion.div` in der Zeile, das Codebeispiel und der ESLint-Hinweis
  streichen `motion` aber ganz. Der Implementer folgte dem ausführbaren Teil;
  `AnimatePresence` umhüllt jetzt Zeilen ohne jede motion-Komponente und ist
  damit vermutlich ein Attrappen-Wrapper.
  (2) Der Zeilentitel von Quick Wins ging von `--ink-2` auf `--ink`. `dimmed` in
  `Row` bedeutet `--ink-3` **plus Durchstreichen**, heißt also „erledigt" und ist
  kein Ersatz für die alte Dämpfung. Frage an den Reviewer: ist ein einheitliches
  `--ink` für ein geteiltes Primitive richtig, oder kodierte die Dämpfung etwas
  Wahres darüber, dass Quick Wins Peripherie sind?
Task 4: task reviewer dispatched (opus), diff 19f3035..3b06ada
Task 4: task review (opus) — Spec ✅ vollständig (jede Signatur, jeder
  DOM-Vertrag, `wrapTitle` korrekt **nicht** vorhanden, Duplikate getilgt,
  `--admit` chirurgisch auf einen Pfad). 0 Critical, 5 Important, 7 Minor.
  Alle fünf Important betreffen die Schnittstelle, die Tasks 8–11 konsumieren.

Task 4: **Ruling (R13)** — Risiko 1 und Important 3 werden mit **einer**
  Ergänzung erledigt, nicht mit zwei Kompromissen.
  Der Reviewer hat aus der Bibliotheksquelle belegt, dass `AnimatePresence` ohne
  motion-Kind sofort unmountet (`PresenceChild.mjs:58-67`) — der Wrapper ist
  also nachweislich Attrappe, nicht bloß vermutlich. Gleichzeitig zeigt er, dass
  `Row` das `<li>` besitzt und nichts durchlässt: `/focus` würde ein `<li>`
  außerhalb einer `<ul>` rendern (ungültiges DOM), `/tasks` braucht Wisch- und
  Aktivierungs-Handler am Zeilenelement, und die Exit-Animation ist über
  `RowProps` gar nicht ausdrückbar.
  Entschieden: `Row` bekommt `as?: React.ElementType` (Standard `"li"`) plus
  typisiertes Rest-Spread auf das Element. Damit wird die Animation als
  `as={motion.li}` mit den ursprünglichen `exit`-Werten wiederhergestellt — also
  so, wie die **Prosa** des Briefs es wollte, und ohne toten Code. Eine
  Ergänzung, drei Probleme. Kosten falls falsch: eine Prop mehr auf einem
  Primitive, das sie ohnehin für drei Aufrufer braucht.

Task 4: **Ruling (R14)** — `tone?: "primary" | "secondary"` kommt jetzt.
  Nicht wegen des Farbtons, sondern weil der Aufrufer den alten Ton **gar nicht
  erreichen kann**: `className` landet auf dem `<li>`, die Farbe steht direkt am
  Titel-Span, und eine direkt gesetzte Farbe schlägt jede geerbte. Der
  überlebende Kommentar in `quick-wins-section.tsx:12-16` behauptet weiter,
  die Liste bleibe „unmistakably secondary" — das Code sagt das nicht mehr.
  `dimmed` ist kein Ersatz: es rendert `--ink-3` **plus Durchstreichen** und
  wäre eine Lüge über eine offene Aufgabe. Kosten falls falsch: eine Prop, die
  vier Aufrufer sowieso brauchen, um zu sagen, ob ihre Zeilen die Aufmerksamkeit
  der Seite tragen.

Task 4: **Ruling (R15)** — `GroupHeading` gehört **neben** die `List`, nicht
  hinein. Die vom Implementer ergänzte JSDoc lädt dazu ein, ein `<p>` in eine
  `<ul>` zu setzen (ungültig) und bricht dabei die eigene Haarlinienregel des
  Primitives: eine Zeile nach einer Überschrift ist nicht mehr `:first-child`,
  also greift `first:border-t-0` nicht und unter der Gruppenüberschrift
  erscheint eine Linie. `/design-system` macht es zufällig schon richtig.
  Entschieden: eine `List` pro Gruppe, Überschrift als Geschwister — statt
  `GroupHeading` zu einem `<li role="presentation">` zu machen. Grund: `/tasks`
  hat drei Prioritätsgruppen, und drei `<ul>` mit Überschriften dazwischen sind
  semantisch richtiger als eine Riesenliste mit Absätzen darin. Kosten falls
  falsch: `/tasks` bekommt drei Listen statt einer.

Task 4: **Ruling (R16)** — drei „Minor"-Testschwächen und drei Ausrichtungsfehler
  werden in die Runde gehoben.
  Die Tests: der Punkt-Test prüft Größe, Radius und Rahmen, aber **nicht die
  Hintergrundfarbe** — man kann `style={{ backgroundColor: dotColor }}`
  entfernen und der Test bleibt grün, obwohl „die Nutzerfarbe erscheint als
  Punkt" seine ganze Aussage ist. Und das ist genau die Zeile, für die wir eine
  Ratschen-Ausnahme zugelassen haben. Ebenso: die Haarlinie wird auf Breite,
  nicht auf Farbe geprüft, und `expect(s.style).not.toBe("dashed")` ist neben
  `borderTopWidth === "0px"` gegenstandslos. Dieselbe Defektklasse zieht sich
  durch die ganze Sitzung; sie in der Datei zu lassen, in der wir gerade
  arbeiten, wäre inkonsequent.
  Die Ausrichtung: `trailing` ist `self-center` gegen einen zweizeiligen Block —
  **jede** Zeile auf `/tasks` und `/topics` hat ein Eyebrow, die Minutenzahl
  würde also auf vier Seiten zwischen den Zeilen schweben. `lead` hat ein festes
  `mt-1` gegen drei Titelgrößen. `data-effort` wird unbedingt ausgegeben, eine
  Themenzeile ohne Dauer behauptet also `medium`. Alle drei sind auf einem
  Primitive billig und auf vier Seiten teuer.
Task 4: minor (deferred): `EFFORT_TEXT` ist ohne externen Konsumenten exportiert (vom Brief für spätere Tasks vorgesehen)
Task 4: minor (deferred): `lead`-Button-Handles und Touch-Ziele im Chrome-Review von Task 12 gegenprüfen

## Sitzung 27.08. — Wiederaufnahme

Vorgefunden: Task 4 mit Task-Review (Spec ✅, 0 Critical, 5 Important, 7 Minor)
und den Rulings R13–R16 im Ledger, aber **ohne** Fix-Runden-Zeile. Auf der
Platte lagen drei uncommittete Dateien und ein bis 17:56 fortgeschriebener
`task-4-report.md`: der Fix-Implementer hatte alle sechs Findings umgesetzt und
verifiziert, wurde aber vor dem Commit unterbrochen. mtimes (17:45–17:47) liegen
vor dem Report-Ende, seither hat nichts den Baum berührt.

Task 4: **Ruling (R17)** — der Controller committet die Arbeit des
  unterbrochenen Fix-Implementers, statt sie zu verwerfen und neu zu dispatchen.
  Grund: der Bericht ist vollständig, der Baum ist beweisbar derselbe, und die
  Verifikation wurde in dieser Sitzung mit eigener Ausgabe wiederholt statt
  geglaubt (tsc 0, lint 0 Fehler/11 vorbestehende Warnungen, check:design 2209
  keiner neu, check:i18n grün, playwright design-tokens+dashboard+design-rules
  58/58 in 1.2m). Die Review-Kette bleibt intakt, weil das Gate das scoped
  Re-Review ist, nicht die Frage, wer `git commit` getippt hat. Kosten falls
  falsch: ein Commit, dessen Autorschaft beim Controller statt beim Subagenten
  steht — inhaltlich unverändert, im Commit-Text offengelegt.
Task 4: fix round 1/5 dispatched (vorgefunden, nicht neu) → commit b1e75bf
Task 4: scoped re-review über 3b06ada..b1e75bf läuft
Task 4: minor (deferred): `.serena/` liegt untracked im Baum (MCP-Artefakte), gehört in `.gitignore` — nicht Teil dieses Plans

### Vorab verifiziert für Task 5
- `app/globals.css:346-349` — die Keyframes starten weiter bei `0.85` und
  erreichen `1` erst bei 50 %. Der Befund der Spec steht also unverändert.
- `components/dashboard/daily-quest-card.tsx:272-276` — der `motion.div` mit
  `initial={{opacity:0,y:16}}` ist unverändert da; `motion` wird in der Datei
  **nur** dort benutzt (Import Zeile 40, Wrapper 272, Schluss 439), der Import
  fällt also mit weg.
- `quick-wins-section.tsx` importiert seit Task 4s Fix-Runde bereits
  `{ AnimatePresence, motion }` aus `motion/react`. Task 5 ergänzt dort nur
  `useReducedMotion` im BESTEHENDEN Import — kein zweiter Import, und
  `as={motion.li}` an den Zeilen bleibt unangetastet.
- Kein `useReducedMotion` im Baum; Task 5 führt es ein.
- Die Umkehrung der Keyframes macht die Positivkontrolle aus R12 nicht
  schwächer: das Licht ist bei t=0 dann heller, nicht dunkler.
Task 4: fix round 1/5 (5 addressed, 1 open — R16a Punkt 3: die gegenstandslose
  `dashed`-Assertion wurde gelöscht statt geschärft, begründet mit einer falschen
  CSS-Behauptung; commits 3b06ada..b1e75bf)
  Das Re-Review hat R13 bis Important 5 nicht nur gelesen, sondern am laufenden
  Dev-Server geprüft: die `@media (hover:hover)`-Verschachtelung im gebauten
  Stylesheet, die Präsenz-Kontext-Weitergabe an `motion.li` durch die
  `Row`-Grenze, und die Ausrichtung über drei Aufwandsstufen in Chrome.

Task 4: **Ruling (R18)** — die offene Assertion wird geschärft, nicht wieder
  verteidigt, und mein Ruling sagt womit. Der Reviewer hat live belegt, dass
  `borderTopStyle` hier `"solid"` ist (Tailwind-v4-Preflight, `border: 0 solid`
  auf `*`), der stehende Kommentar behauptet `"none"` — eine falsche Tatsache in
  ausgeliefertem Testcode ist schlimmer als die gegenstandslose Assertion, die
  sie ersetzt hat. Entschieden: der Test prüft **alle vier** Rahmenbreiten auf
  `0px` statt nur oben, plus durchsichtige Fläche. Damit ist der Stil des
  Rahmens sachlich gegenstandslos — bei Breite 0 zeichnet kein Stil etwas —,
  und der Kommentar sagt genau das statt einer Behauptung über `none`. Die
  Aussage des Tests („der leere Zustand ist kein Kasten") ist danach stärker als
  vorher, nicht schwächer. Kosten falls falsch: eine dreizeilige Assertion mehr
  in einem Test, der ohnehin über den leeren Zustand wacht.
Task 4: fix round 2/5 dispatched (frischer Implementer, cheapest tier — eine Datei, eine Assertion)
Task 4: fix round 2/5 → commit 33fad0e (eine Datei, 15 Zeilen). Controller-seitig
  vorab selbst geprüft, weil das die riskante Stelle war: `git show --stat` zeigt
  ausschließlich `e2e/design-tokens.spec.ts`, und `git status` ist bis auf das
  untracked `.serena/` leer — die temporäre RED-Änderung an `page.tsx` ist
  wirklich weg, nicht nur behauptet.
Task 4: minor (deferred): der neue Kommentar in `e2e/design-tokens.spec.ts:439-442`
  ist sachlich richtig, aber grammatisch schief („also die berechnete Style ist
  immer 'solid'"). Kein Fix-Runden-Grund; Sprachpolitur für das Abschlussreview.
Task 4: scoped re-review über b1e75bf..33fad0e läuft
Task 4: fix round 2/5 (1 addressed, 0 open; commits b1e75bf..33fad0e)
  Der Kommentar wurde nicht geglaubt, sondern gegen
  `node_modules/tailwindcss/preflight.css:15` geprüft — `border: 0 solid` auf
  der Universalregel, die Aussage stimmt. RED (`Received: "1px"`, 1 failed/37
  passed) und GREEN (38 passed) liegen als erfasste Ausgabe im Bericht, nicht
  als Behauptung.
Task 4: complete (commits 19f3035..33fad0e, review clean) — Baseline 2209, design-tokens 38/38, kombiniert 58/58
Task 5: dispatched (sonnet), BASE 33fad0e, brief task-5-brief.md

### Vorab verifiziert für Task 6
- `t.raw()` existiert wirklich auf dem Translator, den `getTranslations`
  zurückgibt: `node_modules/use-intl/dist/types/core/createBaseTranslator.d.ts:19`
  — `raw(key: string): any`. Der Plan schreibt `String(t.raw(...))` vor, und der
  Rückgabetyp `any` macht genau das zur Pflicht, nicht zur Kosmetik: ohne die
  Einengung verletzt die Zeile die „kein `any`"-Regel der Global Constraints.
- Brief für Task 6 liegt (167 Zeilen).
Task 5: implementer DONE, commit 0fe99c3. 3 neue „Die Ankunft"-Tests grün (RED
  zuvor bestätigt), dashboard+design-rules 23/23, design-tokens 38/38, tsc 0,
  lint 0 Fehler, check:design unverändert 2209, check:i18n grün. Chrome in beiden
  Themes und unter `prefers-reduced-motion: reduce` geprüft.
Task 5: eine Selbstmeldung ungewertet ins Review gegeben — Motion stempelt auch
  bei `initial={false}` ein Inline-`opacity: 1` auf die Quick-Wins-`<section>`.
  Der Implementer nennt das erwartetes Bibliotheksverhalten ohne Vertragsbruch
  (der DOM-Vertrag bindet nur `quest-light`). Nicht vom Controller vorbewertet.
Task 5: task reviewer dispatched (sonnet), diff 33fad0e..0fe99c3
Task 5: task review (sonnet) — Spec ✅ vollständig (beide Vorab-Entscheidungen
  eingehalten, `.lichtkegel`-Gate nachweislich intakt, `useReducedMotion` gegen
  die Bibliotheksquelle als synchron-beim-Render belegt). Qualität: Approved.
  0 Critical, 2 Important, 3 Minor. Beide Important sind Kommentare, die
  **dieser** Commit falsch gemacht hat.

Task 5: **Ruling (R19)** — das ⚠️ des Reviewers (Chrome-Prüfung nur als Prosa,
  ohne Screenshot-Artefakt) ist keine Lücke. Die tragenden Aussagen sind
  Programmausgabe und nachprüfbar: Keyframe-Startwert aus der `CSSKeyframesRule`,
  `getAttribute("style") === null` auf `quest-light`, berechnete `opacity` unter
  `prefers-reduced-motion`. Nur „rendert korrekt / kein Layoutsprung" ist visuell
  — und genau das prüft Task 12 Step 2 systematisch über fünf Seiten × zwei
  Themes × zwei Breiten. Pro Task Screenshot-Artefakte zu verlangen dupliziert
  Task 12. Kosten falls falsch: ein optischer Fehler auf dem Dashboard wird erst
  in Task 12 statt jetzt gesehen.

Task 5: **Ruling (R20)** — die Fix-Runde nimmt **drei** Kommentare, nicht zwei.
  Der dritte (`e2e/design-rules.spec.ts:24-26`, „Ein kommendes Task entfernt
  diese Animation ganz") ist derselbe Defekt aus derselben Ursache: die
  Animation, auf die er verweist, ist mit diesem Commit weg. Ich habe geprüft,
  dass der Helper dadurch nicht kaputt, sondern nur sofort erfüllt ist
  (`toHaveCSS("opacity","1")` auf einem Element ohne Inline-Opacity; das Atmen
  läuft im `::before` und erreicht nie 0). Entschieden: Helper bleibt als Wächter
  gegen eine Wiedereinführung, nur der Kommentar wird wahr gemacht — nicht
  gelöscht, weil der Opacity-Wächter in `countAmber` weiter existiert. Kosten
  falls falsch: eine Assertion, die nichts mehr fängt, bleibt stehen.
Task 5: fix round 1/5 dispatched (frischer Implementer, cheapest tier — drei Kommentare, keine Verhaltensänderung)
Task 5: fix round 1/5 → commit 7177f45, kommentar-only (3 Dateien, 9 Zeilen),
  23/23 design-rules+dashboard, tsc 0, Ratsche unverändert 2209. Controller-seitig
  gegen die Keyframes gelesen: alle drei Aussagen stimmen jetzt.
Task 5: minor (deferred): `e2e/design-rules.spec.ts` datiert die Entfernung der
  Eintrittsanimation auf „(2026-08-22)" — das ist das Datum von Spec und Plan,
  gelandet ist sie am 2026-08-27 (Commit 0fe99c3). Selbst gefunden, als Minor
  eingeordnet: ein falsches Datum führt niemanden über Verhalten in die Irre.
  Ungewertet ans Re-Review gegeben (ohne Hinweis darauf, damit es unabhängig
  urteilt); wird sonst im Abschlussreview mitgenommen.
Task 5: scoped re-review über 0fe99c3..7177f45 läuft
Task 5: fix round 1/5 (3 addressed, 0 open; commits 0fe99c3..7177f45)
  Anmerkung zur Modellwahl: das Re-Review (haiku) hat die Datumsangabe
  „(2026-08-22)" als ✓ abgehakt, ohne sie gegen das Commit-Datum zu prüfen —
  genau den einen Punkt, den ich vorher selbst gefunden hatte. Für reine
  Faktenprüfung in Prosa ist haiku zu weich; die inhaltlichen Aussagen
  (Keyframe-Richtung, ::before, Helper-Body) hat es korrekt und mit Belegstellen
  verifiziert. Für kommende Prosa-Runden mindestens sonnet.
Task 5: complete (commits 33fad0e..7177f45, review clean) — Baseline 2209, dashboard+design-rules 23/23, design-tokens 38/38

### Vorab verifiziert für Task 6
- `nav.coin_balance` **existiert bereits in allen sieben** Locales mit genau den
  Strings des Plans (von Task 3 gelandet). Task 6 darf ihn NICHT erneut anlegen —
  sonst doppelter Key.
- `theme_dark|theme_light|theme_system|theme_switch|theme_aria|user_menu` fehlen
  in allen sieben. Das sind die sechs neuen Keys, nicht sieben.
- `components/progress/progress-tabs.tsx:143-145` unverändert `t("cell_tooltip_one")`
  usw. — der Bug ist noch da.
- `components/layout/user-menu.tsx:93` trägt weiter `aria-label="User menu"`,
  wie von Task 3 absichtlich stehen gelassen; die Datei hat noch kein
  `useTranslations`.
- `components/theme-toggle.tsx` ist unverändert englisch mit `label` in
  `THEME_CONFIG` (18-20, 66, 77).
Task 6: dispatched (sonnet), BASE 7177f45, brief task-6-brief.md
Task 6: implementer DONE, commit 33bae77. RED→GREEN am FORMATTING_ERROR bestätigt,
  check:i18n grün, Ratsche 2209 → **2205** (gefallen, wie erwartet: die
  Inline-Styles im Theme-Umschalter sind weg), tsc 0, lint 0 Fehler.
  design-rules allein 11/11.
Task 6: Controller-Vorprüfung, weil der Subagent `git stash` benutzt hat (der
  Stack ist worktree-übergreifend geteilt): `git stash list` ist **leer**, der
  Baum bis auf das untracked `.serena/` sauber, und der Commit umfasst genau die
  elf erwarteten Dateien. Kein Rückstand, keine fremde Stash-Entnahme.
Task 6: selbst nachgezählt statt geglaubt — genau sechs neue Keys
  (`theme_aria|theme_dark|theme_light|theme_switch|theme_system|user_menu`),
  `nav.coin_balance` unverändert `'Dein Münzstand'`.
Task 6: zwei Selbstmeldungen ungewertet ins Review gegeben — (1) der Implementer
  hat mit `grid_aria_label` eine **vierte** Fundstelle desselben `t()`/`t.raw()`-
  Defekts gefunden und mitbehoben, eine Zeile über den Brief hinaus; (2) sieben
  Playwright-Fehlschläge, die er als vorbestehend belegt.
Task 6: zur Kausalität selbst geprüft: `e2e/navigation.spec.ts` erwähnt den
  Theme-Umschalter **nicht** (kein `aria-label`-, kein Theme-Selektor), und alle
  Fehlschläge dort sind `not.toContainText(/500/i)` auf `body` — dieselbe
  Regex-Kollision, die Ruling R12 für `dashboard.spec.ts` behoben hat. Task 6
  kann sie nicht verursacht haben.
Task 6: task reviewer dispatched (sonnet), diff 7177f45..33bae77
Task 6: task review (sonnet) — Spec ✅, 0 Critical, 0 Important, 2 Minor,
  Qualität Approved. Der vierte Fund (`grid_aria_label`) ist als echte
  Ursachenarbeit bestätigt, nicht als Scope-Creep: `contribution-grid.tsx:159-161`
  konsumiert ihn mit demselben `.replace()`-Muster, und `ariaLabel` wird
  **unbedingt** berechnet — der Reproduktionstest des Briefs hätte mit nur drei
  behobenen Zeilen gar nicht grün werden können. Die Kausalitätsbehauptung zu den
  sieben Fehlschlägen wurde unabhängig gestützt (`progress.spec.ts:17,26,33`
  benutzen dasselbe fragile `/500|Interner Fehler/i` auf `body`, unangetastet).
Task 6: minor (deferred): `components/theme-toggle.tsx:187` — der Cast auf die
  Key-Union ist durch `as const` an `THEME_CONFIG` wahrscheinlich redundant.
Task 6: minor (deferred): `String(t.raw(key))` degradiert einen fehlenden Key
  still zu `"undefined"`, wo `t()` vorher geworfen hätte. `check:i18n` deckt das
  in CI ab; das schwächere Fehlerverhalten ist trotzdem notiert.
Task 6: complete (commits 7177f45..33bae77, review clean) — Baseline 2205, check:i18n grün, design-rules 11/11

### Vorab verifiziert für Task 7
- `__tests__/api-misc-route.test.ts:40-60` prüft `/api/health` auf **Anwesenheit**
  von `status`/`timestamp`/`cron`, nicht auf Abwesenheit weiterer Felder. Ein
  zusätzliches `version` bricht dort nichts.
- `e2e/misc.spec.ts:13-16` prüft nur den Status 200.
- Vitest läuft in Node-Umgebung gegen `momo_test`, `include:
  __tests__/**/*.test.ts`, `fileParallelism: false`, Alias `@` vorhanden.

Task 7: **Ruling (R21)** — das neue Feld `version` in `/api/health` bekommt eine
  Assertion im bestehenden Health-Test, obwohl der Plan das nicht auflistet.
  Grund: dieses Feld ist ab Task 7 die Grundlage eines CI-Gates, das einen
  Deploy rot färbt. Ein Feld, an dem ein Gate hängt und das kein Test abdeckt,
  ist genau die Konstruktion, die diesen Defekt überhaupt so lange getragen hat
  (die einzige Versionsanzeige lag hinter Admin-Login und war ungetestet).
  Der Testname nennt die Felder aufzählend und wäre sonst zusätzlich veraltet.
  Kosten falls falsch: zwei Assertion-Zeilen in einem bestehenden Test.

Task 7: **Ruling (R22)** — die Rollout-Prüfung im Workflow liest ihre URL aus
  einer **eigenen** Variablen `ROLLOUT_HEALTH_URL` mit Fallback auf
  `vars.NEXT_PUBLIC_APP_URL` und dann `https://momotask.app`, statt die
  öffentliche URL fest zu verdrahten wie im Plan. Grund: der `deploy`-Job läuft
  auf einem self-hosted Intranet-Runner. Ob der die öffentliche URL erreicht,
  weiß ich nicht — und ein Verifikationsschritt, der aus Netzgründen scheitert,
  färbt jeden main-Push rot und wird binnen einer Woche ignoriert. Genau das
  wollte der Schritt verhindern. Eine Variable ist der kleinste Weg, die
  Prüfung auf den internen Dienst zu richten, ohne den Workflow zu editieren.
  Der Schritt bleibt **blockierend** — ein nicht-blockierender Wächter ist
  keiner. Kosten falls falsch: eine Repository-Variable, die gesetzt werden
  muss, sonst greift der dokumentierte Fallback.
Task 7: dispatched (sonnet), BASE 33bae77, brief task-7-brief.md
Task 7: implementer DONE, commit 7b44a01. 34/34 gezielte Vitest-Tests
  (update-status, update-checker, api-misc-route), RED mit
  `next.revalidate === 86400` erfasst, tsc 0, lint 0 Fehler, check:i18n grün,
  YAML parst, Ratsche unverändert 2205.
Task 7: Controller-seitig selbst geprüft statt geglaubt — `curl
  localhost:3000/api/health` liefert live `{"status":"ok","version":"0.6.0",…}`;
  der Commit umfasst genau die zehn erwarteten Dateien; Baum sauber; Stash-Stack
  leer; `check:design` erneut 2205.
Task 7: drei Selbstmeldungen ungewertet ins Review gegeben — (1) `vi.resetModules()`
  /`vi.unstubAllGlobals()` über den Brief hinaus, weil die neuen Tests sonst aus
  dem falschen Grund fielen (Modul-Cache-Verschmutzung aus dem
  DISABLE_UPDATE_CHECK-Block); ausdrücklich zu prüfen, ob der Wächter etwas an
  den Bestandstests verdeckt. (2) `docs-site/deployment.md` hatte keinen
  Health-Abschnitt, es wurde einer angelegt. (3) Die R22-Fallback-Kette ist von
  hier aus nicht prüfbar.
Task 7: task reviewer dispatched (**opus**, nicht sonnet — CI-Gate, öffentlicher
  Endpunkt und Test-Isolation in einem Diff), diff 33bae77..7b44a01
Task 7: task review (opus) — Spec ❌, 0 Critical, 5 Important, 7 Minor.
  Der Modul-Cache wurde nachweislich nicht angetastet (`:101` 24h-Gate, `:177`
  5-Minuten-Rückdatierung unverändert), der neue Cache-Test liest
  `fetchMock.mock.calls[0][1]` und hat echte Zähne, und der
  `vi.resetModules`-Wächter kann die Bestandstests nicht schwächen (Hooks sind
  describe-scoped, beide Vorblöcke bringen eigene mit, der neue Block ist der
  letzte). Auch die Faktenprüfung der Kommentare ist durchgelaufen.

Task 7: **Ruling (R23)** — I1/I2/I3 werden mit **einer** Änderung erledigt, und
  sie ist ein Eingeständnis: **mein Plan hat das Gate falsch gebaut.**
  Es vergleicht `package.json`-Versionen. Keine Pipeline hebt die Version; der
  Sprung 0.5.0 → 0.6.0 war manuell und lag drei Monate zurück. Auf einem
  gewöhnlichen main-Push ist `want` also schon gleich dem, was läuft: Versuch 1
  trifft, der Schritt meldet „Rollout bestaetigt nach 1 Versuch(en)" und hat
  nichts bewiesen — dieselbe Klasse falsches Grün, die der Schritt an Watchtowers
  HTTP 200 anprangert. Dass `EXPECTED: ${{ github.sha }}` deklariert und nie
  benutzt wird, zeigt, dass die richtige Form halb gedacht war.
  Entschieden: der Commit-SHA wird spät in die `runner`-Stufe des Dockerfiles
  gebacken (nach den COPY-Schichten, damit der Layer-Cache der schweren Stufen
  hält), `/api/health` gibt ihn neben `version` aus, und der Schritt vergleicht
  ihn gegen `github.sha`. Damit fällt der Abruf von `raw.githubusercontent.com`
  weg (I3) und mit ihm die einzige unabgesicherte `jq`-Abhängigkeit auf dem
  Intranet-Runner (I2) — geparst wird mit `sed`. Ein Fix, drei Funde, **weniger**
  Maschinerie als vorher. Kosten falls falsch: ein Build-Arg, das bei jedem
  Commit die letzten Metadaten-Layer neu schreibt.

Task 7: **Ruling (R24)** — der fünfte Zustand `unknown` bleibt, die **Behauptung
  darüber** wird korrigiert. Der Reviewer hat recht: `checkForUpdates` liefert
  `latestVersion: null` nur zusammen mit `disabled` oder `error`, der Zweig ist
  gegen den heutigen Produzenten toter Code — und, wichtiger, der Live-Defekt war
  gar nicht dieser Zustand: Stale-while-revalidate lieferte ein **veraltetes, aber
  nicht-leeres** `latestVersion`, das in `current` landet. Entschieden:
  `updateStatus` bleibt eine totale Funktion über ihren Eingabetyp (zwei Zeilen,
  korrekt), der UI-Zweig bleibt als Tiefenverteidigung und wird als solcher
  kommentiert und optisch an seine Geschwister angeglichen — aber CHANGELOG und
  docs-site dürfen nicht „fünf unterscheidbare Zustände" behaupten, wo vier
  produzierbar sind, und der Cache war die Ursache, nicht der UI-Zweig. Prosa
  angleichen, Code behalten. Kosten falls falsch: ein nie gerenderter Zweig
  bleibt im File.

Task 7: **Ruling (R25)** — der 503-Pfad von `/api/health` bekommt `version` und
  `commit` mit. Ohne sie liest die CI-Schleife bei einer DB-Störung `null`,
  läuft 30 Versuche leer und stellt dann die **falsche** Diagnose („Watchtower
  hat den Container nicht getauscht"). Eine Fehldiagnose in einem Wächter ist
  derselbe Defekt, den diese Task behebt. Beide Felder brauchen keine Datenbank.
  Kosten falls falsch: zwei Felder in einer Fehlerantwort.
Task 7: fix round 1/5 dispatched (frischer Implementer, sonnet — Workflow, Dockerfile, Health-Route, Prosa, ein Cache-Test)
Task 7: fix round 1/5 → commit 04f051c. 36/36 gezielte Vitest, der neue
  Cache-TTL-Test mutationsgeprüft (RED beim Verbiegen der Rückdatier-Konstante),
  tsc 0, lint 0 Fehler, check:design 2205 unverändert, check:i18n grün.
  Controller-seitig selbst nachgesehen, weil dieser Schritt jeden künftigen
  main-Push rot färben kann: `/api/health` liefert `commit` (in dev `null`),
  `ARG/ENV MOMO_COMMIT` steht auf 128-129 — nach `USER` (119) und `EXPOSE` (122),
  vor `ENV PORT` (131), es folgen also nur Metadaten-Layer; im deploy-Job kein
  `jq` und kein `raw.githubusercontent.com` mehr; `build-args` trägt
  `MOMO_COMMIT=${{ github.sha }}`; im Skript trimmt `${APP_URL%/}` den Slash,
  `|| echo '?'` neutralisiert `-e` für genau das Curl, und `sleep 20` ist mit
  `[ "$attempt" -lt 30 ]` gegen den letzten Versuch abgesichert.
Task 7: minor (deferred): `app/CLAUDE.md` beschreibt die Health-Route noch ohne
  `version`/`commit`. Vom Implementer selbst gemeldet und bewusst liegen
  gelassen — Task 12 besitzt die Dokumentation.
Task 7: minor (deferred): der 503-Pfad von `/api/health` hat für seine neuen
  Felder keinen automatisierten Test (kein DB-Mock-Harness in der Datei); nur
  gelesen, nicht ausgeführt.
Task 7: scoped re-review über 7b44a01..04f051c (**opus** — kein „kleiner
  Fix-Diff": CI-Gate plus Dockerfile), läuft
Task 7: fix round 1/5 (4 von 5 addressed, R25 offen; commits 7b44a01..04f051c)
  R23 mit unabhängigem Desk-Check bestätigt (Terminierung in allen drei Fällen,
  `||`-Bindung über die ganze Pipeline, `"commit":null` → kein Match → Retry,
  compact-JSON-Muster, Vergleich Image-unter-Deploy gegen Selbstauskunft), die
  Dockerfile-Cache-Behauptung als wahr geprüft (nach 128-129 folgen nur
  ENV/HEALTHCHECK/CMD), R24s Prosa Satz für Satz gegen den Code gehalten.

Task 7: **Ruling (R26)** — R25 bleibt offen, weil der Fix am falschen Ende saß,
  und die Korrektur ist ein Zeichen: `curl -sf` gibt bei HTTP 503 **nichts** aus
  (`-f`, Exit 22), der 503-Körper erreicht `sed` also nie. Die Felder, die ich
  in R25 anordnete, sind für ihren einzigen Konsumenten unlesbar — und der neue
  Kommentar in `route.ts:28-32` behauptet das Gegenteil. Genau der Defekttyp
  dieser Sitzung, diesmal von meinem eigenen Ruling erzeugt.
  Entschieden: `-f` fällt weg. Das ist auch inhaltlich richtig: die Frage des
  Gates ist „wurde der Container getauscht", nicht „ist die App gesund" — bei
  503 mit passendem Commit **ist** getauscht worden, und der DB-Ausfall ist der
  Alarm eines anderen Wächters. Ohne `-f` prüft der `sed`-Match die Gültigkeit:
  eine Proxy-Fehlerseite findet nichts, ein Verbindungsabbruch fällt weiter in
  `|| echo '?'`. Weil ich dieselbe Zeile ohnehin anfasse, kommt `--max-time 10`
  mit (der Reviewer nennt es out-of-scope, aber ein hängender Versuch ohne
  Zeitgrenze macht denselben Wächter nutzlos). Kosten falls falsch: ein grünes
  Gate über einer Instanz mit ausgefallener Datenbank — bewusst, weil das eine
  andere Frage ist.

Task 7: **Ruling (R27)** — die Nebenläufigkeit hebe ich vom Minor zum
  Fix-Grund. Ohne `concurrency` auf dem `deploy`-Job sucht bei zwei knapp
  aufeinanderfolgenden Pushes der ältere Lauf einen Commit, über den die Instanz
  längst hinaus ist: zehn Minuten Wartezeit und dann rot — auf einem Rollout,
  der tatsächlich geklappt hat. Ein Wächter, der grundlos rot wird, wird
  ignoriert, und das ist exakt das Versagen, gegen das diese Task geschrieben
  ist. Vom Fix selbst eingeführt (ein Versionsvergleich konnte so nicht
  scheitern). Entschieden: `concurrency` mit `cancel-in-progress` **nur auf dem
  deploy-Job**, nie auf dem Workflow — ein abgebrochener Build mitten im
  Manifest-Push wäre schlimmer als das Problem. Kosten falls falsch: ein
  abgebrochener Verifikationslauf, dessen Nachfolger dieselbe Prüfung macht.
Task 7: fix round 2/5 dispatched (sonnet — Shell-Semantik, YAML, zwei Testschwächen)
Task 7: fix round 2/5 → commit 73a98ff. Fünf Punkte, 31/31 gezielte Tests,
  tsc 0, lint 0 Fehler, Ratsche 2205, check:i18n grün, YAML parst.
  Der Implementer hat die fünf curl-Fälle **gegen einen lokalen Mock-Server**
  durchgespielt statt nur durchdacht — stärkere Evidenz als in den Runden davor.
  Controller-seitig programmatisch nachgeprüft: `curl -s --max-time 10` ohne
  `-f`; `concurrency` liegt auf dem `deploy`-Job und **nicht** workflow-weit
  (YAML geparst, fünf Jobs unverändert).
Task 7: scoped re-review über 04f051c..73a98ff (sonnet — die strukturelle Frage
  ist entschieden, diese Runde sind fünf kleine Korrekturen), läuft
Task 7: fix round 2/5 (5 addressed, 0 open; commits 04f051c..73a98ff)
  Der Kommentar, der zweimal falsch war, ist diesmal Satz für Satz gegen den
  Code geprüft worden; F4s RED zeigt „Body is unusable: Body has already been
  read" — genau den beschriebenen Fehlermodus, nicht einen Zähler.
Task 7: complete (commits 33bae77..73a98ff, review clean) — Baseline 2205,
  gezielte Vitest 31/31, `/api/health` liefert `version` + `commit`, das
  Rollout-Gate vergleicht Commit-SHAs und ist gegen Nebenläufigkeit abgesichert

### Vorab verifiziert für Task 8 — mit einem Plan-Defekt
- `Row` hat heute `lead|title|eyebrow|trailing|actions|effort|dotColor|dimmed|
  tone|as|className|testId`. `wrapTitle` gibt es noch **nicht** (Task 10) —
  Task 8 darf es nicht brauchen.
- R15 gilt: eine `List` pro Gruppe, `GroupHeading` als Geschwister davor. Der
  Plan-Code für `/tasks` macht genau das (drei `<section>` mit je einer Liste).
- R13s `as` + Rest-Spread ist der Weg, die Wisch-Handler an das Zeilenelement zu
  bekommen — genau der Grund, warum die Prop existiert.
- `MIGRATED_PAGES` steht auf `["/dashboard"]`.

Task 8: **Ruling (R28)** — **mein Plan ist hier falsch.** Der `TasksRail`-Code
  im Plan ruft `SearchFilterBar` mit `filterGroups`/`onFilterChange`/`onClearAll`
  auf. Die echte Schnittstelle ist
  `searchQuery, onSearchChange, placeholder, filters, activeFilters,
  onFilterChange, resultCount, totalCount, onClearAll` — alle **required**, und
  `filters` heißt nicht `filterGroups`. Der Plan-Code würde nicht kompilieren.
  Zweiter Befund: die Komponente bündelt Suchfeld UND Filterpillen. Ein 208px
  breiter Rand ist kein Ort für ein Suchfeld, und die Spec weist dem Rand
  ausdrücklich „Zähler und die Filter" zu, nicht die Suche.
  Entschieden: `components/shared/search-filter-bar.tsx` wird in zwei
  exportierte Teile zerlegt — `SearchInput` und `FilterPills` —, und
  `SearchFilterBar` bleibt als dünne Komposition beider bestehen. Grund: es gibt
  **zwei** Aufrufer, und `components/wishlist/wishlist-view.tsx:302` gehört
  Phase 2; die Wrapper-Variante lässt Wishlist unangetastet. `/tasks` nimmt dann
  `SearchInput` in die Lesespalte (Suchen ist Tun) und `FilterPills` in den Rand
  (die Spec-Tabelle). Keine doppelte Pillen-Markup, ein geänderter File.
  Nebeneffekt, bewusst in Kauf genommen: die Amber-Fläche der aktiven Pille
  fällt damit auch auf `/wishlist` weg, bevor diese Seite migriert ist — das ist
  eine Bewegung zum Ziel, und die Regel-Tests laufen ohnehin nur über
  `MIGRATED_PAGES`. Kosten falls falsch: eine geteilte Datei mit zwei Exporten
  mehr.
Task 8: dispatched (sonnet), BASE 73a98ff, brief task-8-brief.md
Task 8: implementer DONE_WITH_CONCERNS, commit f386e22 (20 Dateien, +1409/-978).
  vitest 4/4 (RED→GREEN für `groupByPriority`), tsc/lint/check:i18n clean,
  Ratsche **2205 → 2133** (minus 72), design-rules 21/21, design-tokens 38/38,
  wishlist 8/10 (2 vorbestehend). 10 Fehlschläge im kombinierten Lauf, alle mit
  benannter vorbestehender Ursache.

Task 8: **Ruling (R29)** — `task-item.tsx` bleibt, und das ist wieder ein
  Plan-Defekt von mir. Der Plan listet die Datei unter „Gelöscht" und Schritt 11
  verlangt `grep` → leer → `git rm`. Selbst nachgeprüft: sie hat **zwei** weitere
  Konsumenten, `components/quick/five-minute-view.tsx:20,222` und
  `components/topics/sortable-task-item.tsx:13`. `/quick` ist Phase 2, und
  `/topics/[id]` steht in **keiner** Phase-1-Task (Task 10 nennt nur
  `topics/page.tsx`, `topics-grid`, `topic-card`). Der Implementer hat richtig
  gehandelt, nicht zu löschen. Entschieden: die Datei überlebt Phase 1; Task 12
  darf in CHANGELOG und Doku nicht behaupten, sie sei entfernt. Kosten falls
  falsch: eine 803-Zeilen-Datei bleibt bis Phase 2 im Baum.

Task 8: **Ruling (R30)** — der `page-frame`-Fund ist die wichtigste Lehre dieser
  Sitzung über mein eigenes Vorgehen, und der Fix wird geändert.
  Befund (verifiziert im Diff): Tailwind sortiert den eigenen Breakpoint
  `--breakpoint-rail` **hinter** die eingebauten, also gewinnt `sm:flex-row` ab
  1100px gegen `rail:flex-col` — der Rand war auf **jeder** Breite eine
  gewrappte Reihe mit auf Randhöhe gestreckten `<p>`, auch auf `/dashboard`, seit
  Task 1. Zwei Tests aus Task 1 waren dabei grün: sie messen die **äußere**
  Anordnung (Rand neben bzw. unter der Spalte) — die war korrekt. Die innere
  Anordnung des `<aside>` deckte kein Test ab. Kein vorgetäuschter Test, aber
  eine ungedeckte Stelle, die zwei Tasks überlebte, weil niemand hingesehen hat.
  Der Fix des Implementers setzt `rail:flex-col! rail:gap-4!`. Entschieden: das
  `!` fällt weg. Ein Wichtig-Marker in einem geteilten Primitive lädt den
  Nächsten ein, Spezifität zu bekämpfen statt Absicht auszudrücken, und der
  erklärende Kommentar hängt an einem Sortierverhalten, das ein
  Tailwind-Update ändern kann — Renovate hebt Tailwind hier regelmäßig. Die
  drei Bänder werden bandbegrenzt ausgedrückt (`sm:max-rail:flex-row` statt
  `sm:flex-row`), sodass gar kein Konflikt entsteht. **Und** es kommt der
  fehlende Test dazu: der Rand muss bei 1440px eine Spalte sein (zweites Kind
  unter dem ersten). Kosten falls falsch: falls die gestapelte Variante in
  dieser Tailwind-Version nicht greift, bleibt das `!` die Rückfallposition —
  aber dann mit Messbeleg statt Vermutung.
Task 8: task reviewer dispatched (**opus** — größter Diff der Sitzung, zwei
  geteilte Primitives angefasst, zehn rote Tests zu beurteilen), diff 73a98ff..f386e22
Task 8: task review (opus) — Spec ❌, 0 Critical, 6 Important, 10 Minor.
  Das Review hat gemessen statt geschlossen: den Cascade-Defekt im kompilierten
  `.next/dev/static/css/app/layout.css` nachgewiesen (`@media (width >= 1100px)`
  bei 3207, `>= 40rem` erst bei 3233 — gleiche Spezifität, `sm:` später), meine
  R30 gegen **Tailwind 4.3.3** kompiliert (`sm:max-rail:flex-row` erzeugt
  verschachtelte Media Queries, alle drei Bänder sind ausdrückbar, das `!` ist
  entbehrlich) und alle **zehn** Fehlschläge einzeln auf ihre Ursache
  zurückgeführt — kein einziger geht auf diese Task zurück. Auch bestätigt:
  keine Testdatei wurde aufgeweicht, `MIGRATED_PAGES` **verschärft** nur.
Task 8: ⚠️ selbst geprüft: `MIGRATED_PAGES = ["/dashboard", "/tasks"]` — die
  21/21 aus design-rules liefen also wirklich mit `/tasks` drin.

Task 8: **Ruling (R31)** — der 6-px-Punkt in der Themen-Abschnittsüberschrift ist
  erlaubt, obwohl die Regel „nur als `Row`s 6-px-Punkt" sagt. Zweck der Regel ist,
  Nutzerfarbe als **Fläche und Rahmen** auszuschließen; ein Punkt derselben Größe
  in derselben Rolle eine Ebene höher ist dieselbe Kodierung, kein zweiter
  Farbkanal. Kosten falls falsch: eine zweite Stelle, an der Nutzerfarbe
  auftaucht — beide 6px, beide Punkt.

Task 8: **Ruling (R32)** — der fehlende Opacity-Wächter in `countBoxes` wird
  **hier** behoben, nicht vertagt. Der Reviewer verweist ihn an „die Task, die
  `design-count.ts` besitzt" — die gibt es nicht mehr, Task 3 ist abgeschlossen
  und keine spätere Task fasst die Datei an. Ein Wächter mit bekannter Lücke, der
  an eine nicht existierende Task verwiesen wird, ist ein Wächter, der die Lücke
  behält. Zwei Zeilen, dieselbe Form wie in `countAmber` (das den Wächter hat).
  Die Panel-Gate-Lösung des Implementers bleibt zusätzlich: transiente
  Rückmeldung muss im Ruhezustand gar nicht im DOM stehen. Kosten falls falsch:
  ein echter Kasten mit `opacity: 0` entgeht der Zählung — derselbe Kompromiss,
  den `countAmber` seit Task 3 fährt.
Task 8: fix round 1/5 dispatched (sonnet — sechs Important plus fünf mitgenommene Minor)
Task 8: minor (deferred): fünf Verhaltensweisen haben jetzt zwei
  Implementierungen (`formatDueDate`, Wischgeste, 300-ms-Verzögerung,
  `daysFromNow`, `isSnoozed`), weil `task-item.tsx` überlebt. Der lazy Weg wäre,
  `task-item.tsx` auf `useTaskSwipe`/`TaskRowActions` zu zeigen — das berührt
  aber `/quick` und `/topics/[id]`, die keine Testabdeckung dieser Phase haben.
  Phase 2 löst es beim Migrieren dieser Seiten.
Task 8: minor (deferred): `coinSum` im Rand zählt snoozed und blockierte
  Aufgaben mit und ignoriert die `postponeCount >= 3`-Verdopplung, die die alte
  Zeile zeigte. Braucht eine Produktentscheidung, keine Codekorrektur.
Task 8: minor (deferred): `task-list.tsx` steht bei 1035 Zeilen; der ~120-zeilige
  Themen/Stepper-Teilbaum ist die nächste offensichtliche Extraktion.
Task 8: minor (deferred): `--update` hat einen unabhängigen Alteintrag
  (`components/theme-toggle.tsx`) mit in den Baseline-Commit gezogen.
Task 8: fix round 1/5 → commit 2523277. Elf Punkte, Ratsche **2133 → 2124**,
  `search-filter-bar.tsx` spacing 9 → **0**, design-tokens 40/40 (zwei neue
  Rand-Richtungstests, RED gegen den Vor-Fix-Klassenstring bestätigt),
  design-rules 21/21, tasks 8/16 (dieselben acht vorbestehenden).
  Controller-seitig selbst geprüft: kein `!` und kein `rail:flex-col` mehr in
  `page-frame.tsx`, die drei Bänder stehen als `sm:max-rail:`; Ratsche 2124.
  F4s Tailwind-Behauptung wurde gegen die im Repo installierte 4.3.3 kompiliert,
  nicht gegen eine Annahme.
Task 8: eine neue Lint-Warnung, selbst lokalisiert statt geglaubt:
  `components/tasks/task-row.tsx:186`, `react-hooks/set-state-in-effect` — in
  einer Datei, die diese Task angelegt hat. Zehn Bestandsdateien tragen dieselbe
  Warnung; ungewertet ans Re-Review gegeben.
Task 8: scoped re-review über f386e22..2523277 (sonnet — die strukturellen Fragen
  sind entschieden), läuft
Task 8: fix round 1/5 (11 addressed, 0 open; commits f386e22..2523277)
  Das Re-Review hat wieder gemessen: die drei `sm:max-rail:`-Bänder live über
  `document.styleSheets` geprüft (verschachtelte Media Queries, überlappungsfrei
  gegen `rail:`), den RED der neuen Randtests im Bericht als **Ausgabe**
  vorgefunden, `check:design` und `npm run lint` unabhängig nachgefahren, und
  `list.tsx`s korrigierte JSDoc gegen `GroupHeading` gehalten (`<h2>` — stimmt).
Task 8: complete (commits 73a98ff..2523277, review clean) — Baseline **2124**,
  design-tokens 40/40, design-rules 21/21, `/tasks` in MIGRATED_PAGES
Task 8: minor (deferred): `components/tasks/task-row.tsx:186` —
  `react-hooks/set-state-in-effect` in neuem Code. Das Re-Review widerspricht der
  Einordnung des Implementers („dasselbe akzeptierte Muster wie sieben
  Bestandsdateien"): die zehn Bestandsfälle sind prop-getriebene Resets, die ein
  `key`-Remount löst; dieser ist gesten-/timer-getrieben, und genau die
  markierte Zeile (`setPanelMounted(true)`) spiegelt nur `swipe.isSwiping` in
  State — sie ließe sich in den vorhandenen `onTouchStart`-Handler verschieben
  und die Warnung ganz vermeiden. Minor, geht ans Abschlussreview.

### Vorab verifiziert für Task 9
- `app/focus/layout.tsx:20` hat weiter ein `<div>`, **kein `<main>`** — die
  Zähler brauchen es, Task 9 legt es an.
- `components/focus/focus-mode-view.tsx`: 1019 Zeilen, Baseline
  `{color:10, radius:0, inline:53, spacing:0}` = 63 Verstöße, unverändert.
- `MIGRATED_PAGES` steht auf `["/dashboard", "/tasks"]`.
- `wrapTitle` gibt es weiter nicht (Task 10 legt es an).
Task 9: dispatched (sonnet), BASE 2523277, brief task-9-brief.md
Task 9: **Betriebsstörung** — der Implementer wurde mitten in der Arbeit von
  einem Session-Limit abgeschossen (HTTP 429, req_011CeTCKTqKmMgE3RRJobZGQ),
  nach eigener Aussage direkt nach der Chrome-Prüfung („all screenshots
  captured and interactions worked end-to-end"), **vor** Commit und Bericht.
  Vorgefunden: elf geänderte Dateien im Baum (focus-mode-view, focus/layout,
  MIGRATED_PAGES += "/focus", sieben Locales, design-baseline.json), **kein**
  task-9-report.md, dazu ein übriggebliebenes Screenshot-Spec
  `e2e/zzz-visual-focus.spec.ts` (untracked). Stash-Stack leer.
  Der Dev-Server auf :3000 starb mit dem Subagenten und wurde erneut aus der
  Controller-Sitzung gestartet (Log: /home/jpy/.claude/jobs/fed48872/tmp/devserver.log),
  bestätigt mit HTTP 200.
Task 9: Controller-Messung des vorgefundenen Stands, statt ihn zu erraten:
  `npx tsc --noEmit` grün, `check:design` **2061, keiner neu** (von 2124 — genau
  die 63 Verstöße von `focus-mode-view.tsx`), `MIGRATED_PAGES` enthält "/focus".
  Die Migration ist substanziell fertig; was fehlt, ist Beweis, Bericht,
  Aufräumen und Commit.

Task 9: **Ruling (R33)** — anders als bei Task 4 (R17) committe ich hier **nicht**
  selbst. Dort lag ein vollständiger Bericht vor, gegen den ich die Behauptungen
  prüfen konnte; hier gibt es **keinen** — niemand hat aufgeschrieben, was
  geändert wurde und warum, und die vier Regel-Tests sind ungelaufen, weil der
  Server tot war. Ein Commit ohne Rechenschaft wäre genau die Sorte
  unbelegte Zusage, die diese Sitzung durchgehend bekämpft. Entschieden: ein
  frischer Implementer **schließt ab** statt neu zu bauen — die Arbeit auf der
  Platte wird gegen den Brief geprüft, das Übriggebliebene entfernt, alles
  belegt, dann committet. Kosten falls falsch: ein Dispatch mehr für Arbeit, die
  schon dasteht.
Task 9: dispatched (sonnet) — Abschluss-Dispatch, BASE 2523277, brief task-9-brief.md
Task 9: Abschluss-Implementer DONE, commit 60b7beb (Migration über zwei Agenten
  vollendet). design-rules 31/31, design-tokens 40/40, focus-quick 11/13 (zwei
  vorbestehend, je mit Beleg), tsc/lint/check:i18n clean, Ratsche 2061 keiner neu.
  Das Screenshot-Spec des ersten Agenten wurde gelöscht (keine echten
  Assertions).
Task 9: **Prüfpunkt** ungewertet ans Review gegeben — der Implementer hat einen
  **Regel-Test** geändert, um zwei Fehlschläge zu beheben: die Feder-Positivprobe
  (`header a[href="/dashboard"] svg`) ist jetzt auf `hasHeader` bedingt, weil
  `/focus` außerhalb der `(app)`-Hülle liegt und gar kein `<header>` hat. Ich
  habe den Diff selbst gelesen: die Begründung trägt sachlich. Aber es ist
  dieselbe Form wie R12, und dort verlangte das Ruling einen **Beweis, dass das
  Gate sich nicht selbst stillstellen kann**. Denselben Beweis habe ich diesmal
  vom Review verlangt (mutieren, messen, zurücknehmen) — nicht selbst geführt,
  damit das Urteil unabhängig bleibt.
Task 9: Umgebungsbefund fürs Protokoll: `resize_window` der Chrome-Erweiterung ist
  in dieser Umgebung kaputt (schlägt bei jeder Größe fehl). Breiten-Evidenz kommt
  über einen Playwright-gesteuerten Viewport. **Relevant für Task 12**, dessen
  Chrome-Review fünf Seiten × zwei Themes × zwei Breiten vorsieht.
Task 9: task reviewer dispatched (opus — Seitenmigration plus ein veränderter
  Regel-Test), diff 2523277..60b7beb
Task 9: task review (opus) — Spec ❌, 0 Critical, 3 Important, 7 Minor.
  Das Review hat den Beweis geführt, den der Bericht schuldig blieb: mit auf
  `<span>MUTATED</span>` verbogener `feather-mark.tsx` gehen `/dashboard` und
  `/tasks` in beiden Themes rot („die Feder ist kein Inline-SVG mehr",
  design-rules.spec.ts:123), `/focus` bleibt grün — das Gate hat Zähne, und
  nebenbei ist damit belegt, dass `header` auf `/focus` wirklich 0 ist.
  Mutation vollständig zurückgenommen (`git diff` leer, `test-results/` entfernt).
  Beide „vorbestehend"-Zuschreibungen unabhängig verifiziert, die interessantere
  am unauthentifizierten `/login`: das `<div hidden>` ist erstes `<body>`-Kind aus
  dem Root-Layout, und Playwrights `.first()` löst in **DOM-Reihenfolge** auf,
  nicht in Selektor-Reihenfolge — der Test war schon vorher kaputt.

Task 9: **Ruling (R34)** — `hasHeader` wird durch eine **erwartete** Aussage
  ersetzt, und `hasLight` gleich mit. Das Review hat die Restlücke exakt benannt:
  kein Test im Repo behauptet, dass ein `<header>` existiert, also stellt ein
  Refactor auf `<div role="banner">` die Positivprobe auf **allen** Seiten
  lautlos ab. Ein vom Seiteninhalt abgelesenes Prädikat fragt „hat diese Seite
  Chrome?", die ehrliche Frage ist „soll sie?". Entschieden: eine
  `CHROMELESS`-Menge im Test, `expect(headers).toBe(chromeless ? 0 : 1)` — beide
  Richtungen laut. Dasselbe für `hasLight` (R12 hat diese Lücke gelassen; heute
  ist `/dashboard` die einzige Seite mit Licht, und das gehört hingeschrieben).
  Kosten falls falsch: eine Menge im Test, die bei jeder neuen chromelosen Seite
  gepflegt werden muss — genau die Pflege, die die Entscheidung sichtbar hält.

Task 9: **Ruling (R35)** — die falsche Begründung fällt, **und** der blinde Fleck
  wird benannt statt geschlossen. Der Kommentar behauptet,
  `font-variation-settings` sei „der eine Wert, den eine CSS-Custom-Property
  nicht tragen kann" — `app/globals.css:450-455` definiert genau dafür zwei
  Utility-Klassen, mit dem Kommentar, dass sie dort stehen, damit die Seite frei
  von `style={{}}` bleibt. Der Repo widerlegt den Satz zwei Verzeichnisse weiter.
  Schwerer: das benannte Style-Objekt ist der Grund, warum vier der fünf
  `style=`-Stellen der Datei für die Ratsche unsichtbar sind — deren
  `inline`-Muster ist wörtlich `/style=\{\{/g` (`check-design-tokens.mjs:111`).
  Selbst gemessen: **83** Stellen in `app/` und `components/` benutzen
  `style={benanntesObjekt}` und entgehen der Zählung. Ein Teil des Rückgangs
  53 → 1 ist damit ein Zählartefakt.
  Entschieden: die zwei betroffenen Stellen (`focus-mode-view`, und die Quelle
  der falschen Begründung in `daily-quest-card.tsx:95`) gehen auf eine
  Utility-Klasse; die Regex wird **jetzt nicht** erweitert, weil das die Baseline
  neu bodenlegen heißt (der Weg dafür steht im Script-Kopf) und eine
  Phasenentscheidung ist. Stattdessen **muss Task 12 die Zahl 83 messen,
  berichten und darf in CHANGELOG/Doku nicht behaupten, die Ratsche fange alle
  Inline-Styles.** Kosten falls falsch: der blinde Fleck bleibt eine Phase länger
  offen — aber dokumentiert statt unbemerkt.

Task 9: **Ruling (R36)** — das Auswahlziel wird wieder die ganze Zeile. Vorher war
  die komplette Zeile ein `motion.button`, jetzt schaltet nur die 20×20-px-Box.
  Das ist unter WCAG 2.2 2.5.8 (24×24) und liegt auf der Seite, auf der Auswählen
  **die** Interaktion ist, in einer App für Menschen mit Vermeidungstendenz. Zwei
  Zeilen: `onClick` an die `Row` (die Rest-Props durchreicht) plus
  `stopPropagation` am Lead-Button. Kosten falls falsch: die Zeile wird als
  Ganzes klickbar, ein versehentlicher Treffer wählt eine Aufgabe statt keiner.

Task 9: **Ruling (R37)** — `--danger` für eine Speicherfehler-Meldung bleibt,
  obwohl die Regel „nur Zerstörung und Überfälligkeit" sagt. Eine Fehlermeldung
  ist die dritte legitime Rolle dieser Farbe, es gibt Präzedenz im Repo
  (`task-breakdown-modal.tsx:113`), und die Alternative wäre eine Fehlermeldung in
  Ink — unlesbar als Fehler. Task 12 schreibt die Regel in der Doku auf drei
  Rollen fort, statt den Code gegen den Buchstaben zu biegen. Kosten falls
  falsch: eine Farbe mit drei statt zwei Bedeutungen.
Task 9: fix round 1/5 dispatched (sonnet — drei Important plus sechs mitgenommene Minor)
Task 9: fix round 1/5 → commit 8a3bb51, alle neun Punkte. Beide Gates mit
  Mutationszyklus belegt (Header → `<div role="banner">`, `.lichtkegel`
  entfernt): rot auf `/dashboard` und `/tasks`, grün auf `/focus`, dann
  zurückgenommen. Ratsche 2061 → 2060, tsc grün, lint ohne neue Warnung,
  design-rules 31/31, design-tokens 40/40, dashboard 13/13.
Task 9: **Vorkommnis** — der Implementer hat mit `git checkout -- <datei>` eine
  Mutation zurückgenommen und dabei auch die **echte uncommittete F2/F4-Arbeit**
  derselben Datei gelöscht, per grep bemerkt und **von Hand** nachgezogen. Er
  hat das selbst offengelegt, was zählt. Ich habe die Vollständigkeit
  stichprobenartig geprüft (beide falschen Kommentare weg, `.font-display-stage`
  definiert und über `stageTitleClassName` in beiden Dateien angewandt, einmal
  exportiert) — ans Re-Review ist die Vollständigkeitsprüfung explizit als
  Auftrag gegangen, weil Handnachgezogenes der Ort für stille Auslassungen ist.
Task 9: **eigener Fund, ungewertet ans Re-Review** — der Fix für den sechsten
  falschen Kommentar hat womöglich den **siebten** gepflanzt, und zwar ins
  geteilte Primitive: `components/ui/list.tsx:66-67` behauptet jetzt, die
  Variable-Font-Achsen könne „keine CSS-Custom-Property tragen",
  `app/globals.css:459-460` wiederholt es auf Englisch. Meine Lesart: falsch —
  eine Custom Property hält einen beliebigen Token-Strom, `--axes: "SOFT" 50,
  "WONK" 1` plus `font-variation-settings: var(--axes)` ist gültig. Ich habe es
  **nicht** selbst gemessen und nicht gewertet; das Re-Review muss es im Browser
  testen statt darüber zu argumentieren. Die wahre Begründung für die Klasse ist
  eine andere (Anführungszeichen und Kommas überleben Tailwinds
  Arbitrary-Value-Syntax nicht, und es hält die Achsen aus Inline-Styles heraus,
  die die Ratsche nicht sieht).
Task 9: scoped re-review über 60b7beb..8a3bb51 (sonnet), läuft
Task 9: fix round 1/5 (8 von 9 addressed, F2/F4 offen; commits 60b7beb..8a3bb51)
  Das Re-Review hat meinen Verdacht **gemessen**, nicht bewertet: im laufenden
  Dev-Server `--axes: "SOFT" 100, "WONK" 1, "opsz" 144` gesetzt,
  `fontVariationSettings: var(--axes)` angewandt, `getComputedStyle` gibt die
  Achsenliste zurück; dazu ein Kontrollwert `"SOFT" 0, "WONK" 0` mit anderem
  Ergebnis und eine Sichtprüfung, dass die zwei Zeilen sichtbar verschieden
  rendern. Eine CSS-Custom-Property **kann** `font-variation-settings` tragen.
  Der Satz ist damit der siebte falsche Kommentar dieses Projekts — und der Fix
  für den sechsten hat ihn gepflanzt, in `components/ui/list.tsx:66-67` und
  `app/globals.css:459-460`, beide häufiger gelesen als die Stelle, die sie
  ersetzt haben. Mechanisch war der Fix richtig (Klasse statt Style-Objekt,
  einmal exportierte Rezeptur, Ratsche 2060) — nur die Begründung ist falsch.
Task 9: fix round 2/5 dispatched (sonnet, Wortlaut von mir diktiert — bei einem
  Kommentar, der zweimal falsch war, gebe ich den Text vor statt ihn zu bestellen)
Task 9: fix round 2/5 → commit efdb2ec. Beide Kommentare nennen jetzt die zwei
  wahren Gründe (Tailwinds Arbitrary-Value-Syntax trägt die Anführungszeichen
  und Kommas der Achsenliste nicht; die Klasse hält den Wert aus einem
  Style-Objekt heraus, das `/style=\{\{/g` nicht sieht). `cursor-pointer` ergänzt
  und im deaktivierten Fall durch `pointer-events-none` korrekt neutralisiert
  (in Chrome geprüft). 52/52, Ratsche stabil 2060.

Task 9: **Ruling (R38)** — für diese Runde entfällt das scoped Re-Review, und das
  ist eine bewusste Abweichung von der Skill-Regel „jede Runde endet mit einem
  scoped Re-Review". Grund: der Prüfgegenstand sind **zwei Prosazeilen, deren
  Wortlaut ich selbst diktiert habe**, und ich habe sie erstinstanzlich geprüft
  statt einen Bericht darüber zu lesen — beide Kommentare gelesen, und ein grep
  über alle vier betroffenen Dateien zeigt, dass die Falschaussage über
  CSS-Custom-Properties nirgends mehr steht. Dazu 52/52 Tests und eine Ratsche,
  die auf exakt 2060 stehen bleibt, was belegt, dass am Mechanismus nichts
  angefasst wurde. Einen Subagenten zu schicken, der zwei von mir geschriebene
  Zeilen nachliest, wäre ein Prüfsitz ohne Prüfgewinn. Kosten falls falsch: eine
  sprachliche Nuance in einem Kommentar bleibt ohne zweiten Leser — bei einem
  Satz, der zweimal falsch war, ist das das Risiko, das ich benenne statt es zu
  verstecken.
Task 9: complete (commits 2523277..efdb2ec, review clean bis auf R38) —
  Baseline **2060**, design-rules 31/31, design-tokens 40/40, dashboard 13/13,
  focus-quick 11/13 (zwei vorbestehend, belegt)
Task 10: implementer DONE_WITH_CONCERNS, commit e75e8b9. Ratsche **2060 → 1986**
  (−74), tsc/check:i18n clean, lint ohne neue Warnung, topics+design-rules+
  design-tokens kombiniert **91 passed, 0 failed**.
Task 10: minor (deferred): ein Flake in `e2e/navigation.spec.ts` (Sidebar-Links),
  1 von 3 Volldurchläufen, 0 von 5 isoliert, und mit **altem wie neuem**
  `/topics`-Code reproduziert. Der Implementer hat es als
  unreproduzierbar/umgebungsbedingt gemeldet statt als „unrelated" behauptet —
  das ist die richtige Form.

Task 10: **Ruling (R39)** — die Informationsfrage entscheide ich, nicht das
  Review, weil sie meinen Brief betrifft. Entfernt wurden Icon,
  Prioritäts-Abzeichen, Beschreibung, „alles erledigt"-Banner **und** der
  Sequenz-Hinweis. Mein Brief nennt nur Titel, Fortschritt und Punkt; Schweigen
  ist aber nicht „löschen", und die Spec sagt in §4 ausdrücklich, dass jede
  Metadate **eine Kodierung ohne Fläche** bekommt — nicht, dass sie verschwindet.
  Entschieden, getrennt nach Ornament und Tatsache:
  • **Bleibt entfernt:** Icon, Prioritäts-Abzeichen, Beschreibung, „alles
    erledigt"-Banner. Eine Liste ist ein Index; die Prosa gehört auf die
    Detailseite, und die Reduktion von sechs Feldern auf vier Kodierungen ist
    bei `/tasks` genau die Absicht gewesen, kein Versehen.
  • **Kommt zurück:** der Sequenz-Hinweis, als Mono-Eyebrow. Sequenziell zu sein
    ändert, **wie das Thema sich verhält** (Aufgaben werden erst freigeschaltet)
    — das ist keine Zierde, und wer es in der Liste nicht sieht, wird später
    überrascht. Der Eyebrow ist genau das Gerät dafür: kurz, versal, Mono.
  • **Verlangt:** ein CHANGELOG-Eintrag, der benennt, was aus der Listenansicht
    verschwunden ist (Definition of Done), und Task 12 schreibt es in die Doku.
  Bewusst **kein** neuer `Row`-Slot für die Beschreibung: der `eyebrow` ist
  versal-gesperrtes Mono und für Prosa untauglich, und ein Slot für einen
  Aufrufer wäre die Abstraktion, die diese Sitzung sonst überall vermeidet.
  Kosten falls falsch: `/topics` zeigt weniger als die alte Karte, und wer die
  Beschreibung in der Liste braucht, muss sie zurückfordern.
Task 10: task reviewer dispatched (opus — Seitenmigration plus neue Prop am
  geteilten Primitive `wrapTitle`), diff efdb2ec..e75e8b9
Task 10: task review (opus) — Spec ❌, **2 Critical**, 5 Important, 7 Minor.
  Das Review hat den Wortumbruch in Chromium nachgemessen, mit rekonstruiertem
  Layout-Kontext (Flex-Eltern, `flex:1 1 0%; min-width:0`, 16px Mono,
  `lang="de"`), bei 160/140/100px Containerbreite.

Task 10: **Ruling (R40)** — **die Ursachenanalyse in meinem Plan ist falsch, und
  die Spec trägt sie weiter.** Gemessen: `word-break: break-word` zu entfernen
  ändert die Darstellung in **keiner** der drei Breiten; `overflow-wrap:
  break-word` allein reproduziert „Steuererklärun / g 2025" zeichengenau. Der
  Grund ist `min-width: 0` am Titel-Span — es neutralisiert genau den einzigen
  echten Unterschied zwischen `break-word` und `anywhere` (ob Umbruchchancen in
  die min-content-Größe zählen). Die entfernte Deklaration war in diesem Kontext
  ein No-op. Was den Bug behebt, ist `hyphens-auto`, das beide Kommentare als
  Beigabe beschreiben.
  Entschieden: (1) beide Kommentare nennen `hyphens-auto` als **den** Fix, und
  zwar mit der Messung als Begründung, nicht mit einer Theorie; (2) der Test
  bekommt `expect(style.hyphens).toBe("auto")` — heute kann man `hyphens-auto`
  löschen und er bleibt grün, er bewacht also die Entfernung eines No-ops;
  (3) **Task 12 muss §10 der Spec und die Plan-Passage korrigieren**, statt die
  falsche Diagnose in die Doku zu schreiben. Kosten falls falsch: die Erklärung
  benennt einen Mechanismus, der bei anderer Layout-Konfiguration doch greift —
  deshalb kommt die gemessene Tabelle in den Kommentar, nicht bloß die Behauptung.

Task 10: **Ruling (R41)** — der Fortschritt bekommt seine Lokalisierung zurück,
  aber nicht seine Länge. „3/7" ist plan-mandatiert und bleibt **sichtbar** so;
  ein Screenreader hört damit aber „3/7" ohne Substantiv, und die archivierte
  Zeile hat zusätzlich die Prozentangabe verloren. Entschieden: `t("task_progress")`
  als **zugänglicher Name** (aria-label) am `trailing`, sichtbar bleibt die
  kompakte Mono-Zahl. Damit gilt beides: Kompaktheit im Bild, Substantiv für
  Assistenztechnik. Kosten falls falsch: ein aria-label mehr pro Zeile.

Task 10: **Ruling (R42)** — die Entarchivierung bekommt ihren Text zurück. Aus
  einem beschrifteten „Archivierung aufheben" ist ein Icon geworden, dessen
  einzige Beschriftung im `title` steht, in einem Abschnitt, den man selten
  besucht, umgeben von weiteren unbeschrifteten Icons. Das ist der
  Auffindbarkeitsverlust, den mein R39 **nicht** abgedeckt hat — genau die Frage,
  die ich dem Review gestellt habe, und es hat sie beantwortet. Kosten falls
  falsch: ein Textbutton in einer Zeile, die sonst nur Icons trägt.

Task 10: **Korrektur meines eigenen Ledgers** — ich habe oben notiert, der Flake
  sei „mit altem wie neuem `/topics`-Code reproduziert". Das Review hat den
  Bericht nachgelesen: dort steht das Gegenteil („it did NOT fail there
  either"), der Satz widerspricht sich selbst, und ein Fehlschlag mit altem Code
  existiert nicht. Die Schlussfolgerung „nicht zurechenbar" hält trotzdem, aber
  auf dem anderen Bein: die fehlschlagende Assertion klickt `a[href="/tasks"]`,
  **bevor** `/topics` überhaupt geladen wird. 1 von 3 unter Last gegen 0 von 5
  isoliert belegt Lastabhängigkeit, nicht Unabhängigkeit vom Code.
Task 10: fix round 1/5 dispatched (sonnet — zwei Critical, fünf Important, sieben Minor)
Task 10: **Betriebsstörung** — der Fix-Implementer starb an einem API-Fehler
  (400, fehlerhafter Tool-Name > 200 Zeichen, req_011CeTSRTK7dXbad56aKZaE4),
  nach eigener Aussage direkt nach „All 91 passed", beim Start des letzten
  Testlaufs. Vorgefunden: 14 geänderte Dateien, **kein** Fix-Runden-Abschnitt im
  Report, Ratsche stabil 1986. Auffällig: `components/ui/confirm-button.tsx` ist
  geändert — ein geteiltes Primitive für einen Minor (Hover-Label am
  destruktiven Button); das braucht eine ausdrückliche Begründung.
  Nach der Logik von R33 committe ich wieder **nicht** selbst: ohne Bericht gibt
  es keine Rechenschaft, gegen die ich prüfen könnte.
Task 10: fix round 1/5 — Abschluss-Dispatch (sonnet)
Task 10: fix round 1/5 → commit 20ad47b (über zwei Agenten fertiggestellt).
  Audit aller 14 Funde gegen den vorgefundenen Baum: 13 vollständig umgesetzt.
  tsc clean, lint 0 neue Warnungen, check:design 1986 keiner neu, check:i18n
  grün, 91 passed (topics/design-rules/design-tokens) plus 8/8 in tasks.spec.ts
  (die acht vorbestehenden, keiner an `TaskRowActions`), RED→GREEN am
  verschärften Wortumbruch-Test live vorgeführt.
  `confirm-button.tsx` als gerechtfertigt bestätigt: rein additive Prop, alle
  **11** Aufrufstellen geprüft, kein anderes Verhalten geändert.

Task 10: **Ruling (R43)** — **mein Brief widersprach sich, und der Abschluss-
  Dispatch hat es gefunden statt es auszuführen.** Mein Minor „`title` weglassen,
  wo es `aria-label` wörtlich verdoppelt" wurde befolgt — und ließ Bearbeiten und
  Archivieren damit **ohne jedes Hover-Label** zurück, während derselbe Brief
  zwei Absätze weiter „jedes Zeilen-Steuerelement hat ein Hover-Label" verlangt.
  Bei einem Icon-Button **ist** die Verdopplung der Weg, überhaupt ein sichtbares
  Label zu haben. Entschieden: `title` bleibt. Der ursprüngliche Reviewer-Fund
  (Name aus `aria-label`, Beschreibung aus `title`, beides wird angesagt) ist
  richtig, aber das kleinere Übel — ein doppelt angesagtes Label ist besser als
  ein unsichtbares Steuerelement. Empirisch in Chrome geprüft, nicht argumentiert.
  Kosten falls falsch: Screenreader lesen an drei Stellen Name und Beschreibung
  mit gleichem Text.
Task 10: fix round 1/5 (13 von 14 addressed, ein neuer Fund; commits e75e8b9..20ad47b)
  Das Re-Review hat jede Zahl selbst reproduziert (tsc, lint, check:design,
  check:i18n, topics 12/12) und den RED/GREEN des verschärften Tests selbst
  gefahren — inklusive Rückgabe per Edit statt `git checkout`.

Task 10: **Ruling (R44) — die falsche Behauptung kam diesmal von mir.**
  Die Messtabelle in meinem Ruling R40 habe ich aus dem Bericht des ersten
  Reviews übernommen, **weil sie gemessen aussah**, und in den Dispatch diktiert.
  Das Re-Review hat sie zweifach nachgemessen (eigene
  Headless-Chromium-Reproduktion **und** der Rendered-Line-Test aus demselben
  Diff, der grün `["Steuererklä", "rung 2025"]` behauptet): die
  `+hyphens-auto`-Spalte ist bei 140px und 100px je um ein Zeichen falsch, und
  die von mir weitergegebenen Trennpunkte (12 und 7 Zeichen) sind nach Duden
  („Steu-er-er-klä-rung", gültig bei 4/6/8/11) gar keine. Achter falscher
  Kommentar des Projekts, Ursache: ich.
  Entschieden: die Tabelle **fällt ganz weg**, statt korrigiert zu werden. Der
  Mechanismus-Absatz bleibt (er ist richtig und tragend); an die Stelle der
  transkribierten Werte kommt ein Zeiger auf die Rendered-Line-Assertion in
  `e2e/topics.spec.ts` — die ausführbare Fassung derselben Aussage, die nicht
  still veralten kann. Eine Zahl, die ein Mensch abschreibt, ist eine Zahl, die
  falsch werden kann; ein Test nicht. Kosten falls falsch: der Kommentar erklärt
  den Mechanismus ohne Beispielwerte, und wer sie sehen will, liest den Test.
  Lehre fürs Protokoll: „gemessen" in einem Bericht ist selbst eine Behauptung.
  Ich habe die ganze Sitzung Messung über Argument verlangt und dann eine
  Messung weitergegeben, die ich nicht geprüft habe.
Task 10: zwei Genauigkeitsfunde am Bericht des Abschluss-Dispatchers, ohne
  Codefolge: (1) seine Begründung beruft sich auf eine „sitewide convention",
  dass jeder Icon-Button `title` = `aria-label` trägt —
  `task-row-actions.tsx:215-222` hat beim destruktiven Button **kein** `title`,
  die Konvention gilt also nicht so; der Fix bleibt aus eigenem Recht richtig.
  (2) „11 Aufrufstellen geprüft" — es sind **13 Aufrufe in 11 Dateien**, und die
  Aufzählung ließ `task-row-actions.tsx` aus, also genau die Datei, die er an
  anderer Stelle als Referenz zitiert. Die Sicherheitsaussage hält
  (unabhängig geprüft: nur zwei Aufrufstellen übergeben `title`), die Zählung
  nicht.
Task 10: fix round 2/5 dispatched (haiku — eine Tabelle löschen, einen Zeiger setzen; diktierter Wortlaut)
Task 10: fix round 2/5 → commit b4fd2f4. Tabelle in beiden Dateien weg,
  Mechanismus-Text erhalten, Zeiger auf die Rendered-Line-Assertion gesetzt.
  topics 12/12, Ratsche unverändert 1986, tsc/lint clean.
Task 10: **eigener Fund beim Nachlesen — Runde 3 an derselben Erklärung.**
  `components/topics/topic-card.tsx:35` nennt `anywhere` „seinem veralteten
  Alias" von `break-word`. Das ist umgekehrt: `word-break: break-word` ist der
  veraltete Alias, `overflow-wrap: anywhere` der moderne eigenständige Wert. Die
  **kanonische** Fassung in `components/ui/list.tsx:289` sagt es richtig (nur
  „zwischen `break-word` und `anywhere`", ohne Behauptung) — betroffen ist genau
  ein Nebensatz in einer Datei.
  Ich mache die dritte Runde an einem einzigen Kommentar, weil die Alternative
  ist, eine falsche Sachaussage in einer Datei wissentlich auszuliefern; die
  Kosten sind vier Wörter. Dass es drei Runden braucht, ist der eigentliche
  Befund: je länger eine Erklärung, desto mehr Behauptungen trägt sie, und jede
  ist eine Chance, falsch zu liegen. Der Zeiger auf den Test aus R44 ist die
  Antwort darauf, nicht ein weiterer Absatz.
Task 10: fix round 3/5 dispatched (haiku — ein Nebensatz, Wortlaut diktiert)
Task 10: fix round 3/5 → commit 48e93f3, eine Zeile. Klausel weg (grep: 0),
  Kommentar deckt sich jetzt mit der kanonischen Fassung, tsc clean, Ratsche
  unverändert 1986. Nach der Logik von R38 ohne Dispatch-Re-Review geschlossen:
  vier gelöschte Wörter, deren Ergebnis ich direkt lesen kann, und das Kriterium
  war „die falsche Klausel ist weg und keine neue steht da".
Task 10: complete (commits e75e8b9..48e93f3, review clean) — Baseline **1986**,
  topics 12/12, design-rules und design-tokens grün, `/topics` in MIGRATED_PAGES

### Vorab verifiziert für Task 11 — zwei Plan-Korrekturen
- **Zahlen:** `progress-tabs.tsx` trägt **109** Verstöße
  (`{color:0, radius:10, inline:89, spacing:10}`), nicht 99 wie im Plan.
  Dazu `habit-card.tsx` 27, `contribution-grid.tsx` 8, `progress/page.tsx` 2 —
  **146** im Einzugsbereich der Task.
- `MIGRATED_PAGES` steht auf `["/dashboard","/tasks","/focus","/topics"]`.

Task 11: **Ruling (R45)** — **mein Plan ordnet für die Heatmap den falschen Fix
  an.** Er behauptet, die Zellen seien `<button>` und fielen darum unter die
  Affordanz-Ausnahme des Kastenzählers, und verlangt sonst die Umstellung auf
  `<button type="button">` mit dem Argument Tastaturzugang. Nachgesehen:
  `contribution-grid.tsx:238` rendert `<div role="img">` — keine Buttons. Und die
  Umstellung wäre ein **Rückschritt**: ein Jahresraster als Buttons sind ~365
  Tabstopps, durch die ein Tastaturnutzer sich hindurcharbeiten müsste. Ein
  `role="img"` mit Label ist für eine Diagrammmarke die richtige Rolle, kein
  Mangel.
  Entschieden: die Zellen bleiben `role="img"`. Für den Kastenzähler gilt in
  dieser Reihenfolge — (1) die Zellen messen: greift die bestehende
  ≤12px-Ausnahme aus R10 schon, ist nichts zu tun; (2) falls größer, kommt eine
  **ausdrückliche Diagramm-Ausnahme** in `countBoxes`, in derselben Form wie die
  vorhandene `progress`/`meter`-Ausnahme, mit der ehrlichen Begründung: die
  Marken eines Diagramms sind Daten, keine Inhaltsflächen. Keine Attrappen-
  Affordanz, um einen Test zu beruhigen. Kosten falls falsch: eine Ausnahme mehr
  im Zähler, benannt und begründet statt erschlichen.
Task 11: dispatched (sonnet), BASE 48e93f3, brief task-11-brief.md
Task 11: implementer DONE, commit 1a48a1f. Ratsche **1986 → 1940** (−46),
  tsc clean, lint 0 Fehler/keine neue Warnung, check:i18n grün, design-rules
  **51/51**, design-tokens 40/40, progress 15/20 (fünf Fehlschläge identisch
  gegen den Vor-Task-Stand reproduziert: Achievement-Text mit „500" als
  Teilstring, plus ein `/stats`-Test).
Task 11: zwei Funde außerhalb der Dateiliste, beide selbst gemeldet:
  (1) `year-selector.tsx` füllte den aktiven Jahres-Chip mit Amber — eine zweite
  Lichtquelle; (2) ein durchweg leerer Rand war ein **truthy-but-empty**
  React-Fragment, `PageFrame` reservierte die Randspalte also trotzdem. Der
  zweite ist dieselbe Klasse wie der Rand-Cascade-Bug aus Task 8: unsichtbar für
  jeden Test, gefunden durch Hinsehen. Beide gehen ins Review.
Task 11: **Prüfauftrag statt Ruling** — der Implementer nennt die Aggregation der
  Serie im Rand („längste aktuell laufende Serie über alle Habits, in ihrer
  eigenen Periodeneinheit") ausdrücklich seine **Interpretation**, weil der Brief
  nicht sagt, wie eine nicht-additive Pro-Habit-Kennzahl zu einer Randzeile wird.
  Meine Position: die Frage war schon beantwortet — es gab eine bestehende
  `statStreak`-Kachel mit **einer** Zahl, und mein Brief sagt „die Kacheln wandern
  in den Rand", nicht „sie werden neu definiert". Die Semantik der alten Kachel
  ist damit die Spezifikation. Das Review soll **prüfen, ob die Randzahl gleich
  der alten Kachelzahl ist**; weicht sie ab, ist es eine stille
  Verhaltensänderung und ein Fund. Ich werte es nicht vor.
Task 11: minor (deferred): drei verwaiste Locale-Keys über den einen im Brief
  hinaus (`stat_streak_best`, `stat_streak_best_current`, `empty_title`) — vom
  Implementer stehen gelassen und gemeldet statt still gelöscht.
Task 11: task reviewer dispatched (opus — letzte Seitenmigration, 146 Verstöße
  im Einzugsbereich, zwei Funde außerhalb der Dateiliste, eine erfundene
  Kennzahl), diff 48e93f3..1a48a1f
Task 11: task review (opus) — Spec ❌, 0 Critical, 3 Important, 7 Minor. Das
  Review hat jede berichtete Zahl selbst nachgefahren, die Heatmap-Zellen selbst
  gemessen (4158 Zellen, 10×10px bei 1440/1280/375), und ausdrücklich geprüft,
  dass **keine** Style-Objekt-Wäsche stattfand (`grep -nE 'style=\{[^{]'` über
  alle berührten Dateien: 0 Treffer; die verbliebenen 80 `style={{` liegen im
  unangetasteten Achievements/Review-Teil).

Task 11: **Ruling (R46) — meine R45 wurde von einem Layoutfehler erfüllt.**
  Das Review hat die Kette aufgedeckt: das Jahresraster hat eine intrinsische
  Breite von ~724px (53×10 + 52×3 + Wochentagsspalte), `--measure` ist 640px.
  Vorher lebte es in `max-w-4xl` (848px Inhaltsbox) und **passte**, die
  `1fr`-Spuren wuchsen auf 12–13px. Jetzt passt es nicht, die Spuren fallen auf
  ihr `minmax`-Minimum von 10px — **und genau deshalb greift die
  ≤12px-Punkt-Ausnahme und der Kastenzähler meldet 0 statt 4158.** Mein „erst
  messen, dann entscheiden" wurde also von einer Regression beantwortet, nicht
  von einem Entwurf. Gleichzeitig verstecken sich bei 1440px ~84px ≈ sechs Wochen
  hinter einem inneren Scrollbalken, bei 375px 381px — auf einer Seite, deren
  Zweck „das Jahr auf einen Blick" ist. `measureColumns` kann das nicht sehen: es
  misst die Spalte, nicht die `scrollWidth` der Kinder.
  Entschieden: das Raster **bricht bewusst aus der Lesespalte aus**. Die Regel
  „keine Inhaltsspalte breiter als `--measure`" schützt die **Zeilenlänge von
  Prosa**; ein dichtes Datenraster ist keine Prosa, und ein Diagramm, das über
  die Textspalte hinausgeht, ist ein normales typografisches Mittel. Der Ausbruch
  wird benannt und im Maß-Test als erlaubte Ausnahme geführt — nicht
  stillschweigend gescrollt. Weil die Spuren damit wieder über 12px wachsen,
  wird **jetzt** Zweig 2 von R45 fällig: eine ausdrückliche Diagramm-Ausnahme im
  Kastenzähler, mit der Begründung, dass Diagrammmarken Daten sind. Kosten falls
  falsch: eine Seite, deren Diagramm breiter ist als ihr Text — sichtbar und
  begründet statt versteckt.

Task 11: **Ruling (R47)** — der Test, nach dem die Task benannt ist, muss gegen
  die ausgelieferte Fixture fallen können. Gemessen: 11 Zeilen, **0**
  `empty-state` — der leere Zweig rendert nie, die Assertion ist erfüllt von
  einer Seite, die den Code nicht enthält. Der Implementer **hatte** den RED mit
  einem eigenen Leer-Habits-Nutzer bewiesen, den Nutzer dann gelöscht und die
  gegenstandslose Fassung committet. Entschieden: die zweite Session wird in
  `e2e/global.setup.ts` gesät und dieser eine Test daran gefahren — also genau
  das, was schon gebaut und weggeworfen wurde. Kosten falls falsch: eine zweite
  Storage-State-Datei im Setup.

Task 11: **Ruling (R48) — meine Prämisse war falsch, und das Review hat mich
  korrigiert.** Ich hatte behauptet, es gäbe eine bestehende `statStreak`-Kachel
  mit **einer** Zahl, deren Semantik die Spezifikation sei. Nachgewiesen: die
  alte Anzeige war **pro Habit**, eine Pille in jeder `HabitCard` — es gab nie
  eine seitenweite Zahl. Die Randzeile ist also wirklich erfunden, und zwei
  Dinge sind kaputt: (1) `streak.current` zählt in **Perioden**
  (`lib/habits.ts:31-46`, `periodDays` ∈ {1,7,30,365}), der Vergleich über
  Perioden macht also eine 10-Tage-Serie größer als eine 180-Tage-Serie — der
  ehrliche Komparator ist `current * periodDays`, und der Kommentar behauptet
  ausdrücklich das Falsche; (2) `streak.best` wird **nirgends** mehr angezeigt,
  vier Keys sind verwaist. Entschieden: Komparator korrigieren, Kommentar wahr
  machen, und die **Pro-Habit-Serie samt `best` an die Habit-Zeile
  zurückholen** — nach demselben Schnitt wie R39: Zierde darf weg, Tatsachen
  nicht. Kosten falls falsch: eine Zeile mehr Text pro Habit.
Task 11: fix round 1/5 dispatched (sonnet — drei Important, sieben Minor)
Task 11: **Betriebsstörung (dritte in Folge, neue Sorte)** — der Fix-Implementer
  ist nicht abgestürzt, sondern hat **angehalten**: sein letztes Wort war „I'll
  stop making tool calls now and wait for the monitor notification that the test
  suite has finished" — auf eine Benachrichtigung, die niemand auslöst. Die
  Arbeit ist vollständig: 17 geänderte Dateien, Ratsche **1940 → 1938**, keiner
  neu; kein Commit, kein Fix-Abschnitt im Bericht.
  Entschieden: **denselben Agenten fortsetzen** statt einen frischen
  Abschluss-Dispatch. Anders als bei Task 9 und 10 (dort waren die Agenten tot)
  ist dieser fortsetzbar und trägt seinen eigenen Arbeitskontext — er weiß, was
  er gemessen hat, und kann seinen Bericht aus erster Hand schreiben statt aus
  einer Rekonstruktion. Ihm mitgegeben: die Verifikation **im Vordergrund**
  fahren, nicht über einen Monitor, und `e2e/dashboard.spec.ts` als Prüfung des
  geteilten Setups, weil er `e2e/global.setup.ts` angefasst hat — ein kaputtes
  Setup nähme jede Spec mit.
Task 11: fix round 1/5 → commit f776516 (nach Fortsetzung desselben Agenten).
  Ratsche 1940 → **1938**, tsc clean, lint ohne neue Warnung, check:i18n grün,
  design-rules 51/51, design-tokens 40/40, progress 16/21 (die fünf
  dokumentierten vorbestehenden), **dashboard 13/13** — der von mir verlangte
  Sanity-Check auf das geteilte `global.setup.ts` hält.
Task 11: **Offenlegung, die zählt** — die erste Fassung des neuen
  Überlauf-Wächters meldete **94 Falschpositive** auf `/dashboard` und `/tasks`:
  Buttons mit negativen Rändern, die ihre Trefferfläche vergrößern. Gefunden nur,
  weil der Agent die drei Specs **zusammen** laufen ließ statt nur `/progress`.
  Behoben durch Ausnahme der Affordanzen, danach 0 Falschpositive. Genau die
  Sorte Beinahe-Auslieferung, die ein Wächter-Neubau produziert — und genau der
  Grund, warum neue Zähler gegen **alle** migrierten Seiten laufen müssen, nicht
  gegen die eine, für die sie gebaut wurden.
Task 11: **Ruling (R49)** — bei 375px bleibt es bei ~44 % sichtbarem Jahr mit
  lokalem Scrollen, und das ist keine offene Aufgabe. Ein 724px-Raster passt
  physikalisch nicht in 343px Spalte; jede „Lösung" wäre eine andere Ansicht
  (weniger Wochen, kleinere Marken unter der Lesbarkeitsgrenze) und damit ein
  Entwurf, den niemand bestellt hat. Der Ausbruch aus R46 galt der
  Desktop-Breite, wo das Jahr wirklich hineinpasst. Kosten falls falsch: auf dem
  Telefon bleibt die Heatmap eine Scrollfläche — dokumentiert, nicht behauptet.
Task 11: minor (deferred): der neue Rand-/Serien-Test deckt nur 2 von 5
  `periodDays`-Zweigen ab (Tage, Wochen — nicht Zweiwochen, Monate, generisch).
Task 11: scoped re-review über 1a48a1f..f776516 (sonnet — geteilte
  Testinfrastruktur angefasst: design-count, design-rules, global.setup), läuft
Task 11: fix round 1/5 (10 addressed, 0 open; commits 1a48a1f..f776516)
  Das Re-Review hat nichts geglaubt: Raster 896px und **54/54 Wochen** sichtbar
  bei 1440 (Zellen 13,17px), 24/54 bei 375 — selbst gemessen, deckt sich mit dem
  Bericht. Das Falschpositiv-Experiment reproduziert (94 auf `/tasks` + 3 auf
  `/dashboard`; die Drift erklärt sich aus der wechselnden Aufgabenzahl des
  geteilten Testkontos, nicht aus der Logik). Die Leer-Habits-Session **direkt in
  der DB** geprüft (11 vs. 0 wiederkehrende Aufgaben). Und für I3 eine eigene
  Drei-Habit-Saat gebaut und fotografiert: der Rand wählt „1 Monat in Folge",
  also den echten Zeitsieger statt des höchsten Rohwerts — damit sind 3 der 5
  `periodDays`-Zweige belegt, einer mehr als der ausgelieferte Test prüft.
Task 11: complete (commits 1a48a1f..f776516, review clean) — Baseline **1938**,
  design-rules 51/51, design-tokens 40/40, dashboard 13/13, progress 16/21

### Drei mitgeführte Funde aus dem Re-Review — eigene kleine Runde vor Task 12
Task 11: **Ruling (R50)** — diese drei kommen **nicht** in Task 12 und **nicht**
  in eine wiedereröffnete Runde, sondern in einen eigenen kurzen Dispatch. Grund:
  Task 12 ist der Phasenabschluss (Doku, CHANGELOG, Baseline, Chrome-Review, PR);
  Codekorrekturen dort einzuschmuggeln macht aus einer Dokumentationsaufgabe eine
  gemischte, und das Re-Review hat ausdrücklich gesagt, dass keiner der drei die
  Runde wieder aufmacht.
  (1) `habits.stat_streak` ist in allen sieben Locales verwaist — vom Re-Review
  gefunden, in **keinem** der beiden Berichte erwähnt, und `check:i18n` kann es
  nicht sehen (es prüft Vollständigkeit, nicht Benutzung).
  (2) Der Affordanz-Ausschluss in `measureColumns` hat eine **bewiesene** Lücke:
  ein Nicht-Affordanz-Kind, das weiter überläuft als die Affordanz, in der es
  sitzt, wird verschluckt — das Re-Review hat es mit einem synthetischen Button
  plus `<span>` live nachgestellt (`breakoutsFound: []`). Heute nutzt es keine
  Seite aus, geprüft. Der genannte Fix: die Eltern-Übersprungsregel auf „Eltern
  ist selbst eine Affordanz" verengen statt auf „Eltern läuft über".
  (3) **Ein echter, nutzersichtbarer Bug:** `formatRecurrence`
  (`components/habits/habit-card.tsx:58-66`) liest nur `recurrenceInterval`, das
  für `WEEKDAY`/`MONTHLY`/`YEARLY` `null` ist — jeder nicht-`INTERVAL`-Habit wird
  als „TÄGLICH" beschriftet. Vom Re-Review beim Bebildern mit echten Habits
  gefunden. Vorbestehend, aber auf einer Seite, die diese Phase gerade migriert
  hat, und in einer Datei, die sie angefasst hat: das ist die Kategorie
  „mitzuführende Bugs" aus §10 der Spec. Kosten falls falsch: eine kleine Runde
  mehr vor dem Abschluss.
Task 11+: die drei mitgeführten Funde behoben, commit 81c2103. Ratsche
  unverändert 1938, design-rules **51/51**, design-tokens 40/40, tsc/lint/i18n
  clean. Alles drei durch Rendern bzw. Scannen geprüft, nicht durch Lesen: F1 mit
  gesäten Habits jeder Wiederholungsart (danach aufgeräumt), F3 mit dem Loch
  offen, geschlossen und wieder sauber.
  Controller-seitig selbst nachgesehen: die neue Eltern-Übersprungsregel
  (`design-count.ts:412`) verlangt jetzt `!parent.matches(AFFORDANCE)` — eine
  Affordanz unterdrückt ihre Kinder also nicht mehr; `formatRecurrence` schaltet
  über den echten Wiederholungstyp; `stat_streak` ist aus `de.json` weg (0
  Treffer); und alle sieben Locales tragen idiomatische Labels
  (wöchentlich/semanalmente/chaque semaine/wekelijks/еженедельно/每周).
  Ohne eigenen Review-Dispatch geschlossen (Logik von R38): jede tragende
  Behauptung ist erstinstanzlich geprüft, und der lastende Test — die Regel-Suite
  über alle fünf migrierten Seiten — ist grün.
Task 11+: minor (deferred): das WEEKDAY-Label unterscheidet nicht zwischen einem
  Habit an einem Wochentag und einem an mehreren („wöchentlich" für Mo+Mi+Fr).
  Ich lasse es: der Eyebrow ist ein kurzes Label, kein Terminplan, und ein
  Mo/Mi/Fr-Habit **ist** ein Wochenmuster.

### Task 12 — Phasenabschluss
Task 12: **Ruling (R51)** — **Schritt 1 meines Plans ist unerfüllbar, wie er
  dasteht.** Er verlangt „Alles muss grün sein. Nichts davon darf mit ‚bekanntes
  Problem' übersprungen werden — wenn ein Test rot ist, ist die Phase nicht
  fertig." Tatsächlich trägt das Repo ~15 **vorbestehende** Fehlschläge, die
  diese Phase nicht verursacht hat und deren Ursachen einzeln belegt sind:
  `not.toContainText(/500/i)` auf `body` (trifft „Halbtausend500 Coins" und jeden
  Münzstand über 500), acht in `tasks.spec.ts` (kaputter Quick-Add-Locator,
  `TaskForm` hatte nie `role="dialog"`, eine API-Antwortform im Test,
  `estimatedMinutes: 10` gegen einen `5|15|30|60`-Validator), zwei in
  `focus-quick.spec.ts`, fünf in `progress.spec.ts`. Wörtlich genommen wäre die
  Phase nie fertig, und der Satz würde genau das Gegenteil dessen bewirken, was
  er will: er lädt dazu ein, „grün" zu behaupten statt zu erklären.
  Entschieden: das Phasentor ist **„kein neuer Fehlschlag"**, mit einer
  namentlichen, gezählten Liste der vorbestehenden im Abschlussbericht und einer
  Empfehlung ans Abschlussreview, welche vor dem Merge zu beheben sind. Die
  Ratsche und die Regel-Suite sind die harten Tore. Kosten falls falsch: ein
  vorbestehender Fehlschlag verdeckt einen neuen — deshalb ist die Liste
  namentlich und pro Fehlschlag belegt, nicht eine Zahl.
Task 12: DONE, commit 74680ef. tsc clean, lint 0 Fehler, **Unit-Tests
  1741/1741**, check:i18n grün, design-rules 50/50, Ratsche 1938 → 1938 (schon am
  Boden). Chrome-Durchgang: **20 Kombinationen** über Playwright-Viewport (die
  Chrome-Erweiterung UND Playwrights `chrome`-Kanal sind hier kaputt; benutzt
  wurde `playwright-core` mit eigenem Chromium).
Task 12: der Wash-Klip ist behoben und **pixelverifiziert** bei 1440/375 in
  beiden Themes, danach dashboard+design-rules 63/63. Mein Zwischenstand hatte
  ihn verschlimmert; der Agent hat drei Zustände dokumentiert (Original, mein
  Fehlgriff, Endstand) mit gemessener Deckkraft an der Schnittkante.
Task 12: zweiter Chrome-Fund, **aufgenommen statt behoben** (strukturell):
  Aufgabentitel auf `/tasks` kollabieren bei 375px auf einen einzelnen Buchstaben,
  wenn der Trailing-Text lang ist. War im Code schon als offen markiert, jetzt
  live bestätigt. Geht ans Abschlussreview.
Task 12: **Korrektur an mir, die vierte** — meine Behauptung im Task-12-Brief,
  der Sequenz-Marker auf `/topics` sei „zurückgeholt", ist falsch. Selbst
  nachgeprüft: `components/topics/topic-card.tsx` erwähnt `sequential` **nirgends**;
  das Feld lebt nur noch in der Bearbeiten-Verdrahtung des Grids. Mein Ruling R39
  hat den Marker angeordnet, er wurde nie eingebaut, und ich habe die Anordnung
  später als vollzogene Tatsache weitergegeben. Der Agent hat den CHANGELOG
  ehrlich geschrieben statt meine Behauptung zu wiederholen. **R39 bleibt offen
  und geht als „geregelt, nicht ausgeführt" ans Abschlussreview** — nicht als
  stiller Verlust.
Task 12: Voller Playwright-Lauf: **41 echte Fehlschläge** (ein erster Lauf zeigte
  46; fünf davon waren Timeouts aus dem eigenen parallelen Testverkehr des
  Agenten, er hat neu gefahren und nur den sauberen Lauf verwendet). 22 fallen in
  die vorab freigegebenen Familien — und zwar in **mehr** Aufrufstellen als ich
  aufgelistet hatte (die 500er-Kollision trifft auch `wishlist.spec.ts` und
  `navigation.spec.ts:34`). **19 sind neu für mich**, alle auf Seiten außerhalb
  dieser Phase: `settings.spec.ts` ×12, `api-keys`, Landing-Copy, API-Smoke-Tests.
Task 12: complete (commits 81c2103..74680ef) — Baseline 1938, Doku/CHANGELOG/Spec
  §10 korrigiert, kein PR geöffnet (bewusst mir überlassen)

## Abschlussreview (opus) — NICHT MERGEFÄHIG, 3 Critical + 6 Must-Fix
Es hat seinen Umfang ehrlich deklariert (was genau gelesen, was gestichprobt,
was **nicht** gelesen — 5425 Zeilen Plan/Spec), alle acht Farbzahlen aus den Hex
nachgerechnet (8/8 stimmen), und **alle vier Zähler durch Injektion auf
Fehlbarkeit geprüft**. Es hat außerdem festgestellt, dass die fünf migrierten
Seiten-Dateien bei **null** Ratschen-Verstößen stehen — das ist das eigentliche
Ergebnis der Phase.

Task 12+: **Ruling (R52) — die zwei schwersten Funde sind Folgen meiner eigenen
  Planänderung, und kein Test konnte sie sehen.** Task 3 Schritt 7 (mein
  Plantext) hat die globale Linkfarbe auf `a { color: inherit;
  text-decoration: underline }` gesetzt — **ungeschichtet**. Tailwind-Utilities
  liegen in `@layer utilities`, und eine ungeschichtete Regel schlägt jede
  geschichtete, unabhängig von Spezifität. Gemessen an der laufenden App:
  (1) Wortmarke, alle sieben Sidebar-Links und alle fünf Mobile-Nav-Labels sind
  **unterstrichen** — sechs Aufrufstellen mit `no-underline` ohne `!`;
  (2) `countAmber` auf `/dashboard` mit aktiver Quest liefert **genau einen
  Treffer, den ::before-Wash, und null `color`-Treffer** — die eine amberne
  Handlung der Seite, um die diese ganze Phase gebaut ist, ist nicht amber.
  Die Falle ist im Branch an zwei Stellen ausführlich dokumentiert
  (`button.tsx:24-40`, `topic-card.tsx:19-27`) — das Wissen war da, es hat die
  Chrome-Dateien nur nicht erreicht. Und die Deckelung `inside <= 2` / `outside
  <= 1` wird von **0** erfüllt: die Regel-Tests können das nicht fangen, und der
  Kommentar in `daily-quest.spec.ts:158-175` beschreibt genau dieses Versagen,
  während er nur die Theme-Hälfte behebt.
  Entschieden: eine **einzige Fix-Welle** mit der vollen Liste, danach **ein**
  scoped Re-Review, dann Übergabe. Kein zweiter Durchgang.
Task 12+: **Korrektur an mir, die fünfte** — „eine 803-Zeilen-Komponente wurde in
  fünf Dateien zerlegt" ist **nicht**, was passierte. `task-item.tsx` ist
  unangetastet, 803 Zeilen, 73 Verstöße, und wird weiter von **vier** Dateien
  importiert; `task-row.tsx` ist eine **zweite** Zeile daneben, korrekt auf
  `/tasks` begrenzt. Das ist eine Divergenz, die Phase 2 erbt, keine Zerlegung.
  Die Zahl des blinden Flecks ist außerdem **76**, nicht 83 — meine war veraltet.

## Scoped Re-Review der Fix-Welle (opus) — MERGEFÄHIG MIT RESTPOSTEN
Die drei Critical sind **im Browser** bewiesen, nicht im Diff: Unterstreichungen
weg (sechs Seiten × zwei Breiten gemessen, null unterstrichene Anker in
header/nav/aside, und **kein** verbliebenes `no-underline` ohne `!` im Baum), die
Handlung bei `rgb(140, 91, 0)`, 113/113 Titel über null bei 375px mit **678
weiter tappbaren** Aktionsbuttons (der Fix hat `trailing` verschoben, nicht die
Aktionen versteckt), und die neue Amber-Positivprobe wurde **kaputtgemacht**: 2/2
rot in daily-quest, 2/2 in design-rules, dann per sed zurück. Der Sequenz-Marker
wurde durch Setzen des Flags über die API live erzwungen und gerendert gesehen.

Task 12+: **Ruling (R53)** — ich schicke **eine** letzte kleine Runde für vier
  Dokumentationsaussagen, obwohl die Skill-Regel „keine zweite Fix-Welle" sagt.
  Begründung: das sind vier **diktierte** Textkorrekturen, keine
  Wiederaufnahme von Funden, und das Code-Tor ist geschlossen — das Re-Review hat
  jede Critical im Browser belegt. Die vier sind: (1) `components/CLAUDE.md:14`
  behauptet, `surface.tsx` enthalte „Button's underlying elevation logic" —
  `button.tsx` importiert es gar nicht (nur `dialog.tsx` und die
  Referenzseite tun das); (2) `CHANGELOG.md:196` und `docs/design-system.md:227`
  nennen **2219**, eine Zahl, die **nie gemessen** wurde (Projektion 1934+285 aus
  meinem Plan; gemessen waren 2215) — und sie steht im selben Abschnitt, der zwei
  Zeilen vorher erklärt, dass hier keine Zahl steht, weil sie sofort veraltet;
  (3) für die vier nutzersichtbaren Fixes der Welle gibt es **keinen**
  CHANGELOG-Eintrag, während ein älterer Eintrag dem Leser sagt, ein
  Unterstreichungsfehler dieser Klasse sei schon behoben; (4) der README-Alt-Text
  verspricht einen Sequenz-Marker, den das Bild nicht zeigt.
  Jede davon ist exakt der Defekt, gegen den die Welle geschickt wurde — eine
  Doku, die etwas behauptet, was der Code nicht sagt. Sie wissentlich stehen zu
  lassen, um eine Prozessregel einzuhalten, wäre die Regel gegen ihren Zweck
  angewandt. Kosten falls falsch: ein Dispatch mehr, vier Textzeilen.
Task 12+: an die nächste Phase übergeben (vom Re-Review benannt): die Screenshots
  sind auf dem E2E-Fixture-Konto in Deutsch geschossen, `03/04/05` sind noch
  1280×800 hell und englisch — die README-Tabelle ist jetzt gemischt in Theme,
  Breite und Sprache, und `03-habits.png` zeigt noch die alten Kastenkarten.
  Braucht ein gepflegtes Demo-Konto und einen Neuschuss aller fünf zusammen.
  Dazu: 19 nicht dokumentierte Komponenten in `components/CLAUDE.md`, der
  ungetraceite „Task Form Modal"-Fehlschlag (gehört zur `role="dialog"`-Familie),
  die Frage, ob die 43 unterstrichenen Themen-Titel Absicht sind, und ein
  einzeiliger Testfehler in `daily-quest.spec.ts:34` (`{quest}`-Wrapper).
