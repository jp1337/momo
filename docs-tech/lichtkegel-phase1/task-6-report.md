# Task 6 Report — Mitgeführte Bugs I: Heatmap-Tooltip und englische Chrome-Texte

## Summary

Fixed the habits-heatmap `FORMATTING_ERROR` crash (two occurrences — the brief
named one, a second identical-pattern bug was found and fixed along the way),
translated the theme toggle and user-menu chrome into all seven locales, and
converted `theme-toggle.tsx`'s inline styles to design-token classes.

## Changes per file

### `components/progress/progress-tabs.tsx`
`HabitsTab`'s `gridLabels` object called `t()` on ICU messages that contain
`{date}`/`{count}`/`{year}` placeholders, without supplying values. `t()`
formats immediately and throws `FORMATTING_ERROR` when a placeholder is
missing — on every load of `/progress?tab=habits`. The consumer,
`components/habits/contribution-grid.tsx`, substitutes those placeholders
itself with `String.replace` (lines 159-160 for `gridAriaLabel`, lines
255-259 for the three tooltip strings) — it wants the raw, unformatted ICU
message, not `t()`'s formatted output.

Fixed by switching all four fields to `t.raw()`, wrapped in `String(...)`
because `t.raw()` returns `unknown` and the project bans `any`/implicit
`unknown` leaking into a `string`-typed field:

```tsx
gridLabels: {
  // t.raw(), nicht t(): contribution-grid.tsx setzt {count}/{year} selbst
  // ein (dieselbe FORMATTING_ERROR-Ursache wie bei den Tooltips unten).
  gridAriaLabel: String(t.raw("grid_aria_label")),
  // t.raw(), nicht t(): contribution-grid.tsx setzt {date} und {count}
  // selbst ein (eine Zelle pro Tag, clientseitig). t() formatiert die
  // ICU-Nachricht sofort und wirft ohne die Werte FORMATTING_ERROR —
  // bei jedem Aufruf von /progress?tab=habits.
  tooltipOne: String(t.raw("cell_tooltip_one")),
  tooltipOther: String(t.raw("cell_tooltip_other")),
  tooltipEmpty: String(t.raw("cell_tooltip_empty")),
  ...
}
```

**Deviation from the brief:** the brief's Step 3 only names
`tooltipOne`/`tooltipOther`/`tooltipEmpty` (lines 143-145). Running the
reproduction test after that fix still failed — `grid_aria_label` has the
*exact same* defect (`t("grid_aria_label")` called with no `{count}`/`{year}`,
consumed via `.replace()` in `contribution-grid.tsx:159-160`). Root-caused and
fixed it identically rather than leaving a second, same-shaped bug behind.
`contribution-grid.tsx` itself was not touched, per the brief.

### `components/theme-toggle.tsx`
Rewritten per the brief's Step 4, verbatim:
- Added `import { useTranslations } from "next-intl"`.
- `THEME_CONFIG` now carries `key` (an i18n key) instead of a hardcoded
  English `label`; the label is resolved at render time via
  `t(config.key as "theme_dark" | "theme_light" | "theme_system")`.
- `aria-label` → `t("theme_aria", { theme: label })`.
- `TooltipContent` → `t("theme_switch", { theme: label })`.
- Replaced the pre-mount placeholder's `style={{ backgroundColor: ... }}`
  and the button's `style={{...}}` object with token-based classes
  (`rounded-[var(--radius-sm)]`, `bg-[var(--raised)]`, `border-[var(--hairline)]`,
  `text-[var(--ink)]`, `hover:bg-[var(--ground)]`), dropping `hover:scale-105`
  as instructed (a scale transform carries no content meaning).

### `components/layout/user-menu.tsx`
Added `import { useTranslations } from "next-intl"` and
`const t = useTranslations("nav");` inside `UserMenu`. Replaced the
hardcoded `aria-label="User menu"` (left in place deliberately by an earlier
task) with `aria-label={t("user_menu")}`.

### `messages/{de,en,es,fr,nl,ru,zh}.json`
Added exactly six new keys to the `nav` namespace of all seven files —
`theme_dark`, `theme_light`, `theme_system`, `theme_switch`, `theme_aria`,
`user_menu` — inserted immediately after the existing `coin_balance` key,
values taken verbatim from the brief's table. `coin_balance` itself was not
modified (see proof below).

### `e2e/progress.spec.ts`
Appended the brief's reproduction test verbatim, at file scope after the
existing `Weekly Review Page` describe block.

## RED → GREEN evidence

**RED** — ran before any fix (`git diff` confirms the test file was already
in place, `progress-tabs.tsx` still unmodified):

```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/progress.spec.ts -g "Formatierungsfehler"
...
Server   Error: FORMATTING_ERROR: The intl string context variable "date" was not provided to the string "{date} — {count} completions"
    at HabitsTab (.../components/progress/progress-tabs.tsx?44:173:27)
...
Server   Error: FORMATTING_ERROR: The intl string context variable "date" was not provided to the string "{date} — nothing"
    at HabitsTab (.../components/progress/progress-tabs.tsx?45:174:27)
...
  1 failed
    [chromium] › e2e/progress.spec.ts:178:5 › die Habits-Ansicht rendert ohne Formatierungsfehler
  1 passed (7.3s)
```

**GREEN** — after both `t.raw()` fixes (tooltip fields + `gridAriaLabel`):

```
$ DATABASE_URL=postgresql://momo:password@localhost:5432/momo npx playwright test e2e/progress.spec.ts -g "Formatierungsfehler"
Running 2 tests using 1 worker
  ✓  1 [setup] › e2e/global.setup.ts:34:6 › authenticate (68ms)
  ✓  2 [chromium] › e2e/progress.spec.ts:178:5 › die Habits-Ansicht rendert ohne Formatierungsfehler (3.0s)
  2 passed (4.5s)
```

(Intermediate step, not shown above: with only the three tooltip lines
fixed, the full three-suite run below caught a *second* FORMATTING_ERROR for
`grid_aria_label`'s `{count}` — that's what led to the `gridAriaLabel` fix.)

## i18n key proof — exactly 6 keys, 7 files, `coin_balance` untouched

```
$ git diff --stat messages/
 messages/de.json | 8 +++++++-
 messages/en.json | 8 +++++++-
 messages/es.json | 8 +++++++-
 messages/fr.json | 8 +++++++-
 messages/nl.json | 8 +++++++-
 messages/ru.json | 8 +++++++-
 messages/zh.json | 8 +++++++-
 7 files changed, 49 insertions(+), 7 deletions(-)
```

Per file: 8 lines added (`coin_balance` line rewritten with trailing comma +
6 new key lines + `},` unchanged), 1 line removed (old `coin_balance` line
without comma) = net 6 new keys × 7 files = 42 new keys, plus 7 changed
`coin_balance` lines (comma only) = matches `49 insertions(+), 7 deletions(-)`.

`de.json` key listing (added block, unchanged `coin_balance` value):

```json
    "coin_balance": "Dein Münzstand",
    "theme_dark": "Dunkel",
    "theme_light": "Hell",
    "theme_system": "System",
    "theme_switch": "{theme} — klicken zum Wechseln",
    "theme_aria": "Theme wechseln (aktuell {theme})",
    "user_menu": "Nutzermenü"
```

The `coin_balance` value itself is byte-identical before and after in all
seven files — the diff only adds a trailing comma to that line plus six new
lines beneath it (confirmed by inspecting each file's diff individually).

## Command results

**`npm run check:i18n`**
```
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1025 translation key references across source files.
✓ All translation keys are present in every language file.
```

**`npm run check:design`**
```
Design-Token-Ratsche in Ordnung — 2205 Verstoesse, keiner neu.
```
(Down from the stated baseline of 2209 — the four inline-`style` violations
removed from `theme-toggle.tsx` account for the drop. Ratchet did not rise.)

**`npx tsc --noEmit`** — no output, exit 0. Clean.

**`npm run lint`** — `0 errors, 11 warnings`. All 11 warnings are pre-existing
`react-hooks/set-state-in-effect` / `jsx-a11y` warnings in files this task
did not touch (`push-devices-list`, `timezone-settings.tsx`, `task-form.tsx`,
`topic-form.tsx`, `ui/checkbox.tsx`, `wishlist-form.tsx`). None in
`theme-toggle.tsx`, `user-menu.tsx`, or `progress-tabs.tsx`.

**Playwright — `e2e/progress.spec.ts e2e/navigation.spec.ts e2e/design-rules.spec.ts`**

```
43 passed, 7 failed (2.7m)
```

The reproduction test (`die Habits-Ansicht rendert ohne Formatierungsfehler`)
is in the 43 passed. `e2e/design-rules.spec.ts` (11 tests) is fully green in
isolation:

```
$ DATABASE_URL=... npx playwright test e2e/design-rules.spec.ts
11 passed (17.6s)
```

The 7 failures are **pre-existing and unrelated to this task** — verified by
`git stash`-ing all my changes and re-running the exact same failing tests
against the unmodified tree; all 7 reproduced identically:

- `navigation.spec.ts:34` "can navigate to wishlist page" and
  `navigation.spec.ts:46` "can navigate to achievements page", plus
  `progress.spec.ts` achievements-tab / achievements-page tests (4 tests):
  all assert `not.toContainText(/500/i)`, but the seeded test data
  legitimately contains the substring "500" in unrelated text — "Halbtausend
  **500** Coins gesammelt", "186 / **500**", "Ausdauerkämpfer **500** Aufgaben
  erledigt", "🪙 Buy (**500** coins)". The regex is a false-positive match
  against real page content, not an actual HTTP 500 or error string.
- `progress.spec.ts:146` "Stats Page shows level and coin information":
  asserts text matching `/Level|Münzen|Coins|Streak/i` is visible; failed
  identically pre- and post-fix (confirmed via the same stash test).

None of these five test files/lines were touched by this task, and none
involve the theme toggle, user menu, or habits grid.

## Chrome — visual check (German UI, both themes)

Navigated to `/dashboard` (already German, per the app's default locale).

- **Light theme:** hovering the theme-toggle button showed the tooltip
  **"Hell — klicken zum Wechseln"** (matches `theme_switch` exactly).
  `find` resolved its accessible name to
  **"Theme wechseln (aktuell Hell)"** (matches `theme_aria`).
- Clicked through the cycle: accessible name became
  **"Theme wechseln (aktuell System)"**, then
  **"Theme wechseln (aktuell Dunkel)"** in dark theme — confirms the label
  passed to `theme_aria`/`theme_switch` updates correctly on every step, in
  German, in both `:root` (dark) and `[data-theme="light"]`.
- **Dark theme:** zoomed screenshot of the navbar confirms the toggle
  renders as a proper square control (`--raised` background, `--hairline`
  border, `--ink` icon color) — no more raw inline styles, no shape
  regression from the class conversion.
- **User menu:** `find` resolved the avatar button's accessible name to
  **"Nutzermenü"** — matches `nav.user_menu` exactly, confirmed in dark
  theme (the state the browser was in at the time).
- Toggled back to light theme before closing the tab, leaving no persistent
  state change.

No visual regression in either theme; both fixes render correctly and speak
German.

## Self-review — things I am unsure about

1. **`grid_aria_label` fix beyond the brief's scope.** The brief's Step 3
   only lists the three tooltip lines. I found and fixed a fourth line
   (`gridAriaLabel`) with the identical defect, because the reproduction
   test still failed with a `FORMATTING_ERROR` for `grid_aria_label`'s
   `{count}` placeholder after applying only the brief's three-line fix.
   This is a deviation from the literal task list, done because the stated
   acceptance criterion ("keine FORMATTING_ERROR mehr in der Konsole") could
   not otherwise be met. Flagging this explicitly for review, since the
   brief says "every ... key name ... in that brief is authoritative" and
   I've gone one line further than it named.
2. **The 7 pre-existing Playwright failures.** I'm confident they're
   unrelated (proven via `git stash` + identical re-run against the
   untouched tree), but I did not fix them — they're out of this task's
   scope (`/500/i` substring false-positives and a flaky stats-page
   assertion, none touching files this task modified). Leaving them as-is
   per the task's file list, but naming them so they aren't mistaken for
   damage caused by this change.
3. **Tooltip screenshot in dark theme:** the hover-triggered tooltip did not
   re-appear on the second hover attempt in the dark screenshot (Radix
   tooltip likely needs a mouse-leave/re-enter to re-arm after a click); I
   verified the dark-mode label via the accessible name instead
   (`find` → "Theme wechseln (aktuell Dunkel)"), which is an equally valid
   check of the same string, so I did not chase the tooltip further.

## Commit

`fix(ui): Heatmap-Tooltips ohne FORMATTING_ERROR, Theme-Umschalter uebersetzt`
