# Nachprüfung der Phase-1-Seiten in ihren Zuständen

Gemessen am 2026-08-28, Anlass: Spec Phase 2 §5. Die Phase-1-Zähler haben jede
Seite in genau **einem** Zustand gesehen — dem, den `page.goto(path)` herstellt.
Diese Prüfung fragt, ob unter den anderen Zuständen dasselbe liegt wie unter
`/progress`' zwei ungemessenen Tabs.

Instrumente: `countAmber`, `countDisplayFont`, `countBoxes`, `measureColumns`,
`gotoWithTheme` — dieselben wie `e2e/design-rules.spec.ts`, gefahren aus einer
Wegwerf-Sonde (`e2e/zustandssonde.spec.ts`, nach dem Lauf gelöscht: eine Spec,
die nur misst und immer grün ist, wäre ein Test, der nichts behauptet).
Viewport 1440×900, beide Themes, Konto `e2e@momotest.local`, Locale `en`.
**Beide Themes lieferten überall identische Zahlen** — mit einer Ausnahme
(`/topics` · Themenformular: 4 dark / 3 light, der Unterschied ist ein
Farbfeld-Button, dessen Nutzerfarbe nur im Dunkelschema in die Amber-Toleranz
fällt). Die Tabelle führt deshalb eine Zeile je Zustand, nicht je Zustand×Theme.

## Warum die Lücke dieselbe ist, eine Ebene tiefer

```mermaid
flowchart LR
  G["page.goto(path)"] --> S["EIN Zustand:<br/>frisch geladen, nichts fokussiert,<br/>nichts überfahren, nichts geöffnet"]
  S --> M["die vier Zähler"]
  X1["Tastaturfokus"] -.unerreicht.-> M
  X2["Zeiger über einer Zeile"] -.unerreicht.-> M
  X3["Menü / Formular / Modal offen"] -.unerreicht.-> M
  X4["eingeklappter Abschnitt"] -.unerreicht.-> M
  X5["Zustand nach einer Mutation"] -.unerreicht.-> M
```

`e2e/design-rules.spec.ts` und `e2e/helpers/design-count.ts` enthalten **kein**
`click`, `hover`, `press`, `focus` oder `fill` (per grep verifiziert).
`gotoSettled` navigiert und wartet auf `opacity: 1`, mehr nicht. Alles, was erst
durch eine Interaktion entsteht, ist damit nicht ungeprüft-und-in-Ordnung,
sondern **unmessbar** — dieselbe Kategorie wie `/progress`' zwei inaktive Tabs.

## Ergebnis

Regeln: Amber `außerhalb ≤ 0` bei vorhandenem Lichtkegel, sonst `≤ 1`; Fraunces
in `main` genau `1`; Kästen in `main` `0`; mindestens eine `[data-column]`,
keine breiter als `--measure`, kein unbenannter Überlauf.

| Zustand | erreichbar per `goto`? | Amber | Fraunces | Kästen | Spalten | Verdikt |
|---|---|---|---|---|---|---|
| `/dashboard` · Standard | ja | 2 (beide im Licht) | 1 | 0 | 1 | ok |
| `/dashboard` · Energie-Picker offen | nein | 2 (im Licht) | 1 | 0 | 1 | ok |
| `/dashboard` · Aufschlüsselungs-Modal | nein | 2 (im Licht) | 1 | 0 | 1 | ok |
| `/dashboard` · 5× Tab (Tastaturfokus) | nein | **3** (1 außerhalb) | 1 | 0 | 1 | **Amber** |
| `/tasks` · Standard | ja | 1 | 1 | 0 | 1 | ok |
| `/tasks` · Prioritätsfilter aktiv | nein | 1 | 1 | 0 | 1 | ok |
| `/tasks` · Nach Thema gruppiert | nein | 1 | 1 | 0 | 1 | ok |
| `/tasks` · Pausiert + Erledigt aufgeklappt | nein | 1 | 1 | 0 | 1 | ok |
| `/tasks` · Zeile mit Zeiger überfahren | nein | 1 | 1 | 0 | 1 | ok |
| `/tasks` · Auswahlmodus, nichts gewählt | nein | 0 | 1 | 0 | 1 | ok |
| `/tasks` · Auswahlmodus, 1 Zeile gewählt | nein | 1 | 1 | **1** | 1 | **Kasten** |
| `/tasks` · Suche ohne Treffer (Feld fokussiert) | nein | **2** | 1 | 0 | 1 | **Amber** |
| `/tasks` · 8× Tab (Tastaturfokus) | nein | **2** | 1 | 0 | 1 | **Amber** |
| `/tasks` · Snooze-Menü offen | nein | **2** | 1 | 0 | 1 | **Amber** |
| `/tasks` · Formular „Neue Aufgabe" offen | nein | **5** | **2** | **2** | 1 | **Amber, Fraunces, Kästen** |
| `/topics` · Standard | ja | 1 | 1 | 0 | 1 | ok |
| `/topics` · Karte mit Zeiger überfahren | nein | 1 | 1 | 0 | 1 | ok |
| `/topics` · Vorlagenwähler offen | nein | **11** | 1 | 0 | 1 | **Amber** |
| `/topics` · Themenformular (Bearbeiten) | nein | **4** / 3 | 1 | 0 | 1 | **Amber** |
| `/topics/[id]` · Detailseite | Route steht in keiner Liste | **6** | **2** | **5** | **0** | **alle vier** |
| `/focus` · Auswahlphase | ja | 1 | 1 | 0 | 1 | ok |
| `/focus` · Arbeitsphase | nein | 1 | 1 | **1** | 1 | **Kasten** |
| `/focus` · Schlussphase | nein | 1 | 1 | 0 | 1 | ok |

Vier Zustände sind per `goto` erreichbar und grün — genau die, die schon
gemessen wurden. **Von 19 Zuständen dahinter sind 9 rot.**

## Zustände, die auch die Sonde nicht herstellen konnte

| Zustand | warum nicht |
|---|---|
| `/topics` · Archiv aufgeklappt | das Testkonto hat kein archiviertes Thema — der Abschnitt rendert gar nicht |
| `/dashboard` · Quest erledigt, Level-Up, Achievement-Toast | erfordert `POST /complete`, mutiert das geteilte Testkonto |
| `/dashboard` · Empty-State „neuer Nutzer" | erfordert ein Konto mit 0 Themen und 0 Abschlüssen |
| `/tasks` · Empty-State, Wisch-Vorschau | Konto hat Aufgaben; Wischen braucht Touch-Events |
| `/focus` · Empty-State, `completionError` | erfordert 0 offene Aufgaben bzw. einen Netzfehler |

Diese Zustände sind **weder geprüft noch als geprüft vermerkt** — die gleiche
Kategorie wie `/topics/[id]`, nur ohne eigene Route.

## Die Funde

| # | Fund | Datei | Regel | Zuordnung | behoben? |
|---|---|---|---|---|---|
| 1 | Der Fokusindikator ist amber: `outline` **und** ein 6-px-`box-shadow`-Halo. Sobald irgendetwas Fokus hat, trägt jede Seite ein Amber mehr — auch ein Radix-Menü, das sich beim Öffnen selbst fokussiert. | `app/globals.css:541-547` | Amber | keiner Phase zugeordnet | nein |
| 2 | `countAmber` liest `color`, `background*`, `box-shadow`, `fill`, `stroke`, `border-*`, `::before/::after` — **nicht `outline-color`**. Fund 1 wird nur über sein Halo sichtbar; ohne den `box-shadow` wäre er unsichtbar. | `e2e/helpers/design-count.ts` | — (Zählerlücke) | Phase 2, aber s. u. | nein |
| 3 | `::selection { background-color: var(--accent-amber) }` — Amber als Fläche, und für keinen Zähler sichtbar (`countAmber` kennt nur `::before`/`::after`). | `app/globals.css:555-558` | Amber als Fläche | keiner Phase zugeordnet | nein |
| 4 | Eingabefeld-Fokusring `focus-visible:ring-[var(--accent-amber)]`. | `components/ui/input.tsx:18` | Amber | keiner Phase zugeordnet | nein |
| 5 | Aufgabenformular: Panel mit `border` + Backdrop-Fläche in `main` (kein `role="dialog"`, also greift die Overlay-Ausnahme nicht), zweites Fraunces (`h2` „New Task"), Amber als Button-**Fläche** und als Segment-Rahmen. | `components/tasks/task-form.tsx:325, 890, 279-285, 469-471` | Amber, Fraunces, Kästen | keiner Phase zugeordnet | nein |
| 6 | Themenformular: Amber als Button-Fläche („Save changes"), Amber-Rahmen/-Füllung an Auswahlfeldern. | `components/topics/topic-form.tsx:502, 345-350, 391-396` | Amber | keiner Phase zugeordnet | nein |
| 7 | Vorlagenwähler: 11 Amber-Treffer — Badge „In order" als amber getönte **Fläche**, dazu Icons. | `components/topics/template-picker.tsx:149-150, 214` | Amber als Fläche | keiner Phase zugeordnet | nein |
| 8 | Massenaktionsleiste: umrahmter Kasten in `main`, Amber als Textfarbe des Zählers. | `components/tasks/bulk-action-bar.tsx:85, 93` | Kästen | keiner Phase zugeordnet | nein |
| 9 | `/focus` Arbeitsphase: der aktive Fortschritts-Pip ist `h-2 w-6` mit `bg-[var(--ink)]` — 24 px breit, also über der 12-px-Punkt-Schwelle, und ohne `role="progressbar"`, also ohne die Fortschritts-Ausnahme. Zählt als gefüllte Inhaltsfläche. | `components/focus/focus-mode-view.tsx:274-283` | Kästen | Phase-1-Rest | nein |
| 10 | `/topics/[id]`: 6 Amber, 2 Fraunces, 5 Kästen, **0 `[data-column]`** — die Seite steht in keiner `MIGRATED_PAGES`-Liste und rendert über `topic-detail-view.tsx` das alte `TaskItem`. Weder migriert noch als unmigriert vermerkt. | `components/topics/topic-detail-view.tsx:228, 344, 398-399`, `components/tasks/task-item.tsx` | alle vier | Phase-1-Rest / keiner Phase zugeordnet | nein |
| 11 | `Row`s `actions`-Slot ist `opacity-0` + `pointer-events-none` bis Hover/Fokus (`@media (hover: hover)`). Jede Zeilenaktion auf `/tasks`, `/topics`, `/focus`, `/quick`, `/wishlist`, `/progress` ist damit für die Zähler unsichtbar — der `opacity: 0`-Guard überspringt sie zusätzlich. | `components/ui/list.tsx:374-393` | — (Messlücke) | Phase 2 | **nein, geprüft und leer** |

## Was behoben wurde

**Nichts.** Die Entscheidungsregel des Briefs lautet: beheben nur, wo der Fund in
einer Datei liegt, die Task 1–7 ohnehin angefasst hat. Abgeglichen gegen
`git diff --name-only main...HEAD` liegt **kein einziger Fund** in einer solchen
Datei. Die zwei Berührungspunkte, die es gibt, sind keine Verstöße:

- **Fund 11** liegt in `components/ui/list.tsx` — einer Phase-2-Datei. Die
  Hover-Gatterung ist aber eine bewusste, dokumentierte Entscheidung
  (Task-4-Review, Important 5: ohne sie wären die Aktionen auf Touch
  dauerhaft unsichtbar, aber antippbar). Und die Messung mit erzwungenem
  Hover zeigt: **hinter dem Gatter liegt auf `/tasks` und `/topics` nichts** —
  1 Amber, 1 Fraunces, 0 Kästen, unverändert gegenüber dem Standardzustand.
  Der blinde Fleck ist echt, der Inhalt dahinter ist heute sauber. Nichts zu
  beheben; die Lücke ist benannt, damit sie beim nächsten Zeilen-Icon nicht
  wieder unbemerkt bleibt.
- **Fund 2** liegt in `e2e/helpers/design-count.ts`, ebenfalls Phase 2. Ein
  `outline-color`-Zweig wäre ein Zweizeiler — er würde aber Fund 1 auf **jeder**
  Seite scharf schalten, sobald ein Test etwas fokussiert, und Fund 1 lässt sich
  in dieser Task nicht beheben (`app/globals.css` gehört keiner Phase). Einen
  Zähler zu schärfen, dessen Fund man nicht beheben darf, macht die Suite rot
  ohne Gegenwert. Benannt, nicht gebaut.

## Was benannt und stehen gelassen wurde

Alle 11 Funde. §7 der Spec ordnet Phase-1-Reste (`task-item.tsx`), Phase 3
(`components/settings`, `/admin`, `api-keys`) und Phase 4 (Legal, Login,
Onboarding, `app/page.tsx`) zu — **acht der elf Funde stehen in keiner dieser
Listen**: `app/globals.css`, `components/ui/input.tsx`, `task-form.tsx`,
`topic-form.tsx`, `template-picker.tsx`, `bulk-action-bar.tsx`,
`topic-detail-view.tsx`, `focus-mode-view.tsx`.

Das ist der Fund hinter dem Fund: die Phasenaufteilung ist nach **Seiten**
geschnitten, die Verstöße sitzen aber in **Formularen, Menüs, Leisten und einem
globalen Fokusstil**, die keiner Seite gehören. Solange die Zähler nur Routen im
Ruhezustand messen, fällt das nicht auf.

## Was diese Prüfung nicht kann

| Grenze | Folge |
|---|---|
| Fixtures häufen sich an | `e2e/global.setup.ts:8-21` beschreibt es selbst: das Konto `e2e@momotest.local` sammelt über Läufe hinweg. `playwright.config.ts:41-48` hat genau ein `chromium`-Projekt, `design-rules.spec.ts` überschreibt den `storageState` nicht. **Was eine Seite misst, hängt an der Fixture-Hygiene fremder Spec-Dateien.** `/topics` hatte kein archiviertes Thema — nicht weil keins vorgesehen ist, sondern weil zufällig keins übrig war. |
| Grün beweist wenig | Task 6s erster `/wishlist`-Lauf lief gegen eine leere Seite: Kopf, Knopf, Empty-State, vierzeiliger Rand. Er war grün und hat nichts gemessen. |
| Bildquellen | `getComputedStyle` liest keine Farbe aus `<img>`, `background-image: url(...)` oder `<use href>` — siehe die JSDoc in `design-count.ts`. |
| `outline`, `::selection`, `::marker` | von keinem der vier Zähler gelesen (Funde 2 und 3). |
| Touch-Gesten | die Wisch-Vorschau in `task-row.tsx` ist nur während einer aktiven Geste sichtbar. |

## Nicht zu verwechseln mit einem Kanarienvogel

Zwölf Fehlschläge in `e2e/progress.spec.ts` und `e2e/navigation.spec.ts` sind
erwartet und **kein** Signal: die dortigen `not.toContainText(/500/i)` über den
ganzen `body` kollidieren mit zwei Achievement-Definitionen der App selbst —
`lib/gamification.ts:277-279` (`coins_500`) und `:334-336` (`tasks_500`), dazu
`:75`s `minCoins: 500`. Das ist dauerhafte Produktdaten; keine Fixture-Hygiene
behebt es.
