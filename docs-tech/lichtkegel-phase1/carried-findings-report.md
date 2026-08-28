# Carried findings — F1/F2/F3 fixes

One commit, three independent fixes. Working tree:
`/var/home/jpy/projects/momo/.claude/worktrees/deps-consolidation`.

## F1 — every non-interval habit was labelled "täglich"

**What was wrong.** `components/habits/habit-card.tsx`'s `formatRecurrence`
keyed only off `habit.recurrenceInterval`, which is `null` for `WEEKDAY`,
`MONTHLY` and `YEARLY` habits (schema: `lib/db/schema.ts`
`recurrenceInterval` comment — "used by INTERVAL type"). The function fell
through to `n = interval ?? 1 → n <= 1 → "täglich"` for all three, so a
weekly, monthly or yearly habit's eyebrow read TÄGLICH.

**What changed.**

- `formatRecurrence` (`components/habits/habit-card.tsx`) now switches on
  `habit.recurrenceType` (`HabitWithHistory["recurrenceType"]`, already
  fetched by `lib/habits.ts::getHabitsWithHistory` — no new query needed):
  `WEEKDAY` → `recurrenceWeekly`, `MONTHLY` → `recurrenceMonthly`,
  `YEARLY` → `recurrenceYearly`, `INTERVAL`/default → the existing
  "täglich"/"alle N Tage" logic, unchanged.
- `HabitCardProps["labels"]` gained `recurrenceWeekly`, `recurrenceMonthly`,
  `recurrenceYearly`.
- `components/progress/progress-tabs.tsx`'s `HabitsList` now also passes
  `t("recurrence_weekly")`, `t("recurrence_monthly")`, `t("recurrence_yearly")`.
- New keys `habits.recurrence_weekly` / `recurrence_monthly` /
  `recurrence_yearly` added to all seven locale files, each a real
  translation (not a mechanical copy) matching that locale's existing
  `recurrence_every_day` register (adverb-of-frequency style):

  | Locale | weekly | monthly | yearly |
  | --- | --- | --- | --- |
  | de | wöchentlich | monatlich | jährlich |
  | en | weekly | monthly | yearly |
  | es | semanalmente | mensualmente | anualmente |
  | fr | chaque semaine | chaque mois | chaque année |
  | nl | wekelijks | maandelijks | jaarlijks |
  | ru | еженедельно | ежемесячно | ежегодно |
  | zh | 每周 | 每月 | 每年 |

No case was left without a sensible label — `HabitWithHistory["recurrenceType"]`
has exactly four members and all four are now handled.

**Evidence — rendered, not read.** Seeded one habit per recurrence type
(`INTERVAL` interval=3, `WEEKDAY` weekdays=[0,2], `MONTHLY`, `YEARLY`) on
the shared test account (`e2e@momotest.local`) via a throwaway script
against `DATABASE_URL=postgresql://momo:password@localhost:5432/momo`,
rendered `/progress?tab=habits` with a Playwright script (locale cookie set
explicitly, since Chromium's default `Accept-Language: en-US` otherwise
silently wins over next-intl's documented "de" default — a case worth
naming since it makes an unset-cookie "de" run actually render English),
read each row's eyebrow via `[data-row-title]` → closest `<li>` →
`span.uppercase`, then deleted all four seeded rows again. Output:

```
LOCALE=de F1-VERIFY interval => alle 3 Tage
LOCALE=de F1-VERIFY weekday  => wöchentlich
LOCALE=de F1-VERIFY monthly  => monatlich
LOCALE=de F1-VERIFY yearly   => jährlich

LOCALE=en F1-VERIFY interval => every 3 days
LOCALE=en F1-VERIFY weekday  => weekly
LOCALE=en F1-VERIFY monthly  => monthly
LOCALE=en F1-VERIFY yearly   => yearly
```

Cleanup: `DELETE FROM tasks WHERE title LIKE 'F1-VERIFY %'` → `deleted 4 rows`
(all four seeded ids confirmed deleted). No leftover rows on the shared
account; no test spec files left in `e2e/` (temp verification spec was
written, run, then removed before the final suite run below).

## F2 — `habits.stat_streak` orphaned in all seven locale files

**What was wrong.** `habits.stat_streak` (old rail label — "Streak" /
"Racha" / "Série" / …) had no code reference anywhere; a newer key
(`rail_streak`, and the per-row `formatHabitStreakTrailing` composed from
`stat_streak_best`/`stat_streak_best_current`/`stat_streak_empty`) replaced
it. `check:i18n` cannot see this — it only checks that referenced keys
exist, never that defined keys are referenced.

**Grep evidence** (word-boundary, `app/ components/ lib/ e2e/`, `*.ts`/`*.tsx`):

```
$ grep -rn '\bstat_streak\b' app components lib e2e --include="*.ts" --include="*.tsx"
(no output, exit 1)
```

Zero matches — confirmed orphaned, safe to delete.

While in F1's area, also checked the pre-existing keys `formatRecurrence`
touches (`recurrence_every_day`, `recurrence_every_n_days`,
`habit_paused_until`) — both are referenced from
`components/progress/progress-tabs.tsx` (`t("recurrence_every_day")` etc.),
not orphaned. The three new F1 keys are referenced by the same file as of
this change.

**What changed.** Deleted the `"stat_streak": "…"` line from all seven
`messages/*.json` files. `rail_streak` (which sits right after it and IS
referenced) was left untouched.

## F3 — `measureColumns`'s dedup swallowed content overflowing past an affordance

**What was wrong.** `e2e/helpers/design-count.ts::measureColumns` excludes
affordances (`button`, `input`, `a`, …) from being reported as breakouts —
correctly, since enlarged hit targets via negative margin produced 94 false
positives on `/tasks` and 3 on `/dashboard`. The separate dedup step, meant
to report only the entry point of an overflow chain, read:

```ts
const parent = el.parentElement;
if (parent && overflows(parent.getBoundingClientRect(), colRect)) {
  continue; // "parent already reported this"
}
```

That assumption is false when `parent` is itself an excluded affordance:
affordances are never pushed to `breakouts`, so a non-affordance content
child that overflows further than the affordance it sits in was silently
skipped — nothing ever reported it. Reviewer-demonstrated: a synthetic
`<button>` overflowing 11px containing a `<span>` overflowing 44px total
(33px further) produced `breakoutsFound: []`.

**What changed.** Scoped the parent-skip to parents that are not
affordance-excluded — i.e. the "parent already reported (or will)" inference
only holds for a parent that COULD be reported:

```ts
const parent = el.parentElement;
if (
  parent &&
  !parent.matches(AFFORDANCE) &&
  overflows(parent.getBoundingClientRect(), colRect)
) {
  continue;
}
```

Nothing about the `AFFORDANCE` exclusion itself changed — the affordance
element is still never reported (line above, unchanged); only its
non-affordance descendants can now surface an overflow independently of it.

**Evidence — three captured states**, via a temporary spec
(`e2e/_f3-temp-verify.spec.ts`, written, run, deleted — not part of the
final tree) that injects a `<button data-f3-temp>` overflowing `/dashboard`'s
`[data-column]` by 11px with a `<span>` child overflowing 44px total, calls
`measureColumns`, then removes the injected nodes and calls it again.

1. **Hole open** (helper's parent-skip temporarily reverted to the
   original `overflows(parent.rect, colRect)` check, via `Edit` — not
   `git checkout`/`stash` — then restored right after):
   ```
   STATE=withInjection []
   STATE=afterRemoval []
   ```
   Confirms the bug reproduces exactly as described: `breakoutsFound: []`
   despite the 44px injected overflow.

2. **Hole closed** (fix restored, same injection):
   ```
   STATE=withInjection [{"tag":"span","testid":null,"reason":null,"overflowPx":44}]
   ```
   The span is now reported, the button itself (affordance) still is not.

3. **Clean after removal** (fix in place, injected nodes removed):
   ```
   STATE=afterRemoval []
   ```

4. **Real pages report zero** — `e2e/design-rules.spec.ts`'s "hält jede
   Inhaltsspalte auf dem Maß" test, which exercises `measureColumns` on
   every migrated page in both themes, stayed **51/51 green** (full run
   below) — the fix does not resurface any of the 94+3 affordance false
   positives the exclusion was added to prevent.

## Commands run, full output

### `npx tsc --noEmit`
No output (clean).

### `npm run check:design`
```
Design-Token-Ratsche in Ordnung — 1938 Verstoesse, keiner neu.
```
Ratchet unchanged at 1938 (before and after — F1/F2/F3 touch no styled
markup, only a helper and label plumbing).

### `npm run check:i18n`
```
Loaded locales: de, en, es, fr, nl, ru, zh
Found 1037 translation key references across source files.

✓ All translation keys are present in every language file.
```

### `npm run lint`
12 warnings, 0 errors — all 12 are in files this change does not touch
(`components/layout/quick-add-modal.tsx`, `components/onboarding/steps/notification-step.tsx`,
`components/settings/linked-accounts.tsx`, `components/settings/notification-history.tsx`,
`components/settings/notification-settings.tsx`, `components/settings/push-devices-section.tsx`,
`components/settings/timezone-settings.tsx`, `components/tasks/task-form.tsx`,
`components/tasks/task-row.tsx`, `components/topics/topic-form.tsx`,
`components/ui/checkbox.tsx`, `components/wishlist/wishlist-form.tsx`) —
pre-existing `react-hooks/set-state-in-effect` / `jsx-a11y` warnings, none
new.

### `npx playwright test e2e/design-rules.spec.ts`
```
51 passed (1.8m)
```
All five migrated pages (`/dashboard`, `/tasks`, `/focus`, `/topics`,
`/progress`), both themes — including the breakout-column rule that
exercises the fixed `measureColumns`.

### `npx playwright test e2e/design-tokens.spec.ts`
```
40 passed (57.0s)
```

### `npx playwright test e2e/progress.spec.ts`
```
16 passed, 5 failed
```
The 5 failures match the task's named pre-existing set exactly, verified
against the actual thrown assertion (not assumed):

| Test | Assertion | Why it fails (from the captured `body` text) |
| --- | --- | --- |
| `can switch to achievements tab` | `not.toContainText(/500\|Interner Fehler/i)` | Achievement copy literally contains "500": "Ausdauerkämpfer**500** Aufgaben erledigt", "Halbtausend**500** Coins gesammelt" |
| `achievements tab shows achievement cards or empty state` | `not.toContainText(/500/i)` | Same — achievement descriptions/counts contain "500" |
| `Achievements Page loads without error` | `not.toContainText(/500\|Interner Fehler/i)` | Same |
| `Achievements Page shows achievement cards` | `not.toContainText(/500/i)` | Same |
| `Stats Page shows level and coin information` | `toBeVisible({timeout:5000})` on a `Level\|Münzen\|Coins\|Streak` filter | Timeout, matches the named "one `/stats` timeout" |

None of the four `/500/i` failures are a real 500 — every "unexpected value"
dump shows a fully-rendered achievements page (level, coins, achievement
cards with unlock dates), the regex is just matching literal "500" inside
achievement descriptions ("500 Aufgaben erledigt", "500 Coins gesammelt").
This is unrelated to F1/F2/F3: none of the three fixes touch
`app/achievements`, `lib/statistics.ts`, or achievement copy.

## Self-review — what I'm unsure about

- **F1 grammar for WEEKDAY.** "wöchentlich"/"weekly"/etc. describes the
  cadence correctly (`HabitStreak.periodDays` treats WEEKDAY as a 7-day
  period, matching the schema comment "advance to the next occurrence of
  any weekday"), but a WEEKDAY habit set to a single weekday and one set to
  three weekdays both now read simply "wöchentlich" — the label doesn't
  distinguish "once a week" from "three times a week". The task said to
  keep interval habits' phrasing and flagged only genuinely label-less
  cases as worth calling out; I judged "wöchentlich" (unqualified) as a
  sensible, honest label for the recurrence *type*, not a claim about
  frequency-within-the-period, consistent with how "täglich" doesn't say
  "once" either. Flagging in case a reviewer wants
  `recurrenceWeekdays`-aware phrasing ("Mo, Mi") instead — that would need
  a new prop threading `habit.recurrenceWeekdays` (not currently on
  `HabitWithHistory`) through to the card, which felt like scope beyond
  "produce the right label for each case".
- **F3 nested chains beyond the demonstrated case.** The fix is scoped
  exactly to "parent is the excluded affordance itself". A deeper chain
  (affordance → non-affordance wrapper reporting a smaller overflow →
  another non-affordance descendant overflowing further) would still only
  report the wrapper, same as the pre-existing (non-affordance-related)
  entry-point-only design of this dedup — that's an existing property of
  "report only the entry point", not something F3 asked to change, but
  noting it since it's adjacent.
- **F2 comment reference.** `progress-tabs.tsx:94` still has a code
  *comment* mentioning `stat_streak_empty` (a different, still-live key) —
  not `stat_streak`, so nothing to change there; confirmed by re-reading
  the exact text before concluding it wasn't the orphan.
- I did not seed data for F2 or F3 (neither needed it) and did not touch
  the two files with pre-existing uncommitted changes noted in the task's
  git status (`components/dashboard/quick-wins-section.tsx`,
  `components/ui/list.tsx`) — this session's `git status` in the actual
  worktree only ever showed the three files this task's fixes touch plus
  the seven locale files, so there was nothing of that sort to avoid
  disturbing here.
