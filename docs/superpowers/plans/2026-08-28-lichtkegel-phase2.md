# Lichtkegel Phase 2 — Implementierungsplan (Die Zahlen-Seiten)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die vier Zahlen-Ansichten (`/progress?tab=review`, `?tab=achievements`, `?tab=stats`, `/wishlist`, `/quick`) auf das Lichtkegel-System migrieren, `/stats` als vierten Tab von `/progress` einziehen lassen, und die Messeinheit von Routen auf **Zustände** umstellen, damit ein Tab nicht länger ungeprüft bleiben kann.

**Architecture:** `progress-tabs.tsx` (597 Zeilen, zwei Tabs) zerfällt in einen ~30-Zeilen-Dispatcher plus `tabs/*.tsx` — je ein Tab, der seinen eigenen `PageFrame` samt Rand besitzt und die gemeinsame Kopfzeile als `header`-Prop bekommt. `app/(app)/stats/page.tsx` wird zum Redirect-Stub, sein Inhalt zu `tabs/stats-tab.tsx`. `wishlist-card.tsx` (667 Zeilen) zerfällt in `wishlist-row.tsx` + `wishlist-row-actions.tsx` und benutzt den vorhandenen `useTaskSwipe`-Hook. `/quick` tauscht `TaskItem` gegen `TaskRow`. Jede Migrationstask beginnt damit, ihren Zustand in `MIGRATED_PAGES` einzutragen — der rote Test ist der Anfang der Task, nicht ihr Nachgedanke.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS v4 (`@theme inline`), next-intl v4, Motion, Playwright, Node-Scripts (`.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-28-lichtkegel-phase2-design.md`
(Vorgänger, weiter gültig: `docs/superpowers/specs/2026-08-21-lichtkegel-design.md` — Tokens, Farbregeln; `docs/superpowers/specs/2026-08-22-lichtkegel-rollout-design.md` — Maß, Listen-Primitive, Durchsetzung)

---

## Global Constraints

Jede Task-Anforderung enthält diesen Abschnitt implizit.

- **Farbe nur über `var(--…)`.** Kein Hex, kein `rgb()`/`hsl()`, kein `white`/`black`, keine Tailwind-Palettenutility. Einzige Ausnahme: die frei gewählte Nutzer-Themenfarbe, ausschließlich als 6-px-Punkt (`Row`s `dotColor`).
- **Radius nur über vier Token:** `--radius-sm` 7px, `--radius-md` 11px, `--radius-lg` 14px, `--radius-pill` 999px.
- **Abstand nur aus der Skala `4 · 8 · 12 · 16 · 24 · 32 · 48 · 72`** — in Tailwind `p|m|gap|space-*` mit `0 · px · auto · 1 · 2 · 3 · 4 · 6 · 8 · 12 · 18` oder `[var(--space-N)]` / `[var(--gutter)]`.
- **Amber höchstens einmal pro Seite**, gezählt über das **gesamte Dokument**, und nur als Text oder weicher Wash — nie als Fläche, nie als Rahmen. Der Rand (`aside[data-rail]`) trägt **nie** Amber.
- **Fraunces genau einmal pro Seite**, innerhalb von `main`. Auf allen Seiten dieser Phase ist das die Seiten-/Tab-Kopfzeile. Abschnittsüberschriften sind Mono-Eyebrows: `GroupHeading` (`0.6875rem`, versal, `tracking-[0.16em]`, `--ink-3`).
- **Null umrahmte oder gefüllte Inhaltsflächen.** Eine Kante nur an einer echten Affordanz. `countBoxes` nimmt aus: Affordanzen (`button, input, a, label, …`), `[role="progressbar"]`, `[role="dialog"]/[role="menu"]/[role="tooltip"]`, `[role="gridcell"]` und alles ≤ 12×12 px.
- **Keine Inhaltsspalte breiter als `--measure`** (640 px). Ein bewusster Überlauf trägt `data-breakout="chart"`.
- **`--done` heißt ausschließlich „erledigt"**, `--danger` ausschließlich Zerstörung, Überfälligkeit **und fehlgeschlagene Handlungen** (die eine benannte Erweiterung dieser Phase: die Fehlermeldung „nicht genug Münzen" in `wishlist-view.tsx` bleibt `--danger`, weil eine unsichtbare Fehlermeldung ein Accessibility-Defekt ist; sie ist kein Statusabzeichen). „Leistbar" / „über Budget" / „Delta zur Vorwoche" sind **keine** dieser Bedeutungen und werden in `--ink-2`/`--ink-3` gesetzt.
- **Keine Schatten** außer `--shadow-overlay`.
- **7 Locales.** Jeder neue Key muss in `messages/{de,en,es,fr,nl,ru,zh}.json` stehen. `npm run check:i18n` muss grün sein. Diese Phase führt **genau zwei** neue Keys ein: `progress.tab_stats` und `wishlist.budget_total_spent`. Wo eine Randzeile eine Zahl braucht, wird das vorhandene Label-Pattern `{value} {label}` benutzt (Präzedenz: die Habits-Randsummen in `app/(app)/progress/page.tsx`), nicht ein neuer ICU-Key.
- **TypeScript strict, kein `any`.**
- **Die Ratsche darf nur sinken.** `npm run check:design`. Wichtig für diese Phase: eine **neue Datei ohne Baseline-Eintrag zählt als 0** — `--update` verweigert jede Erhöhung, auch für sie. Ein reiner *Umzug* von Verstößen in eine neue Datei ist deshalb unmöglich; jede neue Datei muss migriert geboren werden. Das ist der Grund, warum Extraktion und Migration in dieser Phase **dieselbe** Task sind.
- **Conventional Commits** mit Scope aus der CLAUDE.md-Liste. Nach jeder Task committen.
- **`main` ist branch-protected.** Die Arbeit läuft auf `design/lichtkegel-phase2` und geht per PR.
- **Playwright braucht einen laufenden Dev-Server** und `DATABASE_URL`:

  ```bash
  # Terminal 1
  npm run dev
  # Terminal 2
  DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test <datei>
  ```

- **`PLAYWRIGHT_TEST_PASSWORD` darf NICHT gesetzt sein.** Sobald die Variable existiert, hängt `lib/auth.ts` den Credentials-Provider an, Auth.js verwirft die Konfiguration mit `UnsupportedStrategy`, und jede geschützte Route leitet auf `/login`.
- **`--grep` ist ein Regex.** `?` in `?tab=review` ist ein Regex-Quantor — immer auf `tab=review` greppen, nie auf `/progress?tab=review`.

---

## Vorgefundener Zustand (gemessen 2026-08-28, HEAD `1fadd75`)

| Befund | Wert | Quelle |
|---|---|---|
| Ratschen-Baseline gesamt | **1938** Verstöße über 111 Dateien | `scripts/design-baseline.json` |
| `/wishlist` | **152** (card 59, view 29, budget-bar 25, form 18, loading 19, page 2) | dieselbe Datei |
| `/stats` | **111** (page 68, energy-week-block 28, weekday-chart 9, sparkline 6) | dieselbe Datei |
| `/progress` (achievements + review) | **94** in `progress-tabs.tsx`, plus **17** in `achievement-card.tsx` | dieselbe Datei |
| `/quick` | **18** (page 5, five-minute-view 13) | dieselbe Datei |
| **Summe Phase 2** | **392** | 152 + 111 + 111 + 18 |
| `MIGRATED_PAGES` heute | `/dashboard`, `/tasks`, `/focus`, `/topics`, `/progress` | `e2e/helpers/design-count.ts:30` |

Die Zahl der Spec (≈ 400) stimmt; die 392 sind dieselbe Messung ohne die zwei geteilten Komponenten (`achievement-toast.tsx` 17, `quick-add-modal.tsx` 22), die auf keiner dieser Seiten im Ruhezustand rendern.

---

## Vier Befunde, die die Spec nicht kennt

Alle drei sind gemessen, nicht vermutet. Sie ändern den Plan, nicht das Ziel.

### 1. `/stats` hat **zehn** Abschnitte, nicht neun

§2 der Spec listet neun (`overview`, `streak_history`, `progress`, `activity`, `weekdays`, `energy`, `tasks_by_type`, `tasks_by_priority`, `wishlist`). Es gibt einen zehnten: **`section_topics`** (`app/(app)/stats/page.tsx:652–767`, ein 2-spaltiges Raster mit Fortschrittsbalken je Thema). Er fällt weder unter „bleibt" noch unter „entfällt" — also zieht er um, wie die anderen sieben. Er wird als `List`/`Row` mit `dotColor` + `trailing="3/7"` migriert, genau wie `/topics` es in Phase 1 bekommen hat. Die Spec-Zeile „Acht von neun" liest sich danach als „Neun von zehn".

### 2. `/quick` rendert `TaskItem`, nicht `TaskRow`

`components/quick/five-minute-view.tsx:222` benutzt das alte `task-item.tsx` (803 Zeilen, die Karte). §7 der Spec stellt `task-item.tsx` ausdrücklich **nicht** in diese Phase. Das bleibt so: die Datei wird **nicht angefasst** — `/topics/[id]` benutzt sie weiter. Aber `/quick` kann nicht auf das Lichtkegel-System migrieren, solange es die Karte rendert. Task 7 tauscht deshalb den **Verbraucher** (`TaskItem` → `TaskRow`), nicht die Komponente. Ein Import-Wechsel, kein Eingriff in Phase-1-Reste.

### 3. `var(--font-display, 'Lora', serif)` bekommt keine eigene Aufgabe

59 Stellen schreiben diesen Fallback. Lora ist seit dem Fraunces-Wechsel nicht geladen, aber `--font-display` ist in `globals.css:247` immer definiert — der Fallback feuert nie. Toter Text, kein Defekt (Spec §6). Er verschwindet als Nebenwirkung jeder Migration in diesem Plan, weil es `style={{…}}`-Objekte sind und die Ratsche sie ohnehin zählt. **Keine Suchen-und-Ersetzen-Aufgabe** — wer ihn außerhalb einer migrierten Datei findet, lässt ihn stehen.

### 4. `WITH_LIGHT` und `CHROMELESS` brauchen keine Änderung

§5 warnt, die beiden Mengen in `e2e/design-rules.spec.ts` müssten „die neuen Einträge kennen". Gemessen: beide sind **Positivmengen** (`WITH_LIGHT = {"/dashboard"}`, `CHROMELESS = {"/focus"}`), und die Erwartung für alles andere ist „kein Lichtkegel, aber ein `<header>`". Alle fünf neuen Zustände liegen in der `(app)`-Route-Group (Header vorhanden) und tragen keinen `.lichtkegel` — sie erfüllen die Default-Erwartung ohne Eintrag. Die Mengen bekommen in Task 1 einen JSDoc-Satz, der das festhält, damit der nächste Leser nicht dasselbe nachmisst.

---

## Dateistruktur

```
components/progress/
  progress-tabs.tsx          Dispatcher, ~35 Zeilen (Task 1 + 2 + 4)
  tabs/habits-tab.tsx        Umzug aus page.tsx + progress-tabs.tsx (Task 1)
  tabs/review-tab.tsx        neu, migriert                          (Task 1)
  tabs/achievements-tab.tsx  neu, migriert                          (Task 2)
  tabs/stats-tab.tsx         neu, aus app/(app)/stats/page.tsx      (Task 4)

components/achievements/
  achievement-row.tsx        ersetzt achievement-card.tsx           (Task 2)

components/stats/
  streak-sparkline.tsx       migriert, bleibt                       (Task 3)
  weekday-chart.tsx          migriert                               (Task 3)
  energy-week-block.tsx      migriert                               (Task 3)

components/wishlist/
  wishlist-row.tsx           ersetzt wishlist-card.tsx              (Task 5)
  wishlist-row-actions.tsx   die Kaufaktion                         (Task 5)
  wishlist-view.tsx          PageFrame + Rand + List                (Task 5/6)
  budget-bar.tsx             zieht in den Rand, + totalSpent        (Task 6)
  wishlist-form.tsx          Token-Aufräumung                       (Task 6)

app/(app)/stats/page.tsx     → Redirect-Stub                        (Task 4)
app/(app)/progress/page.tsx  → ~60 Zeilen: auth, Tab, Kopfzeile     (Task 1)
app/(app)/wishlist/page.tsx  → PageFrame-Kopfzeile                  (Task 6)
app/(app)/wishlist/loading.tsx → Haarlinien-Skelett                 (Task 6)
app/(app)/quick/page.tsx     → PageFrame                            (Task 7)
```

`useTaskSwipe` (`components/tasks/use-task-swipe.ts`) wird **wiederverwendet, nicht kopiert und nicht umbenannt**: der Hook nimmt `onComplete`/`onDelete`/`disabled` und weiß nichts über Aufgaben. Ein Umzug nach `components/ui/` wäre eine Umbenennung ohne Verhaltensänderung, die eine Phase-1-Datei anfasst — dafür bekommt der Hook stattdessen einen JSDoc-Satz, dass die Wunschliste ihn mitbenutzt.

---

## Task 1: Der Review-Tab wird Lichtkegel — und die Dateistruktur entsteht dabei

**Files:**
- Create: `components/progress/tabs/habits-tab.tsx`
- Create: `components/progress/tabs/review-tab.tsx`
- Modify: `components/progress/progress-tabs.tsx` (597 → ~250, nur noch Dispatcher + Achievements)
- Modify: `app/(app)/progress/page.tsx` (243 → ~65)
- Modify: `components/ui/list.tsx` (ein neues Export: `RAIL_LINE`)
- Modify: `e2e/helpers/design-count.ts:30` (`MIGRATED_PAGES`)
- Modify: `e2e/design-rules.spec.ts` (nur JSDoc an `WITH_LIGHT`/`CHROMELESS`)

**Warum Extraktion und Migration eine Task sind:** die Ratsche behandelt eine neue Datei ohne Baseline-Eintrag als 0 und verweigert jede Erhöhung, auch mit `--update`. Ein reiner Umzug der 94 Verstöße nach `tabs/review-tab.tsx` würde `npm run check:design` rot machen und wäre nur mit `--admit` durchzubekommen — einem Werkzeug für bewusste Ausnahmen, nicht für Zwischenzustände.

**Interfaces:**
- Produces: `components/progress/progress-tabs.tsx` exportiert
  ```ts
  export type Tab = "habits" | "achievements" | "review";
  export const VALID_TABS: Tab[];
  export interface ProgressTabsProps {
    tab: Tab;
    userId: string;
    /** Die eine Fraunces-Überschrift plus die Tab-Leiste. Jeder Tab rendert sie als erstes Kind seiner Lesespalte. */
    header: React.ReactNode;
    /** Roher `?year=`-Wert; nur der Habits-Tab wertet ihn aus. */
    yearParam?: string;
  }
  export async function ProgressTabs(props: ProgressTabsProps): Promise<React.ReactElement>;
  ```
- Produces: `components/progress/tabs/habits-tab.tsx` → `export async function HabitsTab({ userId, header, yearParam }: { userId: string; header: React.ReactNode; yearParam?: string })`
- Produces: `components/progress/tabs/review-tab.tsx` → `export async function ReviewTab({ userId, header }: { userId: string; header: React.ReactNode })`
- Produces: `components/ui/list.tsx` → `export const RAIL_LINE: string` — die Klassenkette einer Randzeile. **Sie gehört dorthin und nicht in `habits-tab.tsx`**, obwohl der erste Aufrufer dort steht: `budget-bar.tsx` (Task 6) ist eine Client-Komponente, und ein `import { RAIL_LINE } from ".../habits-tab"` zöge ein Modul mit `db`- und `drizzle`-Importen ins Client-Bundle. `components/ui/list.tsx` exportiert mit `ACTION_BTN` und `stageTitleClassName` bereits genau diese Art von geteilter Klassenkette.
- Consumes: `PageFrame` (`components/ui/page-frame.tsx`), `List`/`Row`/`GroupHeading` (`components/ui/list.tsx`), `EmptyState` (`components/ui/empty-state.tsx`).

---

- [ ] **Schritt 1: Den Zustand messbar machen — der rote Test**

`e2e/helpers/design-count.ts`, Zeile 30, wird zu:

```ts
export const MIGRATED_PAGES: string[] = [
  "/dashboard",
  "/tasks",
  "/focus",
  "/topics",
  "/progress", // = ?tab=habits, der Default
  "/progress?tab=review",
];
```

Und der JSDoc-Satz direkt darüber wird ersetzt:

```ts
/**
 * Seiten **und Zustände**, die auf das Token-System migriert sind.
 *
 * Bis Phase 2 war das eine Liste von Routen — und `/progress` stand darin,
 * obwohl `ProgressTabs` nur den AKTIVEN Tab rendert: die vier Zähler sahen
 * einen von drei Tabs, die anderen zwei waren nicht unmigriert, sondern
 * unmessbar (Spec Phase 2, §1). Ein Query-String erfordert hier keine
 * Änderung — die Zähler navigieren mit `page.goto(path)`.
 */
```

- [ ] **Schritt 2: Den roten Test laufen lassen**

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "tab=review"
```

Erwartet: **FAIL**, mindestens drei der fünf Regeln je Theme —
- „trägt Amber höchstens einmal": 3 Treffer (Kalender-Icon `progress-tabs.tsx:501`, Themen-Icon `:576`, `borderLeft: "4px solid var(--accent-amber)"` am Motivationskasten),
- „trägt Fraunces genau einmal": 8 Treffer (das `h2` plus die sechs `2xl`-Zahlen plus der Motivationssatz, alle `var(--font-display, 'Lora', serif)`),
- „hat keine umrahmte oder gefüllte Inhaltsfläche": ~10 Treffer (fünf Summary-Kacheln, drei Themen-Kacheln, der Motivationskasten),
- „hält jede Inhaltsspalte auf dem Maß": FAIL mit „keine `[data-column]` gefunden".

Die Ausgabe abschreiben — sie ist der Beleg, dass der Zustand vorher wirklich ungeprüft war.

- [ ] **Schritt 3: `RAIL_LINE` in `components/ui/list.tsx` anlegen**

Fünf Dateien dieser Phase schreiben dieselbe Klassenkette für eine Randzeile. Sie kommt einmal dorthin, wo `ACTION_BTN` und `stageTitleClassName` schon stehen — ans Ende der Exporte, vor `RowOwnProps`:

```ts
/**
 * Eine Zeile im Rand: Mono, tabellarische Ziffern, `--ink-3`.
 *
 * Vorher an vier Stellen ausgeschrieben (`tasks-rail.tsx`,
 * `app/(app)/progress/page.tsx` zweimal); Phase 2 fügt fünf weitere hinzu.
 * Hier statt in einem Tab-Modul, weil `budget-bar.tsx` eine
 * Client-Komponente ist: ein Import aus einem Server-Tab zöge `db` und
 * `drizzle` ins Client-Bundle.
 *
 * Der Rand trägt nie Amber — deshalb ist die Farbe Teil der Konstante und
 * kein Aufrufer-Parameter.
 */
export const RAIL_LINE =
  "m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]";
```

`components/tasks/tasks-rail.tsx` benutzt dieselbe Kette dreimal ausgeschrieben. Sie **jetzt** anzugleichen ist ein Zweizeilen-Diff in einer Phase-1-Datei ohne Verhaltensänderung — zulässig, aber optional; wer es lässt, lässt es ganz und erwähnt es nicht.

- [ ] **Schritt 4: `tabs/habits-tab.tsx` anlegen (reiner Umzug, keine Designänderung)**

Die Datei vereint, was heute auf zwei Dateien verteilt liegt (der Umzug bringt `RAIL_LINE` aus Schritt 3 gleich mit — die drei Randzeilen benutzen ab jetzt die Konstante):

| Quelle | Was |
|---|---|
| `app/(app)/progress/page.tsx:104–232` | Jahres-Parsing, Timezone-Query, `getHabitsWithHistory`/`getEarliestCompletion`, die Randsummen, `bestStreakText`, `hasRailContent`, `sumLines`, `rail` |
| `components/progress/progress-tabs.tsx:80–144` | `formatHabitStreakTrailing` samt vollständigem JSDoc |
| `components/progress/progress-tabs.tsx:146–242` | `HabitsList` — als **interne** Funktion, nicht mehr exportiert |

Der Rumpf der neuen Datei:

```tsx
/**
 * Der Gewohnheiten-Tab von /progress — Lesespalte plus Rand.
 *
 * Zusammengelegt aus `app/(app)/progress/page.tsx` (Datenbeschaffung und
 * Rand) und `progress-tabs.tsx`s `HabitsList` (Lesespalte). Task 11 der
 * Phase 1 hatte die Beschaffung in die Seite gehoben, weil Rand und Spalte
 * dasselbe `habits`-Array brauchen und der damalige Dispatcher den Rand nie
 * zu sehen bekam. Seit jeder Tab seinen eigenen `PageFrame` besitzt, gilt
 * dieser Grund nicht mehr: hier wird einmal geholt und beides beliefert.
 */
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getHabitsWithHistory,
  getEarliestCompletion,
  buildYearOptions,
} from "@/lib/habits";
import type { HabitStreak, HabitWithHistory } from "@/lib/habits";
import { HabitCard } from "@/components/habits/habit-card";
import { YearSelector } from "@/components/habits/year-selector";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, RAIL_LINE } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

function formatHabitStreakTrailing(/* … unverändert aus progress-tabs.tsx:111–144 … */) { }

async function HabitsList({ habits, year, yearOptions }: {
  habits: HabitWithHistory[];
  year: number;
  yearOptions: number[];
}) { /* … unverändert aus progress-tabs.tsx:156–242 … */ }

export async function HabitsTab({
  userId,
  header,
  yearParam,
}: {
  userId: string;
  header: React.ReactNode;
  yearParam?: string;
}) {
  const t2 = await getTranslations("habits");
  const currentYear = new Date().getFullYear();
  const parsed = Number(yearParam);
  const requestedYear =
    Number.isFinite(parsed) && parsed >= 2024 && parsed <= currentYear + 1
      ? Math.floor(parsed)
      : currentYear;

  /* … der Rest wörtlich aus page.tsx:110–232: userRows, habits/earliest,
     yearOptions, totalYear/totalLast30/totalLast7, bestStreakHabit,
     bestStreakText, hasRailContent, sumLines, rail …
     Die drei Randzeilen benutzen jetzt `RAIL_LINE` statt der ausgeschriebenen
     Klassenkette — sonst byte-identisch. */

  return (
    <PageFrame rail={rail}>
      {header}
      <HabitsList habits={habits} year={requestedYear} yearOptions={yearOptions} />
    </PageFrame>
  );
}
```

**Zwei Fallen beim Umzug:**
1. Der lange Kommentar in `page.tsx` über `check-i18n.mjs` und die `t2`-Bindung zieht **mit** um. Der Grund gilt unverändert: `scripts/check-i18n.mjs` erkennt nur `const X = getTranslations("ns")` per Textregex. `t2` muss in derselben Datei gebunden sein, in der `t2(...)` aufgerufen wird.
2. `hasRailContent` bleibt Pflicht. `PageFrame` prüft `rail` nur auf Wahrheitswert — ein leeres Fragment reserviert die 208-px-Spalte trotzdem (siehe JSDoc dort).

- [ ] **Schritt 5: `tabs/review-tab.tsx` anlegen (migriert)**

```tsx
/**
 * Der Wochenrückblick-Tab von /progress.
 *
 * Vorher: fünf Summary-Kacheln, drei Themen-Kacheln und ein Motivationskasten
 * mit `borderLeft: 4px solid var(--accent-amber)` — drei Amber auf einer
 * Ansicht, wo die Regel eins erlaubt, und kein Test war rot (Spec §1).
 *
 * Nachher: die Zähler der Woche stehen im Rand ("in den Rand gehört, was die
 * App über seinen Tag sagt"), die Themen sind eine Liste, der Motivationssatz
 * ist ein Satz. Kein Amber, keine Fläche, ein Fraunces — die Tab-Kopfzeile.
 */
import { getTranslations, getLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getWeeklyReview } from "@/lib/weekly-review";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, List, RAIL_LINE, Row } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";

/** "5. Mär" — lokalisiert statt der alten `"de-DE"`-Hartkodierung. */
function formatShortDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

export async function ReviewTab({
  userId,
  header,
}: {
  userId: string;
  header: React.ReactNode;
}) {
  const t = await getTranslations("review");
  const locale = await getLocale();

  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const review = await getWeeklyReview(userId, userRows[0]?.timezone ?? null);

  const delta = review.completionsThisWeek - review.completionsLastWeek;
  const deltaText =
    delta > 0
      ? t("vs_last_week_up", { delta: String(delta) })
      : delta < 0
        ? t("vs_last_week_down", { delta: String(delta) })
        : t("vs_last_week_same");

  const motivationKey = (
    review.completionsThisWeek >= 10 ? "motivation_great" :
    review.completionsThisWeek >= 5  ? "motivation_good" :
    review.completionsThisWeek >= 1  ? "motivation_ok" :
    "motivation_zero"
  ) as "motivation_great" | "motivation_good" | "motivation_ok" | "motivation_zero";

  // `{value} {label}` statt vier neuer ICU-Keys — dasselbe Muster, das der
  // Habits-Rand seit Task 11 benutzt. Eine Null wird nicht ausgewiesen
  // (Spec §6): "0 verschoben" ist kein Zustand, es ist ein täglicher kleiner
  // Vorwurf.
  const railLines: Array<[number, string]> = [
    [review.completionsThisWeek, t("completed")],
    [review.postponementsThisWeek, t("postponed")],
    [review.coinsEarnedThisWeek, t("coins_earned")],
    [review.tasksCreatedThisWeek, t("tasks_created")],
  ];
  const showDelta =
    review.completionsThisWeek > 0 || review.completionsLastWeek > 0;
  const showStreak = review.streakCurrent > 0;
  // `hasRail` muss GENAU das spiegeln, was unten tatsächlich rendert —
  // `PageFrame` prüft nur den Wahrheitswert und reserviert die 208-px-Spalte
  // sonst für nichts (JSDoc in page-frame.tsx).
  const hasRail = railLines.some(([v]) => v > 0) || showDelta || showStreak;

  const rail = !hasRail ? undefined : (
    <>
      {railLines.map(
        ([value, label]) =>
          value > 0 && (
            <p key={label} className={RAIL_LINE}>
              {value} {label}
            </p>
          ),
      )}
      {showDelta && <p className={RAIL_LINE}>{deltaText}</p>}
      {showStreak && (
        <p className={RAIL_LINE}>
          {review.streakCurrent}d {t("streak")} · {t("streak_max")}{" "}
          {review.streakMax}d
        </p>
      )}
    </>
  );

  return (
    <PageFrame rail={rail}>
      {header}
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-2)]">
        {t("page_subtitle", {
          start: formatShortDate(review.weekStart, locale),
          end: formatShortDate(review.weekEnd, locale),
        })}
      </p>

      <section>
        <GroupHeading>{t("section_topics")}</GroupHeading>
        {review.topTopics.length === 0 ? (
          <EmptyState line={t("no_topics")} />
        ) : (
          <List>
            {review.topTopics.map((topic) => (
              <Row
                key={topic.title}
                testId="review-topic-row"
                wrapTitle
                title={topic.title}
                trailing={t("completions", { count: topic.completions })}
              />
            ))}
          </List>
        )}
      </section>

      <p className="m-0 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
        {t(motivationKey)}
      </p>
    </PageFrame>
  );
}
```

Was dabei verschwindet und warum:
- `faCalendarWeek`, `faCircleCheck`, `faForward`, `faCoins`, `faFire`, `faPlus`, `faFolderOpen` — sieben Icons, die nichts kodieren, was der Text nicht schon sagt. Zwei davon trugen Amber.
- `resolveTopicIcon` in der Themenzeile — `WeeklyTopicSummary` hat kein `color`-Feld, ein `dotColor` ist hier also nicht möglich; das Icon war der einzige Farbträger und war amberfarben.
- Der Motivationskasten. Ein Satz braucht keinen Rahmen.

- [ ] **Schritt 6: `progress-tabs.tsx` zum Dispatcher machen**

Die Datei behält vorerst nur `AchievementsTab` (Task 2 holt sie heraus) und bekommt oben:

```tsx
/**
 * ProgressTabs — der Dispatcher der vier Tabs von /progress.
 *
 * Jeder Tab besitzt seinen eigenen `PageFrame` samt Rand und bekommt die
 * gemeinsame Kopfzeile als `header` gereicht. Das ist der Grund, warum die
 * Seite selbst nur noch auth, Tab-Wahl und Kopfzeile kennt: ein Rand gehört
 * zu einem Tab, nicht zu einer Route (Spec §3).
 */
import type { ReactNode } from "react";
import { HabitsTab } from "./tabs/habits-tab";
import { ReviewTab } from "./tabs/review-tab";

export type Tab = "habits" | "achievements" | "review";
export const VALID_TABS: Tab[] = ["habits", "achievements", "review"];

export interface ProgressTabsProps {
  tab: Tab;
  userId: string;
  /** Die eine Fraunces-Überschrift plus die Tab-Leiste. */
  header: ReactNode;
  /** Roher `?year=`-Wert; nur der Habits-Tab wertet ihn aus. */
  yearParam?: string;
}

export async function ProgressTabs({ tab, userId, header, yearParam }: ProgressTabsProps) {
  if (tab === "achievements") return <AchievementsTab userId={userId} header={header} />;
  if (tab === "review") return <ReviewTab userId={userId} header={header} />;
  return <HabitsTab userId={userId} header={header} yearParam={yearParam} />;
}
```

`AchievementsTab` bekommt in diesem Schritt nur die `header`-Prop und den bisherigen Wrapper, damit sich optisch **nichts** ändert:

```tsx
async function AchievementsTab({ userId, header }: { userId: string; header: ReactNode }) {
  /* … Datenbeschaffung unverändert … */
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {header}
      <div style={{ maxWidth: "900px" }}>
        {/* … bisheriger Inhalt unverändert … */}
      </div>
    </div>
  );
}
```

Nicht mehr importiert und darum zu entfernen: `HabitStreak`, `HabitWithHistory`, `HabitCard`, `YearSelector`, `GroupHeading`, `EmptyState`, `Button`, `Link`, `getLocale`, `getWeeklyReview`, `resolveTopicIcon`, `faCalendarWeek`, `faCircleCheck`, `faForward`, `faFire`, `faPlus`, `faFolderOpen`, `getHabitsWithHistory` — `npx tsc --noEmit` und `npm run lint` benennen jeden übrig gebliebenen.

- [ ] **Schritt 7: `app/(app)/progress/page.tsx` auf ~65 Zeilen kürzen**

```tsx
/**
 * Progress — eine Route, vier Zustände (habits · achievements · review · stats).
 *
 * Die Seite kennt nur: wer ist angemeldet, welcher Tab ist gewählt, und wie
 * sieht die gemeinsame Kopfzeile aus. Alles andere — Datenbeschaffung,
 * Lesespalte, Rand — gehört dem jeweiligen Tab (`components/progress/tabs/`).
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { ProgressTabs, VALID_TABS } from "@/components/progress/progress-tabs";
import type { Tab } from "@/components/progress/progress-tabs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("progress");
  const params = await searchParams;
  const tab: Tab = VALID_TABS.includes(params.tab as Tab)
    ? (params.tab as Tab)
    : "habits";

  // Die eine Fraunces-Überschrift der Seite plus die Tab-Leiste, in einem
  // eigenen Flex-Block gruppiert (nicht zwei lose PageFrame-Kinder), damit
  // der 16px-Abstand zwischen Titel und Tabs vom 32px-Rhythmus des Rahmens
  // unberührt bleibt.
  const header = (
    <div className="flex flex-col gap-4">
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {t("page_title")}
      </h1>
      <nav className="flex gap-1" aria-label={t("page_title")}>
        {VALID_TABS.map((key) => {
          const isActive = tab === key;
          return (
            <Link
              key={key}
              href={`/progress?tab=${key}`}
              className={cn(
                "rounded-[var(--radius-sm)] px-4 py-2 font-[family-name:var(--font-ui)] text-[0.85rem] no-underline! transition-colors",
                isActive
                  ? "bg-[var(--raised)] font-semibold text-[var(--ink)]!"
                  : "bg-transparent font-medium text-[var(--ink-3)]! hover:text-[var(--ink-2)]!",
              )}
            >
              {t(`tab_${key}` as "tab_habits" | "tab_achievements" | "tab_review")}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <ProgressTabs
      tab={tab}
      userId={session.user.id}
      header={header}
      yearParam={params.year}
    />
  );
}
```

Die Tab-Leiste iteriert jetzt über `VALID_TABS` statt über ein zweites, handgepflegtes Array — Task 4 fügt `stats` an genau **einer** Stelle hinzu.

- [ ] **Schritt 8: `WITH_LIGHT`/`CHROMELESS` erklären (kein Codewechsel)**

In `e2e/design-rules.spec.ts`, direkt über `const WITH_LIGHT`, an den vorhandenen JSDoc anhängen:

```
 * Beide Mengen sind POSITIVMENGEN: alles, was nicht darin steht, erwartet
 * "kein Lichtkegel, aber ein <header>". Die fünf Zustände, die Phase 2
 * ergänzt (`?tab=review|achievements|stats`, `/wishlist`, `/quick`), liegen
 * in der (app)-Route-Group und tragen keinen Lichtkegel — sie erfüllen die
 * Default-Erwartung, ohne eingetragen zu werden. Nachgemessen 2026-08-28,
 * damit der nächste Leser es nicht wieder tut.
```

- [ ] **Schritt 9: Alles prüfen**

```bash
npx tsc --noEmit
npm run lint
npm run check:design
npm run check:i18n
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/progress.spec.ts
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "tab=review"
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "/progress \("
```

Erwartet: alles grün. Die letzte Zeile ist die Regressionsprobe für den Habits-Tab — der Umzug in Schritt 3 darf ihn nicht angefasst haben.

Erwartete Ratsche: `progress-tabs.tsx` fällt von 94 auf ~60 (der Review-Anteil verschwindet), `tabs/review-tab.tsx` und `tabs/habits-tab.tsx` erscheinen mit **0** und brauchen deshalb keinen Baseline-Eintrag. `check:design` bleibt grün, ohne dass die Baseline angefasst wird — sie wird erst in Task 9 nachgezogen.

- [ ] **Schritt 10: Commit**

```bash
git add components/progress app/\(app\)/progress e2e/helpers/design-count.ts e2e/design-rules.spec.ts
git commit -m "feat(ui): Wochenrückblick als Lichtkegel-Tab, Tabs als eigene Dateien"
```

---

## Task 2: Der Errungenschaften-Tab wird eine Liste

**Files:**
- Create: `components/progress/tabs/achievements-tab.tsx`
- Create: `components/achievements/achievement-row.tsx`
- Delete: `components/achievements/achievement-card.tsx`
- Modify: `components/progress/progress-tabs.tsx` (→ der ~35-Zeilen-Dispatcher aus §3)
- Modify: `e2e/helpers/design-count.ts` (`MIGRATED_PAGES`)

**Interfaces:**
- Consumes: `ProgressTabsProps`, `RAIL_LINE` (Task 1), `AchievementWithProgress` (`lib/statistics.ts`: `{ id, key, title, description, icon, rarity, coinReward, secret, earnedAt: Date | null, progress?: { current: number; total: number } }`)
- Produces: `components/progress/tabs/achievements-tab.tsx` → `export async function AchievementsTab({ userId, header }: { userId: string; header: React.ReactNode })`
- Produces: `components/achievements/achievement-row.tsx` → `export function AchievementRow({ achievement }: { achievement: AchievementWithProgress })` — Client-Komponente (`useTranslations`/`useLocale`), genau wie die Karte davor.

---

- [ ] **Schritt 1: Den Zustand messbar machen — der rote Test**

`MIGRATED_PAGES` bekommt `"/progress?tab=achievements"` als sechsten Eintrag (nach `"/progress"`, vor `"/progress?tab=review"` — die Reihenfolge ist kosmetisch, die Testnamen folgen ihr).

- [ ] **Schritt 2: Den roten Test laufen lassen**

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "tab=achievements"
```

Erwartet: **FAIL** —
- Amber: mindestens 3 (der Radialverlauf `progress-tabs.tsx:372`, der `linear-gradient(90deg, var(--accent-amber), …)`-Fortschrittsbalken, plus je ein Treffer pro epischer Errungenschaft über `RARITY_ACCENT.epic`),
- Fraunces: > 1 (Level-Zahl, Level-Titel, Hero-`h2`, je eine `h3` pro Seltenheitsstufe, plus der Titel jeder Karte),
- Kästen: > 50 (Level-Karte, Hero-Karte, je eine Karte pro Errungenschaft),
- Maß: FAIL, keine `[data-column]`.

- [ ] **Schritt 3: `achievement-row.tsx` schreiben**

```tsx
"use client";

/**
 * AchievementRow — eine Errungenschaft als Zeile.
 *
 * Ersetzt `achievement-card.tsx` (17 Ratschen-Verstöße: Kachel mit
 * Seltenheits-Rahmen, farbigem Akzentstreifen, Box-Shadow, umrahmtem
 * Seltenheits-Abzeichen, 🪙-Emoji und einem eigenen Fortschrittsbalken).
 *
 * Die Seltenheit war die eigentliche Regelverletzung: `epic` trug
 * `var(--accent-amber)` — bei 48 Errungenschaften waren das N Amber auf
 * einer Ansicht, wo die Regel eins erlaubt. Sie wandert deshalb aus der
 * Zeile heraus in die `GroupHeading` darüber, genau wie die Priorität auf
 * `/tasks`: eine Gruppierung kodiert etwas Wahres über den Inhalt, ein
 * farbiges Abzeichen an jeder Zeile behauptet nur Wichtigkeit.
 *
 * Die Beschreibung steht als zweite Zeile IM Titel, nicht im `eyebrow`:
 * `Row`s Eyebrow-Slot setzt `uppercase tracking-[0.16em]` und `truncate` —
 * ein ganzer Satz wäre dort abgeschnitten und in Versalien. Der Titel-Slot
 * nimmt beliebige Knoten und bricht mit `wrapTitle` an Silbengrenzen.
 */

import { useLocale, useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock } from "@fortawesome/free-solid-svg-icons";
import { Row } from "@/components/ui/list";
import type { AchievementWithProgress } from "@/lib/statistics";

/**
 * Eine Errungenschaft als `Row`.
 *
 * @param props.achievement - die Errungenschaft samt Fortschritt
 * @returns Eine Zeile ohne Fläche, ohne Rahmen, ohne Abzeichen
 */
export function AchievementRow({
  achievement,
}: {
  achievement: AchievementWithProgress;
}) {
  const t = useTranslations("achievements");
  const locale = useLocale();
  const earned = achievement.earnedAt != null;
  const isSecret = achievement.secret && !earned;

  // Der Eyebrow trägt nur Kurzes: den Fortschrittsbruch (der den
  // Fortschrittsbalken ersetzt — ein Balken zeigt einen Anteil, ein Bruch
  // zeigt beide Zahlen) und die Münzbelohnung ohne Emoji.
  const eyebrowParts: string[] = [];
  if (!earned && !isSecret && achievement.progress) {
    eyebrowParts.push(
      t("progress", {
        current: achievement.progress.current,
        total: achievement.progress.total,
      }),
    );
  }
  if (achievement.coinReward > 0) {
    eyebrowParts.push(t("coin_reward", { coins: achievement.coinReward }));
  }

  return (
    <Row
      testId="achievement-row"
      wrapTitle
      dimmed={!earned}
      lead={
        isSecret ? (
          <FontAwesomeIcon
            icon={faLock}
            aria-hidden="true"
            className="text-[0.875rem] text-[var(--ink-3)]"
          />
        ) : (
          <span aria-hidden="true" className="text-[1.125rem] leading-none">
            {achievement.icon}
          </span>
        )
      }
      title={
        <>
          {isSecret ? t("secret_title") : achievement.title}
          <span className="mt-1 block font-[family-name:var(--font-ui)] text-[0.8125rem] font-normal normal-case tracking-normal text-[var(--ink-2)]">
            {isSecret ? t("secret_description") : achievement.description}
          </span>
        </>
      }
      eyebrow={eyebrowParts.length > 0 ? eyebrowParts.join(" · ") : undefined}
      trailing={
        earned && achievement.earnedAt
          ? new Date(achievement.earnedAt).toLocaleDateString(locale, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : undefined
      }
    />
  );
}
```

Anschließend `components/achievements/achievement-card.tsx` löschen. `grep -rn "AchievementCard" --include=*.tsx components app` muss danach leer sein (heute drei Treffer, alle in `progress-tabs.tsx`).

- [ ] **Schritt 4: `tabs/achievements-tab.tsx` schreiben**

```tsx
/**
 * Der Errungenschaften-Tab von /progress.
 *
 * Vorher: eine Level-Karte mit Verlauf, Glow und farbigem Oberstreifen, eine
 * Hero-Karte mit Amber-Radialverlauf und Trophäen-Emoji, und ein Kachelraster
 * aus bis zu 48 gerahmten Karten (Spec §1: drei Amber auf einer Ansicht).
 *
 * Nachher: Level, Freischaltstand und Münzen stehen im Rand; die Seltenheit
 * ist die Gruppenüberschrift; jede Errungenschaft ist eine Zeile.
 */
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAchievementsWithProgress } from "@/lib/statistics";
import {
  retroactivelyGrantAchievements,
  getLevelForCoins,
  getNextLevel,
  LEVELS,
} from "@/lib/gamification";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, List, RAIL_LINE } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { AchievementRow } from "@/components/achievements/achievement-row";

const RARITY_ORDER = ["legendary", "epic", "rare", "common"] as const;

export async function AchievementsTab({
  userId,
  header,
}: {
  userId: string;
  header: React.ReactNode;
}) {
  const t = await getTranslations("achievements");

  const userRow = await db
    .select({ timezone: users.timezone, coins: users.coins })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const timezone = userRow[0]?.timezone ?? null;
  const coins = userRow[0]?.coins ?? 0;

  await retroactivelyGrantAchievements(userId, timezone);
  const all = await getAchievementsWithProgress(userId, timezone);

  const currentLevelDef = getLevelForCoins(coins);
  const nextLevelDef = getNextLevel(currentLevelDef.level);
  const maxLevel = LEVELS[LEVELS.length - 1].level;
  const earned = all.filter((a) => a.earnedAt != null);

  const RARITY_LABEL: Record<(typeof RARITY_ORDER)[number], string> = {
    legendary: t("section_legendary"),
    epic: t("section_epic"),
    rare: t("section_rare"),
    common: t("section_common"),
  };

  // Der Rand: was die App über den Stand sagt. Nie Amber (PageFrame-Regel) —
  // die Stufenfarben (`RARITY_ACCENT`, `tierColor`) entfallen ersatzlos.
  const rail = (
    <>
      <p className={RAIL_LINE}>
        {t("unlocked_count", { earned: earned.length, total: all.length })}
      </p>
      <p className={RAIL_LINE}>
        {t("level_of_max", { level: currentLevelDef.level, max: maxLevel })}
      </p>
      <p className={RAIL_LINE}>{currentLevelDef.title}</p>
      {nextLevelDef ? (
        <p className={RAIL_LINE}>
          {t("coins_to_next_level", {
            count: nextLevelDef.minCoins - coins,
            level: nextLevelDef.level,
            title: nextLevelDef.title,
          })}
        </p>
      ) : (
        <p className={RAIL_LINE}>{t("level_max_reached")}</p>
      )}
    </>
  );

  const recentlyEarned = [...earned]
    .sort(
      (a, b) =>
        new Date(b.earnedAt!).getTime() - new Date(a.earnedAt!).getTime(),
    )
    .slice(0, 3);

  return (
    <PageFrame rail={rail}>
      {header}

      {all.length === 0 ? (
        <EmptyState line={t("no_achievements")} />
      ) : (
        <>
          {recentlyEarned.length > 0 && (
            <section>
              <GroupHeading>{t("recently_unlocked")}</GroupHeading>
              <List>
                {recentlyEarned.map((a) => (
                  <AchievementRow key={`recent-${a.key}`} achievement={a} />
                ))}
              </List>
            </section>
          )}

          {RARITY_ORDER.map((rarity) => {
            const tier = all.filter((a) => a.rarity === rarity);
            if (tier.length === 0) return null;
            const earnedInTier = tier.filter((a) => a.earnedAt != null).length;
            return (
              <section key={rarity}>
                {/* "LEGENDÄR · 2 / 5" — die Seltenheit als Struktur, nicht
                    als farbiges Abzeichen an jeder Zeile. */}
                <GroupHeading>
                  {RARITY_LABEL[rarity]} ·{" "}
                  {t("progress", { current: earnedInTier, total: tier.length })}
                </GroupHeading>
                <List>
                  {[
                    ...tier.filter((a) => a.earnedAt != null),
                    ...tier.filter((a) => a.earnedAt == null),
                  ].map((achievement) => (
                    <AchievementRow
                      key={achievement.key}
                      achievement={achievement}
                    />
                  ))}
                </List>
              </section>
            );
          })}
        </>
      )}
    </PageFrame>
  );
}
```

**Der Rand ist hier unbedingt.** Anders als beim Habits-Tab hat er immer Inhalt: `unlocked_count` und `level_of_max` rendern auch bei 0 verdienten Errungenschaften (der Freischaltstand „0 / 48" ist eine Tatsache über den Katalog, keine Null über den Nutzer). Ein `hasRailContent`-Wächter wäre hier tote Bedingung.

- [ ] **Schritt 5: `progress-tabs.tsx` auf den Dispatcher reduzieren**

Die Datei enthält danach nur noch das Stück aus Task 1, Schritt 5, mit `AchievementsTab` aus `./tabs/achievements-tab` importiert statt lokal definiert. Ziel: ~35 Zeilen, 0 Ratschen-Verstöße.

- [ ] **Schritt 6: Prüfen**

```bash
npx tsc --noEmit
npm run lint
npm run check:design
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "tab=achievements"
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/progress.spec.ts
```

Erwartet: grün. Ratsche: `progress-tabs.tsx` von ~60 auf **0**, `achievement-card.tsx` (17) verschwindet, `achievement-row.tsx` und `tabs/achievements-tab.tsx` starten bei 0.

- [ ] **Schritt 7: Commit**

```bash
git add components/progress components/achievements e2e/helpers/design-count.ts
git commit -m "feat(gamification): Errungenschaften als Liste statt Kachelraster"
```

---

## Task 3: Die drei Diagramme

**Files:**
- Modify: `components/stats/streak-sparkline.tsx` (6 Verstöße)
- Modify: `components/stats/weekday-chart.tsx` (9)
- Modify: `components/stats/energy-week-block.tsx` (28)

**Warum vor dem Umzug:** die drei Dateien sind heute Kinder von `/stats`, das noch nicht in `MIGRATED_PAGES` steht. Sie lassen sich also einzeln migrieren, ohne dass eine halbfertige Seite rot wird — und Task 4 kann sich danach ganz auf den Umzug konzentrieren. Ihr Beleg ist die Ratsche plus ein Blick auf die noch bestehende Seite.

**Interfaces:**
- Produces: unveränderte Signaturen. `StreakSparkline({ data, todayLabel, peakLabel })`, `WeekdayChart({ data, labels, bestDayLabel, bestDayCount })`, `EnergyWeekBlock({ weekCounts, history, isEmpty })` bleiben Wort für Wort — Task 4 ruft sie genauso auf wie `app/(app)/stats/page.tsx` es heute tut.

---

- [ ] **Schritt 1: `streak-sparkline.tsx` — die eine Lichtquelle der Seite**

Der Kasten (`rounded-xl p-5`, `backgroundColor: var(--bg-surface)`, `border: 1px solid var(--border)`) entfällt ersatzlos; das äußere `<div>` wird `className="flex flex-col gap-3"`.

Die Farben:

| Element | vorher | nachher |
|---|---|---|
| Flächen-`path` | `color-mix(in srgb, var(--accent-amber) 15%, transparent)` | `color-mix(in srgb, var(--ink-3) 18%, transparent)` |
| Linien-`path` | `var(--accent-amber)` | `var(--ink-2)` |
| End-`circle` | `var(--accent-amber)` | `var(--ink-2)` |
| „Heute: Nd" | `var(--accent-amber)` | **bleibt** `var(--amber)` |
| „Peak: Nd" | `var(--text-muted)` | `var(--ink-3)` |

„Heute: Nd" ist damit das **eine Amber des Stats-Tabs** — die einzige Zahl der Seite, die sich täglich ändert und für die der Nutzer sie öffnet. Der Zähler sieht dann genau einen Treffer (`color`); Fläche, Linie und Punkt liefern sonst je einen eigenen (`fill`, `stroke`), weil `fillSeen` und `strokeSeen` getrennte Mengen sind — drei Amber statt einem, das war die eigentliche Falle hier.

Beide Label-Spans werden Mono statt `--font-ui`:

```tsx
<div className="flex justify-between font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] tabular-nums">
  <span className="text-[var(--amber)]">{todayLabel}</span>
  <span className="text-[var(--ink-3)]">{peakLabel}</span>
</div>
```

Die vier `style`-Objekte am `<svg>` und den `<path>`s: `style={{ height: "52px" }}` wird `className="h-[52px]"`; `fill`/`stroke` bleiben als **SVG-Attribute** (`fill="…"`, `stroke="…"`), nicht als `style` — Attribute zählt die Ratsche nicht, `style={{…}}` schon, und Attribute sind hier ohnehin die richtige Form.

- [ ] **Schritt 2: `weekday-chart.tsx`**

Kasten entfernen (äußeres `<div>` → `flex flex-col gap-4`).

Das Balkenraster bekommt die ARIA-Struktur, die `countBoxes` als Diagramm erkennt — dasselbe Muster wie `contribution-grid.tsx`:

```tsx
<div
  className="grid h-[80px] items-end gap-2 [grid-template-columns:repeat(7,1fr)]"
  role="img"
  aria-label={bestDayLabel}
>
  {data.map((value, i) => {
    const pct = max > 0 ? (value / max) * 100 : 0;
    const isBest = i === bestIdx && hasData;
    return (
      <div key={i} className="flex h-full flex-col items-center justify-end gap-1">
        <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--ink-3)]">
          {value > 0 ? value : ""}
        </span>
        {/* `role="gridcell"` ist die benannte Diagramm-Ausnahme, die
            `countBoxes` prüft: eine Marke IST eine gefüllte Fläche, per
            Definition — ihre Höhe kodiert die Abschlusszahl. Ohne sie
            zählt jeder der sieben Balken als Kasten. Dieselbe Ausnahme,
            die `contribution-grid.tsx` seit Task 11 benutzt. */}
        <div
          role="gridcell"
          className={cn(
            "w-full max-w-[32px]",
            isBest ? "bg-[var(--ink-2)]" : "bg-[var(--hairline)]",
          )}
          style={{ height: `${Math.max(pct, 4)}%` }}
        />
      </div>
    );
  })}
</div>
```

Das eine verbleibende `style={{ height }}` ist unvermeidbar (der Wert ist berechnet) und kostet **einen** `inline`-Verstoß statt der bisherigen acht. Kein `borderRadius` mehr: ein 4-px-Radius auf einem Balken ist keiner der vier Token, und ein Balken braucht keinen.

Die Wochentags-Labels und die „Bester Tag"-Annotation werden Mono-Eyebrows in `--ink-3`, der Name des besten Tags in `--ink`. Kein Amber, kein `--accent-green`.

- [ ] **Schritt 3: `energy-week-block.tsx`**

`LEVEL_META` ist die Kernänderung — es enthält heute einen **rohen Hex** (`#818cf8` für LOW, der eine `color`-Verstoß der Datei) und benutzt `--accent-green` für MEDIUM, was gegen „`--done` heißt ausschließlich erledigt" verstößt:

```ts
/**
 * Die drei Energiestufen als eine Tinten-Rampe statt dreier Akzentfarben.
 *
 * Vorher: HIGH = --accent-amber (ein zweites Licht auf einer Seite, die
 * schon eins hat), MEDIUM = --accent-green (= --done, das ausschließlich
 * "erledigt" bedeutet), LOW = #818cf8 (ein roher Hex, der einzige
 * color-Verstoß dieser Datei). Eine Rampe kodiert eine Ordnung; drei
 * Akzentfarben behaupten drei Kategorien, die es nicht gibt.
 */
const LEVEL_META: Record<EnergyLevel, { color: string; labelKey: … }> = {
  HIGH:   { color: "var(--ink)",   labelKey: "energy_level_high" },
  MEDIUM: { color: "var(--ink-2)", labelKey: "energy_level_medium" },
  LOW:    { color: "var(--ink-3)", labelKey: "energy_level_low" },
};
```

Das `icon`-Feld (⚡ ☀ 🌙) entfällt — eine Rampe braucht keine Emoji-Legende, und die drei Emoji waren der Grund für zwei der Inline-Styles.

Weiter:
- die drei Zähl-Pillen der letzten 7 Tage werden drei Mono-Zeilen (`{count} {label}`, `--ink-3`, Null wird nicht ausgewiesen),
- jede Heatmap-Zelle bekommt `role="gridcell"` (heute hat sie keins — nur `contribution-grid.tsx` vergibt die Rolle bisher). Ohne sie zählen 91 Zellen als 91 Kästen, sobald `/progress?tab=stats` in `MIGRATED_PAGES` steht,
- Zellen ohne Check-in: `bg-[var(--raised)]`; außerhalb des Fensters: transparent,
- die Legende benutzt dieselben drei Rampenwerte,
- der Empty-Hint (`energy_empty_hint`) wird `EmptyState`.

Prüfen, dass das 13-Wochen-Raster in die Spalte passt: 13 Spalten × 14 px + Zwischenräume ≈ 210 px, deutlich unter `--measure` (640 px). **Kein `data-breakout` nötig** — das vorhandene `overflow-x-auto` bleibt als Sicherheitsnetz für sehr große Schriftgrade.

- [ ] **Schritt 4: Prüfen**

```bash
npx tsc --noEmit && npm run lint && npm run check:design
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/progress.spec.ts --grep "Stats Page"
```

Erwartet: grün, Ratsche fällt um ~40 (6 + 9 + 28 → höchstens 3, davon einer der berechnete Balkenhöhen-Style).

Danach `/stats` im Browser ansehen (dunkel und hell): die Diagramme stehen jetzt ohne Kästen zwischen Abschnitten, die noch Kästen haben. Das sieht auf halber Strecke absichtlich unfertig aus — Task 4 räumt den Rest.

- [ ] **Schritt 5: Commit**

```bash
git add components/stats
git commit -m "style(ui): Diagramme ohne Kasten, Energie als Tinten-Rampe"
```

---

## Task 4: `/stats` zieht als vierter Tab um

**Files:**
- Create: `components/progress/tabs/stats-tab.tsx`
- Modify: `app/(app)/stats/page.tsx` (834 Zeilen → 6-Zeilen-Redirect-Stub)
- Modify: `components/progress/progress-tabs.tsx` (`Tab`, `VALID_TABS`, ein Zweig)
- Modify: `app/(app)/progress/page.tsx` (der `t(...)`-Cast in der Tab-Leiste)
- Modify: `components/layout/user-menu.tsx:151` und `:157`
- Modify: `messages/{de,en,es,fr,nl,ru,zh}.json` (ein Key hinzu, fünf weg)
- Modify: `e2e/helpers/design-count.ts` (`MIGRATED_PAGES`)

**Die zwei mitgeführten Bugs der Spec §6 werden hier erledigt** — beide liegen in Dateien, die diese Task ohnehin anfasst:
1. `app/(app)/stats/page.tsx:114`: `toLocaleDateString("de-DE", …)` bei sieben Locales.
2. `components/layout/user-menu.tsx:157`: `href="/review"` → ein Redirect-Hop, wo `/progress?tab=review` direkt ginge (steht als „Kleinigkeit" in `ROADMAP.md:326`).

**Interfaces:**
- Consumes: `ProgressTabsProps`, `RAIL_LINE`, `getUserStatistics` (`lib/statistics.ts` → `UserStatistics`), `getEnergyLevelCounts`/`getEnergyHistory`/`getEnergyCheckinDayCount` (`lib/energy.ts`), `LEVELS`/`getNextLevel` (`lib/gamification.ts`), die drei Diagramme aus Task 3.
- Produces: `components/progress/tabs/stats-tab.tsx` → `export async function StatsTab({ userId, header }: { userId: string; header: React.ReactNode })`
- Produces: `Tab` wird `"habits" | "achievements" | "review" | "stats"`, `VALID_TABS` bekommt `"stats"` als vierten Eintrag.

---

- [ ] **Schritt 1: `progress.tab_stats` in sieben Locales anlegen**

In jeder `messages/*.json` in das `progress`-Objekt, direkt hinter `tab_review`:

| Datei | Wert |
|---|---|
| `de.json` | `"tab_stats": "Statistiken"` |
| `en.json` | `"tab_stats": "Statistics"` |
| `es.json` | `"tab_stats": "Estadísticas"` |
| `fr.json` | `"tab_stats": "Statistiques"` |
| `nl.json` | `"tab_stats": "Statistieken"` |
| `ru.json` | `"tab_stats": "Статистика"` |
| `zh.json` | `"tab_stats": "统计"` |

(Wortgleich mit dem vorhandenen `stats.page_title` derselben Datei — nachgeprüft 2026-08-28.)

- [ ] **Schritt 2: Die fünf toten Wunschlisten-Keys entfernen**

Der `wishlist`-Abschnitt von `/stats` entfällt (Spec §2): bought/open/discarded sind auf `/wishlist` abzählbar, `totalSpent` zieht in Task 6 in die `BudgetBar`. Damit werden fünf Keys tot. `scripts/check-i18n.mjs` prüft nur Vollständigkeit, nicht Verwaisung — sie fallen also nicht von selbst auf und müssen von Hand weg:

```bash
cd /var/home/jpy/projects/momo
node -e '
const fs = require("node:fs");
const dead = ["section_wishlist","wishlist_bought","wishlist_spent","wishlist_open","wishlist_discarded"];
for (const l of ["de","en","es","fr","nl","ru","zh"]) {
  const p = `messages/${l}.json`;
  const m = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const k of dead) delete m.stats[k];
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + "\n");
}
'
git diff --stat messages/
```

Erwartet: sieben Dateien, je fünf Zeilen weniger. **Prüfen, dass der Diff nicht die ganze Datei umformatiert** — falls `JSON.stringify(…, 2)` von der bestehenden Formatierung abweicht, die fünf Zeilen stattdessen von Hand löschen.

- [ ] **Schritt 3: Den Zustand messbar machen — der rote Test**

`MIGRATED_PAGES` bekommt `"/progress?tab=stats"`. Dann:

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "tab=stats"
```

Erwartet: **FAIL** in beiden Themes mit „`ProgressPage` … Tab nicht gefunden" bzw. mit dem Habits-Tab im Bild (`VALID_TABS` kennt `stats` noch nicht, der Default greift). Genau das ist die Probe: der Zustand existiert als Testfall, bevor er als Seite existiert.

- [ ] **Schritt 4: `tabs/stats-tab.tsx` schreiben**

```tsx
/**
 * Der Statistiken-Tab von /progress.
 *
 * Umzug aus `app/(app)/stats/page.tsx` (834 Zeilen, 68 Ratschen-Verstöße,
 * sieben Fraunces-Vorkommen). `/stats` war von genau einer Stelle
 * erreichbar — dem Benutzermenü — und beanspruchte dieselbe Rolle wie
 * /progress: Zahlen über dich. Nach dem Umzug gibt es eine
 * Zahlen-Destination statt zwei, und die neue steht in der Navigation
 * statt in einem Menü (Spec §2).
 *
 * Was hier bleibt und was nicht:
 *  - `streak_history` BLEIBT. Die Sparkline zeigt `users.streakCurrent`
 *    über die Zeit — den Aufgaben-Streak aus der Gamification. Der Rail des
 *    Habits-Tabs zeigt `HabitStreak.current` (Gewohnheiten über Perioden),
 *    eine andere Zahl. Der VERLAUF existiert sonst nirgends.
 *  - `wishlist` ENTFÄLLT. bought/open/discarded sind auf /wishlist
 *    abzählbar; `totalSpent` zieht in die BudgetBar.
 *  - `topics` ZIEHT MIT UM. Die Spec zählt neun Abschnitte, es sind zehn —
 *    dieser fehlte in der Tabelle und fällt weder unter "bleibt" noch unter
 *    "entfällt".
 *
 * Die flachen Zähler (Übersicht, Aktivität) stehen im Rand, weil dort
 * hingehört, "was die App über seinen Tag sagt". In der Lesespalte bleibt,
 * was Struktur hat: Verlauf, Verteilungen, Themen.
 */
import { getTranslations, getLocale } from "next-intl/server";
import { getUserStatistics } from "@/lib/statistics";
import { LEVELS, getNextLevel } from "@/lib/gamification";
import {
  getEnergyHistory,
  getEnergyLevelCounts,
  getEnergyCheckinDayCount,
} from "@/lib/energy";
import { EnergyWeekBlock } from "@/components/stats/energy-week-block";
import { WeekdayChart } from "@/components/stats/weekday-chart";
import { StreakSparkline } from "@/components/stats/streak-sparkline";
import { PageFrame } from "@/components/ui/page-frame";
import { GroupHeading, List, RAIL_LINE, Row } from "@/components/ui/list";

export async function StatsTab({
  userId,
  header,
}: {
  userId: string;
  header: React.ReactNode;
}) {
  const [stats, energyWeekCounts, energyHistory, energyDayCount, t, locale] =
    await Promise.all([
      getUserStatistics(userId),
      getEnergyLevelCounts(userId, 7),
      getEnergyHistory(userId, 90),
      getEnergyCheckinDayCount(userId),
      getTranslations("stats"),
      getLocale(),
    ]);

  const currentLevelDef =
    LEVELS.find((l) => l.level === stats.level) ?? LEVELS[0];
  const nextLevelDef = getNextLevel(stats.level);
  const levelProgress = nextLevelDef
    ? Math.min(
        100,
        Math.round(
          ((stats.coins - currentLevelDef.minCoins) /
            (nextLevelDef.minCoins - currentLevelDef.minCoins)) *
            100,
        ),
      )
    : 100;

  const totalByType =
    stats.tasksByType.ONE_TIME +
    stats.tasksByType.RECURRING +
    stats.tasksByType.DAILY_ELIGIBLE;
  const totalByPriority =
    stats.tasksByPriority.HIGH +
    stats.tasksByPriority.NORMAL +
    stats.tasksByPriority.SOMEDAY;

  const weekdayLabels = [
    t("weekday_mon"), t("weekday_tue"), t("weekday_wed"), t("weekday_thu"),
    t("weekday_fri"), t("weekday_sat"), t("weekday_sun"),
  ];
  const bestWeekdayCount = Math.max(...stats.completionsByWeekday);
  const streakPeak = Math.max(...stats.streakHistory, 0);

  /** Der Bug aus Spec §6: `"de-DE"` hartkodiert bei sieben Locales. */
  const memberSince = stats.memberSince.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Der Rand: sieben flache Zähler, `{value} {label}` (das Muster der
  // Habits-Randsummen), Null wird nicht ausgewiesen (Spec §6). Die ersten
  // zwei sind Katalogtatsachen und stehen immer.
  const rail = (
    <>
      <p className={RAIL_LINE}>
        {stats.totalTasksCreated} {t("tasks_created")}
      </p>
      <p className={RAIL_LINE}>
        {stats.totalCompletions} {t("completions_total")}
      </p>
      {stats.streakCurrent > 0 && (
        <p className={RAIL_LINE}>
          {stats.streakCurrent}d {t("current_streak")}
        </p>
      )}
      {stats.streakMax > 0 && (
        <p className={RAIL_LINE}>
          {stats.streakMax}d {t("best_streak")}
        </p>
      )}
      {stats.completionsLast7Days > 0 && (
        <p className={RAIL_LINE}>
          {stats.completionsLast7Days} {t("completions_7d")}
        </p>
      )}
      {stats.completionsLast30Days > 0 && (
        <p className={RAIL_LINE}>
          {stats.completionsLast30Days} {t("completions_30d")}
        </p>
      )}
      {stats.openTasks > 0 && (
        <p className={RAIL_LINE}>
          {stats.openTasks} {t("open_tasks")}
        </p>
      )}
    </>
  );

  /** Eine Verteilungszeile: Label links, "N · P%" rechts in Mono. */
  const distribution = (rows: Array<[string, number]>, total: number) => (
    <List>
      {rows.map(([label, value]) => (
        <Row
          key={label}
          testId="stats-distribution-row"
          title={label}
          trailing={`${value} · ${
            total > 0 ? Math.round((value / total) * 100) : 0
          }%`}
        />
      ))}
    </List>
  );

  return (
    <PageFrame rail={rail}>
      {header}

      {/* ── Fortschritt ──────────────────────────────────────────────────
          Der Level-Fortschrittsbalken wird ein Mono-Bruch: ein Balken zeigt
          einen Anteil, ein Bruch zeigt beide Zahlen — dieselbe Umformung,
          die der Münzring auf /wishlist bekommt (Spec §4). */}
      <section>
        <GroupHeading>{t("section_progress")}</GroupHeading>
        <div className="flex flex-col gap-2">
          <p className="m-0 font-[family-name:var(--font-mono)] text-[1rem] text-[var(--ink)]">
            {t("level_label", { level: stats.level })} · {currentLevelDef.title}
          </p>
          {nextLevelDef && (
            <p className={RAIL_LINE}>
              {stats.coins} / {nextLevelDef.minCoins} ·{" "}
              {t("level_percent", { percent: levelProgress })}
            </p>
          )}
          <p className={RAIL_LINE}>
            {stats.coinsEarnedAllTime} {t("total_earned")}
          </p>
          <p className={RAIL_LINE}>{t("member_since", { date: memberSince })}</p>
        </div>
      </section>

      {/* ── Streak-Verlauf — bleibt (Spec §2) ───────────────────────────── */}
      {stats.streakHistory.some((v) => v > 0) && (
        <section>
          <GroupHeading>{t("section_streak_history")}</GroupHeading>
          <StreakSparkline
            data={stats.streakHistory}
            todayLabel={t("streak_today", { count: stats.streakCurrent })}
            peakLabel={t("streak_peak", { count: streakPeak })}
          />
        </section>
      )}

      {/* ── Beste Wochentage ────────────────────────────────────────────── */}
      {stats.completionsByWeekday.some((v) => v > 0) && (
        <section>
          <GroupHeading>{t("section_weekdays")}</GroupHeading>
          <WeekdayChart
            data={stats.completionsByWeekday}
            labels={weekdayLabels}
            bestDayLabel={t("best_day")}
            bestDayCount={t("completions_count", { count: bestWeekdayCount })}
          />
        </section>
      )}

      {/* ── Energie ─────────────────────────────────────────────────────── */}
      <section>
        <GroupHeading>{t("section_energy")}</GroupHeading>
        <EnergyWeekBlock
          weekCounts={energyWeekCounts}
          history={energyHistory}
          isEmpty={energyDayCount === 0}
        />
      </section>

      {/* ── Aufgaben nach Typ ───────────────────────────────────────────── */}
      <section>
        <GroupHeading>{t("section_tasks_by_type")}</GroupHeading>
        {distribution(
          [
            [t("type_one_time"), stats.tasksByType.ONE_TIME],
            [t("type_recurring"), stats.tasksByType.RECURRING],
            [t("type_daily_eligible"), stats.tasksByType.DAILY_ELIGIBLE],
          ],
          totalByType,
        )}
      </section>

      {/* ── Aufgaben nach Priorität ─────────────────────────────────────── */}
      <section>
        <GroupHeading>{t("section_tasks_by_priority")}</GroupHeading>
        {distribution(
          [
            [t("priority_high"), stats.tasksByPriority.HIGH],
            [t("priority_normal"), stats.tasksByPriority.NORMAL],
            [t("priority_someday"), stats.tasksByPriority.SOMEDAY],
          ],
          totalByPriority,
        )}
      </section>

      {/* ── Themen ──────────────────────────────────────────────────────────
          Derselbe Zeilenentwurf wie /topics seit Phase 1: der Name trägt den
          Inhalt, die Themenfarbe ist der 6-px-Punkt, der Fortschritt steht
          rechts als "3/7". Der farbcodierte Balken (rot < 25 %, grün ≥ 75 %)
          entfällt — er hat --danger und --done zu Bewertungen umgedeutet,
          die beiden Token bedeuten ausschließlich Zerstörung/Überfälligkeit
          und "erledigt". */}
      {stats.topicsWithStats.length > 0 && (
        <section>
          <GroupHeading>
            {t("section_topics", { count: stats.totalTopics })}
          </GroupHeading>
          <List>
            {stats.topicsWithStats.map((topic) => {
              const pct =
                topic.totalTasks > 0
                  ? Math.round((topic.completedTasks / topic.totalTasks) * 100)
                  : 0;
              const eyebrow =
                topic.completionsLast30Days > 0
                  ? `${t("topic_completed_pct", { percent: pct })} · ${t(
                      "topic_completions_30d",
                      { count: topic.completionsLast30Days },
                    )}`
                  : t("topic_completed_pct", { percent: pct });
              return (
                <Row
                  key={topic.id}
                  testId="stats-topic-row"
                  wrapTitle
                  title={topic.title}
                  eyebrow={eyebrow}
                  dotColor={topic.color ?? null}
                  trailing={`${topic.completedTasks}/${topic.totalTasks}`}
                />
              );
            })}
          </List>
        </section>
      )}
    </PageFrame>
  );
}
```

Was ersatzlos verschwindet, und warum:

| Weg | Grund |
|---|---|
| `faChartBar`, `faFire`, `faTrophy`, `faCircleCheck`, `faListCheck` | Icons, die nichts kodieren; zwei trugen Amber |
| `stats.page_title` / `page_subtitle` als Überschrift | Die Tab-Kopfzeile ist die eine Fraunces-Überschrift der Seite |
| 4er-KPI-Raster in umrahmten Kacheln (Übersicht, Aktivität) | Zahl in Mono im Rand, Label daneben, kein Rahmen (Spec §4) |
| Level-Fortschrittsbalken, Typ- und Prioritäts-Balken, Themen-Balken | Mono-Bruch bzw. „N · P%" — trägt beide Zahlen statt nur den Anteil |
| Der ganze `wishlist`-Abschnitt | Spec §2 |
| `resolveTopicIcon` in der Themenzeile | Der 6-px-Punkt ist die Themenkodierung seit Phase 1 |

- [ ] **Schritt 5: Dispatcher und Tab-Leiste erweitern**

In `components/progress/progress-tabs.tsx`:

```ts
export type Tab = "habits" | "achievements" | "review" | "stats";
export const VALID_TABS: Tab[] = ["habits", "achievements", "review", "stats"];
```

und im Rumpf, vor dem Habits-Fallback:

```tsx
  if (tab === "stats") return <StatsTab userId={userId} header={header} />;
```

In `app/(app)/progress/page.tsx` muss nur der Übersetzungs-Cast wachsen (die Leiste iteriert bereits über `VALID_TABS`):

```tsx
{t(`tab_${key}` as "tab_habits" | "tab_achievements" | "tab_review" | "tab_stats")}
```

- [ ] **Schritt 6: `app/(app)/stats/page.tsx` zum Stub machen**

Die ganze Datei wird:

```tsx
import { redirect } from "next/navigation";

/** Statistiken sind jetzt Teil der vereinheitlichten /progress-Seite. */
export default function StatsPage() {
  redirect("/progress?tab=stats");
}
```

Gleiche Form wie `app/(app)/achievements/page.tsx` und `app/(app)/review/page.tsx` — kein neues Muster, das vierte Exemplar eines bestehenden.

- [ ] **Schritt 7: Das Benutzermenü zeigt auf die Tabs**

`components/layout/user-menu.tsx`, Zeilen 151 und 157:

```tsx
<MenuLinkItem href="/progress?tab=stats" icon={faChartBar}>
  Statistiken
</MenuLinkItem>
<MenuLinkItem href="/progress?tab=review" icon={faCalendarWeek}>
  Wochenrückblick
</MenuLinkItem>
```

Der zweite ist der Bug aus Spec §6 / `ROADMAP.md:326` — ein Redirect-Hop weniger. Die deutschsprachigen Beschriftungen bleiben, wie sie sind: die Übersetzung des Benutzermenüs gehört zu Phase 3 (`components/settings`).

- [ ] **Schritt 8: Prüfen**

```bash
npx tsc --noEmit && npm run lint
npm run check:i18n
npm run check:design
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "tab=stats"
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/progress.spec.ts e2e/navigation.spec.ts
```

Erwartet: grün. `e2e/progress.spec.ts` enthält drei Tests, die `/stats` direkt anspringen — sie laufen über den Redirect und müssen ohne Änderung grün bleiben; wenn nicht, ist der Stub falsch. Ratsche: `app/(app)/stats/page.tsx` von **68 auf 0**, `tabs/stats-tab.tsx` startet bei 0.

Im Browser (dunkel und hell) prüfen: die Tab-Leiste zeigt vier Tabs; das Benutzermenü führt auf `?tab=stats` bzw. `?tab=review` ohne Zwischenschritt in der Netzwerkspur.

- [ ] **Schritt 9: Commit**

```bash
git add app/\(app\)/stats app/\(app\)/progress components/progress components/layout/user-menu.tsx messages e2e/helpers/design-count.ts
git commit -m "feat(ui): /stats wird der vierte Progress-Tab, Datum lokalisiert"
```

---

## Task 5: Die Wunschlisten-Zeile

**Files:**
- Create: `components/wishlist/wishlist-row.tsx`
- Create: `components/wishlist/wishlist-row-actions.tsx`
- Delete: `components/wishlist/wishlist-card.tsx` (667 Zeilen, 59 Verstöße)
- Modify: `components/wishlist/wishlist-view.tsx` (die drei `WishlistCard`-Aufrufstellen)
- Modify: `components/tasks/use-task-swipe.ts` (nur JSDoc)

**Diese Task trägt `/wishlist` noch nicht in `MIGRATED_PAGES` ein.** Die Zeile allein macht die Seite nicht regelkonform — Leerzustände, Budgetleiste und Kopfzeile stehen noch aus (Task 6). Ihr Beleg ist die Ratsche plus `e2e/wishlist.spec.ts`.

**Interfaces:**
- Consumes: `Row`, `ACTION_BTN`, `List` (`components/ui/list.tsx`), `ConfirmButton` (`components/ui/confirm-button.tsx`), `useTaskSwipe` (`components/tasks/use-task-swipe.ts`, Signatur `({ onComplete, onDelete, disabled }) => { swipeX, isSwiping, progress, handlers }`), `SerializedWishlistItem` (`components/wishlist/wishlist-view.tsx`).
- Produces:
  ```ts
  // components/wishlist/wishlist-row.tsx
  export interface WishlistRowProps {
    id: string;
    title: string;
    /** Roher Dezimalstring aus der DB, oder null. */
    price: string | null;
    url: string | null;
    priority: "WANT" | "NICE_TO_HAVE" | "SOMEDAY";
    status: "OPEN" | "BOUGHT" | "DISCARDED";
    coinUnlockThreshold: number | null;
    userCoins: number;
    monthlyBudget: number | null;
    remainingBudget: number | null;
    onBuy: (id: string) => void;
    onUnbuy: (id: string) => void;
    onDiscard: (id: string) => void;
    onUndiscard: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }
  export function WishlistRow(props: WishlistRowProps): React.ReactElement;

  // components/wishlist/wishlist-row-actions.tsx
  export interface WishlistRowActionsProps {
    id: string;
    status: "OPEN" | "BOUGHT" | "DISCARDED";
    /** true, wenn ein Münz-Schwellwert gesetzt und noch nicht erreicht ist. */
    locked: boolean;
    /** Der Schwellwert, für die Beschriftung "Für N Münzen kaufen". */
    coinUnlockThreshold: number | null;
    coinsNeeded: number;
    onBuy: (id: string) => void;
    onUnbuy: (id: string) => void;
    onDiscard: (id: string) => void;
    onUndiscard: (id: string) => void;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
  }
  export function WishlistRowActions(props: WishlistRowActionsProps): React.ReactElement;
  ```
  Die Prop-Namen sind absichtlich identisch mit denen von `WishlistCard` — `wishlist-view.tsx` tauscht nur den Komponentennamen, nicht die Aufrufstellen.

---

- [ ] **Schritt 1: Den Hook als geteilt markieren**

In `components/tasks/use-task-swipe.ts`, an den JSDoc-Block der Funktion anhängen:

```
 * Wird seit Phase 2 auch von `components/wishlist/wishlist-row.tsx`
 * benutzt (rechts = kaufen, links = verwerfen). Der Hook weiß nichts über
 * Aufgaben — `onComplete`/`onDelete` sind Richtungen, keine Domäne. Er
 * bleibt hier statt in `components/ui/` zu wandern: ein Umzug wäre eine
 * Umbenennung ohne Verhaltensänderung an einer Phase-1-Datei.
```

- [ ] **Schritt 2: `wishlist-row-actions.tsx` schreiben**

```tsx
"use client";

/**
 * Die Handlungen einer Wunschlisten-Zeile — kaufen, verwerfen, bearbeiten,
 * löschen; für gekaufte/verworfene Einträge das jeweilige Zurück.
 *
 * Getrennt von der Zeile aus demselben Grund wie `task-row-actions.tsx`:
 * die Zeile ist Darstellung, die Handlungen sind Zustand (Bestätigen,
 * Laden). Alle Icon-Knöpfe teilen sich `ACTION_BTN` — den einen Stil für
 * jede Zeilenaktion, der in `components/ui/list.tsx` lebt.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faPen, faXmark, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { ACTION_BTN } from "@/components/ui/list";
import { ConfirmButton } from "@/components/ui/confirm-button";

export interface WishlistRowActionsProps { /* … siehe Interfaces oben … */ }

export function WishlistRowActions({
  id, status, locked, coinUnlockThreshold, coinsNeeded,
  onBuy, onUnbuy, onDiscard, onUndiscard, onEdit, onDelete,
}: WishlistRowActionsProps) {
  const t = useTranslations("wishlist");
  const [isLoading, setIsLoading] = useState(false);

  const run = (action: () => void) => {
    setIsLoading(true);
    try {
      action();
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <span className="flex items-center gap-1">
      {status === "OPEN" && (
        <>
          <button
            type="button"
            onClick={() => run(() => onBuy(id))}
            disabled={isLoading || locked}
            className={ACTION_BTN}
            aria-label={
              locked
                ? t("card_locked", { coins: coinsNeeded })
                : coinUnlockThreshold !== null
                  ? t("buy_with_coins", { coins: coinUnlockThreshold })
                  : t("card_btn_bought")
            }
            title={
              locked
                ? t("card_locked", { coins: coinsNeeded })
                : t("card_btn_bought")
            }
          >
            <FontAwesomeIcon icon={faCheck} className="text-[0.75rem]" />
          </button>
          <button
            type="button"
            onClick={() => run(() => onDiscard(id))}
            disabled={isLoading}
            className={ACTION_BTN}
            aria-label={t("card_btn_discard")}
            title={t("card_btn_discard")}
          >
            <FontAwesomeIcon icon={faXmark} className="text-[0.75rem]" />
          </button>
        </>
      )}
      {status === "BOUGHT" && (
        <button
          type="button"
          onClick={() => run(() => onUnbuy(id))}
          disabled={isLoading}
          className={ACTION_BTN}
          aria-label={t("card_btn_undo")}
          title={t("card_btn_undo")}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[0.75rem]" />
        </button>
      )}
      {status === "DISCARDED" && (
        <button
          type="button"
          onClick={() => run(() => onUndiscard(id))}
          disabled={isLoading}
          className={ACTION_BTN}
          aria-label={t("card_btn_restore")}
          title={t("card_btn_restore")}
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[0.75rem]" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onEdit(id)}
        className={ACTION_BTN}
        aria-label={t("card_btn_edit")}
        title={t("card_btn_edit")}
      >
        <FontAwesomeIcon icon={faPen} className="text-[0.6875rem]" />
      </button>
      {/* Das zweistufige Löschen der Karte (`confirmingDelete`-State plus
          zwei umrahmte Mini-Buttons) war eine Handkopie dessen, was
          `ConfirmButton` seit Phase 1 kann — inklusive Fokusführung. */}
      <ConfirmButton
        onConfirm={() => onDelete(id)}
        confirmPrompt={t("view_confirm_delete")}
        yesLabel={t("card_btn_delete_confirm")}
        noLabel={t("card_btn_delete_cancel")}
        className={ACTION_BTN}
        disabled={isLoading}
        aria-label={t("card_btn_delete")}
        title={t("card_btn_delete")}
      >
        <FontAwesomeIcon icon={faXmark} className="text-[0.75rem]" />
      </ConfirmButton>
    </span>
  );
}
```

- [ ] **Schritt 3: `wishlist-row.tsx` schreiben**

```tsx
"use client";

/**
 * WishlistRow — ein Wunsch als Zeile.
 *
 * Ersetzt `wishlist-card.tsx` (667 Zeilen, 59 Ratschen-Verstöße). Die Karte
 * verschwindet als Konzept; übrig bleiben Zeile, Kaufaktion und Wischgeste
 * (Spec §3). Was die Karte kodierte und wie es jetzt kodiert ist:
 *
 * | Karte | Zeile |
 * |---|---|
 * | Prioritäts-Chip, farbig und umrahmt | `eyebrow`, Mono-Versalien |
 * | Preis 1.625rem in `--accent-amber` | `trailing`, Mono `tabular-nums`, `--ink-3` |
 * | Münz-Fortschrittsring: SVG, 🪙, zwei Farben | Mono-Bruch im `eyebrow`: `34 / 50` |
 * | Münz-Fortschrittsbanner mit Balken | derselbe Bruch — der Ring und der Balken zeigten dieselbe Zahl zweimal |
 * | "Gekauft"/"Verworfen"-Statusabzeichen | `dimmed` plus ein Wort im `eyebrow` |
 * | grüner/roter Rand links | `dimmed` |
 *
 * **N Karten waren N Amber.** Der Preis war der Grund, warum die Regel
 * "Amber höchstens einmal je Seite" auf /wishlist nicht annähernd galt.
 *
 * "Leistbar" und "über Budget" bleiben als Text erhalten, aber ohne Farbe:
 * `--done` bedeutet ausschließlich "erledigt" und `--danger` ausschließlich
 * Zerstörung und Überfälligkeit — eine Preisbewertung ist keins von beidem.
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Row } from "@/components/ui/list";
import { useTaskSwipe } from "@/components/tasks/use-task-swipe";
import { WishlistRowActions } from "./wishlist-row-actions";

export interface WishlistRowProps { /* … siehe Interfaces oben … */ }

export function WishlistRow(props: WishlistRowProps) {
  const t = useTranslations("wishlist");
  const locale = useLocale();

  const isOpen = props.status === "OPEN";
  const numericPrice = props.price !== null ? Number(props.price) : null;

  const hasThreshold =
    props.coinUnlockThreshold !== null && props.coinUnlockThreshold > 0;
  const locked = isOpen && hasThreshold && props.userCoins < props.coinUnlockThreshold!;
  const coinsNeeded = hasThreshold
    ? Math.max(0, props.coinUnlockThreshold! - props.userCoins)
    : 0;

  const swipe = useTaskSwipe({
    // Ein gesperrter Wunsch darf nicht per Wisch gekauft werden, aber sehr
    // wohl verworfen — `disabled` wäre beides auf einmal.
    onComplete: () => {
      if (!locked) props.onBuy(props.id);
    },
    onDelete: () => props.onDiscard(props.id),
    disabled: !isOpen,
  });

  // Die Wisch-Vorschau steht nur während der Geste im DOM. `countBoxes` hat
  // seit Task 8 der Phase 1 zwar einen Opazitäts-Wächter, aber
  // vorübergehendes Feedback muss im Ruhezustand gar nicht existieren —
  // dieselbe Begründung wie in `task-row.tsx`.
  const [panelMounted, setPanelMounted] = useState(false);
  useEffect(() => {
    if (swipe.isSwiping) {
      setPanelMounted(true);
      return;
    }
    const id = setTimeout(() => setPanelMounted(false), 250);
    return () => clearTimeout(id);
  }, [swipe.isSwiping]);

  const eyebrowParts: string[] = [
    t(
      props.priority === "WANT"
        ? "priority_want"
        : props.priority === "NICE_TO_HAVE"
          ? "priority_nice"
          : "priority_someday",
    ),
  ];
  if (isOpen && hasThreshold) {
    eyebrowParts.push(`${props.userCoins} / ${props.coinUnlockThreshold}`);
  }
  if (isOpen && numericPrice !== null && props.monthlyBudget !== null) {
    eyebrowParts.push(
      props.remainingBudget !== null && numericPrice <= props.remainingBudget
        ? t("card_affordable")
        : t("card_over_budget"),
    );
  }
  if (props.status === "BOUGHT") eyebrowParts.push(t("card_bought"));
  if (props.status === "DISCARDED") eyebrowParts.push(t("card_discarded"));

  return (
    <Row
      as={motion.li}
      testId="wishlist-row"
      wrapTitle
      dimmed={!isOpen}
      className="relative overflow-hidden touch-pan-y"
      animate={{ x: swipe.swipeX }}
      transition={{
        x: swipe.isSwiping
          ? { duration: 0 }
          : { type: "spring", stiffness: 400, damping: 35 },
      }}
      onTouchStart={swipe.handlers.onTouchStart}
      onTouchMove={swipe.handlers.onTouchMove}
      onTouchEnd={swipe.handlers.onTouchEnd}
      lead={
        <>
          {/* Rechts wischen = gekauft. `--done` ist hier korrekt: ein
              gekaufter Wunsch IST erledigt — dieselbe Bedeutung wie eine
              abgehakte Aufgabe, nicht eine zweite. */}
          {panelMounted && isOpen && !locked && (
            <motion.span
              aria-hidden="true"
              animate={{ opacity: Math.max(0, Math.min(swipe.progress, 1)) }}
              transition={{ duration: swipe.isSwiping ? 0 : 0.2 }}
              className="pointer-events-none absolute inset-y-0 left-0 flex min-w-[90px] items-center gap-2 bg-[var(--done)] px-4 text-[var(--ground)]"
            >
              {swipe.progress > 0.5 && (
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold">
                  {t("card_bought")}
                </span>
              )}
            </motion.span>
          )}
          {/* Links wischen = verwerfen. `--danger`, wie beim Löschen einer Zeile. */}
          {panelMounted && isOpen && (
            <motion.span
              aria-hidden="true"
              animate={{ opacity: Math.max(0, Math.min(-swipe.progress, 1)) }}
              transition={{ duration: swipe.isSwiping ? 0 : 0.2 }}
              className="pointer-events-none absolute inset-y-0 right-0 flex min-w-[90px] items-center justify-end gap-2 bg-[var(--danger)] px-4 text-[var(--ground)]"
            >
              {swipe.progress < -0.5 && (
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold">
                  {t("card_btn_discard")}
                </span>
              )}
            </motion.span>
          )}
        </>
      }
      title={
        props.url ? (
          // Keine eigene `className`: `globals.css`s ungelayerte a-Regel
          // setzt `color: inherit` und die haarlinienfarbene
          // Unterstreichung — sie schlägt jede @layer-utilities-Klasse
          // (dieselbe Falle wie in `topic-card.tsx` dokumentiert).
          <a href={props.url} target="_blank" rel="noopener noreferrer" title={props.url}>
            {props.title}
          </a>
        ) : (
          props.title
        )
      }
      eyebrow={eyebrowParts.join(" · ")}
      trailing={
        numericPrice !== null
          ? `€${numericPrice.toLocaleString(locale, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : undefined
      }
      actions={
        <WishlistRowActions
          id={props.id}
          status={props.status}
          locked={locked}
          coinUnlockThreshold={props.coinUnlockThreshold}
          coinsNeeded={coinsNeeded}
          onBuy={props.onBuy}
          onUnbuy={props.onUnbuy}
          onDiscard={props.onDiscard}
          onUndiscard={props.onUndiscard}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
        />
      }
    />
  );
}
```

`t("card_no_price")` entfällt: eine fehlende Kennzahl wird nicht angezeigt (Spec §6), und ein leerer `trailing`-Slot ist genau das.

- [ ] **Schritt 4: `wishlist-view.tsx` auf `List`/`WishlistRow` umstellen**

Drei Stellen rufen heute `<WishlistCard …/>` auf (offenes Raster, gekaufte History, verworfene History). Alle drei bekommen dieselbe Behandlung:

```tsx
import { List } from "@/components/ui/list";
import { WishlistRow } from "@/components/wishlist/wishlist-row";
```

```tsx
{/* Offene Wünsche — vorher `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4` */}
<List>
  {openItems.map((item) => (
    <WishlistRow key={item.id} {...rowProps(item)} />
  ))}
</List>
```

Dazu **einen** Helfer im Komponentenrumpf, statt die sechzehn Props dreimal abzuschreiben:

```tsx
/** Die sechzehn Props einer Zeile, an drei Stellen identisch. */
const rowProps = (item: SerializedWishlistItem) => ({
  id: item.id,
  title: item.title,
  price: item.price,
  url: item.url,
  priority: item.priority,
  status: item.status,
  coinUnlockThreshold: item.coinUnlockThreshold,
  userCoins: coins,
  monthlyBudget: budget.monthlyBudget,
  remainingBudget: budget.remaining,
  onBuy: handleBuy,
  onUnbuy: handleUnbuy,
  onDiscard: handleDiscard,
  onUndiscard: handleUndiscard,
  onEdit: handleEdit,
  onDelete: handleDelete,
});
```

**Achtung: kein Wrapper-Element zwischen `<List>` und den Zeilen.** `List` rendert ein `<ul>`, `Row` ein `<li>`; ein `<div>` dazwischen macht jede Zeile zum `:first-child` und kostet die Haarlinie (Task 8 der Phase 1, Fund F1). Die verworfene Unterliste bekommt deshalb ihre eigene `<List>` mit einer `GroupHeading` als **Geschwister davor**, nicht als Kind.

`components/wishlist/wishlist-card.tsx` löschen. `grep -rn "WishlistCard" --include=*.tsx components app` muss danach leer sein.

- [ ] **Schritt 5: Prüfen**

```bash
npx tsc --noEmit && npm run lint && npm run check:design && npm run check:i18n
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/wishlist.spec.ts
```

Erwartet: grün. `e2e/wishlist.spec.ts` prüft unter anderem, dass ein Preis von 29 im Body auftaucht (`toContainText(/29/)`) — der Preis steht jetzt im `trailing`-Slot, der Test bleibt gültig.

Ratsche: `wishlist-card.tsx` (59) verschwindet, `wishlist-row.tsx` und `wishlist-row-actions.tsx` starten bei 0, `wishlist-view.tsx` fällt von 29 auf ~20.

Am echten Gerät oder im Chrome-Geräte-Emulator wischen: rechts kaufen, links verwerfen, vertikal scrollt weiter (die Achsensperre des Hooks).

- [ ] **Schritt 6: Commit**

```bash
git add components/wishlist components/tasks/use-task-swipe.ts
git commit -m "feat(wishlist): Wünsche als Zeilen, Münzring wird Mono-Bruch"
```

---

## Task 6: Die Wunschlisten-Seite

**Files:**
- Modify: `app/(app)/wishlist/page.tsx` (Kopfzeile, `totalSpent`)
- Modify: `components/wishlist/wishlist-view.tsx` (`PageFrame`, Rand, Leerzustände)
- Modify: `components/wishlist/budget-bar.tsx` (25 Verstöße; zieht in den Rand)
- Modify: `components/wishlist/wishlist-form.tsx` (18 Verstöße, Token-Aufräumung)
- Modify: `app/(app)/wishlist/loading.tsx` (19 Verstöße)
- Modify: `messages/{de,en,es,fr,nl,ru,zh}.json` (`wishlist.budget_total_spent`)
- Modify: `e2e/helpers/design-count.ts` (`MIGRATED_PAGES`)

**Interfaces:**
- Consumes: `WishlistRow` (Task 5), `PageFrame`, `EmptyState`, `Button`, `SearchInput`/`FilterPills` (`components/shared/search-filter-bar.tsx`).
- Produces: `BudgetBarProps` bekommt ein Feld:
  ```ts
  export interface BudgetBarProps {
    monthlyBudget: number | null;
    spentThisMonth: number;
    remaining: number | null;
    /** Summe aller je gekauften Wünsche, über alle Monate. Neu in Phase 2. */
    totalSpent: number;
    onBudgetUpdate: (newBudget: number | null) => void;
  }
  ```

---

- [ ] **Schritt 1: `wishlist.budget_total_spent` in sieben Locales**

Ins `wishlist`-Objekt, hinter `budget_left`:

| Datei | Wert |
|---|---|
| `de.json` | `"budget_total_spent": "{amount} insgesamt ausgegeben"` |
| `en.json` | `"budget_total_spent": "{amount} spent in total"` |
| `es.json` | `"budget_total_spent": "{amount} gastado en total"` |
| `fr.json` | `"budget_total_spent": "{amount} dépensé au total"` |
| `nl.json` | `"budget_total_spent": "{amount} in totaal uitgegeven"` |
| `ru.json` | `"budget_total_spent": "всего потрачено {amount}"` |
| `zh.json` | `"budget_total_spent": "累计支出 {amount}"` |

- [ ] **Schritt 2: Den Zustand messbar machen — der rote Test**

`MIGRATED_PAGES` bekommt `"/wishlist"`.

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "/wishlist"
```

Erwartet: **FAIL** — Fraunces > 1 (die `h1` plus die Leerzustands-Überschriften), Kästen > 0 (Budgetleiste, Leerzustände, Fehlerbanner), Maß FAIL (keine `[data-column]`). Amber sollte nach Task 5 schon bei 1–2 liegen (Budgetleisten-Button, Leerzustands-Halo).

- [ ] **Schritt 3: `totalSpent` beschaffen — ohne neue Abfrage**

`getBudgetSummary` liefert nur `spentThisMonth`. `getUserStatistics().wishlistStats.totalSpent` gäbe die Zahl, wäre aber eine vollständige Statistik-Abfrage für ein Feld. Die Zahl steckt bereits in den Daten, die die Seite ohnehin holt: `getUserWishlistItems` liefert **alle** Einträge samt `price` und `status`.

In `components/wishlist/wishlist-view.tsx`, neben `openItems`/`historyItems`:

```tsx
// Alle Zeiten, nicht nur der laufende Monat — aus den Einträgen abgeleitet,
// die die Seite ohnehin hält, statt aus einer zweiten Abfrage. Nebenwirkung
// und Absicht zugleich: die Zahl aktualisiert sich sofort mit, wenn ein
// Wunsch gekauft oder ein Kauf zurückgenommen wird, weil sie aus `items`
// fällt und nicht aus einer Server-Momentaufnahme. Bewusst über `items`
// statt `filteredItems`: eine Gesamtsumme darf nicht auf einen Suchbegriff
// reagieren.
const totalSpent = items.reduce(
  (sum, i) => (i.status === "BOUGHT" && i.price ? sum + Number(i.price) : sum),
  0,
);
```

- [ ] **Schritt 4: `budget-bar.tsx` migrieren**

Die Komponente zieht in den Rand und verliert ihren Kasten. Der Rumpf wird eine Folge von Mono-Zeilen plus ein echter Fortschrittsbalken:

```tsx
<div className="flex flex-col gap-2">
  <p className={RAIL_LINE}>
    {t("budget_this_month")} €{formatCurrency(spentThisMonth, locale)}
    {monthlyBudget !== null && <> / €{formatCurrency(monthlyBudget, locale)}</>}
  </p>

  {monthlyBudget !== null && (
    // `role="progressbar"` ist die benannte Ausnahme, die `countBoxes`
    // prüft — ein Fortschrittsbalken IST eine gefüllte Fläche, per
    // Definition. Ohne die Rolle zählen Spur UND Füllung als zwei Kästen.
    // Die aria-Werte sind kein Beiwerk: eine Rolle ohne sie ist ein leeres
    // Versprechen an den Screenreader.
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={monthlyBudget}
      aria-valuenow={Math.min(spentThisMonth, monthlyBudget)}
      aria-label={t("budget_this_month")}
      className="h-[6px] w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--raised)]"
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percent}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="h-full rounded-[var(--radius-pill)] bg-[var(--ink-2)]"
      />
    </div>
  )}

  {remaining !== null && (
    <p className={RAIL_LINE}>
      {remaining < 0 ? t("budget_over") : t("budget_left", { amount: `€${formatCurrency(remaining, locale)}` })}
    </p>
  )}

  {totalSpent > 0 && (
    <p className={RAIL_LINE}>
      {t("budget_total_spent", { amount: `€${formatCurrency(totalSpent, locale)}` })}
    </p>
  )}

  <Button
    variant="quiet"
    size="sm"
    onClick={() => {
      setBudgetInput(monthlyBudget !== null ? String(monthlyBudget) : "");
      setIsEditing(true);
    }}
  >
    {monthlyBudget === null ? t("budget_set") : t("budget_edit")}
  </Button>
</div>
```

Die Änderungen im Einzelnen:
- **`getBarColor` entfällt.** Grün < 80 %, Amber 80–100 %, Rot > 100 % war dreifach regelwidrig: Amber gehört nicht in den Rand, `--done` bedeutet ausschließlich „erledigt", `--danger` ausschließlich Zerstörung und Überfälligkeit. Der Balken ist immer `--ink-2`; dass das Budget voll ist, sagt der Balken selbst, und „über Budget" steht als Text daneben.
- **`inputStyle`** (ein `React.CSSProperties`-Objekt mit sieben Feldern) wird eine Klassenkette:
  `"w-full rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] px-3 py-2 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink)] outline-none"`
- **Die beiden amberfarbenen Knöpfe** („Budget setzen", „Speichern") werden `<Button variant="quiet">`.
- **Der „kein Budget"-Sonderpfad** (ein eigener gestrichelter Kasten mit zwei Absätzen) fällt weg: bei `monthlyBudget === null` rendern die Balken- und die Restzeile ohnehin nicht, `budget_no_budget_hint` wird eine Mono-Zeile, und der Knopf trägt bereits die passende Beschriftung.
- Die Fehlermeldung `saveError` bleibt `--danger` (siehe Global Constraints).
- `RAIL_LINE` wird aus `components/ui/list.tsx` importiert (Task 1) — **nicht** aus einem Tab-Modul: `budget-bar.tsx` ist eine Client-Komponente, und ein Server-Tab-Modul zöge `db`/`drizzle` ins Client-Bundle.

**Warum die Budgetleiste in den Rand darf, obwohl sie Knöpfe hat:** `/tasks` stellt seit Phase 1 `FilterPills` in den Rand — Affordanzen im Rand sind gesetzt. Die Regel des Randes ist „nie Amber", nicht „nie anfassbar".

- [ ] **Schritt 5: `wishlist-view.tsx` auf `PageFrame` umstellen**

```tsx
const rail = (
  <>
    <BudgetBar
      monthlyBudget={budget.monthlyBudget}
      spentThisMonth={budget.spentThisMonth}
      remaining={budget.remaining}
      totalSpent={totalSpent}
      onBudgetUpdate={handleBudgetUpdate}
    />
    {items.length > 0 && (
      <FilterPills
        filters={filterGroups}
        activeFilters={{ priority: priorityFilter }}
        onFilterChange={handleFilterChange}
        resultCount={filteredItems.length}
        totalCount={items.length}
        onClearAll={clearAllFilters}
        isFiltering={isFiltering}
      />
    )}
  </>
);

return (
  <PageFrame rail={rail}>
    {header}
    {items.length > 0 && (
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={tSearch("placeholder_wishlist")}
      />
    )}
    {/* … Fehlerzeile, Listen, Formular … */}
  </PageFrame>
);
```

Suche in der Lesespalte, Filter im Rand — die Aufteilung, die `task-list.tsx`/`tasks-rail.tsx` in Phase 1 gefunden hat (`SearchFilterBar` bündelt beides und ist für 208 px zu breit). **Vor dem Schreiben die tatsächlichen Signaturen von `SearchInput` und `FilterPills` in `components/shared/search-filter-bar.tsx` nachlesen** — der Phase-1-Plan hatte sie erfunden, und das ist dort als Fund vermerkt.

Der Rand ist hier unbedingt: die Budgetleiste rendert immer (mindestens die Ausgaben dieses Monats und den Knopf), ein `hasRailContent`-Wächter wäre tote Bedingung.

Die drei Kästen der Ansicht werden `EmptyState`:

```tsx
{/* Kein Wunsch vorhanden */}
<EmptyState
  line={t("view_empty_sub")}
  action={<Button variant="quiet" size="md" onClick={() => setShowForm(true)}>{t("view_add")}</Button>}
/>

{/* Suche/Filter ohne Treffer */}
<EmptyState
  line={tSearch("no_results_hint")}
  action={<Button variant="quiet" size="sm" onClick={clearAllFilters}>{tSearch("clear_filters")}</Button>}
/>
```

Damit verschwinden: der gestrichelte Rahmen, der 240-px-Amber-Radialverlauf, der amberfarbene Geschenk-Kreis, `faGift`, `faMagnifyingGlass` und die `--font-display`-Überschriften der Leerzustände. `EmptyState`s JSDoc sagt es ausdrücklich: kein Kasten, kein gestrichelter Rahmen, kein Emoji, keine Illustration.

Die History-Ausklapper (zwei fast identische Blöcke, einmal für „gekauft + verworfen", einmal für „nur verworfen") werden **ein** Block mit einer `GroupHeading` je Untergruppe und je einer eigenen `<List>`. Der Ausklapp-Knopf bleibt ein `<button>` (Affordanz, von `countBoxes` ausgenommen), verliert aber seine sieben Inline-Style-Felder an Klassen.

Das Fehlerbanner `coinError` wird eine Zeile ohne Fläche:

```tsx
{coinError && (
  <p role="alert" className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--danger)]">
    {coinError}
  </p>
)}
```

- [ ] **Schritt 6: `app/(app)/wishlist/page.tsx` — Kopfzeile in die Ansicht reichen**

Die Seite verliert ihren `max-w-5xl`-Wrapper und ihre eigene Kopfzeile; `WishlistView` besitzt jetzt den `PageFrame`, also muss die Kopfzeile als Prop hinein (dasselbe Muster wie `header` bei den Progress-Tabs):

```tsx
const header = (
  <div className="flex flex-col gap-2">
    <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
      {t("page_title")}
    </h1>
    <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-2)]">
      {t("page_subtitle")}
    </p>
  </div>
);

return (
  <WishlistView
    header={header}
    initialItems={serializedItems}
    initialBudget={budget}
    userCoins={userCoins}
  />
);
```

`WishlistViewProps` bekommt entsprechend `header: React.ReactNode`.

- [ ] **Schritt 7: `wishlist-form.tsx` — reine Token-Aufräumung**

Der Dialog liegt unter `role="dialog"` (Radix) und ist damit von `countBoxes` ausgenommen; er ist beim Laden ohnehin nicht offen. Diese Arbeit senkt nur die Ratsche und beseitigt zwei echte Farbverstöße:
- `backgroundColor: "rgba(184,84,80,0.12)"` und `border: "1px solid rgba(184,84,80,0.3)"` am Fehlerbanner → `--danger` über `color-mix(in srgb, var(--danger) 12%, transparent)` bzw. `… 30% …`.
- `color: isSelected ? "var(--accent-amber)" : …` an den Prioritätsknöpfen → `--ink` / `--ink-3` (ein Formular mit drei amberfarbenen Optionen ist drei Amber).
- `inputStyle`, `disclosureRowStyle` und die übrigen Stilobjekte → Klassenketten mit `--radius-sm`, `--hairline`, `--raised`, `--ink`.

- [ ] **Schritt 8: `loading.tsx` — das Skelett folgt der Liste**

Der Skelettschirm zeigt heute Kacheln, die es nicht mehr gibt. Er wird eine Haarlinien-Liste:

```tsx
export default function WishlistLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--measure)] animate-pulse flex-col gap-8">
      <div className="h-8 w-48 rounded-[var(--radius-sm)] bg-[var(--raised)]" />
      <ul className="m-0 list-none p-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 border-t border-t-[var(--hairline)] py-3 first:border-t-0"
          >
            <span className="h-4 w-2/3 rounded-[var(--radius-sm)] bg-[var(--raised)]" />
            <span className="h-4 w-16 rounded-[var(--radius-sm)] bg-[var(--raised)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Kein `List`/`Row`-Import: das Skelett hat keine Inhalte, es hat Platzhalter — es die echten Primitive mit leeren Props füttern zu lassen wäre mehr Code für dasselbe Bild.

- [ ] **Schritt 9: Prüfen**

```bash
npx tsc --noEmit && npm run lint && npm run check:i18n && npm run check:design
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "/wishlist"
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/wishlist.spec.ts
```

Erwartet: alle fünf Regeln × zwei Themes grün. Amber auf `/wishlist` danach: **0**.

- [ ] **Schritt 10: Commit**

```bash
git add components/wishlist app/\(app\)/wishlist messages e2e/helpers/design-count.ts
git commit -m "feat(wishlist): Seite auf PageFrame, Budget in den Rand, Gesamtausgaben sichtbar"
```

---

## Task 7: `/quick`

**Files:**
- Modify: `app/(app)/quick/page.tsx` (5 Verstöße)
- Modify: `components/quick/five-minute-view.tsx` (13 Verstöße)
- Modify: `e2e/helpers/design-count.ts` (`MIGRATED_PAGES`)
- **Nicht** angefasst: `components/tasks/task-item.tsx` (Phase-1-Rest, Spec §7 — `/topics/[id]` benutzt es weiter)

**Interfaces:**
- Consumes: `TaskRow`/`TaskRowProps` (`components/tasks/task-row.tsx`), `PageFrame`, `List`, `EmptyState`, `Button`.

---

- [ ] **Schritt 1: Den Zustand messbar machen — der rote Test**

`MIGRATED_PAGES` bekommt `"/quick"`. Damit ist die Liste vollständig:

```ts
export const MIGRATED_PAGES: string[] = [
  "/dashboard",
  "/tasks",
  "/focus",
  "/topics",
  "/progress",                 // = ?tab=habits, der Default
  "/progress?tab=achievements",
  "/progress?tab=review",
  "/progress?tab=stats",
  "/wishlist",
  "/quick",
];
```

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "/quick"
```

Erwartet: **FAIL** — Amber ≥ 2 (der 280×160-Radialverlauf hinter der Überschrift plus, je nach Zustand, der amberfarbene Link im Leerzustand), Fraunces > 1, Kästen > 0 (jede `TaskItem`-Karte), Maß FAIL.

- [ ] **Schritt 2: `five-minute-view.tsx` — `TaskItem` gegen `TaskRow` tauschen**

Das ist ein **Verbraucherwechsel**, kein Eingriff in `task-item.tsx`. `TaskRowProps` ist eine Teilmenge dessen, was die Ansicht ohnehin hat; drei heute übergebene Props kennt `TaskRow` nicht und sie entfallen (`coinValue`, `postponeCount`, `energyLevel` — die Münzen stehen seit Phase 1 als Randsumme, nicht an jeder Zeile).

```tsx
import { List } from "@/components/ui/list";
import { TaskRow } from "@/components/tasks/task-row";
```

```tsx
<List>
  <AnimatePresence initial={false}>
    {sortedTasks.map((task) => {
      const topic = task.topicId ? topicMap.get(task.topicId) : null;
      return (
        <TaskRow
          key={task.id}
          id={task.id}
          title={task.title}
          type={task.type}
          priority={task.priority}
          completedAt={task.completedAt}
          dueDate={task.dueDate}
          nextDueDate={task.nextDueDate}
          topicTitle={topic?.title}
          topicColor={topic?.color}
          topicId={task.topicId}
          estimatedMinutes={task.estimatedMinutes}
          snoozedUntil={task.snoozedUntil}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onInlineEdit={handleInlineEdit}
          onGoToTopic={handleGoToTopic}
          exitAnimation
        />
      );
    })}
  </AnimatePresence>
</List>
```

**Der `motion.div`-Wrapper um jede Zeile muss weg.** `TaskRow` mit `exitAnimation` rendert selbst als `motion.li` — genau dafür existiert `Row`s `as`-Prop (`AnimatePresence` muss das Element beobachten, das aus dem DOM verschwindet). Ein `<div>` zwischen `<ul>` und `<li>` würde außerdem jede Zeile zum `:first-child` machen und die Haarlinie kosten. Muster wörtlich wie `task-list.tsx:848–854`.

- [ ] **Schritt 3: Die beiden Feier-/Leerzustände**

Beide (der „alles erledigt"-Block und der „keine 5-Minuten-Aufgaben"-Block) sind heute gestrichelte bzw. grün umrandete Kästen mit einem 72-px-Farbkreis, einem Icon, einer Fraunces-Kursivzeile und einem amberfarbenen Link. Beide werden `EmptyState`:

```tsx
{allDone && (
  <EmptyState
    testId="quick-all-done"
    line={t("completed_all")}
    action={
      <Button asChild variant="quiet" size="md">
        <Link href="/tasks">{tTasks("page_title")}</Link>
      </Button>
    }
  />
)}

{initialTasks.length === 0 && (
  <EmptyState
    line={t("empty_subtitle")}
    action={
      <Button asChild variant="quiet" size="md">
        <Link href="/tasks">{t("empty_link")}</Link>
      </Button>
    }
  />
)}
```

`empty_title` und `faBolt`/`faCheck` entfallen: `EmptyState` trägt genau eine Zeile, und die Zeile, die sagt, was zu tun ist, ist `empty_subtitle`. Der `→`-Pfeil in `empty_link` bleibt als Teil der Übersetzung stehen — er zu entfernen wäre eine Textänderung in sieben Locales ohne Anlass.

- [ ] **Schritt 4: `app/(app)/quick/page.tsx` auf `PageFrame`**

```tsx
return (
  <PageFrame>
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
        {t("page_title")}
      </h1>
      <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-3)]">
        {t("page_subtitle", { count: serializedTasks.length })}
      </p>
    </div>
    <FiveMinuteView initialTasks={serializedTasks} topics={serializedTopics} />
  </PageFrame>
);
```

**Kein Rand.** `/quick` ist wie `/focus` eine Ansicht mit genau einer Aufgabe — der Anzahl der wartenden Aufgaben; die steht bereits als Untertitel. Ein Rand mit einer Zeile wäre eine 208-px-Spalte für eine Zahl.

**Der Radialverlauf entfällt.** `radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-amber) 10%, transparent) …)` mit Alpha 0,10 liegt über der 0,03-Schwelle von `countAmber` und ist damit ein voller Amber-Treffer — und er ist kein `.lichtkegel`, also nicht die eine erlaubte Lichtquelle. `/quick` hat danach null oder ein Amber (der Leerzustands-Link, sofern sichtbar), beides erlaubt.

Die kursive Fraunces-Überschrift wird aufrecht — dieselbe Kopfzeilenform wie `/progress` und `/wishlist`.

- [ ] **Schritt 5: Prüfen**

```bash
npx tsc --noEmit && npm run lint && npm run check:design && npm run check:i18n
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts --grep "/quick"
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/focus-quick.spec.ts
```

Erwartet: grün. Wenn die Standard-Sitzung Aufgaben mit ≤ 5 Minuten hat, prüfen die Regeln den Listen-Zweig; den Leerzustand zusätzlich von Hand ansehen (`/quick` mit einem Konto ohne kurze Aufgaben, oder die Bedingung im Browser-Devtools kurzzeitig umkehren).

- [ ] **Schritt 6: Commit**

```bash
git add app/\(app\)/quick components/quick e2e/helpers/design-count.ts
git commit -m "feat(ui): /quick auf PageFrame und TaskRow, Amber-Halo entfernt"
```

---

## Task 8: Die Zustandsprüfung der Phase-1-Seiten

**Files:**
- Create: `docs-tech/lichtkegel-phase2/zustandspruefung.md`
- Ggf. modify: nur Dateien, die ohnehin zu Phase 2 gehören (siehe unten)

**Warum diese Task existiert:** §1 der Spec hat einen Fund beschrieben, nicht nur einen Fehler behoben — die Messeinheit war die Ursache, ein Zähler, der Routen kennt, kann eine Route nicht in ihren Zuständen prüfen. §5 verlangt darum **eine einmalige Nachprüfung derselben blinden Stelle auf den vier Phase-1-Seiten**. Gefundene Lücken werden **benannt**; behoben nur, wo sie in Phase-2-Dateien liegen — sonst wächst diese Phase unkontrolliert, und der Fund verschwindet in einem PR, der ihn nicht erklärt.

**Interfaces:**
- Consumes: `countAmber`, `countDisplayFont`, `countBoxes`, `measureColumns`, `gotoWithTheme` (`e2e/helpers/design-count.ts`).
- Produces: `docs-tech/lichtkegel-phase2/zustandspruefung.md` — eine Tabelle, kein Fließtext.

---

- [ ] **Schritt 1: Die Sonde schreiben (Einwegcode, nicht committen)**

Ins Scratchpad, **nicht** ins Repository: eine Spec, die nur misst und immer grün ist, wäre ein Test, der nichts behauptet. Die Sonde wird einmal gefahren, ihr Ergebnis wandert in den Bericht, der Code wird weggeworfen.

`e2e/zustandssonde.spec.ts` (anlegen, fahren, danach `git checkout -- .` bzw. löschen):

```ts
import { test } from "@playwright/test";
import {
  countAmber,
  countBoxes,
  countDisplayFont,
  measureColumns,
  gotoWithTheme,
} from "./helpers/design-count";

/** Ein Zustand: Name, Route, und was zu tun ist, um ihn herzustellen. */
const STATES: Array<{ name: string; path: string; reach?: (page: import("@playwright/test").Page) => Promise<void> }> = [
  { name: "/tasks · Standard", path: "/tasks" },
  {
    name: "/tasks · Prioritätsfilter aktiv",
    path: "/tasks",
    reach: async (page) => {
      await page.getByRole("button", { name: /hoch|high/i }).first().click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "/tasks · Suche ohne Treffer",
    path: "/tasks",
    reach: async (page) => {
      await page.getByRole("textbox").first().fill("zzz-kein-treffer-zzz");
      await page.waitForTimeout(300);
    },
  },
  {
    name: "/tasks · Nach Thema gruppiert",
    path: "/tasks",
    reach: async (page) => {
      await page.getByRole("button", { name: /thema|topic/i }).first().click();
      await page.waitForTimeout(300);
    },
  },
  { name: "/topics · volle Liste", path: "/topics" },
  { name: "/topics/[id] · Detailseite", path: "PLATZHALTER — echte ID einsetzen" },
  { name: "/dashboard · Standard", path: "/dashboard" },
  { name: "/focus · Auswahlphase", path: "/focus" },
];

for (const state of STATES) {
  for (const theme of ["dark", "light"] as const) {
    test(`${state.name} (${theme})`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoWithTheme(page, theme, state.path);
      await state.reach?.(page);
      const amber = await countAmber(page);
      const fraunces = await countDisplayFont(page);
      const boxes = await countBoxes(page);
      const { measurePx, widths, breakouts } = await measureColumns(page);
      const wide = widths.filter((w) => w > measurePx + 1);
      const unlabeled = breakouts.filter((b) => b.reason === null);
      console.log(
        `RESULT | ${state.name} | ${theme} | amber=${amber.length} | fraunces=${fraunces.length} | boxen=${boxes.length} | spalten_zu_breit=${wide.length} | unbenannte_ueberlaeufe=${unlabeled.length}`,
      );
      for (const h of boxes) console.log(`  BOX  ${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`);
      for (const h of amber) console.log(`  AMBER ${h.tag}[${h.testid ?? "-"}] ${h.prop} "${h.text}"`);
      for (const h of fraunces) console.log(`  FRAUNCES ${h.tag} "${h.text}"`);
    });
  }
}
```

Vor dem Fahren: eine echte Themen-ID besorgen und in `STATES` einsetzen —

```bash
psql "$DATABASE_URL" -c "select id, title from topics limit 3;"
```

Die vier `reach`-Funktionen benutzen absichtlich `getByRole` mit lockeren Namensmustern: sie müssen nur einmal funktionieren. Wenn ein Selektor nicht greift, wird der Zustand von Hand im Browser hergestellt und mit `document.querySelectorAll` in der Devtools-Konsole gemessen — der Bericht braucht die Zahl, nicht die Automatisierung.

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/zustandssonde.spec.ts --reporter=list 2>&1 | grep -E "RESULT|BOX|AMBER|FRAUNCES" \
  > /tmp/claude-1000/-var-home-jpy-projects-momo/*/scratchpad/zustaende.txt
```

- [ ] **Schritt 2: Den Bericht schreiben**

`docs-tech/lichtkegel-phase2/zustandspruefung.md`:

```markdown
# Nachprüfung der Phase-1-Seiten in ihren Zuständen

Gemessen am <DATUM>, Anlass: Spec Phase 2 §5. Die Phase-1-Zähler haben
jede Seite in genau EINEM Zustand gesehen — dem, den `page.goto(path)`
herstellt. Diese Prüfung fragt, ob unter den anderen Zuständen dasselbe
liegt wie unter `/progress`s zwei ungemessenen Tabs.

## Ergebnis

| Zustand | Amber | Fraunces | Kästen | Maß | Datei | Phase 2? |
|---|---|---|---|---|---|---|
| … eine Zeile je gemessenem Zustand und Theme … |

## Was behoben wurde

… nur Zeilen, deren Datei ohnehin zu Phase 2 gehört …

## Was benannt und stehen gelassen wurde

… je Fund: Datei, Zustand, welche Regel, und in welche Phase er gehört
(§7 der Spec ordnet zu: Phase-1-Reste `task-item.tsx`; Phase 3
`components/settings`, `/admin`, `api-keys`; Phase 4 Legal, Login,
Onboarding, `app/page.tsx`).
```

- [ ] **Schritt 3: Beheben — aber nur in Phase-2-Dateien**

Die Entscheidungsregel, ohne Ermessensspielraum:

| Liegt der Fund in … | dann |
|---|---|
| einer Datei, die Task 1–7 ohnehin angefasst hat | **beheben**, in dieser Task, mit eigenem Commit |
| `components/tasks/task-item.tsx`, `components/topics/topic-detail-view.tsx`, `sortable-task-*.tsx` | **benennen** — Phase-1-Rest bzw. `/topics/[id]`, das in keiner Phase-Liste steht |
| `components/settings`, `/admin`, `api-keys` | **benennen** — Phase 3 |
| Legal, Login, Onboarding, `app/page.tsx` | **benennen** — Phase 4 |

**Eine Erwartung vorab, damit sie nicht als Überraschung durchgeht:** `/topics/[id]` steht in keiner `MIGRATED_PAGES`-Liste und rendert über `topic-detail-view.tsx` das alte `TaskItem`. Es ist damit weder migriert noch als unmigriert vermerkt — dieselbe Lücke wie bei den zwei Progress-Tabs, nur eine Ebene tiefer. Das ist ein Fund für den Bericht und ein Kandidat für eine Phase-Zuordnung, **kein** Arbeitsauftrag dieser Task.

- [ ] **Schritt 4: Die Sonde entfernen und committen**

```bash
rm e2e/zustandssonde.spec.ts
git status --short   # e2e/ muss sauber sein
git add docs-tech/lichtkegel-phase2/
git commit -m "docs(docs): Zustandsprüfung der Phase-1-Seiten"
```

---

## Task 9: Abschluss der Phase

**Files:**
- Modify: `scripts/design-baseline.json` (per `--update`, nicht von Hand)
- Modify: `README.md` (Statustabelle, zwei Screenshots)
- Modify: `public/screenshots/04-stats.png`, `public/screenshots/05-wishlist.png`
- Modify: `CHANGELOG.md`
- Modify: `docs-site/features.md`
- Modify: `ROADMAP.md` (Zeilen 326–327)
- Create: `docs-tech/lichtkegel-phase2/abschluss.md`

---

- [ ] **Schritt 1: Die Baseline festschreiben**

```bash
npm run check:design            # muss vorher schon grün sein
npm run check:design -- --update
git diff --stat scripts/design-baseline.json
```

Erwartet: die Summe fällt von **1938** um mindestens **380** auf ≈ **1550**. Steigt eine einzelne Datei, verweigert `--update` den Lauf und nennt sie — das ist dann ein echter Rückschritt in dieser Datei, kein Grund für `--admit`.

`--admit` wird in dieser Phase **nicht** gebraucht. Wird es doch, ist das ein Befund für den Abschlussbericht, keine Formalie.

- [ ] **Schritt 2: Die zehn Zustände, beide Themes**

```bash
DATABASE_URL=postgresql://momo:password@localhost:5432/momo \
  npx playwright test e2e/design-rules.spec.ts
```

Erwartet: 10 Zustände × 2 Themes × 5 Regeln = **100 grüne Tests**. Die Zahl in den Abschlussbericht schreiben — sie ist der einzige harte Beleg, dass die Messeinheit der Phase wirklich zehn Zustände umfasst und nicht sechs Routen.

```bash
npm run check:i18n
npm run test
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test
```

- [ ] **Schritt 3: Chrome-Review — beide Themes, 1440 px und 375 px**

Grüne Tests sind kein Beleg dafür, dass ein Entwurf funktioniert. Sie belegen, dass er keine Regel bricht. Im Pilot kamen fünf falsche Festlegungen durch saubere Reviews.

Anzusehen sind **zwölf** Ansichten je Theme:

| Ansicht | Worauf besonders zu achten ist |
|---|---|
| `/progress?tab=habits` | dass der Umzug aus Task 1 nichts verschoben hat |
| `/progress?tab=review` | ob der Rand bei einer leeren Woche wirklich verschwindet, statt leer zu stehen |
| `/progress?tab=achievements` | 48 Zeilen am Stück — trägt die Seltenheits-Gruppierung genug Struktur, oder ist es eine Wand? |
| `/progress?tab=stats` | sieben Randzeilen bei 1440 px; bei 375 px stapelt der Rand als umbrechende Zeile ans Seitenende |
| `/progress?tab=stats` (Diagramme) | Sparkline, Wochentage, Energie-Heatmap — sind sie ohne Kasten noch als eigene Einheiten lesbar? |
| `/wishlist` mit Wünschen | der Preis rechts in Mono statt groß in Amber: ist der Preis noch der Preis? |
| `/wishlist` leer | `EmptyState` statt gestricheltem Kasten mit Geschenk-Symbol |
| `/wishlist` mit Suchbegriff ohne Treffer | derselbe `EmptyState`, andere Zeile |
| `/wishlist` mit gesetztem und überschrittenem Budget | „über Budget" ohne Rot — reicht das? (siehe Schritt 4) |
| `/quick` mit Aufgaben | `TaskRow` statt `TaskItem`: dieselbe Zeile wie auf `/tasks` |
| `/quick` leer | `EmptyState` |
| `/wishlist` bei 375 px | Wischen nach rechts und links am Gerät oder im Emulator |

Jede Korrektur wird als eigener Commit gefahren, nicht in den Abschluss-Commit gemischt.

- [ ] **Schritt 4: Den einen offenen Punkt der Spec entscheiden**

§9 der Spec lässt bewusst eine Frage offen: die drei Wunschlisten-Zählwerte (bought/open/discarded) sind mit „auf `/wishlist` sichtbar" begründet — sichtbar heißt dort *abzählbar in einer eingeklappten Liste*, nicht *als Zahl ausgewiesen*.

Im Chrome-Review beantworten. Fällt die Antwort auf „zu wenig", ist die Gegenmaßnahme **festgelegt und eng**: eine Mono-Zeile in der History-Überschrift (`{n} gekauft · {n} verworfen`, aus den vorhandenen Keys `card_bought`/`card_discarded`), **kein** zurückgeholter Abschnitt und **keine** neuen Randzeilen. Das Ergebnis — so oder so — kommt in den Abschlussbericht.

Ebenfalls hier fällig, aus §12 der Vorgängerspec über §7 dieser: **der 6-px-Themenpunkt** wird jetzt bewertet, am vollständigeren Bild. Er taucht nach Phase 2 auf `/tasks`, `/topics`, `/progress?tab=stats` und in der „Nach Thema"-Gruppierung auf. Bewertung in den Bericht; eine Änderung daran gehört in eine eigene Aufgabe, nicht in diesen Abschluss.

- [ ] **Schritt 5: Die zwei Screenshots neu schießen**

`README.md:35–43` zeigt fünf Bilder. Nach Phase 1 trugen zwei das neue System und drei das alte; nach Phase 2 tragen alle fünf dieselbe Sprache — das ist der Grund für die Reihenfolge dieser Phase. awesome-selfhosted wird am **22.09.2026** eligible, und ein Listing schickt Besucher auf genau diese fünf Bilder.

Neu zu schießen sind zwei:

| Datei | Zeigt jetzt | Alt-Text (anzupassen) |
|---|---|---|
| `public/screenshots/04-stats.png` | `/progress?tab=stats` — nicht mehr `/stats` | „Statistics — overview in the rail, streak sparkline, and energy heatmap" |
| `public/screenshots/05-wishlist.png` | `/wishlist` als Zeilenliste mit Budget im Rand | „Wishlist — hairline-separated rows with prices in mono, budget and filters in the rail" |

Aufnahmebedingungen, identisch zu den drei bestehenden Bildern (03 nachmessen und angleichen): 1440 px Fensterbreite, dunkles Theme, ein Konto mit echten Daten, Beschnitt auf den Inhaltsbereich einschließlich Seitenleiste.

Prüfen, dass `04-stats.png` **kein** Datum in `de-DE` zeigt, wenn die Oberfläche auf Englisch steht — das wäre der Bug aus §6, der es ins Schaufenster geschafft hat.

- [ ] **Schritt 6: Dokumentation**

`README.md`, Statustabelle (nach Zeile 282) eine Zeile ergänzen:

```
| Lichtkegel Phase 2 (2026-08-28) | ✅ Done | Zahlen-Seiten: /stats als Progress-Tab, Wunschliste als Zeilen, Errungenschaften als Liste; Messeinheit sind jetzt Zustände statt Routen (10 statt 6) |
```

`CHANGELOG.md`, unter `[Unreleased]`:

```markdown
### Changed

- **`/stats` ist jetzt der vierte Tab von `/progress`.** Die Route bleibt als
  Weiterleitung bestehen; alle Lesezeichen funktionieren weiter. Es gibt damit
  eine Zahlen-Destination statt zwei, und die verbliebene steht in der
  Navigation statt in einem Menü.
- **Wunschliste, Errungenschaften und Wochenrückblick sind Listen statt
  Kacheln.** Der Preis steht rechts in Mono statt groß in Amber, der
  Münz-Fortschrittsring ist ein Bruch (`34 / 50`) — er zeigt beide Zahlen, wo
  der Ring nur den Anteil zeigte.
- **Die Gesamtausgaben der Wunschliste (alle Zeiten) stehen jetzt in der
  Budgetleiste.** Vorher nur auf `/stats`, und dort neben drei Zählwerten, die
  auf `/wishlist` ohnehin abzählbar sind.

### Fixed

- **Zwei von drei Tabs auf `/progress` wurden von keiner Designregel geprüft.**
  Die Zähler kannten Routen, `ProgressTabs` rendert aber nur den aktiven Tab —
  der Rückblick-Tab trug drei Amber, wo die Regel eins erlaubt, und kein Test
  war rot. Die Messeinheit sind jetzt Zustände: zehn statt sechs.
- **Das Datum auf der Statistikseite war auf `"de-DE"` hartkodiert** — bei
  sieben unterstützten Sprachen.
- **Das Benutzermenü verlinkte auf `/review` statt `/progress?tab=review`** —
  ein Weiterleitungs-Sprung bei jedem Aufruf.
```

`docs-site/features.md`:
- Abschnitt „Personal stats" (ab Zeile ~977): `**/stats**` → **Progress → Statistics**; die Aufzählungspunkte `Progress`, `Tasks by type and priority`, `Topics` beschreiben Fortschrittsbalken, die es nicht mehr gibt (jetzt Brüche und `3/7`); der Punkt `Topics below 25% completion are highlighted in red, above 75% in green` ist schlicht falsch geworden und muss weg; der Punkt `Wishlist — bought, spent, open, and discarded counts` entfällt, dafür ein Satz bei „Wishlist and Budget" (Zeile ~443), dass die Gesamtausgaben dort stehen.
- Die Sprachliste „German, English, French, Spanish, or Dutch" (Zeile ~994) nennt fünf von sieben Locales — Russisch und Chinesisch fehlen. Mitkorrigieren: die Zeile wird in dieser Task ohnehin angefasst.

`ROADMAP.md`, Zeilen 326–327 (der Redirect-Hop) ersatzlos löschen — in Task 4 behoben.

- [ ] **Schritt 7: Der Abschlussbericht**

`docs-tech/lichtkegel-phase2/abschluss.md` — kurz, in Tabellenform:

| Prüfung | Kriterium | Ergebnis |
|---|---|---|
| `npm run check:design` | Baseline gefallen, mit `--update` festgeschrieben | 1938 → … |
| `npm run check:i18n` | grün über sieben Locales (neu: `tab_stats`, `budget_total_spent`) | |
| `e2e/design-rules.spec.ts` | grün auf allen **zehn** Zuständen, beide Themes (100 Tests) | |
| Chrome-Review | beide Themes, 1440 px und 375 px, zwölf Ansichten | |
| README-Screenshots | `04-stats.png` und `05-wishlist.png` neu | |
| §9-Entscheidung | drei Wunschlisten-Zählwerte: ausreichend / Mono-Zeile ergänzt | |
| §12-Bewertung | der 6-px-Themenpunkt am vollständigeren Bild | |

- [ ] **Schritt 8: PR**

```bash
git add -A
git commit -m "docs(docs): Abschluss der Lichtkegel-Phase 2"
git push -u origin design/lichtkegel-phase2
gh pr create --base main \
  --title "Lichtkegel Phase 2: die Zahlen-Seiten, und eine Messeinheit, die Zustände kennt" \
  --body "…"
```

Der PR-Text nennt drei Dinge, in dieser Reihenfolge: **den Fund** (zwei von drei Tabs waren nicht unmigriert, sondern unmessbar — die Messeinheit war die Ursache), **die Konsequenz** (zehn Zustände statt sechs Routen), **die Migration** (≈ 390 Verstöße, fünf Ansichten, eine Route weniger). Die Zahl der grünen Tests und die neue Baseline gehören hinein; die Dateiliste nicht — die steht im Diff.

