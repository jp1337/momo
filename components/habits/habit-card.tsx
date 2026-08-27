/**
 * HabitCard — one habit as a `Row` (title, topic dot, recurrence/pause as
 * a mono eyebrow) plus its full-width year `ContributionGrid` below.
 *
 * Task 11: was a boxed `<article>` with four stat pills (year/30d/7d/
 * streak) and a topic-icon badge. The pills moved to `/progress`'s
 * `PageFrame` rail as page-wide sums (see `app/(app)/progress/page.tsx`) —
 * a per-habit number pill is a filled surface, and the spec forbids a
 * boxed content surface just as it forbids the dashed empty state this
 * same task removed. The icon badge is gone too: `Row`'s vocabulary for
 * "this row's colour" is the 6-px `dotColor` dot (topic colour), not an
 * icon in a framed square — the icon carried no information the dot and
 * the title don't already carry, and a framed square is exactly the
 * "Kasten" §6 forbids. Pure server component; receives all data
 * pre-fetched via props.
 */

import { List, Row } from "@/components/ui/list";
import type { HabitWithHistory } from "@/lib/habits";
import { ContributionGrid } from "./contribution-grid";

interface HabitCardProps {
  habit: HabitWithHistory;
  year: number;
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

export function HabitCard({ habit, year, labels }: HabitCardProps) {
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

  return (
    <div className="flex flex-col gap-3">
      <List>
        <Row
          title={habit.title}
          eyebrow={eyebrowParts.join(" · ")}
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
