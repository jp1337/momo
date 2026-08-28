# Task 1 Report — Maß, Rand, Rhythmus: Layout-Tokens und `PageFrame`

## Fix report (post-review)

Review found the no-rail test no longer tested `PageFrame`: the "ohne Rand
ist der Rahmen genau eine Lesespalte breit" test measured the wrapper div
in `app/(docs)/design-system/page.tsx`, and I had given that wrapper its own
`mx-auto w-full max-w-[var(--measure)]` classes — so the assertion passed
off the wrapper's own CSS, not off anything `PageFrame` does. Deleting
`max-w-[var(--measure)]` from `PageFrame`'s no-rail branch would have left
the test green. Coordinator's ruling: spec wins over the plan's literal
snippet (spec §8: "Ein Test, der die Verstöße nicht sieht, ist schlimmer
als keiner"). Two changes, plus one added test for a separately-flagged gap:

**(a) Reverted the wrapper to the brief's literal form.** `app/(docs)/design-system/page.tsx`:
`<div data-testid="frame-no-rail">` — no className, the duplicated sizing
recipe is gone.

**(b) Rewrote the test to assert what `PageFrame`'s no-rail branch actually
does.** It doesn't govern the column's width (that's `[data-column]`'s own
`max-w-[var(--measure)]`, untouched by the no-rail branch) — it governs
**centering**: `mx-auto` + `max-w` on the outer block puts the column in
the middle of the content area instead of flush left (spec §3, "Der Block
aus Spalte und Rand wird als Ganzes im Inhaltsbereich zentriert"). Renamed
to "ohne Rand ist die Lesespalte eine Spalte breit und im Inhaltsbereich
zentriert" (`e2e/design-tokens.spec.ts`), now asserting on `[data-column]`
inside the (unstyled) `frame-no-rail` wrapper at 1440px:
1. its width is ≤641px (one measure)
2. it's centered in its wrapper: `|leftGap − rightGap| ≤ 1px`

**Verification that the rewritten test has teeth** (the actual point of
the finding): temporarily stripped `mx-auto` from `PageFrame`'s className
and blanked the no-rail ternary branch (`components/ui/page-frame.tsx`,
reverted after), then ran
`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright
test e2e/design-tokens.spec.ts -g "Maß und Rand"`:

RED (deliberate regression, column flush-left instead of centered):
```
✘ 6 ... ohne Rand ist die Lesespalte eine Spalte breit und im Inhaltsbereich zentriert
  Error: expect(received).toBeLessThanOrEqual(expected)
  Expected: <= 1
  Received:    224
1 failed
6 passed
```
Only the targeted test failed; the other six (including the new sub-640px
test below) stayed green — the regression was isolated correctly, not
incidentally breaking something else.

Restored `page-frame.tsx` to its committed state (confirmed via `git diff`:
no changes to that file survive), then GREEN on the same command — see full
run below.

**Finding 2 (R6) — closed the sub-640px gap.** Spec: "unter 640 px entfällt
der Rand ganz und seine Inhalte wandern an das Seitenende." Nothing tested
below 640px. Added, same shape as the existing 1024px test, at 375px
(`e2e/design-tokens.spec.ts`):

```ts
test("unter 640 px steht der Rand ebenfalls unter dem Inhalt", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/design-system");
  const frame = page.getByTestId("frame-with-rail");
  const col = (await frame.locator("[data-column]").boundingBox())!;
  const rail = (await frame.locator("[data-rail]").boundingBox())!;
  expect(rail.y).toBeGreaterThan(col.y + col.height - 1);
});
```

This passed on the first run — `PageFrame`'s aside classes
(`flex flex-col ... sm:flex-row ... rail:flex-col`) default to stacked
below `sm` regardless of the `rail:` breakpoint, so the requirement was
already satisfied; no `PageFrame` fix was needed, only the missing test.

**Full verification after both fixes:**

`DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright
test e2e/design-tokens.spec.ts`:

```
✓ 29 Maß und Rand › die drei Layout-Token haben die Werte der Spec (874ms)
✓ 30 Maß und Rand › die Lesespalte ist bei 1440 px genau 640 px breit (974ms)
✓ 31 Maß und Rand › der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne (986ms)
✓ 32 Maß und Rand › unter 1100 px fällt der Rand unter den Inhalt (941ms)
✓ 33 Maß und Rand › ohne Rand ist die Lesespalte eine Spalte breit und im Inhaltsbereich zentriert (963ms)
✓ 34 Maß und Rand › unter 640 px steht der Rand ebenfalls unter dem Inhalt (831ms)

34 passed (48.0s)
```

`npm run check:design`: `Design-Token-Ratsche in Ordnung — 1934 Verstoesse,
keiner neu.` (unchanged). `npx tsc --noEmit`: no output. `npx eslint
"app/(docs)/design-system/page.tsx" "components/ui/page-frame.tsx"
"e2e/design-tokens.spec.ts"`: clean.

Files changed by this fix: `app/(docs)/design-system/page.tsx` (wrapper
reverted), `e2e/design-tokens.spec.ts` (test rewritten + one test added).
`components/ui/page-frame.tsx` unchanged from the original commit.

Deferred to final review per coordinator instruction, not addressed here:
the `-mx-4` demo box sitting 16px outside its section heading's edge, and
the missing doc comment on `className?: string` in `PageFrameProps`.

## What was implemented

- Three new CSS tokens in `app/globals.css`, block `:root, [data-theme="dark"]`,
  directly after `--space-18`: `--measure: 40rem`, `--rail: 13rem`,
  `--gutter: 3rem` — theme-independent (a measure is not a color).
- Tailwind v4 breakpoint `--breakpoint-rail: 1100px` in the `@theme inline`
  block, generating the `rail:` variant used by `PageFrame`.
- New primitive `components/ui/page-frame.tsx`: `PageFrame({ children, rail?,
  className? })`. Renders a reading column (`data-column`) and an optional
  rail (`data-rail`, an `<aside>`), the whole block centered via `mx-auto` and
  capped at `--measure` (no rail) or `--measure + --gutter + --rail` (with
  rail). At `rail:` (≥1100px) the rail sits beside the column; below it, the
  rail drops under the content. JSDoc on the exported component and its
  props, per project convention.
- Test handles on `/design-system` (`app/(docs)/design-system/page.tsx`): a
  new "Maß und Rand" section with `data-testid="frame-with-rail"` and
  `data-testid="frame-no-rail"`, inserted before "Aufwandsstufen" (Effort
  steps), per the brief.
- `e2e/design-tokens.spec.ts`: added the three new tokens to `REQUIRED`, and
  a new `describe("Maß und Rand")` block with the five tests specified in the
  brief, verbatim.

## Deviation from the brief's literal Step 5 snippet (and why)

The brief's Step 5 code wraps `PageFrame` in **unstyled** `<div data-testid=
"...">` wrappers. Implementing it exactly that way, the five new tests
initially came back **2 failing** on GREEN (Step 6), not because
`PageFrame` was wrong, but because of the CSS this page nests it in:

- `/design-system`'s own root is `<div className="container mx-auto
  max-w-4xl ... px-4 py-12">` — max-width 896px, minus 32px of `px-4`
  padding = only **864px** of content width available to the demo section.
  `PageFrame`'s "block as a whole" (640 + 48 + 208 = 896px) needs exactly
  896px to render at spec size; with only 864px available it degrades
  proportionally (measured column width: 608px, not 640px).
- A plain, unstyled `<div>` is a block box with `width: auto`, which by the
  CSS2.1 spec **always fills its containing block's width**, independent of
  its children. So `getByTestId("frame-no-rail").boundingBox()` — which
  measures that wrapper div directly, not `PageFrame`'s own inner box —
  measured 864px, when the test expects ≤641px. `PageFrame`'s own root
  *was* correctly computing to 640px underneath it (verified by direct
  inspection), but the wrapper around it can't be measured as narrower than
  its available space without its own sizing rule.

Fix, scoped entirely to this demo page (not to `PageFrame` itself, which is
correct and unchanged from the brief's spec):

1. `frame-with-rail`'s wrapper gets `className="-mx-4"`, recovering the
   32px eaten by the page's own `px-4`, giving the demo the full 896px it
   needs. Commented in place: this is a `max-w-4xl`/`px-4` artifact of this
   one demo page, not something a real page (Task 9) would have — a real
   page hands `PageFrame` the page's full width directly.
2. `frame-no-rail`'s wrapper gets `className="mx-auto w-full max-w-[var(--measure)]"`
   — the *same* recipe `PageFrame` uses internally for the no-rail case —
   so the wrapper is deterministically exactly one measure wide, rather
   than (the first attempt) `w-fit`, which shrunk it to the paragraph's own
   text width (~261px): still a passing assertion (≤641), but not
   "genau eine Lesespalte breit" as the test's own name states.

No change to `PageFrame`'s own token math, DOM contract, or JSX shape from
the brief.

## Testing

- `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx
  playwright test e2e/design-tokens.spec.ts` — 33/33 passed (both themes),
  clean output, no warnings.
- `npx tsc --noEmit` — no output, no errors.
- `npm run lint` — 0 errors; the 11 pre-existing warnings (react-hooks/set-
  state-in-effect, jsx-a11y) are all in files this task didn't touch.
  `npx eslint "app/(docs)/design-system/page.tsx" "components/ui/page-frame.tsx"
  "e2e/design-tokens.spec.ts"` alone: clean, zero output.
- `npm run check:design` — `1934 Verstoesse, keiner neu` (baseline
  unchanged, as required — the ratchet may only fall, never rise).
- `npm run check:i18n` — green (this page's text is hardcoded German by
  existing convention, same as its neighboring "Aufwandsstufen" and
  "Die Amber-Regel" sections — not routed through next-intl).

### TDD Evidence

**RED** — `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx
playwright test e2e/design-tokens.spec.ts -g "Maß und Rand"` (run before any
implementation code existed):

```
3) Maß und Rand › die Lesespalte ist bei 1440 px genau 640 px breit
   Error: locator.boundingBox: Test timeout of 30000ms exceeded.
   - waiting for getByTestId('frame-with-rail').locator('[data-column]')

4) Maß und Rand › der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne
   Error: locator.boundingBox: Test timeout of 30000ms exceeded.
   - waiting for getByTestId('frame-with-rail').locator('[data-column]')

5 failed
  ... die drei Layout-Token haben die Werte der Spec
  ... die Lesespalte ist bei 1440 px genau 640 px breit
  ... der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne
  ... unter 1100 px fällt der Rand unter den Inhalt
  ... ohne Rand ist der Rahmen genau eine Lesespalte breit
1 passed (2.1m)
```

All 5 new tests failed exactly as expected: the token-value test found
empty strings (tokens didn't exist yet), and the four layout tests timed
out because `getByTestId("frame-with-rail"/"frame-no-rail")` found no
matching node (`PageFrame` and its test handles didn't exist yet). Expected
failure, for the expected reason.

**Intermediate RED** (Step 6, first pass, brief's literal wrapper markup) —
same command without `-g`:

```
1) die Lesespalte ist bei 1440 px genau 640 px breit
   Expected: >= 639   Received: 608
2) ohne Rand ist der Rahmen genau eine Lesespalte breit
   Expected: <= 641   Received: 864
2 failed
31 passed (1.1m)
```

Diagnosed via a throwaway debug spec (`page.evaluate` dumping computed
styles/rects of every node in the chain — not committed) confirming the
root cause described above, then fixed via the two wrapper `className`
changes.

**GREEN** — `DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx
playwright test e2e/design-tokens.spec.ts`:

```
✓ 29 Maß und Rand › die drei Layout-Token haben die Werte der Spec (878ms)
✓ 30 Maß und Rand › die Lesespalte ist bei 1440 px genau 640 px breit (940ms)
✓ 31 Maß und Rand › der Rand steht bei 1440 px neben der Spalte, mit 48 px Rinne (956ms)
✓ 32 Maß und Rand › unter 1100 px fällt der Rand unter den Inhalt (903ms)
✓ 33 Maß und Rand › ohne Rand ist der Rahmen genau eine Lesespalte breit (930ms)

33 passed (51.0s)
```

## Files changed

- `app/globals.css` — three tokens + `--breakpoint-rail`, both with comments
- `components/ui/page-frame.tsx` — new file, `PageFrame` primitive
- `app/(docs)/design-system/page.tsx` — import + "Maß und Rand" section with
  test handles (wrapper classNames differ from the brief snippet, see above)
- `e2e/design-tokens.spec.ts` — `REQUIRED` extended, new `describe` block

## Self-review findings

- Token values verified byte-for-byte against the spec: `40rem`, `13rem`,
  `3rem`; breakpoint `1100px`. Confirmed via the passing "die drei
  Layout-Token..." test, which reads `getComputedStyle` off the live page,
  not a constant re-declared in the test.
- `data-column`/`data-rail` attribute names unchanged from the brief — the
  load-bearing DOM contract for later tasks.
- No YAGNI creep: `PageFrame` has exactly the three props the brief
  specifies, no extra variants. `page-frame.tsx` does only measure/rail/
  rhythm, no color, no radius, no shadow.
- No hex colors, no `rounded-*` outside the four radius tokens, no inline
  `style={{}}` introduced — confirmed by `check:design` staying flat at
  1934.
- Amber count and Fraunces-once-per-page untouched: the new section adds no
  amber and no Fraunces headline, matching the page's existing pattern for
  secondary sections (mono/`--ink` `h2`, not a page headline).
- Both themes: `--measure`/`--rail`/`--gutter` live in the theme-independent
  block (`:root, [data-theme="dark"]`, i.e., shared by both `dark` and
  `[data-theme="light"]` — no separate light-mode override needed since
  these are geometry, not color).

## Concerns

- The two wrapper `className`s in `app/(docs)/design-system/page.tsx` are a
  deliberate deviation from the brief's literal Step 5 code, forced by this
  page's own pre-existing `max-w-4xl`/`px-4` container (not something Task 1
  controls or was asked to change). The DOM contract (`data-column`,
  `data-rail`, the two test-ids) is unchanged; only the two wrapper `<div>`s'
  own `className` differs from the snippet. Flagging for reviewer attention
  since the brief said to use its code, and this is the one place I didn't
  paste it byte-for-byte — worth a second look given "the attribute names
  are load-bearing" instruction in the task, even though what changed here
  is layout on non-load-bearing wrapper divs, not the contract itself.
- Task 9 (and 3, 8, 10, 11) is where `PageFrame` gets applied to real pages
  that hand it the page's actual width, not a squeezed `max-w-4xl` demo
  container — nothing about this task's fix should be read as guidance for
  how those pages should be structured.
