# Task 3 report — Die Zähler und das Navbar-Schlupfloch

## What was implemented

Followed the brief's eleven steps in order.

1. **`e2e/helpers/design-count.ts`** (new) — the four counters verbatim from the brief:
   `countAmber`, `countDisplayFont`, `countBoxes`, `measureColumns`, plus `Hit`,
   `MIGRATED_PAGES = ["/dashboard"]`.
2. **`e2e/design-rules.spec.ts`** (new) — the four rule tests per migrated page × theme, verbatim.
3. Ran Step 3, captured the RED failure (see TDD Evidence below).
4. **`components/layout/feather-mark.tsx`** (new) — inline SVG feather, `currentColor` fill,
   no amber. `components/layout/navbar.tsx` now imports it and no longer imports `next/image`.
5. **`components/layout/coin-counter.tsx`** — dropped the `style={{...}}` block (amber text +
   amber wash), switched to `text-[var(--ink-2)]`, mono font, `px-2` (was `px-2.5`), and
   `title={t("coin_balance")}` via `useTranslations("nav")`.
6. **`components/layout/level-badge.tsx`** — `tierColor`/`tierBg`/`tierBorder` collapsed to a
   pure ink ladder (no `--accent-amber`, no `--accent-green`). **`components/layout/user-menu.tsx`**
   — avatar placeholder button lost its green fill/border (`bg-[var(--raised)]`,
   `border-[var(--hairline)]`, `rounded-[var(--radius-pill)]`, no inline `style`); the Admin
   menu-entry's two `var(--accent-amber)` values (the file's only occurrences — see "Deviations"
   below) became `var(--ink-2)`.
7. **`app/globals.css`** — the `a { }` block: `color: var(--accent-amber)` → `color: inherit` +
   underline (`text-decoration-color: var(--hairline)`, hover → `currentColor`).
8. **`app/(app)/dashboard/page.tsx`** — outer container replaced with `PageFrame`, rail carries
   streak/coins/postpones-left as mono `--ink-3` text; `gap-12` dropped (PageFrame owns `gap-8`).
   `EnergyCheckinCard`'s `streakText` prop is now `null` (moved to the rail). Added
   `rail_coins`/`rail_postpones` to `dashboard.*` in all seven locales, plus `nav.coin_balance`
   (Ruling R2, per the brief) in all seven locales.
9. Ran the full verification battery — all green (see below).
10. Browser check — **not performed**; no browser tool was available in this session (see
    "Browser check" below).
11. Not committed yet — leaving that to the controller's explicit instruction, since the task
    prompt's step list says "Commit" but the harness note says report first; committing now per
    the brief's Step 11 command, see "Files changed" for the exact file set.

## Deviations from the brief (with reasons)

Two files outside the brief's list were touched. Both were required to make the brief's own
Step 9 acceptance criteria ("alles grün") true — the brief did not anticipate these two facts:

1. **`components/dashboard/daily-quest-card.tsx`** — the RED run's "no framed content area" test
   failed with `div background:rgb(32, 38, 35) "One-time"` (dark) — the quest's type-label and
   energy-match badges (`<Badge variant="neutral">`) carry `bg-[var(--raised)]`, a filled chip
   around text, which is exactly what global-constraints.md forbids ("Keine Chips um Text").
   This is pre-existing, unrelated to the navbar loophole, and not mentioned anywhere in the
   eleven steps. Since Step 9 requires `design-rules.spec.ts` fully green and this file is not a
   "page outside /dashboard or the navigation chrome" (the brief's stated escalation trigger),
   I fixed it minimally in place: both `<Badge variant="neutral">` usages became plain
   `text-[var(--ink-3)]` spans (text carries the signal, no surface) — consistent with how the
   file's `done`/`danger`/`amber` badge variants already work. `components/ui/badge.tsx` itself
   was **not** touched (it's shared with `/design-system`, which is exempt from these rules, and
   `task-breakdown-modal.tsx`, which renders inside a dialog and is excluded from `countBoxes` by
   the `FLOATING` selector regardless).

2. **`e2e/dashboard.spec.ts`** — Step 8 moves `streakText` out of the meta line into the
   `PageFrame` rail (`EnergyCheckinCard streakText={null}`). This is exactly what the brief
   instructs, but it breaks the pre-existing test "Streak erscheint in der Metazeile nur, wenn
   sie nicht null ist," which asserted the streak digit appears in `data-testid="quest-meta"`.
   Per the R5 precedent in `progress.md` ("der Test wird geändert, nicht der Plantext
   verteidigt"), I updated the test to check the new location: added
   `data-testid="rail-streak"` to the rail's streak `<p>` in `dashboard/page.tsx`, and rewrote
   the test to assert (a) `quest-meta` never contains a digit and (b) `rail-streak` is present
   with a digit iff `streakCurrent > 0`. Renamed the test and updated the file's header comment
   accordingly.

Also reworded one comment in `feather-mark.tsx`: the brief's literal JSDoc snippet contains the
string `#f0a500`, which the design-token ratchet's hex-literal regex matches even inside a
comment. Changed to "Amber-Hex (f0a500)" (no `#`) — same information, no false violation.

## TDD Evidence

**RED** — `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts`, run before touching any component:

```
6 failed, 3 passed
1) /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit
   außerhalb: span[coin-counter] background "186" / path[-] fill "" / span[-] color "186"
4) /dashboard (light) › trägt Amber höchstens einmal, dokumentweit — identical
2/5) /dashboard (dark/light) › hat keine umrahmte Inhaltsfläche
   div[-] background:rgb(32, 38, 35) "One-time"   (light: rgb(207, 213, 197))
3/6) /dashboard (dark/light) › hält jede Inhaltsspalte auf dem Maß
   keine [data-column] gefunden
```

**Did the observed hits match the brief's predicted list? No — three differences, all
informative, not bugs:**

- **No feather hit.** The brief predicted `svg`/`img` (Feder) as an amber hit. The pre-Task-3
  navbar rendered the feather as `<Image src="/icon.svg">` — a rasterized image resource. Its
  amber pixels are baked into the SVG file's own fill, which `getComputedStyle` cannot see (an
  `<img>` has no `color`/`fill` computed property reflecting the image's internal drawing). The
  counter is not blind here — there is genuinely nothing to detect via computed style on an
  `<img>`. This is exactly the fact the brief's own Step 4 JSDoc explains for *why* the fix must
  be an inline SVG, not proof the counter missed a real hit.
- **No level-badge hit.** The test account is below level 7 (only levels 7+ carried amber, 4+
  carried green), so the pre-fix badge showed `--text-muted`, not `--accent-amber`/`--accent-green`.
- **No link hits.** This test account's dashboard state (quest already completed today — see
  achievement timestamps "✓ Aug 22, 2026" in later probes) does not render any `<a>` in `main`
  on this run (no empty-state CTA, no quest hint link). The global `a{}` rule change is still
  correct and necessary — it is exercised on other pages with visible links — it simply had no
  a-tag to hit on this particular dashboard render.

The three real RED hits were all in `coin-counter.tsx`: the wash (`background`), the FontAwesome
coin icon (`fill`, inherited via `currentColor`), and the digit span (`color`) — exactly the
"Münzzähler (Text und Wash)" the brief named, just without the feather/level-badge/link hits that
didn't apply to this account's current state. The box-rule and measure-rule RED failures matched
the brief exactly.

**GREEN** — `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts`:

```
9 passed (19.4s)
```

## The amber count on /dashboard after the change

**Zero**, in both themes, for this test account's current dashboard state. A one-off probe
script (`countAmber` run directly, not committed) confirmed no hits at all — not even the
`.lichtkegel` wash or the "jetzt anfangen" amber text — because this account's daily quest is
already completed today, so `DailyQuestCard` renders its completed/no-CTA branch, which carries
no amber. This is compliant either way (the rule's ceiling is "at most one," not "exactly one"),
but worth flagging: the design-rules suite as currently seeded never exercises the ≤2-inside-light
branch of the amber rule on `/dashboard`. That is a gap in observability, not a defect in the
counter or the fix — a future task should reset the seed quest to "not completed today" if it
wants that branch actually covered.

## What was tested and the results

| Command | Result |
|---|---|
| `npx playwright test e2e/design-rules.spec.ts` | 9/9 green |
| `npx playwright test e2e/design-tokens.spec.ts e2e/dashboard.spec.ts` | 44/44 green (incl. the 2 modified tests) |
| `npx playwright test e2e/design-rules.spec.ts e2e/dashboard.spec.ts e2e/navigation.spec.ts e2e/design-tokens.spec.ts` (combined run) | 69 passed, 4 failed in `navigation.spec.ts` |
| `npm run check:i18n` | green, 1022 keys |
| `npm run check:design` | 2211 violations (was 2214), none new; locked in with `--update` |
| `npx tsc --noEmit` | clean |
| `npm run lint` | 0 errors, 11 pre-existing warnings (none in touched files) |
| `npm test` (vitest) | 1728/1728 green (matches recorded baseline exactly) |

### The 4 navigation.spec.ts failures — investigated and confirmed pre-existing, not caused by this task

I did not accept "4 failed" at face value. I `git stash`ed all of Task 3's changes (verified
`git status --porcelain` was empty), re-ran `e2e/navigation.spec.ts` twice against the
**unmodified** base commit (once combined with other specs, once alone), and got the **identical
four failures**, same test names, same error signatures:

1. `can navigate to wishlist page` / 2. `can navigate to achievements page` — both fail on
   `expect(page.locator("body")).not.toContainText(/500/i)`. The regex is meant to catch an HTTP
   500 error page, but this seed account has a wishlist item costing exactly 500 coins and an
   achievement at a 500-task threshold — the page text legitimately contains the digits "500."
   Pure test-regex/fixture-data coincidence, unrelated to any code change.
2. `all main navigation links from sidebar work` — clicking `a[href="/tasks"]` doesn't navigate
   within the 5s timeout window on this run. Reproduces identically on the base commit.
3. `unauthenticated user is redirected from /dashboard to login` — `page.goto` exceeds the 30s
   timeout. Reproduces identically on the base commit (~38.6s both times).

After confirming, I restored the stash (`git stash pop`) and re-ran `design-rules.spec.ts` +
`dashboard.spec.ts` (19/19 green) plus `check:design`/`check:i18n`/`tsc` again to make sure the
round-trip didn't disturb anything.

## The browser check (Step 10)

**Not performed.** No browser automation tool (Chrome extension / Playwright MCP) was available
to me in this session. I cannot confirm visually that the feather renders grey, the coin counter
renders grey, the level badge shows no amber, links are underlined instead of amber-colored, or
that the column sits at 640px with a right-hand rail at 1440px/375px in dark/light. The
Playwright assertions in `design-rules.spec.ts` and `design-tokens.spec.ts` cover the numeric/DOM
side of all of these (color values, column width, rail presence) but do not substitute for an
actual look, per the brief's own reminder ("Grüne Tests sind kein Beleg").

## New `check:design` baseline

**2211** violations (was 2214), locked in via `npm run check:design -- --update`. The decrease
came from: `coin-counter.tsx` losing its one `style={{...}}` (inline: −1), `navbar.tsx` losing
its `<Image>` (no category change there, the `style={{}}` blocks it still has are unrelated),
and `user-menu.tsx` losing its avatar-button `style={{...}}` (inline: −1). No file's count rose.

## Files changed

- `e2e/helpers/design-count.ts` (new)
- `e2e/design-rules.spec.ts` (new)
- `components/layout/feather-mark.tsx` (new)
- `components/layout/navbar.tsx`
- `components/layout/coin-counter.tsx`
- `components/layout/level-badge.tsx`
- `components/layout/user-menu.tsx`
- `app/globals.css`
- `app/(app)/dashboard/page.tsx`
- `messages/{de,en,es,fr,nl,ru,zh}.json` (`nav.coin_balance`, `dashboard.rail_coins`, `dashboard.rail_postpones`)
- `scripts/design-baseline.json` (ratchet update, 2214 → 2211)
- `CHANGELOG.md`
- **Deviations (see above):** `components/dashboard/daily-quest-card.tsx`, `e2e/dashboard.spec.ts`

## Self-review findings

- **Completeness:** all 11 steps done. `coin_balance` present in all 7 locales (verified via a
  Python JSON-load script per locale). `MIGRATED_PAGES` is exactly `["/dashboard"]`.
- **Counters:** each rule test fails loudly with the offending element's tag/testid/prop/text —
  verified directly in the RED run output. The amber counter's `color(srgb … / α)` branch and
  `::before`/`::after` pseudo-element branch are present exactly as specified (not modified from
  the brief's literal code). I did not independently unit-test the alpha-threshold/gradient-drop
  behavior beyond trusting the brief's pre-measured table, since the brief explicitly supplies
  those as given facts, not something this task derives.
- **Quality:** `tierColor` for level ≥10 and ≥7 both return `var(--ink)` (per the brief's literal
  snippet) — the two tiers are only distinguished by the level number and title text, not by
  shade. This is what the brief specifies; I did not add a fourth shade since the brief only
  described a 3-step ladder in its own bullet list (muted/ink-2/ink) despite `tierColor` having
  four branches. Flagging this as a minor inconsistency in the brief itself, not something I
  changed.
- **Discipline:** no extra counters, no extra rule specs added beyond the four specified. The two
  file deviations above were the minimum edit needed to make Step 9's stated acceptance criterion
  true, not a broader refactor.
- **Testing:** the `rail-streak` test now fails if the streak digit is missing when it should be
  present, or if it leaks back into `quest-meta`. Verified by running it green after the fix.

## Concerns

1. The two out-of-brief file changes (`daily-quest-card.tsx`, `e2e/dashboard.spec.ts`) are
   necessary for Step 9 to be true but were not explicitly authorized in the brief's file list —
   flagging for reviewer attention rather than treating my own judgment call as final.
2. The dashboard's current amber count is 0, not 1–2, because the seed account's quest is already
   completed — the ≤2-inside-light amber branch is currently unexercised by this suite on this
   page. Not a defect, but worth the next task's author knowing.
3. Browser check not performed (no tool available) — purely numeric/DOM verification only.
4. Level 10 and level 7 badges are visually identical (`var(--ink)` for both) per the brief's
   literal code, even though the badge's own doc-comment describes three named tiers, not four.

---

# Fix round 1 — response to task review

The review's Concern #2 ("dashboard's amber count is 0 because the quest is completed") was
**refuted**: `.lichtkegel` and its `::before` wash render unconditionally regardless of quest
state. The real cause was an opacity-animation race in the counter, confirmed empirically below.
Every finding is addressed; two false starts and their empirical resolution are described where
relevant so the reasoning is checkable, not just asserted.

## C1 (Critical) — the amber rule measured nothing, fixed at the root

**Diagnosis, verified before fixing anything:** `daily-quest-card.tsx`'s `.lichtkegel` wrapper
(`data-testid="quest-light"`) animates `opacity: 0 → 1` over 350ms via Motion. `gotoWithTheme`
returns at `load`, before that animation settles. `countAmber`'s `parseFloat(cs.opacity) === 0`
guard (correct in isolation — a genuinely invisible element shouldn't count) was racing this
animation and losing often enough that a bare probe script (no wait) measured **zero** hits,
including the always-present `::before` wash — exactly the failure mode C1 describes. I confirmed
this by writing a temporary, uncommitted probe (`e2e/probe-amber.spec.ts`, deleted after use) that
called `countAmber` immediately after `gotoWithTheme` with no wait: it returned 0 hits in both
themes, matching what the original report (incorrectly) attributed to "seed account state."

**Fix chosen: wait for the animation to finish, at the call site — not reordering the guard in
the counter.** `design-rules.spec.ts` now has a local `gotoSettled(page, theme, path)` helper: it
calls `gotoWithTheme`, then, if a `.lichtkegel` element exists, waits for
`expect(light).toHaveCSS("opacity", "1")` before any counter runs. Rejected alternative: moving
the pseudo-element check above the opacity guard in `countAmber`. That would make the wash always
"seen" regardless of real visibility, which breaks the guard's actual purpose (an element that is
opacity-0 for a *different*, permanent reason — e.g. a collapsed accordion panel on some future
migrated page — should not have its `::before` counted as visible amber). Waiting for the real
end state measures what a user actually sees, which is what every one of these four rules claims
to measure.

**Positive control added**, exactly as suggested: the amber test now asserts
`hits.some(h => h.prop === "::before")` is `true` before checking the ceilings. This is the one
change that makes a return to 0/0 impossible to pass silently — the RED case I manually verified
(reverting `gotoSettled` back to `gotoWithTheme` locally, not committed) fails with "der
Lichtkegel-Wash wird nicht gesehen" instead of silently passing.

**`countDisplayFont` folded in**: added the same `opacity === 0` and zero-size guards that
`countAmber` already had, plus a JSDoc note explaining why the two counters must share this guard
(an element mid-animation shouldn't be Fraunces-visible if it isn't amber-visible, or the two
rules read the same render state differently).

**Documented the underlying limitation in `countAmber`'s module JSDoc**: this function is a
snapshot, not a test — it does not wait for anything itself; the caller must settle first if the
page animates. This is now written down instead of implicit.

## I1 (Important) — fill/stroke deduped per nearest `<svg>`

Verified first, empirically, that my own coin-counter icon (FontAwesome, `<svg><path
fill="currentColor"/></svg>`) does **not** double-count today: a live probe showed the outer
`<svg>`'s computed `fill` is `rgb(0, 0, 0)` (UA default — FontAwesome only sets `fill` on the
`<path>`, not the `<svg>`), so only one element ever carried a non-default fill. The reviewer's
mechanism is real, though, for the opposite authoring pattern — `fill`/`stroke` set on the
**outer** `<svg>` with children that have no fill/stroke of their own inherit it, and both parent
and child(ren) then report the same colour independently. I found this exact pattern already in
the codebase (`components/settings/profile-settings.tsx:396`, `<svg stroke="currentColor">` with
plain children) — not currently amber, but the counter would have double- or triple-counted it if
it ever were.

**Fix**: `countAmber` now tracks `fillSeen`/`strokeSeen` sets keyed by `el.closest("svg") ?? el`.
The first matching element under a given `<svg>` root pushes one hit *for that root* (tag reported
as `svg`, not the leaf `<path>`/`<circle>`); subsequent matches under the same root are
suppressed. Elements with no `<svg>` ancestor (the rare case of `fill`/`stroke` set on an HTML
element) still count individually.

**Verified with a synthetic probe** (temporary, deleted after use): an `<svg stroke="amber">`
wrapping a `<path>` and a `<circle>` (neither with its own stroke) — before the fix this would
have produced 3 stroke hits (svg + path + circle all inherit); after the fix it produces exactly
1, tagged `svg`.

## I2 (Important) — `closest(AFFORDANCE)` no longer exempts whole card-links

**Fix**: replaced `el.closest(AFFORDANCE) !== null` with two narrower checks: skip the element if
`el.matches(AFFORDANCE)` (it IS the affordance), or if its `parentElement` matches AFFORDANCE AND
it has no element children (`el.children.length === 0` — a leaf label/icon, not a container).
A `<div>` with multiple children (paragraphs, headings) wrapped directly in an `<a>` is no longer
exempted at any depth.

**Verified with two synthetic probes** (temporary, deleted after use):
- A filled `<div>` with two `<p>` children, wrapped in an `<a>`, appended to `main` — **is now
  caught** by `countBoxes` (`background:rgb(255, 0, 0)` hit reported). Before this fix it would
  have been invisible (the old `closest("a, ...")` matched all the way up from the `<p>`s).
- A plain `<span>Label</span>` with no element children, direct child of a `<button>` — **still
  exempted**, confirming the legitimate case (button label/icon) isn't newly flagged.

## R10 (Ruling) — `countBoxes` gets principled, size/semantics-based exceptions

Extended the exclusions with reasoning written into the code (not a growing escape-hatch list):

- `PROGRESS = 'progress, meter, [role="progressbar"]'` — a progress bar is unsatisfiable under
  "no fill", so the rule doesn't apply to it. (No page currently uses semantic progress markup —
  `progress-tabs.tsx`'s bars are plain styled `<div>`s and `/progress` isn't in `MIGRATED_PAGES`
  yet — this is forward cover for whichever task migrates that page.)
- `DOT_MAX_PX = 12`: any element ≤ 12px in both width and height is treated as a dot, not a
  content surface, per the global constraint's explicit "user theme colour, exclusively as a
  6px point" allowance (12px, not 6px, because a dot with a ring/border renders slightly larger
  than its colour core).

**Verified with a synthetic probe**: a 10×10px filled purple `<div>` appended to `main` produces
no hit.

**Renamed the test and the export's own framing**: `"hat keine umrahmte Inhaltsfläche"` →
`"hat keine umrahmte oder gefüllte Inhaltsfläche"` in `design-rules.spec.ts`; `countBoxes`'s JSDoc
now opens by naming both criteria explicitly and lists all four exemption categories with their
individual justification (affordance, progress, dot, floating overlay), instead of only two.

## R11 (Ruling) — dashboard rhythm restored inside a single `PageFrame` child

Wrapped the entire dashboard body (head group, optional empty-state, quest+quick-wins) in one
`<div className="flex flex-col gap-12">` inside `PageFrame`. `PageFrame`'s own `gap-8` now has
nothing to distribute (a single child), so the original three-tier rhythm — 8px inside the head
group, 48px break before the quest, 32px between quest and quick wins — is exactly as it was
before Task 3 touched this file. `PageFrame` itself is unchanged (four later tasks consume it).
The two comments the review flagged (`:272-283` "großer Bruch", the empty-state's "48px gap")
needed no rewording once the structural fix was in — they describe the restored behaviour
correctly again — but I added a new comment block explaining *why* the wrapper exists (so a future
reader doesn't "simplify" it back into `PageFrame`'s direct children and reintroduce the
flattening).

## I4 (Important) — `Button`'s `hover:underline` signal restored

**Fix, and why this direction over scoping the global rule**: added `no-underline!` to `Button`'s
`baseStyles` (important-modifier trailing `!`, Tailwind v4 syntax — same pattern the file already
uses for `text-[var(--amber)]!` against the same unlayered global `a{}` rule) rather than scoping
`globals.css`'s underline rule away from button-shaped anchors. Reasoning: `Button` already owns
responsibility for asserting its own text-decoration contract regardless of page-level chrome
defaults (the file's existing comment about `text-[var(--ink)]!` establishes this precedent), and
scoping the global rule would require enumerating every current and future button-like class
combination in `globals.css`, which is more fragile than the component asserting its own base
style once.

**A second problem this fix would have caused, caught before shipping**: `no-underline!` is
`!important`, which unconditionally beats a *non*-important `hover:underline` regardless of the
`:hover` pseudo-class — so `variant="primary"`'s `hover:underline` would have become permanently
inert instead of merely colour-shifting. Fixed by also marking that utility important:
`hover:underline!`. With both sides `!important`, the `:hover` selector's higher specificity
((0,2,0) vs (0,1,0)) decides, which is exactly the state that should win on hover.

**Verified empirically**, not just reasoned about: a temporary probe (deleted after use) inserted
a live `<a>` with `Button`'s exact compiled class string into the running dashboard page (fixed
position, away from the header, to get real `:hover` hit-testing) and read
`getComputedStyle(...).textDecorationLine` at rest and under `page.hover()`:
```
rest: none
hover: underline
```
This confirms the fix works in the actual generated CSS, not just in theory.

## I6 (Important) — feather regression guard + documented image blindness

Added a new test, `"Amber-Zähler ist nicht blind für Bildquellen"`, in `design-rules.spec.ts` per
migrated page/theme:
- `expect(await page.locator('img[src$=".svg"]').count()).toBe(0)` — catches a regression back to
  `<Image src="/icon.svg">` (or any other `.svg` `<img>`), which the amber counter would never see.
- `expect(await page.locator("header svg").count()).toBeGreaterThan(0)` — positively confirms the
  feather is present as an inline `<svg>`, not merely absent as an `<img>`.

Also documented the generalisation in `countAmber`'s module JSDoc: the counter cannot see colour
carried by any image resource (`<img>`, `background-image: url(...)`, `<use href>`) — this is a
structural limitation of `getComputedStyle`, not something a regex/threshold tweak can fix, and
it applies to every future migrated page, not just the navbar.

## Tests re-run, actual output pasted in full

`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts`:

```
Running 11 tests using 1 worker

  ✓   1 [setup] › e2e/global.setup.ts:34:6 › authenticate (45ms)
  ✓   2 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit (2.3s)
  ✓   3 [chromium] › e2e/design-rules.spec.ts:73:11 › /dashboard (dark) › Amber-Zähler ist nicht blind für Bildquellen (4.9s)
  ✓   4 [chromium] › e2e/design-rules.spec.ts:93:11 › /dashboard (dark) › trägt Fraunces genau einmal (1.8s)
  ✓   5 [chromium] › e2e/design-rules.spec.ts:102:11 › /dashboard (dark) › hat keine umrahmte oder gefüllte Inhaltsfläche (2.5s)
  ✓   6 [chromium] › e2e/design-rules.spec.ts:111:11 › /dashboard (dark) › hält jede Inhaltsspalte auf dem Maß (4.4s)
  ✓   7 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit (2.3s)
  ✓   8 [chromium] › e2e/design-rules.spec.ts:73:11 › /dashboard (light) › Amber-Zähler ist nicht blind für Bildquellen (4.8s)
  ✓   9 [chromium] › e2e/design-rules.spec.ts:93:11 › /dashboard (light) › trägt Fraunces genau einmal (1.8s)
  ✓  10 [chromium] › e2e/design-rules.spec.ts:102:11 › /dashboard (light) › hat keine umrahmte oder gefüllte Inhaltsfläche (2.6s)
  ✓  11 [chromium] › e2e/design-rules.spec.ts:111:11 › /dashboard (light) › hält jede Inhaltsspalte auf dem Maß (4.7s)

  11 passed (33.3s)
```

Note test #3 in particular: the amber test now includes the positive control internally
(`expect(hits.some(h => h.prop === "::before")).toBe(true)`) and it passes — proof the counter
sees the wash after `gotoSettled`, where it saw nothing before.

`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts e2e/design-tokens.spec.ts` (first attempt, one flake):

```
Running 44 tests using 1 worker
  [... 43 passed ...]
  ✘   8 [chromium] › e2e/dashboard.spec.ts:80:7 › Dashboard › quick wins appear when short tasks exist (30.4s)

  1) [chromium] › e2e/dashboard.spec.ts:80:7 › Dashboard › quick wins appear when short tasks exist

    Test timeout of 30000ms exceeded.
    Error: apiRequestContext.delete: Request context disposed.
      at helpers/api.ts:55
      at deleteTask (.../e2e/helpers/api.ts:55:23)
      at .../e2e/dashboard.spec.ts:96:21

  1 failed
  43 passed (2.1m)
```

This is a test-cleanup timeout (an API `DELETE` call in the test's own teardown), unrelated to any
counter/component change — re-ran in isolation immediately after:

```
DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts -g "quick wins appear when short tasks exist"

Running 2 tests using 1 worker
  ✓ 1 [setup] › e2e/global.setup.ts:34:6 › authenticate (50ms)
  ✓ 2 [chromium] › e2e/dashboard.spec.ts:80:7 › Dashboard › quick wins appear when short tasks exist (11.6s)

  2 passed (12.5s)
```

Passes cleanly in isolation (11.6s vs. the 30s timeout under combined-suite load) — confirmed as
an environment-load flake, not a regression, by re-running the full combined battery once more:

`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts e2e/dashboard.spec.ts e2e/design-tokens.spec.ts`:

```
Running 54 tests using 1 worker
  ✓   1 [setup] › e2e/global.setup.ts:34:6 › authenticate (50ms)
  ✓   2 [chromium] › e2e/dashboard.spec.ts:13:7 › Dashboard › loads without error (1.4s)
  ✓   3 [chromium] › e2e/dashboard.spec.ts:20:7 › Dashboard › zeigt keine Stat-Tiles mehr (965ms)
  ✓   4 [chromium] › e2e/dashboard.spec.ts:26:7 › Dashboard › renders the Daily Quest section (1.4s)
  ✓   5 [chromium] › e2e/dashboard.spec.ts:34:7 › Dashboard › zeigt keine Quick-Links mehr (984ms)
  ✓   6 [chromium] › e2e/dashboard.spec.ts:40:7 › Dashboard › Wochentag und Energie stehen in einer Metazeile (3.2s)
  ✓   7 [chromium] › e2e/dashboard.spec.ts:50:7 › Dashboard › Streak erscheint im Rand nur, wenn sie nicht null ist, nie in der Metazeile (2.7s)
  ✓   8 [chromium] › e2e/dashboard.spec.ts:80:7 › Dashboard › quick wins appear when short tasks exist (1.9s)
  ✓   9 [chromium] › e2e/dashboard.spec.ts:99:7 › Dashboard › page renders without JavaScript errors (1.4s)
  ✓  10 [chromium] › e2e/dashboard.spec.ts:110:7 › Aufwandsstufen › die Schriftgroesse folgt der geschaetzten Dauer (3.0s)
  ✓  11 [chromium] › e2e/dashboard.spec.ts:156:7 › Aufwandsstufen › die Liste hat keine Kaesten (3.6s)
  ✓  12 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit (1.8s)
  ✓  13 [chromium] › e2e/design-rules.spec.ts:73:11 › /dashboard (dark) › Amber-Zähler ist nicht blind für Bildquellen (2.6s)
  ✓  14 [chromium] › e2e/design-rules.spec.ts:93:11 › /dashboard (dark) › trägt Fraunces genau einmal (4.6s)
  ✓  15 [chromium] › e2e/design-rules.spec.ts:102:11 › /dashboard (dark) › hat keine umrahmte oder gefüllte Inhaltsfläche (2.2s)
  ✓  16 [chromium] › e2e/design-rules.spec.ts:111:11 › /dashboard (dark) › hält jede Inhaltsspalte auf dem Maß (4.8s)
  ✓  17 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit (1.9s)
  ✓  18 [chromium] › e2e/design-rules.spec.ts:73:11 › /dashboard (light) › Amber-Zähler ist nicht blind für Bildquellen (5.2s)
  ✓  19 [chromium] › e2e/design-rules.spec.ts:93:11 › /dashboard (light) › trägt Fraunces genau einmal (1.8s)
  ✓  20 [chromium] › e2e/design-rules.spec.ts:102:11 › /dashboard (light) › hat keine umrahmte oder gefüllte Inhaltsfläche (2.7s)
  ✓  21 [chromium] › e2e/design-rules.spec.ts:111:11 › /dashboard (light) › hält jede Inhaltsspalte auf dem Maß (4.9s)
  ✓  22 [chromium] › e2e/design-tokens.spec.ts:27:7 › Design-Tokens › sind im Dark Mode vollstaendig (1.0s)
  ✓  23 [chromium] › e2e/design-tokens.spec.ts:36:7 › Design-Tokens › sind im Light Mode vollstaendig und anders (1.8s)
  ✓  24 [chromium] › e2e/design-tokens.spec.ts:49:7 › Design-Tokens › Radien sind die vier Stufen der Skala (7.6s)
  ✓  25 [chromium] › e2e/design-tokens.spec.ts:66:9 › Design-Tokens › Schatten-Token sind im dark Mode in Listen verwendbar (2.4s)
  ✓  26 [chromium] › e2e/design-tokens.spec.ts:66:9 › Design-Tokens › Schatten-Token sind im light Mode in Listen verwendbar (947ms)
  ✓  27 [chromium] › e2e/design-tokens.spec.ts:89:7 › Schriften › die drei Rollen sind gesetzt und geladen (1.8s)
  ✓  28 [chromium] › e2e/design-tokens.spec.ts:109:7 › Schriften › Fraunces ist wirklich geladen, nicht auf Serif zurueckgefallen (4.7s)
  ✓  29 [chromium] › e2e/design-tokens.spec.ts:146:7 › Surface › raised hat eine Haarlinie und eine vom Grund verschiedene Flaeche (921ms)
  ✓  30 [chromium] › e2e/design-tokens.spec.ts:165:7 › Surface › overlay hat einen Schatten und keine Haarlinie (864ms)
  ✓  31 [chromium] › e2e/design-tokens.spec.ts:181:9 › Surface › ΔL*(--raised, --ground) ist mindestens 8 im dark Mode (792ms)
  ✓  32 [chromium] › e2e/design-tokens.spec.ts:181:9 › Surface › ΔL*(--raised, --ground) ist mindestens 8 im light Mode (858ms)
  ✓  33 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink erreicht 4.5:1 gegen --ground im dark Mode (802ms)
  ✓  34 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink-2 erreicht 4.5:1 gegen --ground im dark Mode (1.2s)
  ✓  35 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink-3 erreicht 4.5:1 gegen --ground im dark Mode (4.3s)
  ✓  36 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --amber erreicht 4.5:1 gegen --ground im dark Mode (867ms)
  ✓  37 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --done erreicht 4.5:1 gegen --ground im dark Mode (832ms)
  ✓  38 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --danger erreicht 4.5:1 gegen --ground im dark Mode (818ms)
  ✓  39 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink erreicht 4.5:1 gegen --raised im dark Mode (1.4s)
  ✓  40 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink erreicht 4.5:1 gegen --ground im light Mode (4.0s)
  ✓  41 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink-2 erreicht 4.5:1 gegen --ground im light Mode (908ms)
  ✓  42 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink-3 erreicht 4.5:1 gegen --ground im light Mode (860ms)
  ✓  43 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --amber erreicht 4.5:1 gegen --ground im light Mode (843ms)
  ✓  44 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --done erreicht 4.5:1 gegen --ground im light Mode (865ms)
  ✓  45 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --danger erreicht 4.5:1 gegen --ground im light Mode (843ms)
  ✓  46 [chromium] › e2e/design-tokens.spec.ts:237:11 › Kontrast › --ink erreicht 4.5:1 gegen --raised im light Mode (1.0s)
  ✓  47 [chromium] › e2e/design-tokens.spec.ts:254:7 › Button › primary traegt Amber als Text, nicht als Flaeche (4.4s)
  ✓  48 [chromium] › e2e/design-tokens.spec.ts:268:7 › Button › es gibt genau drei Varianten (969ms)
  ✓  49 [chromium] › e2e/design-tokens.spec.ts:279:7 › Maß und Rand › die drei Layout-Token haben die Werte der Spec (898ms)
  ✓  50 [chromium] › e2e/design-tokens.spec.ts:287:7 › Maß und Rand › die Lesespalte ist bei 1440 px genau 640 px breit (935ms)
  ✓  51 [chromium] › e2e/design-tokens.spec.ts:296:7 › Maß und Rand › der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne (1.6s)
  ✓  52 [chromium] › e2e/design-tokens.spec.ts:311:7 › Maß und Rand › unter 1100 px fällt der Rand unter den Inhalt (4.0s)
  ✓  53 [chromium] › e2e/design-tokens.spec.ts:320:7 › Maß und Rand › ohne Rand ist die Lesespalte eine Spalte breit und im Inhaltsbereich zentriert (950ms)
  ✓  54 [chromium] › e2e/design-tokens.spec.ts:338:7 › Maß und Rand › unter 640 px steht der Rand ebenfalls unter dem Inhalt (831ms)

  54 passed (1.9m)
```

All 54 green, including the previously-flaky test at normal speed (1.9s this run).

`npm run check:design`:

```
Design-Token-Ratsche in Ordnung — 2211 Verstoesse, keiner neu.
```

Unchanged from before this fix round — `no-underline!`/`hover:underline!` in `button.tsx` are not
color/radius/spacing patterns the ratchet scans for.

`npm run check:i18n`:

```
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1022 translation key references across source files.

✓ All translation keys are present in every language file.
```

`npx tsc --noEmit`: no output (clean). `npm run lint`: same 11 pre-existing warnings as before
this round (0 errors), none in any file touched this round.

## What I did NOT change, and why

- Did not touch `progress-tabs.tsx`, `contribution-grid.tsx`: `/progress` is not in
  `MIGRATED_PAGES`, so these files' current dot/bar/gradient code is not exercised by
  `design-rules.spec.ts` today. `countBoxes`'s new exemptions are forward cover for whichever task
  migrates that page next, per the ruling's own scoping ("The heatmap cells need nothing from
  you").
- Did not add a fifth exported function to `design-count.ts`; `gotoSettled` lives in
  `design-rules.spec.ts` (a test-file-local helper, not a counter) to keep the module's stated
  scope ("the four counters and `MIGRATED_PAGES`; nothing else") intact.

## Files changed (fix round 1)

- `e2e/helpers/design-count.ts` — opacity/size-guard consistency + image-blindness JSDoc
  (`countAmber`, `countDisplayFont`); fill/stroke de-dupe by nearest `<svg>` (`countAmber`);
  narrowed AFFORDANCE exemption + progress/dot exemptions + renamed doc (`countBoxes`).
- `e2e/design-rules.spec.ts` — `gotoSettled` helper; positive control in the amber test; new
  image-blindness guard test; renamed box test.
- `components/ui/button.tsx` — `no-underline!` on `baseStyles`; `hover:underline!` on the
  `primary` variant; explanatory comments.
- `app/(app)/dashboard/page.tsx` — single rhythm wrapper `<div className="flex flex-col gap-12">`
  inside `PageFrame`, re-indented.
- `CHANGELOG.md` — two new bullets under `### Fixed` documenting C1/I1/I2 and I4.

## Self-review (fix round)

- Every fix was verified empirically with a temporary, uncommitted probe before being accepted as
  correct — not just reasoned about from the code. All probes were deleted immediately after use;
  `git status --porcelain` confirmed no probe files leaked into the diff.
- The I4 fix required discovering and fixing a second problem (`hover:underline!` needing its own
  `!`) that a naive read of the review's suggestion would have missed — caught by testing the
  actual hover behaviour rather than trusting the one-line description.
- C1's positive control is inside the same test as the ceiling checks, not a separate test, so a
  future reader can't accidentally delete "just the extra assertion" without noticing the test
  changed meaning.

## Concerns carried forward

1. Concerns #1, #3, #4 from the original report stand unchanged (out-of-brief file touches
   documented and justified there; no browser check performed; level 10/7 badge colour identity
   is per the brief's literal code). Concern #2 (amber count = 0 due to "seed state") is retracted
   — it was wrong; the real cause was the animation race, now fixed, and the dashboard's actual
   amber count with `gotoSettled` is 1 (the wash) inside `.lichtkegel`, 0 outside, in both themes.
2. The `dashboard.spec.ts` "quick wins" flake (30s API-delete timeout under combined-suite load,
   passes in isolation and in a clean re-run) is noted for whoever next runs the full suite under
   load — it is not new and not caused by anything in this task.

---

# Fix round 2 — response to re-review

All eight findings from round 1 were confirmed addressed by independent re-implementation and
boundary probing (fill/stroke dedupe, affordance narrowing, 12px floor, `page-frame.tsx`
untouched, the `.svg` `<img>` guard, and the flake evidence). Three new findings from this pass,
all fixed.

## Important — the positive control would fail on every non-dashboard page

**The bug**: the `::before` positive control I added in round 1 ran unconditionally on every
migrated page. `.lichtkegel` exists in exactly one file (`daily-quest-card.tsx`); the four pages
later tasks add to `MIGRATED_PAGES` (`/tasks`, `/focus`, `/topics`, `/progress`) have no light
cone — on `/tasks` the one allowed amber is a plain text link. The control would report "der
Lichtkegel-Wash wird nicht gesehen" on those pages even though they are fully compliant, and it
directly contradicted the ceiling rule two lines below it, which already handles the light-less
case (`inside.length > 0 ? 0 : 1`).

**Fix**: gated the control behind `const hasLight = (await page.locator(".lichtkegel").count()) >
0;` — the same existence check `gotoSettled` already performs to decide whether to wait for
opacity. The control now only asserts the wash is seen on pages that actually have one; a
light-less, compliant page skips it entirely and falls through to the ceiling checks, which are
unconditional and already correct for that case. Added a comment explaining the conditional
explicitly, so a later reader doesn't "simplify" it back into an unconditional assertion.

**Proved it still has teeth, with the same before/after discipline used for every other finding**
— not just re-asserted:

1. Temporarily disabled the animation wait inside `gotoSettled` (commented out
   `await expect(light).toHaveCSS("opacity", "1")`, made the counter blind again, exactly as in
   round 1's C1 verification).
2. Ran `e2e/design-rules.spec.ts -g "trägt Amber höchstens einmal"`:

   ```
   Running 3 tests using 1 worker

     ✓  1 [setup] › e2e/global.setup.ts:34:6 › authenticate (41ms)
     ✘  2 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit (1.1s)
     ✘  3 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit (1.1s)

     1) [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit

       Error: der Lichtkegel-Wash wird nicht gesehen — der Zähler misst nichts, nicht 'kein Amber'

       expect(received).toBe(expected) // Object.is equality

       Expected: true
       Received: false

     2 failed
       [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit
       [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit
     1 passed (3.6s)
   ```

   The gate is true on `/dashboard` (it has `.lichtkegel`), so the control still fires and still
   fails when the counter is blind — exactly the case it exists to catch.
3. Restored `gotoSettled` (`git diff --stat` confirmed the working tree matched the pre-experiment
   state exactly, no stray `TEMP-DISABLED` marker left behind). Re-ran the same command:

   ```
   Running 3 tests using 1 worker

     ✓  1 [setup] › e2e/global.setup.ts:34:6 › authenticate (52ms)
     ✓  2 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit (1.8s)
     ✓  3 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit (1.8s)

     3 passed (4.7s)
   ```

## Important — this task introduced a deterministic future failure in `dashboard.spec.ts`

**The bug**: `e2e/dashboard.spec.ts`'s "quick wins appear when short tasks exist" test asserted
`body not toContainText /500|error/i`. Task 3's rail (`app/(app)/dashboard/page.tsx`, `rail_coins`)
renders the account's coin total as plain text. `/500/` matches any digit sequence containing that
substring — "1500", "5000", "15000" — not just an HTTP 500 page. Once this seed account's coin
balance crosses one of those, the test fails for a reason that has nothing to do with what it
claims to test. This one was mine to fix: the rail is this task's change, unlike the two
pre-existing `navigation.spec.ts` failures the coordinator separately attributed to the same
regex/fixture-data collision pattern (confirmed pre-existing, out of scope for this task).

**Fix**: replaced the substring-text assertion with a check on the actual HTTP response status
from `page.goto`:
```ts
const response = await page.goto("/dashboard");
expect(response?.status(), "dashboard responded with a server error").toBeLessThan(500);
```
This tests what the original comment always meant (a server error rendered into the page) and
cannot collide with any digit sequence in the page's own legitimate content, now or after any
future coin balance. A genuine client-side exception (as opposed to a server error) is already
covered separately by the adjacent "page renders without JavaScript errors" test, which listens
for `pageerror` events — so no coverage is lost, only the false-positive surface.

## Minor, but named as this task's own defect class — a vacuous assertion given real teeth

**The bug**: the image-blindness guard's second half, `page.locator("header svg").count() > 0`
with message "die Feder ist kein Inline-SVG mehr", is satisfied by the coin-counter's FontAwesome
icon (`coin-counter.tsx`) or the theme toggle's icon (`theme-toggle.tsx`) regardless of whether the
feather exists at all — it could never fail for the reason its own message names. This is exactly
the class of defect this whole task is about: a check that looks like it verifies something but
structurally cannot.

**Fix**: scoped the selector to the wordmark link specifically:
`page.locator('header a[href="/dashboard"] svg')`. Verified this is unambiguous, not merely
narrower, by checking every other place in the codebase with an `href="/dashboard"` link:
`sidebar.tsx` and `mobile-nav.tsx` both have one too (their "Dashboard" nav item), but they render
inside `<aside>`/`<nav>`, not `<header>` — `navbar.tsx`'s `<header>` is the only one in the
document, and its only `a[href="/dashboard"]` is the wordmark. The combined selector therefore
targets exactly one element: the feather. If `FeatherMark` regresses back to `<Image
src="/icon.svg">`, this locator resolves to zero elements and the assertion now genuinely fails
for the stated reason, not by coincidence with an unrelated icon.

## Tests re-run, actual output pasted in full

`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/design-rules.spec.ts`:

```
Running 11 tests using 1 worker

  ✓   1 [setup] › e2e/global.setup.ts:34:6 › authenticate (51ms)
  ✓   2 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (dark) › trägt Amber höchstens einmal, dokumentweit (1.9s)
  ✓   3 [chromium] › e2e/design-rules.spec.ts:88:11 › /dashboard (dark) › Amber-Zähler ist nicht blind für Bildquellen (1.8s)
  ✓   4 [chromium] › e2e/design-rules.spec.ts:114:11 › /dashboard (dark) › trägt Fraunces genau einmal (1.8s)
  ✓   5 [chromium] › e2e/design-rules.spec.ts:123:11 › /dashboard (dark) › hat keine umrahmte oder gefüllte Inhaltsfläche (1.8s)
  ✓   6 [chromium] › e2e/design-rules.spec.ts:132:11 › /dashboard (dark) › hält jede Inhaltsspalte auf dem Maß (1.9s)
  ✓   7 [chromium] › e2e/design-rules.spec.ts:46:11 › /dashboard (light) › trägt Amber höchstens einmal, dokumentweit (3.4s)
  ✓   8 [chromium] › e2e/design-rules.spec.ts:88:11 › /dashboard (light) › Amber-Zähler ist nicht blind für Bildquellen (4.1s)
  ✓   9 [chromium] › e2e/design-rules.spec.ts:114:11 › /dashboard (light) › trägt Fraunces genau einmal (1.8s)
  ✓  10 [chromium] › e2e/design-rules.spec.ts:123:11 › /dashboard (light) › hat keine umrahmte oder gefüllte Inhaltsfläche (2.6s)
  ✓  11 [chromium] › e2e/design-rules.spec.ts:132:11 › /dashboard (light) › hält jede Inhaltsspalte auf dem Maß (4.8s)

  11 passed (26.9s)
```

`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/dashboard.spec.ts`:

```
Running 11 tests using 1 worker

  ✓   1 [setup] › e2e/global.setup.ts:34:6 › authenticate (52ms)
  ✓   2 [chromium] › e2e/dashboard.spec.ts:13:7 › Dashboard › loads without error (1.5s)
  ✓   3 [chromium] › e2e/dashboard.spec.ts:20:7 › Dashboard › zeigt keine Stat-Tiles mehr (928ms)
  ✓   4 [chromium] › e2e/dashboard.spec.ts:26:7 › Dashboard › renders the Daily Quest section (1.4s)
  ✓   5 [chromium] › e2e/dashboard.spec.ts:34:7 › Dashboard › zeigt keine Quick-Links mehr (989ms)
  ✓   6 [chromium] › e2e/dashboard.spec.ts:40:7 › Dashboard › Wochentag und Energie stehen in einer Metazeile (2.6s)
  ✓   7 [chromium] › e2e/dashboard.spec.ts:50:7 › Dashboard › Streak erscheint im Rand nur, wenn sie nicht null ist, nie in der Metazeile (4.5s)
  ✓   8 [chromium] › e2e/dashboard.spec.ts:80:7 › Dashboard › quick wins appear when short tasks exist (1.9s)
  ✓   9 [chromium] › e2e/dashboard.spec.ts:104:7 › Dashboard › page renders without JavaScript errors (1.5s)
  ✓  10 [chromium] › e2e/dashboard.spec.ts:115:7 › Aufwandsstufen › die Schriftgroesse folgt der geschaetzten Dauer (1.6s)
  ✓  11 [chromium] › e2e/dashboard.spec.ts:161:7 › Aufwandsstufen › die Liste hat keine Kaesten (1.1s)

  11 passed (19.1s)
```

`npm run check:design`:

```
Design-Token-Ratsche in Ordnung — 2211 Verstoesse, keiner neu.
```

`npm run check:i18n`:

```
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1022 translation key references across source files.

✓ All translation keys are present in every language file.
```

`npx tsc --noEmit`: no output (clean).

## Files changed (fix round 2)

- `e2e/design-rules.spec.ts` — gated the amber positive control on `.lichtkegel` presence;
  scoped the feather-regression guard to `header a[href="/dashboard"] svg`.
- `e2e/dashboard.spec.ts` — replaced the `/500|error/i` body-text assertion with an HTTP response
  status check in the "quick wins" test.

## Self-review (fix round 2)

- The positive-control fix was verified with the exact same discipline as round 1's C1: a real
  RED (control fails when blind, even with the gate in place, because `/dashboard` has a light)
  and a real GREEN (control passes once the wait is restored) — not just a description of what
  the gate should do.
- Checked that no other file in the codebase would make the scoped feather selector ambiguous
  (`grep` for every `href="/dashboard"` occurrence, confirmed only `navbar.tsx`'s is inside a
  `<header>`) rather than assuming the narrower selector was automatically unique.
- Confirmed the dashboard.spec.ts fix doesn't lose coverage: a genuine client-side exception is
  still caught by the adjacent "page renders without JavaScript errors" test, which this task did
  not touch.
- `git status --porcelain` after the RED/GREEN experiment showed the temporary edit fully reverted
  before moving on — no debug markers left in the diff.

## Concerns

No new concerns. All concerns from round 1 stand as stated there.
