# Task 10 Report: `/topics` — Liste statt Raster, und der Wortumbruch

## Summary

`/topics` migrated from a 1/2/3-column card grid to `PageFrame` + `List`/`Row`.
The word-break bug (`overflowWrap` + `wordBreak: "break-word"` set together
on the old `<h3>`) is fixed via a new `Row` prop `wrapTitle`. Ratchet fell
from 2060 to 1986. All required test files pass; pre-existing failures
verified as pre-existing with fresh evidence, not fixed by this task
(out of scope).

## Rule failures — before / after

Ran (per brief Step 2) against the **unmodified** `topic-card.tsx` /
`topics-grid.tsx` / `page.tsx`, with `/topics` already added to
`MIGRATED_PAGES` and the new word-break test already written:

```
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/topics.spec.ts e2e/design-rules.spec.ts -g "topics|/topics"
```

Result: `ein langer Themenname bricht nicht mitten im Wort` — **FAIL**
(`locator.evaluate: Test timeout of 30000ms exceeded … waiting for
getByTestId('topic-row')`). The brief predicted a `wordBreak: "break-word"`
assertion failure; the actual failure is one step earlier — `topic-row` /
`data-row-title` don't exist yet in the old markup, so the locator never
resolves. Both are honest RED: the *reason* named in the brief presupposes
Step 3 already ran; the true starting state fails for a more basic reason
(no `Row`, no testid), which is the more accurate "honest starting point."

Design-rules RED (5 rules × 2 themes, unrun until `/topics` was added to
`MIGRATED_PAGES` — first run after adding it, still on old markup):
- **Kästen** (`hat keine umrahmte oder gefüllte Inhaltsfläche`): fails —
  the old card is a filled/bordered `<div>` (`bg-[var(--bg-surface)]`,
  `border`, `box-shadow`).
- **`[data-column]`** (`hält jede Inhaltsspalte auf dem Maß`): fails — no
  `PageFrame`, so no `data-column` element exists at all
  (`measureColumns` asserts `widths.length > 0`).
- Amber, Fraunces: pass even on old markup (the old page already had one
  `<h1>` Fraunces and one amber "+ Neues Thema" button) — not part of the
  28/27-violation count the brief describes, but confirmed not broken
  either way.

After the fix (Step 4), all five rules pass on `/topics`, both themes (see
Playwright section below).

## What changed, per file

- **`components/ui/list.tsx`** — new `Row` prop `wrapTitle?: boolean`.
  Title span class becomes `wrapTitle ? "break-words hyphens-auto" :
  "truncate"` instead of the previous unconditional `truncate`. No other
  `Row`/`List`/`GroupHeading` behavior changed.

- **`components/topics/topic-card.tsx`** — rewritten from a 227-line
  bordered/filled card (icon circle, priority badge, description,
  progress bar, sequential badge, "all done" banner, Tooltip-wrapped
  action buttons) to a `Row`: `title` is `<Link href={/topics/{id}}>`
  with `wrapTitle`, `trailing` is `"{completedCount}/{taskCount}"`,
  `dotColor` is the user's topic color. Actions (edit/archive/delete)
  are three plain icon buttons in the same undecorated style as
  `TaskRowActions`' `ACTION_BTN` (now exported from this file so
  `ArchivedTopicCard` can reuse it instead of duplicating the string).
  Priority, description, and the "sequential" flag are **dropped from
  the row** — they stay editable in `TopicForm`, matching the brief's
  literal Step-3 wording (title/trailing/dotColor only) and the "row is
  nothing but text" doctrine already applied to `/tasks`.

- **`components/topics/topics-grid.tsx`** — both `grid grid-cols-1 …
  lg:grid-cols-3` containers become `<List>`; the inline `EmptyState`
  function is replaced by the shared `components/ui/empty-state.tsx`
  (`line={t("empty_hint")}`, action = quiet Button). `ArchivedTopicCard`
  is rewritten the same way as `TopicCard` but keeps `truncate` (no
  `wrapTitle`) and `tone="secondary"`, per the brief's explicit
  instruction that the archived view stays compact. "+ Neues Thema" is
  now `<Button variant="primary">` (amber text, no fill) instead of a
  hand-rolled amber-filled `<button>`. The staggered fade-up-on-mount
  entrance animation (`motion.div` wrapper per card) was dropped rather
  than ported onto `Row`'s `as={motion.li}` — `/tasks` (the reference
  page) doesn't animate initial mount either (only exits, via
  `AnimatePresence`), so this keeps `topics-grid.tsx` consistent with
  that precedent instead of adding animation `/tasks` itself doesn't
  have. This is a finding, not something I was asked to add back.

- **`app/(app)/topics/page.tsx`** — wrapped in `PageFrame`. The rail
  carries two counters: `page_subtitle` (topic count, reusing the
  existing key, dropping the separate `page_subtitle_empty` variant per
  the brief's literal "page_subtitle wandert in den Rand") and a new
  `rail_open_tasks` counter (open tasks summed over **active** topics
  only — archived topics don't count as carrying open work). The open
  counter is hidden at 0 (matches the `rail_overdue` pattern on
  `/tasks`: a zero count isn't shown as a fact). `max-w-5xl mx-auto` is
  gone; `PageFrame` supplies `--measure`.

- **`e2e/helpers/design-count.ts`** — `/topics` added to
  `MIGRATED_PAGES`.

- **`e2e/topics.spec.ts`** — added the word-break test verbatim from the
  brief.

- **`messages/{de,en,es,fr,nl,ru,zh}.json`** — new key
  `topics.rail_open_tasks` (`"{count} Aufgaben offen"` / `"{count} tasks
  open"` / etc.) in all seven locales.

- **`scripts/design-baseline.json`** — updated via `--update` after the
  real decrease (2060 → 1986); no `--admit` needed, nothing rose.

## RED / GREEN for the word-break test

**RED** (old `topic-card.tsx`/`topics-grid.tsx`/`page.tsx`, temporarily
restored from `git show HEAD:<path>` for this capture, then re-applied
after):

```
Test timeout of 30000ms exceeded.
Error: locator.evaluate: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('topic-row').filter({ hasText: 'Steuererkl' }).first()
1 failed
```

**GREEN** (current code):

```
Running 2 tests using 1 worker
  ✓ [setup] › e2e/global.setup.ts:34:6 › authenticate
  ✓ [chromium] › e2e/topics.spec.ts:78:7 › Topics Page › ein langer Themenname bricht nicht mitten im Wort (5.6s)
2 passed (6.7s)
```

## `wrapTitle` — implementation and why `truncate` isn't dropped globally

`Row`'s title span gets `wrapTitle ? "break-words hyphens-auto" :
"truncate"`. Verified directly against the installed Tailwind v4 engine
(`node_modules/tailwindcss/dist/lib.js`): `break-words` compiles to
`overflow-wrap: break-word` **only** — Tailwind does not also emit
`word-break` for this utility (confirmed by grepping the compiled
utility table: `e.utilities.static("break-words",()=>[o("overflow-wrap","break-word")])`).
That is exactly the fix the brief describes: the old bug was setting
`overflow-wrap: break-word` **and** `word-break: break-word` together:
`word-break: break-word` is the deprecated alias of `overflow-wrap:
anywhere` and breaks inside a word that would have fit on the next line.
`overflow-wrap: break-word` alone only breaks a word that cannot fit the
line by itself. `hyphens-auto` is added alongside so a long German
compound word gets a real syllable break instead of an abrupt line-end;
this works because `app/layout.tsx` sets `<html lang={locale}>`.

`truncate` is **not** dropped for other rows: every other `Row` caller
(`TaskRow`, wishlist, focus) still truncates a title that doesn't fit —
that's deliberate (a task title is disposable at a glance; a topic name,
per the brief, is "the only way to recognize the topic" and must be
readable in full). `wrapTitle` is opt-in per row, defaulting to `false`
(unchanged behavior everywhere it isn't explicitly passed), so nothing
about `TaskRow` or any other current `Row` caller changes.

## Verification commands and results

- `npx tsc --noEmit` — clean, no output.
- `npm run lint` — 12 warnings, all pre-existing
  (`react-hooks/set-state-in-effect` in `push-devices.tsx`,
  `timezone-settings.tsx`, `task-form.tsx`, `task-row.tsx`,
  `topic-form.tsx`, `wishlist-form.tsx`; `jsx-a11y/role-supports-aria-props`
  in `checkbox.tsx`). **Zero warnings in any file this task touched**
  (`grep` for `topic-card|topics-grid|components/ui/list|topics/page`
  against the lint output returns nothing).
- `npm run check:design` — before this task: 2060 (baseline, unchanged
  from the session's stated starting point). After: **1986**, written
  with `npm run check:design -- --update` (no `--admit` used — every
  affected file's count went down or stayed the same; the run refused
  nothing).
- `npm run check:i18n` — `✓ All translation keys are present in every
  language file.` (1034 references scanned.)
- `npx playwright test e2e/topics.spec.ts e2e/design-rules.spec.ts
  e2e/design-tokens.spec.ts` — **91 passed, 0 failed** (full combined run,
  includes both themes × all four `MIGRATED_PAGES` for design-rules, the
  full design-tokens suite, and all 12 topics.spec.ts tests including the
  new word-break test). `/topics` passes all five design-rules checks
  (Amber-höchstens-einmal, Amber-Bildquellen-Probe, Fraunces-genau-einmal,
  keine-Kästen, Maß) in both dark and light.

## Pre-existing failures — evidence per failure

Per-failure evidence, not a blanket citation of the brief's list:

- **`e2e/navigation.spec.ts` — `/500/i` false positives.** Ran the full
  file twice. Both runs show 2 failures from the literal digit sequence
  "500" appearing in real page content, not an HTTP 500: `wishlist` shows
  "Halbtausend...500 Coins gesammelt" (an achievement name/description),
  `achievements` shows the same "Halbtausend" achievement text
  ("500 Coins gesammelt", "500 Aufgaben erledigt"). Neither page was
  touched by this task. This matches the brief's stated pre-existing
  class exactly (`not.toContainText(/500/i) on body`).
  - One run (out of three total across this session) additionally showed
    `all main navigation links from sidebar work` failing (clicked
    `a[href="/tasks"]`, ended up back on `/dashboard`). I re-ran that
    single test 4 times in isolation after restoring my changes (3×
    `--repeat-each=3` plus one more standalone) — passed every time. I
    also reproduced it once with the OLD `/topics` code in place (before
    restoring my fix) — it did NOT fail there either; it only failed
    once, embedded in a large concurrent test run. I can't produce a
    reliable repro and it doesn't correlate with the `/topics` change
    (the failing link was `/tasks`, before `/topics` is even visited) —
    logging this as flaky/environmental, not attributable to this task,
    but flagging the uncertainty rather than silently omitting it.
- **`e2e/tasks.spec.ts` — 8 failed.** Ran full file: exactly 8 failures,
  all in the Quick-Add modal (`N`/`/` shortcuts, create-via-modal, Escape,
  More-options), the topic-tag display, recurring-task creation, and the
  edit-modal open — none touch `/topics`, `topic-card.tsx`,
  `topics-grid.tsx`, or `components/ui/list.tsx`. Matches the brief's
  stated count exactly.
- **`e2e/focus-quick.spec.ts` — 2 failed.** Ran full file: exactly 2
  failures — `Focus Mode › shows heading or content` and `Focus Mode ›
  shows quick wins section when tasks ≤ 15 min exist` (the latter fails
  before assertion, on `createTask` returning 422 `estimatedMinutes:
  Invalid input` — a test-helper/API validation mismatch unrelated to
  `/topics`). Matches the brief's stated count exactly.

None of these three files were modified by this task.

## Browser check — what I saw and did

**Tooling note:** the `claude-in-chrome` extension's `resize_window` was
unreliable in this session (the window resized itself unpredictably
between actions, sometimes to sizes as small as 846×356, independent of
any resize call I made). I used it anyway for interactive testing (clicks
survive window-size changes) but **not** for width-controlled screenshots.
For the 1440px/375px × dark/light matrix I used a temporary Playwright
spec (`e2e/_visual-topics.spec.ts`, deleted after use — not part of the
deliverable) that calls `page.setViewportSize` + the existing
`gotoWithTheme` helper and saves a full-page PNG per combination, with a
"Steuererklärung 2025" topic present via `createTopic`/`deleteTopic` so
the wrap fix is visible in the capture.

All four screenshots (dark/light × 1440/375) show: one Fraunces "Topics"/
"Themen" `<h1>`, "+ New Topic" as the page's one amber element (text only,
no fill), rows separated by hairlines with no boxed/filled surfaces, mono
trailing counts, rail counters (topic count + open-task count) in the
right rail at 1440px and stacked below the list at 375px (matches
`PageFrame`'s documented `<640px` behavior), and the mobile bottom nav
present at 375px without overlapping the list.

**Interactive walkthrough** (in Chrome, against the signed-in dev
account, not the E2E test account — see note below):
1. **Create**: `+ Neues Thema` → template picker → "Leer starten" → typed
   `Steuererklärung 2025 Test`, picked a color, saved. Row appeared
   immediately with the color as a 6px dot before the title.
2. **Edit**: opened edit, retitled to `Steuererklärung
   Einkommensteuererklärung Nachbearbeitung 2025` (deliberately long/
   compound), saved. The row grew to two lines, breaking as
   `"Nachbe-\narbeitung"` — a real syllable hyphenation (`hyphens-auto`),
   not a mid-syllable break. With the confirm-delete UI open later
   (narrower available width for the title column) the same title
   wrapped to six lines, still breaking only at hyphenation points
   (`Steuer-`, `Einkommen-`, `steuer-`, `Nachbear-`) — confirms the fix
   holds under an extreme width constraint, not just the common case.
3. **Archive**: clicked the archive icon → row moved into the
   auto-expanded "Archiviert (1)" section, title now `truncate`d with an
   ellipsis, dimmed to `--ink-2`, still showing the color dot.
4. **Restore**: clicked "Archivierung aufheben" → row returned to the
   active list, `wrapTitle` behavior restored (two-line wrap, not
   truncated).
5. **Navigate into the topic**: clicked the title (a `<Link>`) → landed
   on `/topics/{id}` (the untouched, out-of-scope detail page — confirms
   navigation still works and this task didn't touch that page).
   Navigated back to `/topics`.
6. **Delete**: clicked the delete icon, confirmed via the inline
   Yes/Cancel prompt → row removed, list back to its original 4 topics.

**One click-automation quirk, not a product bug:** the first click on a
hover-revealed action button (edit/archive/delete/unarchive/the title
link) consistently only triggered the `:hover` CSS state (making the
buttons visible) without registering as a "real" click; a second click at
the same location then worked. This matches `Row`'s documented behavior
(`actions` are `pointer-events-none` until `:hover`/`:focus-within` on
devices with a pointer) — the automated click's mouse-move-then-click
sequence needs the hover state to settle before `pointer-events` opens up
for the click to land. Confirmed as an automation artifact, not a real
defect, because a plain human mouse hover-then-click (which is what the
CSS is designed for) doesn't have this two-step problem.

**Data-mixing note (self-caught, not a defect):** early in the browser
check I nearly deleted the wrong "Steuererklärung 2025" — the RED-test
capture (which fails before reaching its `deleteTopic` cleanup, by
design) had left one real leftover topic under the **E2E test account**
(`e2e/.auth/user.json`'s session, 191 coins). The Chrome extension's
signed-in session is a **different, persistent dev account** ("R", 247+
coins) that happens to already have its own demo topic named identically
"Steuererklärung 2025" (it's literally the example text in the
create-form's placeholder). I confirmed the mismatch by comparing
`/api/user` coin balances between a `curl` call using the E2E session
cookie and the Chrome UI, deleted only the E2E-account leftover via
`curl -X DELETE` (verified by re-fetching that account's topic list:
`Steuererklärung 2025 (exact)` count → 0), and left the dev account's own
demo topic untouched. No test data was deleted from the wrong account.

## Self-review — what I'm unsure about

- **Dropping priority badge / sequential badge / description / "all
  done" banner from the row entirely.** The brief's Step 3 only mentions
  title/trailing/dotColor going into `Row`, so I took that literally and
  dropped the rest (still editable via `TopicForm`). This is a bigger
  information loss than `/tasks`' migration (which kept priority via
  `GroupHeading` grouping) — `/topics` has no grouping mechanism for
  priority in this design, so priority is now invisible on the list
  entirely, not just de-emphasized. I believe this is what was asked,
  but it's the single largest behavior change in this task and I'd want
  a reviewer to explicitly confirm it's intended rather than an
  oversight in the brief.
- **Dropping the topic icon** (`resolveTopicIcon`/FontAwesome + colored
  circle) from the row. Not mentioned either way in the brief; I dropped
  it because a bordered/filled icon circle is exactly the "Kasten" the
  design rules forbid outside a real affordance, and `Row` has no slot
  for a decorative (non-affordance) icon. Same uncertainty as above:
  intentional simplification per the brief's spirit, or an omission I
  should have flagged before dropping.
- **`rail_open_tasks` counting only active topics' open tasks.** Not
  specified precisely in the brief ("Anzahl offener Aufgaben"); I chose
  active-only with reasoning in a code comment, but "all topics including
  archived" is a defensible alternative reading.
- **Dropping the staggered entrance animation** from the active-topics
  list. Reasoned from precedent (`/tasks` doesn't animate initial mount
  either), but this is inference, not something the brief states.
- **The flaky sidebar-navigation-links failure** (one occurrence in three
  navigation.spec.ts runs) — I could not pin down a cause and am
  reporting it as unreproducible/environmental rather than asserting
  it's definitely unrelated to my change, even though every targeted
  re-run (old code once, new code four times) passed.
- Action icon sizing: found the edit-pencil icon at `h-3 w-3` while
  archive/delete were `h-3.5 w-3.5` (an artifact of copying the
  pre-existing `topic-card.tsx`'s inline `fontSize` values, 11 vs
  12/13) — fixed to a uniform `h-3.5 w-3.5`, matching `TaskRowActions`.

## Fix round 1 — fourteen findings (finished across two agents)

A review of the above returned fourteen findings (C1, C2, I3–I6, and eight
minors). A first agent implemented fixes for all 14, reached "All 91 passed"
on the Playwright suites, and was killed by an API error before committing
and before writing this section. This section audits what that agent left
on disk, finishes the one gap it left, and proves the result.

### Audit — what was on disk, per finding

- **C1 (false word-break explanation, in a shared primitive) — complete.**
  Both `components/ui/list.tsx` (at `wrapTitle`, the canonical location) and
  `components/topics/topic-card.tsx` (in the file header) carry the
  corrected explanation with the measured table (160/140/100 px ×
  overflow-wrap-only / +word-break / +hyphens-auto) and state plainly that
  `hyphens-auto`, not removing `word-break`, is the fix. Read both in full;
  neither restates the old false claim, and neither introduces a new one —
  the `topic-card.tsx` comment explicitly narrates "the first version of
  this comment claimed X; measured, that's wrong" rather than silently
  overwriting history. Before/after text below.
- **C2 (test passed with the fix half deleted) — complete, and stronger
  than the brief's minimum.** `e2e/topics.spec.ts`'s word-break test now
  asserts `style.hyphens === "auto"` in addition to the two original style
  assertions, **and** adds a rendered-line assertion: it forces the title
  span to `flex: 0 0 140px` (the same width the review measured at) and
  walks the text node's `getClientRects()` to find the actual line-break
  offset, asserting the rendered lines equal `["Steuererklä", "rung 2025"]`
  — the real Duden hyphenation point, not the old bug's `["Steuererklärun",
  "g 2025"]`. The agent also found and fixed a second bug while writing
  this: without a `locale=de` cookie, `next-intl` fell back to the test
  environment's `Accept-Language` (English), and Chromium did not
  hyphenate a German word under an English `lang` — silently reproducing
  the exact original bug. The test now sets `{ name: "locale", value: "de"
  }` explicitly. I did not need to change this file further.
- **I3 (no ICU plural for `rail_open_tasks`) — complete, verified myself
  in all seven locales** (see grep table below): every locale has
  `{count, plural, one {…} other {…}}`, `ru` additionally has `few`,
  matching `page_subtitle`'s exact plural-category shape locale-by-locale
  (checked de: one/other, ru: one/few/other, zh: other-only — all three
  match their sibling key).
- **I4 (`ACTION_BTN` triplicated with an unenforced claim) — complete.**
  `ACTION_BTN` now lives once in `components/ui/list.tsx`, exported, with a
  JSDoc that names the review finding instead of asserting an unchecked
  claim. `task-row-actions.tsx` imports it (diff is exactly `+import
  {ACTION_BTN} from list; -const ACTION_BTN = "…"` — nothing else in that
  file changed). `/tasks` verified working (screenshot + `e2e/tasks.spec.ts`
  full run below).
- **I5 (progress lost its localized noun) — complete.** Both
  `topic-card.tsx` and the archived row in `topics-grid.tsx` render visible
  `"{completed}/{total}"` in mono, wrapped in a `<span aria-label={t(
  "task_progress", {...})}>` — full sentence for a screen reader, compact
  digits for sighted users, symmetric between active and archived rows
  (archived keeps the percentage removed, per ruling, but its accessible
  name is equally complete).
- **I6 (unarchive became a bare icon) — complete.** The unarchive control
  in `topics-grid.tsx` is a labelled button (icon + visible
  `"Archivierung aufheben"` text, `w-auto gap-2 px-3` instead of the fixed
  8×8 icon square), and `title`/`aria-label` now carry the same string
  (previously "Wiederherstellen" vs. "Archivierung aufheben" — two
  different strings for the same control). Verified in Chrome: hovering
  and reading the archived row shows the labelled button, not a bare icon.
- **Minors — seven of eight complete, one incomplete (found and fixed by
  me):**
  - Dead i18n keys: complete, verified myself (grep below).
  - `aria-expanded` on the archive disclosure button: present
    (`topics-grid.tsx:185`).
  - Hover label on the destructive `ConfirmButton`: present — `title` prop
    added to `ConfirmButton` (see verdict below), passed through on both
    delete buttons.
  - Off-scale `h-2.5` chevron: now `h-3 w-3` (an actual Tailwind scale
    step), confirmed by grep — no `h-2.5` left in `topics-grid.tsx`.
  - `rail_overdue`-as-precedent comment in `page.tsx`: rewritten, now
    correctly says this is its own decision, not a citation of `/tasks`'
    `rail_open` (which is *not* gated; only `rail_overdue` is).
  - **`drop title where it duplicates aria-label verbatim on edit/archive`
    — implemented literally, but incompletely: this is the one gap I
    found and closed.** The inherited code dropped `title` from the edit
    and archive buttons in `topic-card.tsx`, leaving them with **no
    hover-visible label at all** — only `aria-label`, which is
    screen-reader-only and produces no tooltip. Meanwhile the same round
    added `title` to the delete button (the ConfirmButton minor above).
    Net effect on disk: 2 of the row's 3 icon buttons had no hover label,
    1 did — inconsistent within the same row, and it fails "every row
    control has a hover label" outright (I checked in Chrome — see below).
    This also disagreed with the established sitewide convention: every
    icon-only action button in `task-row-actions.tsx` (the reference
    implementation this whole primitive is modeled on) keeps `title` equal
    to `aria-label`, specifically so mouse users get a native tooltip on
    an icon with no visible text. I restored `title={t("aria_edit")}` /
    `title={t("aria_archive")}` on those two buttons, matching the
    now-three-for-three pattern. This is a one-line-per-button fix, not a
    rewrite, and it doesn't reverse the parts of the minor that were
    correct (the delete button's new `title` stays; nothing about
    aria-label changed).

### Word-break comment — before / after

**Before** (this round's git history has no earlier version on disk since
this was uncommitted work-in-progress; the *false* explanation this
finding refers to is the one from the original Task 10 commit, `e75e8b9`):
Task 10's original comment claimed removing `word-break: break-word` and
relying on `overflow-wrap: break-word` alone was the fix — no measurement,
just an assertion built into the code comment.

**After**, `components/ui/list.tsx` (at `wrapTitle`, canonical):

> `hyphens-auto` ist der Fix, nicht `break-words` (Task-10-Review C1: die
> ursprüngliche Begründung war falsch). Gemessen in Chromium, im exakten
> Layout-Kontext dieser Zeile … [160/140/100px table] … `word-break:
> break-word` zu entfernen ändert hier NICHTS … `hyphens-auto` ist der
> Teil, der tatsächlich an einer Silbengrenze statt mitten im Wort bricht.

**After**, `components/topics/topic-card.tsx` (file header, narrates its
own correction):

> Die erste Fassung dieses Kommentars behauptete, das Entfernen von
> `word-break: break-word` sei der Fix. Gemessen in Chromium im echten
> Layout ist das falsch … Der tatsächliche Fix ist `hyphens-auto`.

Both comments agree with each other and with the measured table; neither
makes an unmeasured claim.

### RED / GREEN — strengthened word-break test, captured live by me

Per instruction, I did this myself rather than trusting the inherited
report — edited `components/ui/list.tsx`'s `wrapTitle` line from
`"break-words hyphens-auto"` to `"break-words"` (no `git checkout`), ran
just that test, restored the line by editing it back, ran it again.

RED (hyphens-auto removed):
```
Expected: "auto"
Received: "manual"
  > 105 |     expect(style.hyphens).toBe("auto");
1 failed
```

GREEN (restored):
```
✓ 2 [chromium] › e2e/topics.spec.ts:78:7 › ein langer Themenname bricht nicht mitten im Wort (4.7s)
2 passed (5.8s)
```

`git diff --stat components/ui/list.tsx` after restoring matched the
pre-edit diff exactly (35 insertions / 4 deletions against HEAD, same as
before the RED capture) — confirms the edit-back left no residue.

### Dead i18n keys — grep proof

```
grep -rn "page_subtitle_empty" app components lib --include="*.tsx" --include="*.ts"   → (no output)
grep -rn "\"view\""              app components lib --include="*.tsx" --include="*.ts"   → (no output)
grep -rn "unarchive_btn"          app components lib --include="*.tsx" --include="*.ts"   → (no output)
grep -rn "all_done_archive_hint"  app components lib --include="*.tsx" --include="*.ts"   → (no output)
grep -rn "task_progress"          app components lib --include="*.tsx" --include="*.ts"
  → components/topics/topic-card.tsx:92, components/topics/topics-grid.tsx:299
```

The four dead keys are removed from all seven locale files; `task_progress`
(a candidate the review named but I5 revives) is correctly kept, and is
used in exactly the two places I5 describes. Also checked the untouched
`topic-form.tsx` and `topic-detail-actions.tsx` (both in the `topics`
namespace, both off-limits) for references to the four deleted keys —
none found, so deleting them doesn't break an out-of-scope file either.

### Verdict on `components/ui/confirm-button.tsx`

**Justified — kept, not reverted.** The diff is additive only: a new
optional `title?: string` prop, forwarded to the trigger `<button>`
alongside the existing `aria-label`. Before this round `ConfirmButton` had
no `title` prop at all, so `topic-card.tsx`/`topics-grid.tsx` passing
`title={t("aria_delete")}` to it required this change — TypeScript strict
mode would reject an unknown prop on a typed component, so this wasn't
optional. I grepped every `<ConfirmButton` call site in the codebase
(`active-sessions.tsx`, `calendar-feed-section.tsx`,
`notification-channels.tsx`, `passkeys-section.tsx`, `webhooks.tsx`,
`bulk-action-bar.tsx`, `task-item.tsx`, `topic-detail-actions.tsx`, plus
the two in this task's files) — none of the other nine pass `title`, so
`title` is `undefined` for all of them and no attribute is rendered,
identical to before. No behavior changed anywhere except the two call
sites that now intentionally pass it.

### Verification — commands and output

- `npx tsc --noEmit` — clean, no output (checked twice: once on the
  inherited state, once after my `topic-card.tsx` fix).
- `npm run lint` — 12 warnings, all pre-existing, same set as the original
  Task 10 report (`react-hooks/set-state-in-effect` × 6,
  `jsx-a11y/role-supports-aria-props` × 1 file with a repeated pattern);
  zero in any of the 14 changed files. Checked after my fix too — still 12,
  still none new.
- `npm run check:design` — `Design-Token-Ratsche in Ordnung — 1986
  Verstoesse, keiner neu.` Checked before and after my `topic-card.tsx`
  edit — unchanged both times (adding a `title` attribute isn't a ratchet
  violation).
- `npm run check:i18n` — `✓ All translation keys are present in every
  language file.` (1038 references after my edit added no new keys, only
  reused `t("aria_edit")`/`t("aria_archive")` that already existed.)
- `DATABASE_URL=… npx playwright test e2e/topics.spec.ts
  e2e/design-rules.spec.ts e2e/design-tokens.spec.ts` — **91 passed, 0
  failed**, run twice (once before my fix, once after, both clean).
- `DATABASE_URL=… npx playwright test e2e/tasks.spec.ts` — **8 passed, 8
  failed**, matching the original report's stated pre-existing count
  exactly. Failures: Quick-Add modal (N/`/` shortcuts, create-via-modal,
  Escape, More-options), topic-tag display, recurring-task creation,
  edit-modal open — all in modal-opening / topic-tag code, none touch
  `TaskRowActions`, `ACTION_BTN`, or any edit/delete/archive button. This
  is the suite the first agent never reached; it confirms I4's
  `ACTION_BTN` extraction didn't regress `/tasks`.

### What I saw in Chrome

Light and dark, ~1568×771 viewport (window resize to 375px was unreliable
in this session too, same tooling issue the original report flagged —
substituted with the already-passing `e2e/topics.spec.ts` "renders
correctly on mobile viewport" test and `design-tokens.spec.ts`'s explicit
<640px/<1100px rail-layout assertions, both green):

- **List rendering**: hairline-separated rows, no boxed surfaces, one
  amber ("+ Neues Thema", text only), one Fraunces `<h1>` ("Themen"), rail
  counters ("4 Themen", "6 Aufgaben offen") — both themes.
- **Hover labels, before my fix**: inspected the DOM directly
  (`getAttribute('title')`) on all three action buttons per row — edit and
  archive returned `null`, delete returned `"Thema löschen"`. Hovering
  edit/archive showed nothing; only delete showed a native tooltip.
- **Hover labels, after my fix**: all three return matching `title` and
  `aria-label` (`"Thema bearbeiten"`, `"Thema archivieren"`, `"Thema
  löschen"`) — confirmed both via DOM inspection and by hovering and
  zooming into the revealed action cluster.
- **Word-wrap**: forced the title span to `flex: 0 0 140px` via a
  temporary (non-persisted, reloaded away afterward) inline style/outline
  and zoomed in — rendered as `"Steuererklä-"` / `"rung 2025"`, the real
  hyphenation point, matching the strengthened test's assertion exactly.
- **Archive / unarchive round-trip**: archived "Fitness" (via
  `element.click()` — the extension's synthetic click-then-click quirk the
  original report flagged is still present; a JS-dispatched `.click()`
  avoided it), confirmed the archived section renders `"Archivierung
  aufheben"` as visible text next to the icon (not a bare icon), then
  unarchived it back — data left exactly as found (4 active topics, 0
  archived).
- **`/tasks`**: loaded correctly, action buttons still carry both
  `aria-label` and `title` (`ACTION_BTN` import didn't change anything
  visible or behavioral there).

### Self-review — what I could not fully verify

- I did not attempt a true 375px-viewport screenshot; the `claude-in-chrome`
  extension's `resize_window` failed with "Invalid value for bounds" both
  times I tried it (500×800 and 375×700), reproducing the same
  session-environment limitation the first agent hit. I substituted the
  automated evidence (mobile-viewport Playwright test + the explicit
  `<640px`/`<1100px` design-tokens assertions), which is real coverage of
  the same behavior, but it is not a screenshot I looked at with my own
  eyes.
- I did not re-verify every one of the inherited report's browser-check
  claims from the original Task 10 pass (e.g. the six-line wrap under an
  extreme width constraint, the data-mixing incident) — those predate this
  fix round and weren't in question; I focused verification on the
  fourteen findings and my own fix.
- The click-registers-as-hover-first quirk in the Chrome extension is
  still present in this session (confirmed again while archiving/
  unarchiving); worked around with `element.click()` via
  `javascript_tool` rather than the `computer` tool's coordinate clicks.
  This is an automation-tool artifact, not a product defect — plain mouse
  hover-then-click doesn't have this problem, consistent with the first
  agent's note.

## Fix round 2 — the transcribed table goes away

The transcribed break-point table in `components/ui/list.tsx` (lines 290-294)
was replaced by a reference to the executable assertion that validates the
rendering. Two of its cells stated incorrect break points; transcribed numbers
drift silently, but a test cannot.

### Before — list.tsx comment at wrapTitle

```
// `hyphens-auto` ist der Fix, nicht `break-words` (Task-10-
// Review C1: die ursprüngliche Begründung war falsch).
// Gemessen in Chromium, im exakten Layout-Kontext dieser
// Zeile (Flex-Elternteil, dieser Span `flex:1 1 0%;
// min-width:0`, 16px Mono, `<html lang="de">`), Text
// "Steuererklärung 2025":
//
// | Breite | nur overflow-wrap | + word-break (alter "Fix") | + hyphens-auto (jetzt) |
// |---|---|---|---|
// | 160px | Steuererklärung / 2025 | identisch | identisch |
// | 140px | Steuererklärun / g 2025 | identisch | Steuererklär / ung 2025 |
// | 100px | Steuererkl / ärung 2025 | identisch | Steuere / rklärung / 2025 |
//
// `word-break: break-word` zu entfernen ändert hier NICHTS:
// `min-width: 0` auf diesem Titel-Span neutralisiert den
// einzigen echten Unterschied zwischen `break-word` und
// `anywhere` (ob Weichumbruch-Stellen in die
// Min-Content-Breite einfließen) — `overflow-wrap:
// break-word` allein reproduziert den gemeldeten Fehler
// zeichengenau. `hyphens-auto` ist der Teil, der tatsächlich
// an einer Silbengrenze statt mitten im Wort bricht; er
// greift, weil `app/layout.tsx` `<html lang={locale}>` setzt.
```

### After — list.tsx comment at wrapTitle

```
// `hyphens-auto` ist der Fix, nicht `break-words` (Task-10-
// Review C1: die ursprüngliche Begründung war falsch).
// `overflow-wrap: break-word` allein reproduziert den
// gemeldeten Fehler zeichengenau. `word-break: break-word` zu
// entfernen ändert hier NICHTS: `min-width: 0` auf diesem
// Titel-Span neutralisiert den einzigen echten Unterschied
// zwischen `break-word` und `anywhere`. `hyphens-auto` ist
// der Teil, der tatsächlich an einer Silbengrenze statt mitten
// im Wort bricht; es greift, weil `app/layout.tsx` `<html
// lang={locale}>` setzt.
//
// Das tatsächliche Bruchverhalten wird durch eine
// ausführbare Assertion geprüft, nicht durch abgeschriebene
// Beispielwerte: der Test „ein langer Themenname bricht nicht
// mitten im Wort" in `e2e/topics.spec.ts` erzwingt einen
// engen Container und überprüft die tatsächlichen Zeilenboxen
// des Titels. Abgeschriebene Werte können lautlos veralten und
// zwei vorherige waren falsch; ein Test kann das nicht.
```

### Before — topic-card.tsx header comment

```
 * **Der Wortumbruch-Fehler, der hier behoben wird — und warum die erste
 * Erklärung dafür falsch war (Task-10-Review C1):** die vorherige Karte
 * setzte auf dem `<h3>`-Titel `overflowWrap: "break-word"` UND
 * `wordBreak: "break-word"` gleichzeitig und brach mitten im Wort
 * ("Steuererklärun g 2025"). Die erste Fassung dieses Kommentars behauptete,
 * das Entfernen von `word-break: break-word` sei der Fix. Gemessen in
 * Chromium im echten Layout ist das falsch: `Row`s Titel-Span trägt
 * `min-width: 0`, und das neutralisiert den einzigen Unterschied zwischen
 * `break-word` und seinem veralteten Alias `anywhere` — `overflow-wrap:
 * break-word` allein reproduziert den gemeldeten Fehler zeichengenau, mit
 * oder ohne `word-break` daneben (Messtabelle in `components/ui/list.tsx`
 * bei `wrapTitle`). Der tatsächliche Fix ist `hyphens-auto`: es bricht an
 * einer echten Silbengrenze statt mitten im Wort, weil `app/layout.tsx`
 * `<html lang={locale}>` setzt. `Row`s `wrapTitle`-Prop setzt beides,
 * `break-words hyphens-auto` — dieselbe Logik gilt für jede Zeile mit
 * `wrapTitle`, nicht nur für Themen.
```

### After — topic-card.tsx header comment

```
 * **Der Wortumbruch-Fehler, der hier behoben wird — und warum die erste
 * Erklärung dafür falsch war (Task-10-Review C1):** die vorherige Karte
 * setzte auf dem `<h3>`-Titel `overflowWrap: "break-word"` UND
 * `wordBreak: "break-word"` gleichzeitig und brach mitten im Wort
 * ("Steuererklärun g 2025"). `Row`s Titel-Span trägt `min-width: 0`, und
 * das neutralisiert den einzigen Unterschied zwischen `break-word` und
 * seinem veralteten Alias `anywhere` — `overflow-wrap: break-word` allein
 * reproduziert den gemeldeten Fehler zeichengenau, mit oder ohne
 * `word-break` daneben. Der tatsächliche Fix ist `hyphens-auto`: es bricht
 * an einer echten Silbengrenze statt mitten im Wort, weil `app/layout.tsx`
 * `<html lang={locale}>` setzt. `Row`s `wrapTitle`-Prop setzt beides,
 * `break-words hyphens-auto` — dieselbe Logik gilt für jede Zeile mit
 * `wrapTitle`, nicht nur für Themen. Die kanonische Erklärung des Mechanismus
 * steht in `components/ui/list.tsx` bei `wrapTitle`, und das tatsächliche
 * Bruchverhalten wird durch die ausführbare Assertion „ein langer Themenname
 * bricht nicht mitten im Wort" in `e2e/topics.spec.ts` geprüft.
```

### `git diff --stat`

```
 components/topics/topic-card.tsx | 20 ++++++++++----------
 components/ui/list.tsx           | 34 +++++++++++++++-------------------
 2 files changed, 25 insertions(+), 29 deletions(-)
```

### Verification commands and output

- `npx tsc --noEmit` — clean, no output.
- `npm run lint` — 12 warnings, all pre-existing. Zero warnings in the two edited files.
- `npm run check:design` — `Design-Token-Ratsche in Ordnung — 1986 Verstoesse, keiner neu.`
- `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/topics.spec.ts`:
  ```
  Running 12 tests using 1 worker
    ✓ 1 [setup] › e2e/global.setup.ts:34:6 › authenticate (53ms)
    ✓ 2 [chromium] › e2e/topics.spec.ts:12:7 › Topics Page › loads without error (1.8s)
    ✓ 3 [chromium] › e2e/topics.spec.ts:19:7 › Topics Page › displays a topic created via API (7.5s)
    ✓ 4 [chromium] › e2e/topics.spec.ts:31:7 › Topics Page › shows topic card with task progress (22.4s)
    ✓ 5 [chromium] › e2e/topics.spec.ts:51:7 › Topics Page › clicking 'New Topic' button shows the create form (1.7s)
    ✓ 6 [chromium] › e2e/topics.spec.ts:70:7 › Topics Page › renders correctly on mobile viewport (1.3s)
    ✓ 7 [chromium] › e2e/topics.spec.ts:78:7 › Topics Page › ein langer Themenname bricht nicht mitten im Wort (1.3s)
    ✓ 8 [chromium] › e2e/topics.spec.ts:156:7 › Topic Detail Page › navigates to topic detail and shows tasks (2.4s)
    ✓ 9 [chromium] › e2e/topics.spec.ts:177:7 › Topic Detail Page › topic detail shows 'Add subtask' button (1.9s)
    ✓ 10 [chromium] › e2e/topics.spec.ts:196:7 › Topic Detail Page › topic detail with multiple tasks shows task list (2.5s)
    ✓ 11 [chromium] › e2e/topics.spec.ts:223:7 › Topic Detail Page › can navigate back from topic detail to topics list (3.8s)
    ✓ 12 [chromium] › e2e/topics.spec.ts:250:7 › Topic Topic Template Import › template picker button is visible on topics page (1.4s)
    12 passed (49.0s)
  ```

## Fix round 3 — the deprecated-alias clause

### The error

`components/topics/topic-card.tsx`, line 35, file-header comment:

**Before:**
```
das neutralisiert den einzigen Unterschied zwischen `break-word` und
seinem veralteten Alias `anywhere` — `overflow-wrap: break-word` allein
```

**After:**
```
das neutralisiert den einzigen Unterschied zwischen `break-word` und
`anywhere` — `overflow-wrap: break-word` allein
```

The clause "seinem veralteten Alias" (its deprecated alias) wrongly attributed deprecation to `overflow-wrap: anywhere`, when in fact `word-break: break-word` is the deprecated one. Removed false claim; sentence is correct without it. Now matches the canonical version in `components/ui/list.tsx` line 289.

### `git diff --stat`

```
 components/topics/topic-card.tsx | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)
```

### Verification commands and output

- `npx tsc --noEmit` — clean, no output.
- `npm run check:design` — `Design-Token-Ratsche in Ordnung — 1986 Verstoesse, keiner neu.`
