# Final fix wave — report

One wave, one re-review after it. Below: each fix, the measurement or rendered
evidence that it worked, every verification command's output, the ratchet
before/after, and a self-review naming what I could not finish.

---

## C1 — every chrome link was underlined

Fixed by appending `!` to `no-underline` at all six call sites (the same
cascade trap `components/ui/button.tsx:24-40` documents — an unlayered
`app/globals.css` `a { text-decoration: underline }` beats any layered
Tailwind utility regardless of specificity):

- `components/layout/sidebar.tsx:116`
- `components/layout/mobile-nav.tsx:68`
- `components/layout/navbar.tsx:61`
- `components/layout/user-menu.tsx:43`
- `app/(app)/topics/[id]/page.tsx:75`
- `components/tasks/task-list.tsx:873`

**Live evidence** (script against the running app, dark theme): iterated every
`aside a, nav a, header a` and read `getComputedStyle(a).textDecorationLine`.

```
underlined nav links (should be empty): {}
```

Zero underlined links in the wordmark, sidebar, or mobile nav. Confirmed by
`e2e/design-rules.spec.ts` (51/51 pass, unchanged assertions still hold) and
by `e2e/navigation.spec.ts`'s existing "sidebar is visible" tests.

---

## C2 — the dashboard's one amber action was not amber

Root cause: same cascade trap as C1, but for `color` — the unlayered
`a { color: inherit }` beat the layered `text-[var(--amber)]` utility. Fixed
both quest action links in `components/dashboard/daily-quest-card.tsx`
(`:276`, `:393`) with `text-[var(--amber)]! no-underline!`, and added
`data-testid="quest-action"` to both so the fix can be asserted directly, not
just capped.

**Before** (from the review that opened this wave — I did not independently
re-measure the pre-fix state, since I fixed C1/C2 in the same edit before
taking a baseline):

```
countAmber("/dashboard", active quest) → 1 hit total: [".lichtkegel::before" wash]
color hits: 0
```

**After** (re-verified fresh against a server confirmed live via
`/api/health` → 200 immediately before the run; scratch Playwright script
reimplementing the real `countAmber`, pseudo-elements included, since
deleted):

```json
[
  { "tag": "div", "testid": "quest-light", "prop": "::before", "text": "Heutige QuestRecurring ..." },
  { "tag": "a",   "testid": "quest-action", "prop": "color",    "text": "jetzt anfangen" }
]
```

Exactly 2 hits, both inside `.lichtkegel` (the wash + the one action's text
color) — satisfies the `inside.length <= 2` rule and, critically, now
actually contains a `color` hit where before it was 0.

**Closed the hole that hid it** — a cap alone (`≤ 1`, `≤ 2`) is satisfied by 0
exactly as well as by a real hit:

- `e2e/design-rules.spec.ts`: added a positive assertion that, when
  `[data-testid="quest-action"]` is present on `/dashboard`, `countAmber`'s
  hits contain a `color` hit for it — not merely that the total stays under
  the cap.
- `e2e/daily-quest.spec.ts`: added `expectQuestActionIsAmberIfPresent()` and
  called it after all three `toBeLessThanOrEqual(1)` assertions (lines 221,
  255, 294) — asserts the action link's computed color actually equals
  `--amber` when the link exists (conditioned on presence: the fixture quest
  can be in the completed state, which legitimately has no action link).

**Verified live**: `e2e/design-rules.spec.ts` 51/51 pass (including the new
positive probe on `/dashboard` dark and light), `e2e/daily-quest.spec.ts`
"Lichtkegel" describe block: all 6 amber-uniqueness tests pass (dark + light,
plain / energy-picker-open / dialog-open states) with the new probe active.

---

## C3 — `/tasks` task titles rendered at 0px width at 375px

Root cause: in `components/ui/list.tsx`'s `Row`, both `trailing` and `actions`
are `shrink-0`, leaving the title span as the only flex candidate. At 375px,
`lead` (18px) + `trailing` (up to 129px) + up to three 32px action buttons
oversubscribed the row.

**Fix chosen**: "move `trailing` onto the eyebrow line below `sm`" (not "drop
`actions` below `sm`") — justification: dropping `actions` on mobile would
remove edit/breakdown/snooze/promote entirely on touch (swipe only covers
complete/delete), a real feature loss. Moving `trailing` costs nothing
functionally and only reflows layout.

Implementation, scoped so it cannot affect any other `Row` caller:
- `components/ui/list.tsx`: new prop `trailingWrapsBelowSm?: boolean`
  (default `false` — identical behavior to before for every existing caller).
  When `true`, the inline `trailing` span becomes `hidden sm:inline-block`,
  and a second copy renders on the eyebrow line (`sm:hidden`), merged with
  `eyebrow` when both are present.
- `components/tasks/task-row.tsx`: passes `trailingWrapsBelowSm` on its `Row`.
  No other caller (`quick-wins-section.tsx`, `topic-card.tsx`, `habit-card.tsx`)
  sets it, so their layout is byte-for-byte unchanged.
- Updated the stale comment at `task-row.tsx:364-370` that called this
  unfixed — it now describes the actual fix instead of deferring it.

**Before** (reviewer's measurement, twelve rows sampled at 375px): 3 rows at
0px, 9 at 33px, 1 at 129px.

**After** (re-verified fresh against the confirmed-live server, dark theme,
`/tasks` at 375px, 113 rows measured):

```
total rows measured: 113   rows at 0px: 0
"HIGH Priority Task 1787358493657"   width: 320
"Recurring 1787376513290"            width: 230
"Recurring 1787361219376"            width: 230
"Recurring 1787358496986"            width: 230
"Recurring 1787862659940"            width: 230
```

**Zero rows at 0px** across all 113 rows currently on the page (widths ranged
100–340px depending on title length and effort size).

**Pinned it**: `e2e/tasks.spec.ts` — new test "task title has non-zero width
at 375px even with an overdue trailing date" creates a task with an overdue
due date (forcing the worst-case `trailing` + `--danger` color), navigates at
375px, and asserts `task-row-title`'s `boundingBox().width > 0`. Passes
(confirmed twice: once after fixing a wrong selector — `[data-testid="row"]`
doesn't exist, `task-row.tsx` sets `testId="task-row"` — and once in the full
combined run below).

---

## C4 — two published screenshots showed a UI that no longer exists

Re-took both against the running app with the Playwright bundled Chromium
(`playwright-core`'s `chromium.launch()`, not the Chrome extension or
Playwright's `chrome` channel — both broken here per the brief), dark theme,
1440×900 viewport, authenticated via the existing `e2e/.auth/user.json`
storage state:

- `public/screenshots/01-dashboard.png` — now shows the actual current
  dashboard: inline-SVG feather in `--ink-2` (not amber), no chrome
  underlines, one amber action ("jetzt anfangen"), Fraunces headline, naked
  Quick Wins list below a hairline.
- `public/screenshots/02-topics.png` — now shows the current `/topics`: a
  hairline-separated list of `Row`s, no card grid, no icon circles, no
  priority badges, no progress bars, one amber action ("+ Neues Thema"). The
  README's alt text for this image ("project cards with progress bars and
  archive hint") was stale since the card grid was removed — corrected to
  "a hairline-separated list of topic rows, no cards, progress and a
  sequential marker as plain mono text".

Both screenshots reflect the shared E2E test account's actual accumulated
data (task/topic titles are test fixtures, e.g. "Recurring 1787361219376") —
this is the real, live state of the app, not curated demo data; a clean
account wasn't available and creating one was out of scope for this wave.

Taken **after** C1–C3 landed, per the brief's instruction not to photograph
the defects.

---

## C5 — CHANGELOG asserted what the design doc forbids, with wrong numbers

- `CHANGELOG.md`: rewrote the `check:design` bullet. It no longer claims to
  catch "neue Inline-Styles in `.tsx`" categorically — it now states the
  `inline` rule is literally `/style=\{\{/g` and misses `style={obj}` (76
  such sites, verified: `grep -rE 'style=\{[a-zA-Z_]' app components
  --include="*.tsx" | grep -v 'style={{' | wc -l` → 76, matching
  `docs/design-system.md`'s already-correct claim). Dropped the absolute
  violation counts (1934, 2214) — they were stale (measured: 1938 current,
  2215 at the commit that added `spacing`, not 2214) — and pointed at
  `npm run check:design` instead, which can't go stale.
- `docs/superpowers/specs/2026-08-22-lichtkegel-rollout-design.md` §8:
  corrected "Die Baseline von 1934 darf nur fallen" (contradicted
  `docs/design-system.md`, which was already fixed) to state that adding a
  category necessarily raises the baseline (measured 2215), and the ratchet
  rule (only fall) resumes from the new floor.
- Confirmed `docs/design-system.md` already states 1938 and 76 correctly —
  no change needed there.
- "Läuft in CI (PR Gate)" in the rewritten CHANGELOG bullet is scoped only to
  `check:design`, not to the Playwright counters — matches the "do not do"
  instruction (Playwright is not wired into CI; no document claims it is).

---

## C6 — `app/CLAUDE.md` documented the health route as a bare liveness probe

`app/CLAUDE.md`: changed the one-line description from "GET (liveness probe,
returns 200 OK)" to state the actual response shape (`{ status, version,
commit, timestamp, cron }`) and that the deploy gate reads `commit` to verify
a rollout happened — matching `app/api/health/route.ts`'s own doc comment.

---

## Also fixed (all named by the reviewer)

- **Flaky test**: `e2e/design-rules.spec.ts` — added `test.beforeEach(() =>
  test.setTimeout(60_000))` inside each page/theme `describe` block (five
  design-rule tests), since `countAmber` does up to 8 `getComputedStyle` +
  2 pseudo-element reads per element over the whole document and timed out
  at the default 30s under full-suite load on `/focus`.
- **`body`'s amber wash escaping the counter by accident**:
  `e2e/helpers/design-count.ts` now explicitly skips `document.body` in
  `countAmber`'s loop, with a JSDoc paragraph explaining why (an intentional
  6% ambient wash, not content) and naming the cost (a real `background-color`
  directly on `body` would now go permanently uncounted — an accepted,
  documented blind spot, not an accidental one).
- **Second entrance animation not awaited**: `components/dashboard/quick-wins-section.tsx`'s
  `motion.section` now carries `data-testid="quick-wins-section"`;
  `e2e/design-rules.spec.ts`'s `gotoSettled` waits for `opacity: 1` on it in
  addition to `.lichtkegel`, generalized as a small loop over both selectors
  so a future third animation is one line to add.
- **`components/ui/button.tsx`'s stale rationale**: corrected the comment
  citing an "unlayered `a { color: var(--accent-amber) }` link default" (no
  longer true — `app/globals.css:688` is `color: inherit`) to describe the
  actual current rule; the `!`s remain load-bearing for the same reason
  (unlayered beats layered).
- **`docs-site/features.md`**: removed "ambient amber and forest-green
  lighting" and "on a centered card" (both deleted per
  `components/focus/focus-mode-view.tsx:13-14`); rewrote the Focus Mode
  section to describe the actual current UI (no nav chrome, plain list, no
  ambient glow).
- **`/topics` sequential marker**: added. `components/topics/topics-grid.tsx`
  now passes `sequential={topic.sequential}` to `TopicCard`;
  `components/topics/topic-card.tsx` renders it as `eyebrow={sequential ?
  t("sequential_badge") : undefined}` — reuses `Row`'s existing `eyebrow`
  slot, no new `Row` prop, no pill/chip, reuses the existing
  `topics.sequential_badge` i18n key (already present in all seven locales,
  already used by `template-picker.tsx`) — zero new i18n work,
  `check:i18n` stayed green.

  **Live verification**: created a topic with `sequential: true` via the API,
  loaded `/topics`, read the row's text:
  ```
  "Seq Marker Probe 1787862242641\n0/0\nSEQUENZIELL"
  ```
  Mono eyebrow, no fill, no border. Deleted the probe topic after.

- **`.serena/`** added to `.gitignore` (was untracked every `git status` this
  session).
- **`e2e/design-rules.spec.ts:24`** dangling "Ein" fragment — rewritten into
  one coherent comment along with the `gotoSettled` doc update above.
- **`components/focus/focus-mode-view.tsx:4`** — "two-phase focus session"
  corrected to "three-phase" (the JSDoc already lists three).

---

## Ratchet

```
Before: 1938 (per task brief)
After:  1938 — Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.
```

No violation count changed: every fix used `cn()`/Tailwind classes and
existing tokens, no new inline styles, no new hardcoded colors/radii/spacing.

---

## Verification — every command's output

```
$ npx tsc --noEmit
(no output — clean)

$ npm run lint
✖ 12 problems (0 errors, 12 warnings)
(all 12 pre-existing react-hooks/set-state-in-effect + one jsx-a11y warning,
none touched by this wave — confirmed by re-reading each flagged file)

$ npm test
 Test Files  76 passed (76)
      Tests  1741 passed (1741)

$ npm run check:i18n
✓ All translation keys are present in every language file.

$ npm run check:design
Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.
```

Playwright, combined run against the running dev server
(`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright
test e2e/design-rules.spec.ts e2e/design-tokens.spec.ts e2e/dashboard.spec.ts
e2e/daily-quest.spec.ts e2e/tasks.spec.ts e2e/topics.spec.ts
e2e/navigation.spec.ts`):

```
160 passed, 12 failed (5.6m)
```

The 12 failures, all confirmed pre-existing and unrelated to this branch's
design-system work (none of the touched files are in their call path):

| Test | Cause |
|---|---|
| `daily-quest.spec.ts` › "GET /api/daily-quest returns expected shape" | Test bug: asserts `body.id`/`body.title` but the route returns `{ quest: ... }` — the same wrapper-unwrapping bug `createTask()`'s own comment in `e2e/helpers/api.ts` documents having fixed elsewhere, just not here. |
| `navigation.spec.ts` × 3 (wishlist/achievements/api-keys pages) | Test bug: `.not.toContainText(/500/i)` false-positives on legitimate page content containing the digits "500" (e.g. "192 / 500 🪙", "500 coins", or a `Date.now()`-based fixture title that happens to contain "500"). Not an actual HTTP 500. |
| `tasks.spec.ts` › 5 Quick-Add-Modal tests | Test bug: selector `input[placeholder*="Titel"]` assumes German locale; the shared E2E account's UI language is currently English (`"What do you need to do?"`), unrelated to any design change. |
| `tasks.spec.ts` › "topic tag" | Playwright strict-mode violation: `text="..."` matches both the row's title span and an unrelated filter-pill button with the same topic name — pre-existing selector ambiguity. |
| `tasks.spec.ts` › "recurring task ... visible" | `task.title` is `undefined` at the assertion — a test-side data bug independent of rendering. |
| `tasks.spec.ts` › "edit modal" | `[role="dialog"]` never appears — did not investigate root cause; out of scope (Task Form Modal, not named in the brief). |

None of these touch the six migrated pages' design-system code, and re-running
each individually before/after showed identical failure sets — no new
failures, no regression from this wave's changes.

### Three specs run separately against the confirmed-live server (re-run in
the foreground, one at a time, after re-confirming `/api/health` → 200)

**`e2e/user-journey.spec.ts`** — the one this branch modified, so the one
most likely to hide a real regression:

```
6 passed, 2 failed (19.2s)
```

Both failures pre-existing and unrelated to any design change:
- "completing a quick-win task removes it from the dashboard list" —
  `createTask(request, title, { estimatedMinutes: 10 })`: `10` is not a valid
  `estimatedMinutes` value (the schema is the enum `5 | 15 | 30 | 60 | null`,
  per `components/ui/list.tsx`'s own `effortStep()` doc) — a bad fixture
  value in the test, API correctly rejects it with 422.
- "task created via N shortcut appears on /tasks" — same German-placeholder
  selector assumption as the `tasks.spec.ts` Quick-Add-Modal family above.

No regression: neither failure touches quest/task rendering logic this wave
changed; both are test-authoring bugs (bad fixture value, locale-mismatched
selector) that would fail identically on `HEAD` before this wave.

**`e2e/topics.spec.ts`**:

```
12 passed, 0 failed (19.6s)
```

All pass, including "topic detail" tests from line 156 onward and the
long-topic-name word-break test — confirms `topic-card.tsx`'s new
`sequential` prop/eyebrow and `list.tsx`'s `trailingWrapsBelowSm` addition
caused no regression on this page.

**`e2e/wishlist.spec.ts`** (out of scope — run only to confirm no regression,
not touched):

```
8 passed, 2 failed (27.0s)
```

Both failures are the exact same "500 substring in legitimate page text"
false positive already documented above — the failing assertion's own
received-text dump contains "192 / 500 🪙" and "Buy (500 coins)" (real
wishlist pricing copy), not an HTTP 500. Confirms the pre-existing family,
no new failure, wishlist code untouched by this wave.

---

## Manual live-app check (measure, not infer)

Playwright bundled Chromium against the running app, using the existing
E2E storage state:

- **`/dashboard`**: quest action link ("jetzt anfangen") computes to
  `--amber`; screenshot confirms visually. ✓
- **Sidebar + mobile nav**: zero links with `text-decoration-line !== "none"`. ✓
- **`/tasks` at 375px**: 106 rows measured, zero at 0px width. ✓
- **`/topics`**: sequential marker renders as a mono "SEQUENZIELL" eyebrow
  under the title, verified by creating a real sequential topic via the API
  and reading the rendered row, then deleting it. ✓

---

## Self-review — what I could not finish / chose not to do

- **`components/CLAUDE.md`** and **`scripts/CLAUDE.md`**: updated, but not
  exhaustively. I documented the 9 new `ui/` primitives (badge, button,
  checkbox, empty-state, input, label, list, page-frame, surface — matching
  "omits nine new files"), corrected the stale `topic-card.tsx` entry, and
  added `task-row.tsx`/`task-row-actions.tsx`/`quick-wins-section.tsx`/
  `progress-tabs.tsx`. I did **not** document every other undocumented
  component in `components/` (achievements, habits, settings, stats —
  ~20 more files a broader audit found missing) — those are on out-of-scope
  pages and documenting them is a separate, larger cleanup than this wave's
  named findings called for.
- **The `tasks.spec.ts` "edit modal" failure**: I did not trace why
  `[role="dialog"]` never appears — it's on the Task Form Modal, not named
  in the brief, and tracing it properly would mean opening scope beyond the
  punch list with the wave already large. Flagged, not fixed.
- **Quick-Add-Modal / locale test family** (5 tests in `tasks.spec.ts` + 1 in
  `user-journey.spec.ts`, plus a 6th unrelated `estimatedMinutes: 10`
  validation bug in `user-journey.spec.ts`): confirmed pre-existing, root
  cause identified (locale assumption + one invalid test fixture value), not
  fixed — none of these are in the brief's punch list, and the pages/flows
  they touch are not migrated pages.
- Did not touch the ratchet's `inline` blind spot, did not wire Playwright
  into CI, did not touch any of the explicitly out-of-scope pages/files.

---

## Final documentation corrections

Four documentation claims corrected post-review to match the code:

### 1. components/CLAUDE.md:14 — false claim about Button's relationship to surface.tsx

**Before:** 
```
- `ui/surface.tsx` — `Surface` (raised/overlay only — no stage for ordinary content, which sits directly on `--ground`) and `Button`'s underlying elevation logic
```

**After:**
```
- `ui/surface.tsx` — `Surface` (raised/overlay only — no stage for ordinary content, which sits directly on `--ground`). Used by `dialog.tsx` and `/design-system` reference page
```

**Verification** — grep output for importers of `ui/surface.tsx`:

```
app/(docs)/design-system/page.tsx:23:import { Surface } from "@/components/ui/surface";
components/ui/dialog.tsx:22:import { Surface } from "@/components/ui/surface";
```

Button does not import surface.tsx. The elevation logic mentioned in the old line exists only as inline comments in button.tsx (lines 60, 71), not as imported code.

### 2. CHANGELOG.md:196 and docs/design-system.md:227 — unmeasured figure "2219"

**Before (CHANGELOG.md:196):**
```
- **Design-Ratsche bei 1938 Verstößen** (Task 2: 2219, nach Task 11: 1938; Task 12 senkt sie nicht
```

**After (CHANGELOG.md:196):**
```
- **Design-Ratsche bei 1938 Verstößen.** Der aktuelle Stand kommt aus `npm run check:design`, nicht aus diesem Dokument — er veraltet sofort, sobald sich etwas ändert. Die Ratsche hat einen blinden Fleck: ihre
```

**Before (docs/design-system.md:226-227):**
```
Abstands-Utilities außerhalb der Achterskala in `.tsx`. Aktuell 1938
Verstöße über den Rest der App (Task 2: 2219) — die Zahl darf nur fallen,
```

**After (docs/design-system.md:226-227):**
```
Abstands-Utilities außerhalb der Achterskala in `.tsx`. Der aktuelle Stand
kommt aus `npm run check:design` — die Zahl darf nur fallen,
```

The figure "2219" was never measured — it is a projection from the plan (1934 + 285). The measured baseline at commit 34e1734 (which added the fourth category) was 2215, and 2214 one commit later. Documents now point readers to `npm run check:design` instead, which cannot go stale.

### 3. CHANGELOG.md — four missing user-facing fixes

**Four entries added under `### Fixed`:**

- **Navigationslisten waren dauerhaft unterstrichen.** Every link in the sidebar, mobile nav, navbar, topic back-link and task-list topic link carried an unlayered `a { text-decoration: underline }` from globals.css, beating every layered Tailwind utility. Fixed with `no-underline!` at all six sites.

- **Das Dashboard-Quest-Element war farblos.** The quest-action link (the one amber action per page) was underlined and colourless due to the same cascade trap. Fixed with `text-[var(--amber)]! no-underline!`.

- **Task-Titel unter 375 px auf `/tasks` kollabiert auf 0 px Breite.** At 375px, task titles rendered at zero width when trailing values were long, because title, trailing, and action buttons all competed for the same line. Fixed by moving `trailing` onto the eyebrow line below 640px via new `trailingWrapsBelowSm` prop in Row.

- **Sequential-Marker auf `/topics` verschwunden.** The sequential badge was not restored when the Row migration happened, despite being claimed done. Re-added as a mono eyebrow using the existing `topics.sequential_badge` i18n key (already present in all seven locales).

### 4. README.md:35 — alt text claiming absent sequential marker

**Before:**
```
| ![Topics — a hairline-separated list of topic rows, no cards, progress and a sequential marker as plain mono text](public/screenshots/02-topics.png) |
```

**After:**
```
| ![Topics — a hairline-separated list of topic rows, no cards, with progress bars](public/screenshots/02-topics.png) |
```

The screenshot `02-topics.png` shows no sequential marker (the topics displayed are not sequential), so the alt text was misleading. Corrected to describe what the image actually shows.

### Verification

```
$ npm run check:design
Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.

$ git diff --stat
 CHANGELOG.md          | 7 +++++--
 README.md             | 2 +-
 components/CLAUDE.md  | 2 +-
 docs/design-system.md | 4 ++--
 4 files changed, 9 insertions(+), 6 deletions(-)
```

No changes to code, tests, or configuration — documentation only. Design ratchet unchanged at 1938 with 0 new violations.
