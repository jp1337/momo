# Task 11 report: `/progress` — the empty state without a box

## Corrections applied

Both corrections in the assignment were verified before implementation:

1. **Violation counts.** `components/progress/progress-tabs.tsx` measured
   `{color:0, radius:10, inline:89, spacing:10}` (109 total, not 99) via
   `node scripts/check-design-tokens.mjs`. Full blast radius before any
   change: `progress-tabs.tsx` 109 + `habit-card.tsx` 27
   (`{radius:4, inline:15, spacing:8}`) + `contribution-grid.tsx` 8 +
   `app/(app)/progress/page.tsx` 2 = **146**.
2. **Heatmap ruling — measured, not assumed.** `contribution-grid.tsx:238`
   is `<div role="img">`, its cells `<div role="gridcell">` — not
   `<button>`. Measured actual rendered cell size with a throwaway
   Playwright probe (`document.querySelectorAll('[role="gridcell"]')`,
   `getBoundingClientRect()`, all 4158 cells across 11 seeded habits) at
   three viewports:

   | Viewport | min w×h | max w×h |
   |---|---|---|
   | 1280×720 | 10×10 | 10×10 |
   | 1440×900 | 10×10 | 10×10 |
   | 375×812 | 10×10 | 10×10 |

   Every cell is 10×10px — inside `countBoxes`' existing ≤12px dot
   exemption. **Ruling branch 1 applies**: nothing needed. No chart
   exemption was added to `countBoxes` in `e2e/helpers/design-count.ts`,
   and `contribution-grid.tsx` was not touched at all — its 8 inline-style
   violations remain exactly as they were (unrelated grid-layout/cell-color
   styles, not a box-rule concern). Cells keep `role="img"`/`role="gridcell"`.

## Rule failures — before and after

Ran `e2e/design-rules.spec.ts -g "/progress"` with `/progress` added to
`MIGRATED_PAGES`, against the **pre-task code** (temporarily restored from
git to capture genuine RED, then restored back — see Method below):

**Before (6 of 11 failing):**

| Test | Dark | Light |
|---|---|---|
| trägt Fraunces genau einmal | FAIL (2 Fraunces: page h1 + habits h2) | FAIL |
| hat keine umrahmte oder gefüllte Inhaltsfläche | FAIL (4224 hits) | FAIL |
| hält jede Inhaltsspalte auf dem Maß | FAIL (no `[data-column]`) | FAIL |
| trägt Amber höchstens einmal | pass | pass |
| Amber-Zähler / Bildquellen | pass | pass |

**After: all 51 tests in `design-rules.spec.ts` pass**, including all 10
for `/progress` (5 rules × 2 themes).

## Dashed-box test — RED and GREEN

Added to `e2e/progress.spec.ts`:

```ts
test("der leere Zustand ist kein gestrichelter Kasten mit grünem Knopf", async ({ page }) => {
  await page.goto("/progress");
  const dashed = await page.evaluate(() => { /* scans main for border-*-style: dashed */ });
  expect(dashed).toBe(0);
});
```

**Problem found while writing this**: the persistent `e2e@momotest.local`
fixture has 11 recurring habits (built up across earlier test runs), so the
old dashed empty state never actually renders against that account — the
test would trivially read `0` even before the fix and prove nothing.
Fixed by seeding a **second, throwaway** test user with zero recurring
tasks (`e2e-empty-habits@momotest.local`), giving it a session the same way
`e2e/global.setup.ts` does, and driving the assertion with that
`storageState`:

- **RED** (old code, empty user): `DASHED_COUNT=1`, test fails —
  `expect(received).toBe(expected) // Expected: 0, Received: 1`.
- **GREEN** (new code, same empty user): `DASHED_COUNT=0`, test passes.

The throwaway user and its session were deleted afterward; only the test
file changes are committed. In the real (non-empty) fixture the dashed-box
test also passes — the point of a second user was to prove the assertion
*can* catch the old regression, not just that it's satisfied by an account
that never exercised the branch.

## What changed, per file

**`app/(app)/progress/page.tsx`** — now fetches the habits-tab data itself
(`getHabitsWithHistory`, `getEarliestCompletion`, `buildYearOptions`) and
wraps the page in `PageFrame`. Shared header (one Fraunces `<h1>` + tab
nav, token classes, no inline styles) sits above either branch. Non-habits
tabs (`achievements`, `review`) keep their pre-migration wrapper
unchanged — out of scope, and their own content is wider than `--measure`
(900px / `max-w-4xl`), so wrapping them in `PageFrame` would squeeze both
grids for no benefit. The rail carries the four stat sums, each hidden at
0 (see below).

**`components/progress/progress-tabs.tsx`** — `ProgressTabs` now only
dispatches `achievements`/`review` (habits is handled directly by
`page.tsx`, since the rail needs the same `habits` array the content
column renders — fetching it twice just to hand the sums back up would be
a wasted round trip). New exported `HabitsList` renders `GroupHeading` +
subtitle + `YearSelector` (conditional) + either `EmptyState` or one
`HabitCard` per habit. Achievements/Review tabs' code is byte-identical to
before (89 − 9 = 80 inline styles remain there, all pre-existing,
untouched).

**`components/habits/habit-card.tsx`** — rewritten from a boxed
`<article>` (bg/border/shadow, topic-icon badge, 4 stat pills) to one
`List`+`Row` (title, `dotColor` = topic colour, eyebrow = topic · recurrence
· pause text) plus the unchanged `ContributionGrid` below. Ratchet count:
109→0 for this file (radius 4→0, inline 15→0, spacing 8→0).

**`components/habits/year-selector.tsx`** — not in the brief's file list,
but found necessary: the active-year chip filled its background with
`var(--accent-amber)`, a second amber surface. Fixed to the same
`--raised`-fill/`--ink`-text vs. transparent/`--ink-3` distinction the tab
nav uses. Ratchet: inline 2→0 (radius/spacing were already 0/2, spacing
unchanged since `px-3 py-1.5` etc. were already on-scale).

**`e2e/helpers/design-count.ts`** — `/progress` added to `MIGRATED_PAGES`.
No exemption logic added (see heatmap ruling above).

**`e2e/progress.spec.ts`** — added the dashed-box regression test.

**`scripts/design-baseline.json`** — updated via `--update` after the
above reductions.

## Inline styles: how the 89 in `progress-tabs.tsx` were resolved

Of the 89, only **9** belonged to the habits tab (the part `/progress`
actually renders and the part `design-rules.spec.ts` exercises — it
navigates to `/progress` with no `?tab=`, which defaults to habits). Those
9 are gone: the seedling icon, the `<h2>`/`<p>` header pair, the year-nav
wrapper text, and the dashed empty-state block are all removed or replaced
by token-class primitives (`GroupHeading`, `EmptyState`, `Button`).

The remaining **80** live entirely in `AchievementsTab` (44) and
`ReviewTab` (36) — both unchanged, out of scope, and not visited by any
design-rule test (`design-rules.spec.ts` only navigates to bare
`/progress`, never `?tab=achievements`/`?tab=review`). They remain because
touching them was not part of this task; the ratchet does not require
zero, only "not higher than before," and it isn't.

## Measured heatmap cell size and ruling branch

See "Corrections applied" above: 10×10px at all three tested viewports —
**ruling branch 1** (measure first; small enough, do nothing).
`contribution-grid.tsx` has zero diff.

## Verification results

```
npx tsc --noEmit                     → clean, no errors
npm run lint                          → 12 warnings, 0 errors, ALL in files
                                         untouched by this task (task-form.tsx,
                                         task-row.tsx, topic-form.tsx,
                                         wishlist-form.tsx, checkbox.tsx,
                                         timezone-settings.tsx, link-accounts
                                         page) — none new
npm run check:design (before)         → 1986 violations
npm run check:design (after)          → 1940 violations, none raised
npm run check:i18n                    → all keys present in all 7 locales
```

Playwright (`DATABASE_URL=... npx playwright test <file>`):

- `e2e/design-rules.spec.ts` — **51/51 pass** (10 of them the new
  `/progress` × 2-theme set).
- `e2e/design-tokens.spec.ts` — **40/40 pass**, unaffected.
- `e2e/progress.spec.ts` — **15/20 pass**, 5 fail — all five reproduce
  identically against the pre-task code (evidence below); none touch code
  this task changed.

### Per-failure evidence (`e2e/progress.spec.ts`)

All five re-ran against the original (git `HEAD`) `page.tsx` /
`progress-tabs.tsx` / `habit-card.tsx` / `year-selector.tsx`, restored
afterward:

1. **"can switch to achievements tab"** — `body` contains `/500/i` because
   the achievement copy legitimately contains the substring "500" ("500
   Coins gesammelt", "500 Aufgaben erledigt") — a false positive in the
   test's own regex, not an HTTP error. Reproduced against old code.
2. **"achievements tab shows achievement cards or empty state"** — same
   cause. Reproduced against old code.
3. **"Achievements Page › loads without error"** (`/achievements`) — same
   cause, different route into the same `AchievementsTab`. Reproduced.
4. **"Achievements Page › shows achievement cards"** — same cause.
   Reproduced.
5. **"Stats Page › shows level and coin information"** — unrelated to
   achievements text; `/stats` and `lib/statistics.ts` are outside this
   task's diff entirely. Reproduced identically against old code
   (`locator('body').filter(...)` times out hidden in both cases).

None of these five are new; none touch a file this task modified.

## Chrome — what was looked at and found

Reviewed both tabs at 1440px and 375px, dark and light (Playwright
screenshots for precise-width comparison — **the extension's
`resize_window` is broken in this environment**, confirmed by a failed
call, so width-controlled shots came from
`page.setViewportSize()`/`page.screenshot()` instead; the live Chrome
extension was used for interaction/console checks on whatever window size
it had).

**Bug found by looking, not by a test**: with the seeded `e2e@momotest.local`
account (11 habits, 0 completions), every rail sum was 0, so the first
`rail` implementation — `habits.length === 0 ? undefined : (<>…4 conditional
lines…</>)` — still built a *truthy but visually empty* `<>` fragment.
`PageFrame` checks `rail` by truthiness, not by whether it renders
anything, so it reserved the full 208px+48px rail column and centered the
content column off-axis for nothing — a real defect no design-rule test
can see (no boxed surface, no amber, no second Fraunces, still passes the
column-measure check). Fixed by computing `hasRailContent` explicitly and
setting `rail = undefined` whenever every sum is 0 and there's no active
streak — confirmed by re-screenshotting: content column returned to its
correctly centered, full-`--measure` width.

- **Both tabs, both widths, both themes**: content renders correctly; no
  dashed box; no boxed surfaces; tab nav switches with token-based
  active/inactive styling (`--raised`/`--ink` vs. transparent/`--ink-3`),
  no amber fill.
- **Empty state, live**: the actual signed-in dev account (`ET`→different
  session shown in the extension, German locale, 0 habits) organically
  exercised the empty branch — screenshot confirms no dashed box, `Button
  variant="quiet"` CTA ("Zu den Aufgaben"), no green fill.
- **Tab switching** (habits → achievements → review, via `navigate` and
  DOM inspection since click-by-ref was flaky in this session): no console
  errors on any transition (`read_console_messages` with `onlyErrors`, all
  three).
- **Year selector**: doesn't appear in the seeded account's default view
  (`buildYearOptions` correctly returns only `[currentYear]` when there's
  no completion history at all — not a bug, verified by reading the
  function). Backdated one completion to 2024 (DB-level, reverted after)
  to exercise it: year chips render `2026 / 2025 / 2024`, active chip is
  `--raised`-filled (not amber), clicking `2024` navigates to `?year=2024`
  and the June cell for the backdated date turns green. Screenshot
  confirms; DB change reverted.
- **Heatmap tooltip shows a date**: confirmed via the cell's `title`
  attribute (the actual mechanism a hover shows) —
  `"2024-06-15 — 1 completion"` for the backdated cell, via Playwright
  `page.evaluate`.
- **Pause text**: temporarily paused one habit in the DB (`pausedAt` +
  `pausedUntil='2026-09-15'`), screenshot confirms the eyebrow reads
  `EVERY 7 DAYS · PAUSED UNTIL 2026-09-15` — plain text, no amber badge,
  no box (the old amber-tinted pause pill is gone). DB change reverted.
- **Console**: no errors on any tab/state visited, including the
  `FORMATTING_ERROR` regression test (`e2e/progress.spec.ts`'s existing
  "die Habits-Ansicht rendert ohne Formatierungsfehler") — passes.

All DB mutations made for verification (paused-habit test, backdated
completion, throwaway empty-habits user) were reverted/deleted after use;
the only persisted changes are the seven files in the diff.

## Locale keys now orphaned

- `habits.stat_streak_empty` — per the brief, left in place: "missing
  metric means show nothing" now applies at the rail-line level (the whole
  line is omitted at 0, not replaced with this key's text).
- `habits.stat_streak_best` / `habits.stat_streak_best_current` — **not
  named in the brief**, but also now unreferenced: the old per-habit "best
  streak" sub-caption doesn't exist in the new design (only the single
  best-*current*-streak rail line remains, and it doesn't distinguish a
  new record). Left in the locale files rather than deleted silently, per
  the same instruction extended to these two.
- `habits.empty_title` — the old two-part empty state (`empty_title` +
  `empty_body`) is now `EmptyState`'s single required `line`; `empty_body`
  (a complete sentence on its own) was kept, `empty_title` is now
  unreferenced. Also not named in the brief; flagged here rather than
  deleted.

## Self-review — what I'm unsure about

- **The rail's "streak" aggregation is my own interpretation, not a
  literal reading of the brief.** The brief says all four
  `statTotalYear`/`statLast30`/`statLast7`/`statStreak` pills "wandern in
  den Rand" without specifying how a per-habit *streak* (not additive like
  a completion count) becomes one rail line. I chose "the longest
  currently-running streak among all habits, in that habit's own period
  unit" — mirroring `tasks-rail.tsx`'s established pattern of turning
  several per-row numbers into one page-level figure, but the specific
  choice of *max* rather than, say, omitting streak from the rail
  entirely, is a judgment call.
- **Whether achievements/review truly belong outside this task's `PageFrame`
  migration is inferred, not stated.** The brief's file list and Step 3 only
  describe the habits tab; I left achievements/review untouched by
  omission rather than an explicit "not in scope" line in the original
  brief. I'm confident this is right (their own widths don't fit
  `--measure`, and no rule test exercises them), but it's my inference.
- **The eyebrow line composition** (`topicTitle · recurrence · paused`) is
  a plain joined string, not JSX with separate styling per segment — matches
  `Row`'s `eyebrow` contract (`React.ReactNode`, rendered as one line) but
  loses the `·` separators' individual `aria-hidden` treatment the old
  markup had. Screen-reader users now hear the raw `·` character between
  segments; I did not verify this against a screen reader, only visually.
- **89 → 9 inline-style scoping**: I determined which lines belong to the
  habits tab by `awk`-ing line ranges against the function boundaries
  (`HabitsTab` at old lines 80–273). This is exact for the current file
  structure but was a manual line-range check, not an automated
  per-function count — if I mis-drew a boundary by a line or two the 9/80
  split could be off by one or two entries; the aggregate 1986→1940 ratchet
  numbers are the actual measured source of truth regardless.

## Fix round 1 — ten findings

Ten review findings against commit `1a48a1f` (I1–I3 plus seven minors), all
addressed. 17 files changed: `app/(app)/progress/page.tsx`,
`components/habits/contribution-grid.tsx`, `components/habits/habit-card.tsx`,
`components/habits/year-selector.tsx`, `components/progress/progress-tabs.tsx`,
`components/ui/page-frame.tsx`, `e2e/design-rules.spec.ts`,
`e2e/global.setup.ts`, `e2e/helpers/design-count.ts`, `e2e/progress.spec.ts`,
`messages/{de,en,es,fr,nl,ru,zh}.json`, `scripts/design-baseline.json`.

### I1 — the heatmap breakout

**`components/habits/contribution-grid.tsx`** — the grid's outer wrapper
(previously `w-full overflow-x-auto`, silently clipping the grid to the
640px column) now also carries `rail:w-[calc(100%_+_var(--gutter)_+_var(--rail))]`
and `data-breakout="chart"`. `rail:` is the same 1100px breakpoint
`PageFrame` itself uses to place its rail beside the column — below it, the
grid keeps its own local horizontal scroll (an honest, contained scrollbar);
at and above it, the grid is allowed to grow into the 48px gutter + 208px
rail width `PageFrame` already reserves next to the reading column. That
bleed amount (`--gutter` + `--rail` = 256px) is a fixed, viewport-independent
pixel offset added to the column's *own* current width (`100% + 256px`), so
it always lands exactly at the frame's own outer edge — never past
`<main>`'s available width — regardless of whether `PageFrame` is currently
narrower than 640px (it shrinks under the 1100px→1168px squeeze range) or
whether this particular render actually has rail content. The rail's own
text sits only at the very top of the page (the header), while every habit's
grid renders well below it, so bleeding into that column's horizontal space
never visually collides with the rail's text — confirmed by the Chrome
screenshots below.

**Measured after the fix** (`e2e@momotest.local` fixture, real dev server,
Playwright `page.evaluate` against `[data-breakout="chart"]`,
`[role="gridcell"]`, `[data-column]`):

| viewport | column width | grid wrapper width | grid content width | cell size | local scroll | week-columns visible |
|---|---|---|---|---|---|---|
| 1440×900 | 640px | 896px | 871px | 13.17×13.17px | none | 54/54 (**whole year**) |
| 375×812 | 343px | 343px | 724px (`scrollWidth`) | 10×10px | yes | 24/54 (≈44%) |

At 1440px the grid now fits entirely inside its bled box — zero scrollbar,
the full year renders. At 375px nothing changed (below the `rail:`
breakpoint, no spare width exists to bleed into on a 375px viewport) — same
10px cells, same local scroll, as documented in the original finding; a
year of 53–54 weeks genuinely cannot fit an unscrolled 375px screen at any
readable cell size.

**Ruling branch used: branch 2 (chart exemption needed).** The cells grew
past the box rule's 12px dot threshold (13.17px > 12px) as soon as they had
room to grow, so `countBoxes` (`e2e/helpers/design-count.ts`) needed a new,
named `CHART` exemption (`'[role="gridcell"]'`) — added with the same
reasoning as the existing `PROGRESS` exemption: the rule is unfulfillable
for a chart cell, not inapplicable to it. Cells keep `role="img"`/
`role="gridcell"`; they were not converted to `<button>` (would be ~365 tab
stops per habit).

**Made the exception visible in the enforcement, not just the rule.**
`measureColumns` (same file) previously only measured `[data-column]`'s own
width, never its children's — so the pre-fix 84px/381px overflow was
invisible to it. It now also walks every `[data-column]`'s descendants,
finds the *entry point* of any overflow (the first ancestor whose parent
does not itself overflow, so a wide chart's 4158 individual cells don't each
re-report the same breakout), and requires that entry point to carry
`data-breakout` — `e2e/design-rules.spec.ts`'s "hält jede Inhaltsspalte auf
dem Maß" test now fails on any *unnamed* overflow, not just on a
`[data-column]` that's itself too wide.

**Bug found and fixed while building this exception**: the first version of
this check flagged **94 false positives** on `/dashboard` and `/tasks` — all
`<button>` elements using the `-m-2 … p-2` hit-target-enlargement pattern
(negative margin pulls the clickable box 8px past the visible icon on each
side, a legitimate, pre-existing a11y technique, e.g. the task-row checkbox
lead). That pattern genuinely shifts the button's own border-box 8px past
the column edge without any visible content leaving the column. Fixed by
excluding `AFFORDANCE` elements (button/input/textarea/select/a/label/
summary/role=button|tab|switch|menuitem/contenteditable/`[data-affordance]`
— the same list `countBoxes` already uses) from the overflow scan, for the
same reason `countBoxes` already exempts them: a hit target is not reading
content. Caught by running the full three-file suite in the background
(see Verification below) — a foreground run scoped to `design-rules.spec.ts
-g "/progress"` alone would never have exercised `/dashboard` or `/tasks`
and would have shipped this regression silently.

### I2 — the empty-state test, with a session that can actually go RED

**`e2e/global.setup.ts`** — refactored the single auth-seeding body into
`authenticateAs(client, email, label, authFile)` and call it twice: once for
the existing `e2e@momotest.local` (`e2e/.auth/user.json`, unchanged
behavior) and once for a new `e2e-empty-habits@momotest.local`
(`e2e/.auth/empty-habits.json`) — a fresh user that, as long as nothing ever
creates a `RECURRING` task for it, stays genuinely empty across runs.

**`e2e/progress.spec.ts`** — the dashed-box regression test now runs inside
a `test.describe("Progress Page — leere Habits-Sitzung")` block with
`test.use({ storageState: "e2e/.auth/empty-habits.json" })`, so it actually
exercises the empty branch instead of a session with 11 accumulated habits.

**RED, captured against the reintroduced dashed box** (temporarily replaced
`EmptyState` in `progress-tabs.tsx` with the literal pre-Task-11 markup —
`border: "1px dashed var(--border)"` + a green-filled `<a>` — ran the test,
reverted the edit by hand immediately after, **not** via `git checkout`):

```
Error: expect(received).toBe(expected) // Object.is equality
Expected: 0
Received: 1
```

**GREEN, immediately after reverting**:

```
✓ Progress Page — leere Habits-Sitzung › der leere Zustand ist kein
  gestrichelter Kasten mit grünem Knopf (2.5s)
```

Re-ran the dashed-box test alone afterward to confirm the account is still
genuinely empty (`SELECT count(*) FROM tasks … = 0`) and the test still
passes — the evidence this time lives in a test that can re-run, not in a
throwaway user that gets deleted with the proof.

### I3 — the streak comparator, the row, and the rail's own coverage

**Comparator fix, `app/(app)/progress/page.tsx`**: `bestStreakHabit` now
compares `current * periodDays` (elapsed time), not raw `current` (period
count) — a daily habit at `current: 10` no longer beats a monthly habit at
`current: 6` (10 days vs. ≈180 days). The comment above it now states this
explicitly instead of the previous (wrong) "the single longest CURRENTLY
running streak" framing.

**Per-habit streak restored**: `components/progress/progress-tabs.tsx`
gained `formatHabitStreakTrailing(t, streak)`, called once per habit inside
`HabitsList` and passed into `HabitCard` as a new `streakTrailing: string |
null` prop (not a new `Row` prop). `components/habits/habit-card.tsx` now
passes it as `Row`'s existing `trailing` slot, e.g. `"2 Tage in Folge ·
Neuer Rekord"` or `"3 Wochen in Folge · Rekord: 12"`. `null` (line omitted)
when a habit has neither a current nor a past streak — spec §6, and
consistent with the rail's own "missing metric means show nothing".
Duplicates the `periodDays` switch already in `page.tsx` rather than sharing
it, for the reason `page.tsx`'s own comment already gives:
`scripts/check-i18n.mjs` matches a translator variable to its namespace
per-file via a textual regex, not real scope analysis — a shared helper
taking `t` as a parameter would call `t(...)` in a file with no matching
binding, and those calls would silently drop out of the completeness check.

**Locale keys — grep, not assertion:**

```
$ grep -rn "stat_streak_best\b" app/ components/ lib/ e2e/
components/progress/progress-tabs.tsx:141:  … t("stat_streak_best", { n: best }) …

$ grep -rn "stat_streak_best_current" app/ components/ lib/ e2e/
components/progress/progress-tabs.tsx:141:  … t("stat_streak_best_current") …

$ grep -rn "stat_streak_empty" app/ components/ lib/ e2e/
components/progress/progress-tabs.tsx:94: * (mentioned only in a comment, not called)

$ grep -rln 'getTranslations("habits")\|useTranslations("habits")' app/ components/ \
    | xargs grep -n "empty_title"
(no output)
```

`stat_streak_best` and `stat_streak_best_current` are used again (the
per-habit trailing text). `stat_streak_empty` stays unreferenced — per the
**original task-11-brief's own explicit instruction** ("Der Key bleibt in
den Locales stehen"), not my judgment call, so I left it. `empty_title` had
no such protection (the previous report's decision to keep it was its own
judgment, not a brief instruction) and is now genuinely, permanently
unreferenced in the `habits` namespace — deleted from all 7
`messages/*.json` files this round.

**New ICU key**: `habits.rail_streak` (`"Streak: {streak}"` in de/en,
`"Racha: {streak}"` es, `"Série : {streak}"` fr — note the French
space-before-colon, matching this codebase's existing `date_next` key —
`"Reeks: {streak}"` nl, `"Серия: {streak}"` ru, `"连击:{streak}"` zh)
replaces the hardcoded `": "` at the old `page.tsx:206`, matching the full-
ICU-message pattern `tasks-rail.tsx`'s `rail_open`/`rail_overdue` already
use. The rail's three sum lines were also folded from three copies of one
`<p>` into a `[value, label][]` map.

**Rail + per-row coverage test, `e2e/progress.spec.ts`** (same
`empty-habits` describe block, I2's session, so the fixture stays reused
rather than duplicated): seeds a daily habit (`INTERVAL`, periodDays=1,
completed today + yesterday → `current: 2, best: 2`) and a weekly habit
(`WEEKDAY`, periodDays=7, one completion this week → `current: 1, best: 1`)
directly via `pg`, sets the `locale=de` cookie (Chromium's default
`Accept-Language` resolves to `en`, which would make the test's German
literal assertions fail for reasons unrelated to the code under test),
asserts:
- `[data-rail]` shows `"3 dieses Jahr"` / `"3 letzte 30 Tage"` /
  `"3 letzte 7 Tage"` (additive across both habits) and `"1 Woche in
  Folge"` — the **weekly** habit wins the rail's best-streak line
  (`1×7=7` > `2×1=2`), which only happens with the `periodDays`-weighted
  comparator; this test would fail again if that comparator regressed.
- The daily habit's row contains `"2 Tage in Folge"` + `"Neuer Rekord"`;
  the weekly habit's row contains `"1 Woche in Folge"` + `"Neuer Rekord"`.
- `finally` deletes both seeded tasks (cascades completions) so the
  `empty-habits` session is empty again for I2's test on the next run —
  confirmed via a follow-up DB query and a standalone re-run of the
  dashed-box test (both above).

**Left undone**: the seed only exercises 2 of the 5 `periodDays` switch
branches (days, weeks) — biweeks/months/generic are still untested. The
mechanism itself ("the whole rail runs in nothing") is fixed; full 5-branch
coverage would need 3 more seeded habits and was cut for time.

### Minors

- **`components/habits/habit-card.tsx`** — `eyebrowParts.join(" · ")`
  replaced with JSX mapping each part to its own `<span>`, with an
  `aria-hidden="true"` `<span> · </span>` separator between parts (matching
  the pre-Task-11 markup's behavior). `Row`'s `eyebrow` prop is
  `React.ReactNode`, so this needed no `Row` change.
- **`components/habits/year-selector.tsx`** — `gap-1.5`/`py-1.5` (6px) →
  `gap-2`/`py-1` (8px/4px), matching `search-filter-bar.tsx`'s `FilterPills`
  padding. Confirmed via `node`-run regex probe (the same patterns
  `check-design-tokens.mjs` uses) that the fix — and the JSDoc comment
  explaining it — introduce zero new spacing matches (my first comment
  draft used slash-joined shorthand like `gap-2/py-1` and the shared regex
  read that as one token spanning the slash, resurfacing the exact
  violation the comment was describing as fixed; rewritten in prose).
- **`app/(app)/progress/page.tsx:194`** — "vier" → "FIVE design-rule
  assertions per page" (amber, amber-image-blindness, Fraunces, box,
  measure = 5, confirmed against `design-rules.spec.ts`'s own `describe`
  block, not re-counted by hand).
- **`components/ui/page-frame.tsx`** — `rail` prop's JSDoc now documents the
  truthy-empty-rail trap explicitly (a truthy-but-visually-empty fragment
  still reserves the rail column) and how to avoid it
  (`hasRailContent`-style explicit truthiness), per the reviewer's
  confirmation that no other caller can currently hit it — the primitive
  itself was not re-plumbed.
- **`app/(app)/progress/page.tsx:206`** (old) — hardcoded `": "` replaced by
  the new `rail_streak` ICU message (see I3 above).
- **`app/(app)/progress/page.tsx:188-209`** (old) — the four repeated
  `<p className="...">` blocks became one `sumLines.map(([value, label]) =>
  …)` plus the separate streak line (which isn't a `[number, label]` pair
  and stayed its own block).

## Verification (this round)

All commands run in the foreground, one at a time, from the repo root,
`DATABASE_URL=postgresql://momo:password@localhost:5432/momo` where needed.

```
$ npx tsc --noEmit
(no output — clean)

$ npm run lint
✖ 12 problems (0 errors, 12 warnings)
(all 12 in task-form.tsx, task-row.tsx, topic-form.tsx, wishlist-form.tsx,
 checkbox.tsx — none touched by this round, none new)

$ npm run check:design
Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.
(before this round: 1940; ran --update afterward to lock in the new floor —
 scripts/design-baseline.json now reflects 1938, 111 files, ratchet may only
 fall further from here)

$ npm run check:i18n
✓ All translation keys are present in every language file.
(1034 references found, up from the pre-round count by the new rail_streak
 usages; empty_title's removal confirmed clean, no dangling reference)
```

Playwright, `DATABASE_URL=... npx playwright test <file>`, one file per
invocation:

- `e2e/design-rules.spec.ts` — **51/51 pass** (includes the fixed
  `/dashboard` and `/tasks` measure-rule false positives above).
- `e2e/design-tokens.spec.ts` — **40/40 pass**, unaffected.
- `e2e/progress.spec.ts` — **16/21 pass**, 5 fail, all five reproducing the
  documented pre-existing set exactly (four `not.toContainText(/500/i)`
  false positives on achievement copy containing the literal substring
  "500" — "500 Coins gesammelt", "500 Aufgaben erledigt" — and one `/stats`
  `toBeVisible` timeout on `lib/statistics.ts`, outside this task's diff).
  None touch a file this round changed; the two new tests (dashed-box,
  rail+row) are both in the 16 passing. A single earlier combined run of
  all three spec files together additionally showed a one-off
  "Weekly Review Page › loads without error" 30s navigation timeout that
  did **not** reproduce in this isolated, foreground rerun — a timing flake
  under concurrent load from running three spec files back to back, not a
  regression (unrelated file, `/review`, never touched by this task).
- `e2e/dashboard.spec.ts` — **13/13 pass** (sanity check per the dispatch:
  `e2e/global.setup.ts` now seeds two sessions instead of one, and every
  suite's setup runs through it — a broken shared setup would have taken
  this down too).

## Chrome — what was looked at

Playwright-driven screenshots (same technique `e2e/helpers/theme.ts` uses:
`emulateMedia` + `addInitScript("data-theme", …)` before `goto`, avoiding
the hydration race a plain cookie/`page.evaluate` approach has) against the
seeded `e2e@momotest.local` fixture (11 habits, 0 completions — so no rail:
`hasRailContent` correctly stays false and the content column sits centered
at full `--measure` width, not narrowed for an empty gutter), `/progress?tab=habits`:

- **1440×900, dark and light**: each habit's heatmap now visibly bleeds past
  the "Fortschritt" header/tab-nav column width, filling most of the frame
  and rendering the full Jan–Dec grid with no scrollbar — reads as an
  intentional wide chart, not an overflow bug. No visual collision with
  where a rail would sit (none renders here, by design, and even where one
  does the rail's text is confined to the very top of the page, well above
  any habit's grid).
- **375×812, dark and light**: unchanged from before this round — the grid
  shows roughly Jan–Jun before its own local horizontal scrollbar takes
  over (matches the measured 24/54 columns), tab nav text ("Wochenrückblick")
  clips at the viewport edge (pre-existing, out of this task's scope).
- Did not re-screenshot the seeded rail/streak-row state (no rail on this
  fixture, since it has zero completions) — that behavior is instead
  verified by the new Playwright assertions in I3's rail test, which check
  actual rendered text against real seeded data rather than a screenshot of
  a fixture that can't exercise it.

## What's left undone

- **Full 5-branch `periodDays` switch coverage** (I3): only `streak_unit_days`
  and `streak_unit_weeks` are exercised by the new test; `streak_unit_biweeks`,
  `streak_unit_months`, and `streak_unit_generic` still run in nothing. Would
  need 3 more seeded habits (recurrenceInterval=14, MONTHLY, and a
  non-standard interval like 5) in the same test.
- **Mobile heatmap visibility** (I1): 375px still shows ≈44% of the year
  before local scroll — inherent to a 53-week grid on a 375px screen at any
  readable cell size, not something the `rail:`-breakpoint-gated breakout
  was meant to fix, but flagging it as a known, unaddressed limit rather
  than silently declaring I1 "done" for all viewports.
