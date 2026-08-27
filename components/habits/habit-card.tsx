/**
 * HabitCard — one habit as a `Row` (title, topic dot, recurrence/pause as
 * a mono eyebrow, own streak as `trailing`) plus its full-width year
 * `ContributionGrid` below.
 *
 * Task 11: was a boxed `<article>` with four stat pills (year/30d/7d/
 * streak) and a topic-icon badge. Year/30d/7d moved to `/progress`'s
 * `PageFrame` rail as page-wide sums (see `app/(app)/progress/page.tsx`) —
 * a per-habit number pill is a filled surface, and the spec forbids a
 * boxed content surface just as it forbids the dashed empty state this
 * same task removed. The streak pill came back in review (Task-11-review
 * I3): it isn't additive like the other three, so the rail can only ever
 * show ONE page-wide streak — every other habit's own streak would
 * otherwise be gone from the page entirely, and a streak is the fact a
 * habit tracker exists to show. It's back as `Row`'s existing `trailing`
 * text, pre-formatted by the caller (`formatHabitStreakTrailing` in
 * `progress-tabs.tsx`) — not a new prop on `Row`, not a pill again. The
 * icon badge stays gone: `Row`'s vocabulary for "this row's colour" is the
 * 6-px `dotColor` dot (topic colour), not an icon in a framed square — the
 * icon carried no information the dot and the title don't already carry,
 * and a framed square is exactly the "Kasten" §6 forbids. Pure server
 * component; receives all data pre-fetched via props.
 */

import { List, Row } from "@/components/ui/list";
import type { HabitWithHistory } from "@/lib/habits";
import { ContributionGrid } from "./contribution-grid";

interface HabitCardProps {
  habit: HabitWithHistory;
  year: number;
  /** Pre-formatted "N Tage in Folge · Rekord: N" text, or `null` if the habit has no streak at all (current and best both 0). */
  streakTrailing: string | null;
  /** Pre-translated label pack passed through from the page. */
  labels: {
    recurrenceEveryDay: string;
    recurrenceEveryNDays: string; // "alle %n% Tage"
    pausedUntilLabel: string; // "Pausiert bis %date%"
    gridLabels: {
      gridAriaLabel: string;
      tooltipOne: string;
      tooltipOther: string;
      tooltipEmpty: string;
      monthLabels: [
        string, string, string, string, string, string,
        string, string, string, string, string, string,
      ];
      weekdayLabels: [string, string, string, string, string, string, string];
    };
  };
}

/**
 * Pretty-prints the recurrence interval, e.g. "täglich" or "alle 3 Tage".
 *
 * The `%n%` placeholder (not next-intl's `{n}` ICU syntax) is intentional:
 * `recurrenceEveryNDays` is translated ONCE per page render (see
 * `app/(app)/progress/page.tsx`) and reused for every habit card, each with
 * its own interval — so the substitution has to happen here, per-card, not
 * at translation time. Using `{n}` would make next-intl parse it as a
 * required ICU argument; calling `t()` without supplying one throws, and
 * next-intl's fallback renders the raw message key instead of the label
 * (that fallback is exactly the bug this comment is here to prevent
 * someone reintroducing).
 */
function formatRecurrence(
  interval: number | null,
  labels: HabitCardProps["labels"]
): string {
  const n = interval ?? 1;
  if (n <= 1) return labels.recurrenceEveryDay;
  return labels.recurrenceEveryNDays.replace("%n%", String(n));
}

export function HabitCard({ habit, year, labels, streakTrailing }: HabitCardProps) {
  const eyebrowParts: string[] = [];
  if (habit.topicTitle) eyebrowParts.push(habit.topicTitle);
  eyebrowParts.push(formatRecurrence(habit.recurrenceInterval, labels));
  if (habit.paused) {
    eyebrowParts.push(
      habit.pausedUntil
        ? labels.pausedUntilLabel.replace("%date%", habit.pausedUntil)
        : labels.pausedUntilLabel.replace("%date%", "")
    );
  }
  // JSX, not `eyebrowParts.join(" · ")` (Task-11-review, minor): the old
  // markup this replaced had `aria-hidden="true"` on each "·" separator —
  // joining to a plain string dropped that, so a screen reader now reads
  // the raw dot between every segment. `Row`'s `eyebrow` prop is typed
  // `React.ReactNode` specifically so JSX is available here; "matches
  // Row's eyebrow contract" was never a real constraint against using it.
  const eyebrow = eyebrowParts.map((part, i) => (
    <span key={i}>
      {i > 0 && <span aria-hidden="true"> · </span>}
      {part}
    </span>
  ));

  return (
    <div className="flex flex-col gap-3">
      <List>
        <Row
          title={habit.title}
          eyebrow={eyebrow}
          trailing={streakTrailing}
          dotColor={habit.topicColor}
        />
      </List>
      <ContributionGrid
        year={year}
        completions={habit.completions}
        labels={labels.gridLabels}
      />
    </div>
  );
}
