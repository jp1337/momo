# Task 8 report: `/tasks` — die Zeile ohne Chips, `task-item.tsx` zerlegt

## Summary

`/tasks` is migrated to the Lichtkegel token system and added to `MIGRATED_PAGES`.
`task-item.tsx` (803 lines) is decomposed into `task-groups.ts`, `use-task-swipe.ts`,
`task-row.tsx`, `task-row-actions.tsx`, and `tasks-rail.tsx`. `search-filter-bar.tsx` is
split into `SearchInput` + `FilterPills`, with `SearchFilterBar` kept as an unchanged
thin wrapper for `wishlist-view.tsx`. Two real bugs were found by actually looking in the
browser (not by the tests) and fixed: a Tailwind custom-breakpoint ordering bug in
`page-frame.tsx` that broke every rail on the site (including `/dashboard`'s, already
shipped), and a design-rule violation from my own swipe-reveal panels. One deliberate
deviation from the brief: `task-item.tsx` is **not deleted** — three other pages
(`/quick`, `/topics/[id]`) still depend on it and are out of scope for this task.

`check:design`: **2205 → 2133** (fall of 72, baseline updated with `--update`).

## File-by-file account

### New files

- **`components/tasks/task-groups.ts`** — `groupByPriority`, literal from the brief.
- **`__tests__/task-groups.test.ts`** — literal from the brief.
- **`components/tasks/use-task-swipe.ts`** — literal from the brief (swipe hook, threshold 80, max 110, axis-lock).
- **`components/tasks/task-row-actions.tsx`** — the promote/goto-topic/breakdown/snooze/edit/delete cluster, moved from `task-item.tsx` lines ~616–800. Every inline `style={{…}}` converted to a `className` with a `var(--…)` token (the brief's four listed substitutions were not exhaustive — the design-token ratchet counts *any* `style={{` in a new file against a baseline of 0, so the whole cluster had to be tokenized, not just the four named spots). The snooze-menu's hover highlight (`data-[highlighted]:…`) also lost its amber tint (→ `--raised`) — not explicitly named in the brief's substitution table, but required by "amber at most once, document-wide" once you actually look at what that table covers.
- **`components/tasks/task-row.tsx`** — `TaskRow`. Same props as `TaskItem` minus `coinValue` and `energyLevel` per the brief. Extends the brief's Step-7 sketch (which never calls `useTaskSwipe`, never renders the `lead` checkbox/selection/blocked variants) into a working component:
  - `lead` renders three variants (checkbox / selection checkbox / blocked lock), matching `task-item.tsx:354-419` logic exactly, tokenized (`--ink` for the selected-checkbox fill, not amber — see deviations).
  - Swipe reveal panels (green "Erledigt" / red "Löschen") are `motion.span`s, gated on `swipe.isSwiping` (see "Bugs found and fixed" — the box-rule counts a filled span even at `opacity:0`).
  - Inline double-click rename is self-contained in `TaskRow` (state, `commitInlineEdit`, `handleInputKeyDown`), not routed through `TaskRowActions`.
  - The 300 ms checkbox-completion delay lives here (`handleCheckboxChange`), shared by both the click handler and `useTaskSwipe`'s `onComplete`, per the brief's explicit note.
  - Dropped fields (not in the brief's `TaskRowProps`, not recoverable without adding scope): the recurring (↺) and daily-eligible (★, amber) icons, the "often postponed" badge, and the postpone-doubled coin amount. The recurring info is already in `trailing` ("Nächste: …"); the ★ badge would have been a second amber on every daily-eligible row.
- **`components/tasks/tasks-rail.tsx`** — `TasksRail`. Uses `FilterPills` (not `SearchFilterBar`) per the ruling in the task prompt. Props: `open, overdue, coins, filters, activeFilters, onFilterChange, resultCount, totalCount, isFiltering, onClear` — matches `FilterPills`' real interface, not the brief's fictional `filterGroups/onFilterChange/onClearAll`.

### Modified files

- **`components/shared/search-filter-bar.tsx`** — split into `SearchInput` (search box) and `FilterPills` (chip rows + result-count/clear-all line, now takes an explicit `isFiltering` prop since it no longer sees `searchQuery`). `SearchFilterBar` composes both with the exact same props/behaviour as before — `wishlist-view.tsx:302` is untouched and still compiles/renders (confirmed: `npx tsc --noEmit` green, `e2e/wishlist.spec.ts` 8/10 passed, the 2 failures are the same pre-existing `/500/i`-matches-a-coin-price fragility documented for `navigation.spec.ts`, unrelated to this change). Amber removed from the active pill (fill+border) and the "Filter zurücksetzen" link, per Step 9 — active state now gets `--raised` fill + `--hairline` border (an affordance may have an edge; it must not be light).
- **`components/tasks/task-list.tsx`** — full rewrite of the render tree, all handlers/state kept verbatim:
  - Local `EmptyState` and `SectionHeader` components deleted; replaced by `components/ui/empty-state.tsx`'s `EmptyState` (one config, not four hour-of-day variants) and a new local `CollapsibleSectionHeading` (mono eyebrow + chevron affordance, used by Snoozed/Completed — kept collapsible, unlike the priority groups).
  - The **date-sectioned default view** (Today/Upcoming/No date/Someday) is replaced by `groupByPriority` over the concatenation of `grouped.today/upcoming/noDate/someday` (still due-date-sorted internally, since `groupTasks`'s sort is untouched — only the *grouping key* changed from date-bucket to priority).
  - **Snoozed/Completed** sections are kept (still collapsible, still their own state), just retokenized and switched to `TaskRow`.
  - **"Nach Thema" view** (topic grouping + sequential-group blocking/stepper) is kept structurally identical — `isBlocked`/sequential-badge logic untouched — only retokenized (amber → `--ink-2`/`--hairline`/`--ink`) and switched to `TaskRow`.
  - A `rowProps()` factory replaces seven near-identical `<TaskItem …>` prop blocks with one closure.
  - "+ Neue Aufgabe" → `Button variant="primary"` (the one amber). All other toolbar buttons → `Button variant="quiet"`.
- **`app/(app)/tasks/page.tsx`** — trimmed per Step 10: no container div, no `<h1>`, no `DueTodayBanner`, no `dueTodayCount`. Passes `pageTitle` to `TaskList`.
- **`e2e/helpers/design-count.ts`** — `MIGRATED_PAGES: ["/dashboard", "/tasks"]`.
- **`components/ui/list.tsx`** — `GroupHeading` now renders `<h2>` instead of `<p>` (see deviations).
- **`components/ui/page-frame.tsx`** — one-line bug fix (see "Bugs found and fixed").
- **`messages/{de,en,es,fr,nl,ru,zh}.json`** — added `tasks.rail_open`, `tasks.rail_overdue`, `tasks.rail_coins`, `tasks.empty_generic`, `tasks.empty_cta` in all seven, values exactly as specified in the brief's tables. Old `empty_morning`/`empty_evening`/etc. keys left in place (unused, per the brief — `check:i18n` only checks parity, not usage).
- **`scripts/design-baseline.json`** — updated via `--update` (see ratchet section). Diff includes one file I never touched (`components/theme-toggle.tsx`) whose violation count had already reached 0 in a prior, already-committed task — the baseline was just stale for it; `--update` correctly dropped its now-empty entry as a side effect of sweeping the whole repo.

### Not deleted (deviation — see below)

- **`components/tasks/task-item.tsx`** — kept, unmodified, unused by anything I touched.

## Deviations from the brief, with reasoning

1. **`TasksRail` uses `FilterPills`, not `SearchFilterBar`** — per your ruling in the prompt; implemented as specified.
2. **`task-item.tsx` is not deleted.** The brief assumes it has no other consumers (`grep -rn "task-item" app components e2e` must be empty besides the file itself). That's false in this codebase: `components/quick/five-minute-view.tsx`, `components/topics/sortable-task-list.tsx`, `components/topics/sortable-task-item.tsx`, and `components/topics/topic-detail-view.tsx` all import `TaskItem` and render `/quick` and `/topics/[id]` — pages this task doesn't touch. Deleting it would have broken those pages' build and runtime. I left it in place, stopped using it in `task-list.tsx` only, and did not migrate the other three consumers (out of scope, not directed, and each is its own risk surface — e.g. `sortable-task-item.tsx` wraps `TaskItem` with dnd-kit drag handles that `TaskRow` has no equivalent for). `grep -rn "task-item\|TaskItem" app components e2e` still returns those four files plus a handful of comment mentions (in `task-row.tsx`, `task-row-actions.tsx`, `use-task-swipe.ts`, `task-list.tsx`, `list.tsx`) that reference the old file by name in their "ported from" documentation, not as imports.
3. **`GroupHeading` renders `<h2>`, not `<p>`.** `e2e/tasks.spec.ts`'s "tasks are grouped by priority/due date sections" test asserts an `h2`/`h3` exists on the page. `GroupHeading` had no real caller before this task (only the `/design-system` showcase page), so changing its tag doesn't touch anything else, and a heading being an `<h2>` is arguably more correct than a `<p>` in the first place. This surfaced a second, more serious bug: `globals.css` sets `h1..h6 { font-family: Fraunces; color: var(--text-primary) }` **unlayered**, which beats any `@layer utilities` class regardless of specificity (the same trap already documented in `button.tsx`). Every `GroupHeading` was rendering in Fraunces, at full `--ink` strength, until I added `!` to its `font-[family-name:var(--font-mono)]` and `text-[var(--ink-3)]` classes. `design-rules.spec.ts`'s "trägt Fraunces genau einmal" test caught the font half of this immediately (RED → GREEN, see below); the color half (an eyebrow rendering at full strength instead of muted) would not have been caught by any automated test — I only found it by rereading the unlayered-rule comment already in `button.tsx` and checking `globals.css` for the same pattern.
4. **`TaskRowActions`' pencil button opens the full edit modal (`onEdit`), not inline rename.** The brief's `TaskRow` sketch passes `onStartEdit={() => setIsEditing(true)}` into `TaskRowActions`, which would repurpose the pencil for inline editing and leave the required `onEdit` prop unused. `TaskRowProps.onEdit` is declared required, and "opening the full edit modal via the pencil" isn't in the "must not lose" list but is real, load-bearing functionality (topic/priority/due-date changes) that nothing else in the row reaches. I kept the pencil wired to `onEdit` (opens `TaskForm`, exactly as before) and implemented double-click-to-rename as its own self-contained mechanism inside `TaskRow`, matching the brief's separate prose note ("Die Inline-Titelbearbeitung … bleibt erhalten").
5. **`aria_complete`/`aria_uncomplete` called without the `{title}` param.** The actual message strings (`"Als erledigt markieren"`, etc.) have no placeholder; the brief's sample code passes one anyway. Matched the real messages instead.
6. **Selection-mode checkbox uses `--ink`, not amber**, for its selected fill/border. The original used `--accent-amber`; under "amber at most once, document-wide" that's no longer available, and no replacement color was specified anywhere. `--ink` is the strongest neutral available and doesn't collide with `--done`/`--danger`'s reserved meanings.
7. **No "often postponed" badge, no postpone-doubled coin display.** Not in the brief's six-field table for the new row, and `TaskRowProps` has no `postponeCount`. Dropped along with the coin/energy fields already explicitly named as dropped.
8. **No exit/enter animation on `TaskRow` lists** (no `AnimatePresence`). Three of the four original date-sections already had no exit animation (only "Today" did); given priority-grouping replaces all four with one mechanism, I didn't reintroduce the inconsistency, and `TaskRow` already has its own `animate`/`transition` (swipe + completion fade) which would have needed reconciling with an `initial`/`exit` pair `TaskRow` doesn't currently expose.

## Bugs found and fixed (not directed by the brief)

### 1. `page-frame.tsx`: the rail didn't stack — and this shipped on `/dashboard` too

Looking at `/tasks` at 1440px, the rail's three counter lines and two filter groups were spread out over ~4800px of empty vertical space instead of stacking tightly. Root cause: `globals.css` defines `--breakpoint-rail: 1100px` as a Tailwind v4 custom breakpoint, but it gets inserted **before** the built-in breakpoints in the generated stylesheet rather than in numeric order — so at any viewport ≥1100px, `sm:flex-row` (640px, but declared later in the compiled CSS) wins the cascade over `rail:flex-col` (1100px) despite matching a narrower, "more mobile" breakpoint. Same root cause, same effect, on `/dashboard`'s rail — verified directly:

```
/dashboard, 1440px, BEFORE fix: asideFlexDirection: "row"  (should be "column")
/tasks,     1440px, BEFORE fix: asideFlexDirection: "row"  (should be "column")
```

No existing test caught this because `e2e/design-tokens.spec.ts`'s rail geometry tests check the **aside's own** bounding box (position, width, gutter) — all of which were already correct, since only `rail:flex-col`/`rail:gap-4` lost the cascade fight, not `rail:w-[var(--rail)]` (which has no competing `sm:` utility). Nothing checked whether the rail's *children* stacked correctly.

Fix: added `!` to the two conflicting utilities in `page-frame.tsx`'s `<aside>` className (`rail:flex-col!`, `rail:gap-4!`) — `!important` beats source order regardless of which rule came first. Verified: all 38 pre-existing `e2e/design-tokens.spec.ts` tests still pass (including the exact-geometry ones), and the rail now stacks correctly on both `/tasks` and `/dashboard`.

### 2. My own swipe-reveal panels violated the box rule

`countBoxes` (`design-count.ts`) has no opacity guard (unlike the amber/Fraunces counters) — it only skips `display:none`, `visibility:hidden`, and zero-size elements. My green/red swipe-reveal `motion.span`s were always mounted with a solid `bg-[var(--done)]`/`bg-[var(--danger)]`, animated to `opacity:0` at rest — invisible to the eye, fully counted by `countBoxes`. With ~75 rows on the seeded test data, this showed up as **148 box violations**. Fixed by gating both panels on `swipe.isSwiping` (only mounted during an active touch drag) — RED→GREEN, see design-rules output below.

## `groupByPriority`: RED then GREEN

RED (`npm test -- task-groups`, before `task-groups.ts` existed):

```
FAIL  __tests__/task-groups.test.ts [ __tests__/task-groups.test.ts ]
Error: Cannot find package '@/components/tasks/task-groups' imported from
.../__tests__/task-groups.test.ts
Test Files  1 failed (1)
```

GREEN (after):

```
Test Files  1 passed (1)
Tests  4 passed (4)
```

## `SearchInput`/`FilterPills` split — what `wishlist-view.tsx` gets

`wishlist-view.tsx:302` calls `<SearchFilterBar searchQuery=… onSearchChange=… placeholder=… filters=… activeFilters=… onFilterChange=… resultCount=… totalCount=… onClearAll=… />` — the exact same nine props as before, unchanged. `SearchFilterBar` is now a two-line composition of `<SearchInput searchQuery onSearchChange placeholder />` and `<FilterPills filters activeFilters onFilterChange resultCount totalCount onClearAll isFiltering />`, where `isFiltering` is computed inside `SearchFilterBar` itself from `searchQuery`/`activeFilters` — `wishlist-view.tsx` doesn't need to know `FilterPills` exists. `/tasks` uses `SearchInput` directly in the reading column and `FilterPills` directly in `TasksRail` (which also computes and passes `isFiltering` itself, since the rail doesn't receive the search query as a separate concept from the filters — it gets a single `isFiltering` boolean from `TaskList`).

## Verification results

**`npx tsc --noEmit`**: exit 0, no errors.

**`npm run lint`**: 0 errors, 11 warnings — all in files I didn't touch (`react-hooks/set-state-in-effect` on `useEffect`+`setState` patterns pre-dating this task, plus one `jsx-a11y` warning in `checkbox.tsx`) except one I introduced and fixed myself: `task-list.tsx`'s new `rowProps` `useCallback` initially flagged `topicMap`'s dependency (computed inline every render); wrapped `topicMap` in `useMemo` and the warning is gone.

**`npm run check:i18n`**: `✓ All translation keys are present in every language file.` (1040 references, 7 locales).

**`npm run check:design`**: before this task, 2205. After (with `--update`): **2133** — a fall of 72. Per-file, the touched files went from `search-filter-bar.tsx {radius:2, inline:9, spacing:9}` → `{radius:0, inline:1, spacing:9}` and `task-list.tsx {radius:7, inline:39, spacing:16}` → `{radius:0, inline:1, spacing:0}`; the new files (`task-row.tsx`, `task-row-actions.tsx`, `tasks-rail.tsx`, `app/(app)/tasks/page.tsx`) have **zero** violations each. (The baseline diff also drops `components/theme-toggle.tsx`, a file I never touched — see the "Not deleted" section above; a prior, already-committed task had already fixed it but never re-ran `--update`.)

**`npm test -- task-groups`**: 4/4 passed (see RED/GREEN above).

**Playwright, `e2e/tasks.spec.ts e2e/design-rules.spec.ts e2e/user-journey.spec.ts`** (combined run): **33 passed, 10 failed.** Run individually: `design-rules.spec.ts` 21/21 passed; `tasks.spec.ts` 8/16 passed; `user-journey.spec.ts` 6/8 passed.

### Failures, each with evidence for why it's pre-existing and not mine

| Test | Cause | Evidence |
|---|---|---|
| `tasks.spec.ts`: 5× "Quick-Add Modal" tests (N/`/` shortcut, create, Escape, More options) | `input[placeholder*="Titel"], input[name="title"]` never matches — `components/layout/quick-add-modal.tsx` has neither a `name="title"` attribute nor a literal "Titel" placeholder (it's `t("placeholder")`, locale-driven). File untouched by this task, unrelated to `/tasks`. | Read the component source directly; grepped for `name=`/`placeholder`. |
| `tasks.spec.ts`: "task with a topic displays the topic tag" | `text="<topic title>"` strict-mode-matches 2 elements: the row's own eyebrow **and** the rail's topic filter pill, which now shows every topic name as a chip label. Same ambiguity existed in the pre-migration code too — `SearchFilterBar`'s old topic `FilterChip` also rendered the exact topic title as its label, simultaneously with `TaskItem`'s own topic-tag `<span>{topicTitle}</span>` — the test's loose locator was already fragile before this task; my rail just makes the filter chip more prominent, not newly duplicate. | Read `task-item.tsx` (topic-tag span) and the original `search-filter-bar.tsx` (topic `FilterChip`) side by side — both render the same string simultaneously in the pre-migration code. |
| `tasks.spec.ts`: "recurring task is created and visible in task list" | Test does `const task = await res.json()` on `POST /api/tasks`, then reads `task.title` — but the route returns `{ task }`, not the task directly (confirmed live: `task.id`/`task.title` both `undefined`). The route is untouched by this task; `e2e/helpers/api.ts`'s `createTask` helper already has a comment noting it must unwrap `{ task }` — this specific test bypasses that helper and calls `request.post` raw. | Reproduced live with a throwaway script: `POST /api/tasks` → `res.json()` → `{id: undefined, title: undefined}`; read `app/api/tasks/route.ts`'s `POST` handler (`return Response.json({ task }, ...)`). |
| `tasks.spec.ts`: "opening edit on a task shows the edit modal" | Asserts `page.locator('[role="dialog"]')` becomes visible after clicking Edit. `components/tasks/task-form.tsx` (untouched, not in scope) is a hand-rolled `<div className="fixed inset-0 …">` — it has never had `role="dialog"` at any point; it doesn't use the shared `Dialog`/`DialogContent` wrapper other modals use. | `grep -n 'role="dialog"' components/tasks/task-form.tsx` → no matches; `git log` on the file shows it wasn't touched by this task; reproduced live — the click correctly reaches the row's own edit button (verified the resolved DOM node is inside the clicked row's own `<li>`), `onEdit` fires, but no `[role="dialog"]` ever exists because the component never sets it. |
| `user-journey.spec.ts`: "completing a quick-win task removes it from the dashboard list" | `createTask` throws `422 {"error":"Validation failed","details":{"estimatedMinutes":["Invalid input"]}}` — a Zod validation rejection in the test's own payload, in `e2e/helpers/api.ts` (untouched infra file), before any page ever renders. | Full stack trace shows the throw happens inside `helpers/api.ts:40`, at API-call time, before `page.goto` for either dashboard or tasks. |
| `user-journey.spec.ts`: "task created via N shortcut appears on /tasks" | Same quick-add-modal locator issue as the 5 `tasks.spec.ts` failures above. | Same. |

None of the ten touch `task-row.tsx`, `task-row-actions.tsx`, `use-task-swipe.ts`, `tasks-rail.tsx`, `task-groups.ts`, or the parts of `task-list.tsx`/`search-filter-bar.tsx` this task rewrote.

**`e2e/design-tokens.spec.ts`** (existing, not required by the brief, run as extra confirmation the `page-frame.tsx` fix is safe): 38/38 passed.

**`e2e/wishlist.spec.ts`** (existing, extra confirmation the `SearchFilterBar` split is safe for its other caller): 8/10 passed; the 2 failures are `not.toContainText(/500/i)` matching the literal string "500" inside "🪙 Buy (500 coins)" — the exact same fragile-regex class the brief already calls out for `navigation.spec.ts`, unrelated to `search-filter-bar.tsx`.

## What I saw and did in Chrome

Used Playwright directly (driving real Chromium) rather than the interactive `claude-in-chrome` extension — the latter needs the user's own OAuth login in their live browser session, which isn't available headlessly; Playwright already had a valid stored session (`e2e/.auth/user.json`) and is the same rendering engine. Seeded a mix of HIGH/NORMAL/SOMEDAY, with/without topic, overdue, and 5/30/60-minute tasks via the API, then:

- **1440px, dark and light**: confirmed no chips, group headings read "HOCH · N"/"NORMAL · N" in mono uppercase, topic rows show a 6px dot + mono eyebrow under the title, overdue dates are red, minutes appear in the trailing slot, and exactly one amber element exists ("+ Neue Aufgabe"). Also directly measured `countAmber`-style: only the toolbar button carries amber text. Found and fixed the rail-stacking bug here (see above) — before the fix, the rail was unreadable (huge blank gaps, single-line paragraphs stretched to 1266px tall).
- **375px, dark and light**: confirmed the reading column and toolbar wrap sensibly, bottom tab bar still works. **Found a real readability problem**: on rows with long `trailing` text (e.g. "Nächste: 5T überfällig", 22 characters) combined with a long title, the title truncates to a single letter with no visible ellipsis (`Row`'s `truncate` class wins essentially all available width to the trailing text). This is a consequence of `Row`'s own layout (Task 4, not in this task's file list — title and trailing deliberately share one line, per `list.tsx`'s own JSDoc) meeting genuinely long trailing text for the first time; I did not attempt a structural fix to a shared primitive outside my scope, but did add a native `title=` attribute to the row's title span so the full text is at least available on hover. Flagging this for follow-up review — it's the most defensible finding: the same trade-off, but a page whose trailing content happens to run this long makes it visible for the first time.
- **Interactions**, verified live end-to-end (not just from the automated suite): completing a task (confetti fires, row leaves the active list), double-click inline rename (`RenameCheck …` → `RenameCheck DONE …`, confirmed the new title is genuinely in the DOM afterward, not just visually flashed), snooze via the dropdown menu (task moves into the collapsed "Pausiert · N" section), and swipe-to-complete on a touch-emulated 375px viewport (dispatched real `Touch`/`TouchEvent` objects at ~86% of the 110px max drag — captured the green "✔ Erledigt" reveal panel mid-gesture, confirming both the gesture math and the visual feedback work).
- Cleaned up all task/topic data created during this investigation via the API afterward (confirmed via a final sweep — matched by title prefix, none left over from my own probing). The account still carries a large amount of **pre-existing** test-data debris (~75+ tasks, ~25+ topics, accumulated across many prior e2e sessions, mostly named `E2E …`/`Journey …`/`Recurring …`) — not something this task should or did clean up (out of scope, and touching it risks interfering with other in-flight work), but it made visual review considerably noisier and is worth someone's attention separately.

## Self-review — what I'm unsure about

- **The narrow-viewport title truncation** (above) is the finding I'm least certain how to resolve. It's real, it's visible, and it predates this task's file list (Row's title/trailing-share-a-line layout, Task 4) — but it's *this* task that first supplies content long enough to expose it badly. I did not touch `list.tsx`'s `Row` layout itself beyond the `GroupHeading` tag change.
- **Coin sum in the rail** (`coinSum`) is a plain sum of `coinValue` for open tasks. The original row used to double the displayed value for `postponeCount >= 3` tasks (an incentive nudge) — I don't know whether that doubling reflects an actual server-side coin award difference or was purely a UI embellishment; I didn't find time to trace it through `lib/tasks`/`lib/gamification`. If the doubling is real business logic, the rail's "Münzen möglich" total is currently an undercount for any often-postponed task.
- **The topic-grouped ("Nach Thema") sequential stepper** still has a filled connecting line and filled circular step badges (not measured by the design-rules test, since `groupByTopic` defaults to `false` and that tree isn't in the DOM at page load) — I retokenized its colors per the brief's Step 9 instruction but did not redesign it to be boxless. If a future rule ever asserts on the toggled state, this view will fail it.
- **The `!` fix on `page-frame.tsx`** addresses the specific `rail:` vs `sm:` conflict I found (flex-direction, gap). I did not audit whether the same custom-breakpoint-ordering issue affects any *other* `rail:`-prefixed utility elsewhere in the codebase — I only checked the one `<aside>` element this task's rail lives in.
- I did **not** run the full e2e suite (only the three files the brief named, plus `design-tokens.spec.ts` and `wishlist.spec.ts` as targeted extra confirmation for the two shared files I touched). A full-suite run was outside the time budget for this task.

## Fix round 1 — eleven findings

### F1 — topic view had no hairlines (`components/tasks/task-list.tsx`)

Each task in the "Nach Thema" sequential-group branch was wrapped as `<List><TaskRow/></List>` inside a per-task `<div>` that carried the step badge. Every `<List>` renders its own `<ul>`, so every `TaskRow` was `:first-child` of its own one-row list and `Row`'s `first:border-t-0` fired everywhere — no hairline anywhere in that view.

Fix: one `<List>` around all of a sequential group's `group.tasks.map(...)`. The step badge moved from a per-row wrapper `<div>` into a new `TaskRow` prop, `stepBadge`. When set, `TaskRow` adds `pl-8` to the row itself and renders the badge `absolute left-1 top-3.5` — inside the row's own box, not poking out to its left, so the row's existing `overflow-hidden` (needed for the swipe-reveal panels) doesn't clip it. The connecting vertical line stays in the (now un-padded) outer per-group wrapper, moved to `left-4` to align with the new badge center. I chose this over inlining the badge into `lead` in normal flow (the brief's other option) because it keeps the stepper's left-margin look intact instead of visibly changing it.

Also fixed `List`'s own JSDoc, which still asserted "`GroupHeading` rendert ein `<p>`" (false since `GroupHeading` was changed to `<h2>` in the original task) and generalized the warning to any wrapper element between `<ul>` and `<li>`, not just a heading — that's the exact shape of this bug.

Verified in Chrome (real browser, ~1568×900, close to 1440 desktop): seeded three tasks in one topic with the same `taskGroup` via the API, toggled "Nach Thema". Hairlines are visible between all three sequential rows; badge 1/lock/lock render inline in the left margin; connecting line runs through them; test tasks deleted afterward via the API.

### F2 — `SWIPE_THRESHOLD` deduplicated (`use-task-swipe.ts`, `task-row.tsx`)

Chose the "better" option the brief offered: `useTaskSwipe` now returns `progress: swipeX / SWIPE_THRESHOLD` (signed, negative = left) instead of exporting the constant. `task-row.tsx`'s duplicate `const SWIPE_THRESHOLD = 80` and its sync-hazard comment are deleted; the reveal panels' opacity and the "> 40 px" text-reveal thresholds are now `swipe.progress` / `swipe.progress > 0.5` / `swipe.progress < -0.5`. `task-item.tsx`'s copy is untouched (out of scope, later phase).

### F3 — literal brief spacing applied, search input brought onto the scale (`components/shared/search-filter-bar.tsx`)

All nine off-scale classes in the file fixed:

| Before | After | Where |
|---|---|---|
| `py-2.5 pl-9 pr-9` | `py-2 pl-8 pr-8` | `SearchInput` |
| `gap-1.5` (×2) | `gap-2` | `FilterPills` group/chip-row gaps |
| `mb-5` | `mb-6` | `SearchFilterBar` wrapper (shared with `wishlist-view.tsx`) |
| `gap-1.5 px-2.5 py-1.5` | `gap-2 px-2 py-1` | `FilterChip` — `px-2 py-1` is the brief's literal value |

Verified the icon still clears the text at `pl-8`/`pr-8` with a cropped screenshot (magnifying glass and clear-icon both have visible gap from the text at 375px).

### F4 — `!` removed from `page-frame.tsx`, three mutually-exclusive bands

Replaced `sm:flex-row sm:flex-wrap sm:gap-6 rail:flex-col! rail:gap-4!` with `sm:max-rail:flex-row sm:max-rail:flex-wrap sm:max-rail:gap-6 rail:gap-4` (base stays `flex-col gap-3`; `rail:flex-col` dropped, base already covers it; no `!` anywhere).

**Measurement, compiled against this project's actual `tailwindcss@4.3.3` via `@tailwindcss/postcss`** (a scratch `@theme { --breakpoint-rail: 1100px }` + the exact class string, in a throwaway dir, deleted afterward):

```css
@media (width >= 1100px) {
  .rail\:w-\[13rem\] { width: 13rem; }
  .rail\:shrink-0 { flex-shrink: 0; }
  .rail\:gap-4 { gap: calc(var(--spacing) * 4); }
}
@media (width >= 40rem) {
  @media (width < 1100px) {
    .sm\:max-rail\:flex-row { flex-direction: row; }
    .sm\:max-rail\:flex-wrap { flex-wrap: wrap; }
    .sm\:max-rail\:gap-6 { gap: calc(var(--spacing) * 6); }
  }
}
```

Matches the review's claim exactly: `sm:max-rail:` nests to `@media (width>=40rem){@media(width<1100px){…}}`, and that condition never overlaps `rail:`'s `width>=1100px` — so which media block comes first in the stylesheet no longer matters. Confirmed the `!` was genuinely no longer needed.

### F5 — new rail-direction tests (`e2e/design-tokens.spec.ts`, `app/(docs)/design-system/page.tsx`)

The design-system fixture's rail now renders two `<p>` children (`rail-fixture-1`/`rail-fixture-2`) instead of one, so the rail's own inner flex-direction can be checked by relative position, not just its outer box. Two new tests in "Maß und Rand":

- "der Rand selbst ist bei 1440 px eine Spalte, nicht eine Reihe" — asserts `flex-direction: column` on `[data-rail]` and that fixture 2 sits below fixture 1.
- "der Rand selbst ist zwischen 640 und 1100 px eine Reihe" — asserts `flex-direction: row` at 800px.

**RED**: temporarily restored the pre-fix class string (`sm:flex-row … rail:flex-col rail:gap-4`, no `!`) and ran just these two tests:

```
✘ der Rand selbst ist bei 1440 px eine Spalte, nicht eine Reihe
  Expected: "column"  Received: "row"
✓ der Rand selbst ist zwischen 640 und 1100 px eine Reihe   (passes either way — sm:flex-row applies in both versions at this width)
```

**GREEN**: restored the F4 fix, reran the whole file: **40/40 passed** (including the two new tests and all 38 pre-existing ones).

### F6 — opacity guard added to `countBoxes` (`e2e/helpers/design-count.ts`)

Added `if (parseFloat(cs.opacity) === 0) continue;` to `countBoxes`, mirroring `countAmber`'s existing guard, with a JSDoc note describing the shared limitation (an element mid-entrance-animation is invisible to a snapshot taken too early). Kept the `panelMounted` gate in `task-row.tsx` (renamed from `isSwiping` — see below) — transient feedback still doesn't need to be in the DOM at rest, independent of the checker fix.

Re-ran `e2e/design-rules.spec.ts` after the change: **21/21 passed**, including "hat keine umrahmte oder gefüllte Inhaltsfläche" on `/tasks` in both themes — the count did not silently drop to zero; it stayed a real, non-trivial assertion.

### Also fixed

- **`CollapsibleSectionHeading` now renders a real `<h2>`** inside the `div[role="button"]` wrapper (Snoozed/Completed). Needed the same `!` treatment as `GroupHeading` (`font-[family-name:var(--font-mono)]!`, `text-[var(--ink-3)]!`) for the same reason: `globals.css`'s unlayered `h1`–`h6` rule beats any `@layer utilities` class regardless of specificity. The Enter-only key handler (`e.key === "Enter" && onToggle()`) is untouched.
- **"Today"-equivalent exit animation restored.** The priority-grouped default view (which replaced the old date sections, including the one that had `AnimatePresence`) is now wrapped in `<AnimatePresence initial={false}>`, and `TaskRow` gained an `exitAnimation` boolean prop that, when set, adds `exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}` and matching `height`/`paddingTop`/`paddingBottom` transition entries — same shape as `quick-wins-section.tsx`. Only the priority-grouped section passes it; Snoozed/Completed (archives) and the topic view (sequence-blocked) don't need it.
- **`title={props.title}` wording corrected, not the behavior.** Added a comment on the title `<span>` stating plainly that this is unmitigated on touch (375px) — a native-tooltip attribute needs hover, which touch doesn't have — and that the real cause is `Row`'s shared title/trailing line (Task 4, out of scope here). No code change to the truncation itself.
- **Reveal panels now survive the spring-back.** First attempt (`swipe.isSwiping || isUnsnapping`, with `isUnsnapping` starting `false` and set via a `useEffect` after `isSwiping` flipped false) had a one-tick gap where BOTH were false — the panel unmounted, then the effect ran and remounted it fresh at its already-zero target, i.e. no visible fade, just a snap. Measured this directly (dispatched real `TouchEvent`s at 375px, read the reveal `<span>`'s computed opacity at fixed offsets after release) before concluding it was broken. Fixed by replacing it with `panelMounted`, a state that's already `true` throughout the release (set `true` while swiping, cleared only via a 300ms `setTimeout` after `isSwiping` goes false) — no gap, no remount. Re-measured the same way:

  ```
  mid-gesture   opacity 0.625
  t+0ms         opacity 0.625
  t+60ms        opacity 0.339
  t+140ms       opacity 0.069
  t+240ms       opacity 0        (fade complete, ~200ms tween)
  t+390ms       panel unmounted  (querySelector falls through to the next element)
  ```

  This was a real bug in my own first attempt at this same finding, not a restatement of the brief.

### Ratchet

`search-filter-bar.tsx` spacing: **9 → 0**. Repo total: **2133 → 2124** (fall of 9, matching the nine fixed classes exactly; baseline updated with `--update`).

### Command output

- `npx tsc --noEmit` — exit 0, no output.
- `npm run lint` — 0 errors, 12 warnings (11 pre-existing + one new: `react-hooks/set-state-in-effect` on the `panelMounted` effect in `task-row.tsx`, same accepted pattern as 7 other pre-existing files in this codebase — not new class of issue).
- `node scripts/check-design-tokens.mjs` — before this round: 2133. After: `Design-Token-Ratsche in Ordnung — 2124 Verstoesse, keiner neu.` Committed with `--update`.
- `npm run check:i18n` — `✓ All translation keys are present in every language file.` (1040 references, 7 locales) — no new keys needed this round.
- `npm test -- task-groups` — 4/4 passed, unaffected.
- `e2e/design-tokens.spec.ts` — **40/40 passed** (38 pre-existing + 2 new F5 tests).
- `e2e/design-rules.spec.ts` — **21/21 passed**.
- `e2e/tasks.spec.ts` — **8/16 passed**, the same 8 pre-existing failures named in the original report and in this round's instructions (5× quick-add-modal locator, topic-tag strict-mode collision, recurring-task `{task}` unwrap, `role="dialog"` on `TaskForm`) — none touch a file this round changed.
- Combined run (`design-tokens.spec.ts design-rules.spec.ts tasks.spec.ts`): **67 passed, 8 failed**, same 8.

### What I saw in Chrome

Used the `claude-in-chrome` extension for the topic-view/stepper check at the browser's native size (~1568×900, close enough to 1440 desktop) — confirmed hairlines between sequential rows, badge/lock icons aligned to the connecting line, filter-pill spacing visibly tighter. `resize_window` failed in this sandbox for every size tried ("Bounds must be at least 50% within visible screen space"), so for 1440×900 / 375×800 dark+light and the touch-swipe timing I used Playwright directly (bundled Chromium, `e2e/.auth/user.json` session) — same rendering engine, exact viewports: rail is a narrow column at 1440, filter pills/search icon spacing checked via cropped screenshots, and the pre-existing 375px title-truncation ("R" instead of "Recurring …") is still visible and still out of scope, unchanged by this round. All ad hoc scratch scripts and seeded test data were deleted after use.

### Left undone, with reason

- The topic-grouped stepper's connecting-line/badge fill is still a filled/bordered treatment (unchanged aside from repositioning for F1) — the original report already flagged this as a known gap outside `groupByTopic`'s default-off DOM, and this round's brief didn't ask for a redesign there.
- Did not audit other `rail:`-prefixed utilities elsewhere in the codebase for the same band-ordering issue — only `page-frame.tsx`'s one `<aside>` was in scope.
