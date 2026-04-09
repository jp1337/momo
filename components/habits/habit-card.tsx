/**
 * HabitCard — one card per recurring task on the /habits page.
 *
 * Header with topic icon + title + recurrence interval, three stat pills
 * (year / 30d / 7d), and a full-width ContributionGrid below. Pure server
 * component; receives all data pre-fetched via props.
 */

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRepeat, faFire } from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";
import type { HabitWithHistory } from "@/lib/habits";
import { ContributionGrid } from "./contribution-grid";

interface HabitCardProps {
  habit: HabitWithHistory;
  year: number;
  /** Pre-translated label pack passed through from the page. */
  labels: {
    statTotalYear: string;
    statLast30: string;
    statLast7: string;
    statStreak: string;
    statStreakEmpty: string;
    recurrenceEveryDay: string;
    recurrenceEveryNDays: string; // "alle {n} Tage"
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
  /**
   * Pre-formatted current-streak value, e.g. "8 Wochen" or "Noch kein
   * Streak". Built on the page because it needs `t()` + ICU plurals.
   */
  streakValueText: string;
  /**
   * Pre-formatted best-streak sub-label, e.g. "Rekord: 12" or "Neuer
   * Rekord". `null` when the habit has never had a streak.
   */
  streakBestText: string | null;
}

/** Pretty-prints the recurrence interval, e.g. "täglich" or "alle 3 Tage". */
function formatRecurrence(
  interval: number | null,
  labels: HabitCardProps["labels"]
): string {
  const n = interval ?? 1;
  if (n <= 1) return labels.recurrenceEveryDay;
  return labels.recurrenceEveryNDays.replace("{n}", String(n));
}

export function HabitCard({
  habit,
  year,
  labels,
  streakValueText,
  streakBestText,
}: HabitCardProps) {
  const topicColor = habit.topicColor ?? "var(--accent-green)";
  const topicIcon = habit.topicIcon ? resolveTopicIcon(habit.topicIcon) : faRepeat;
  const hasStreak = habit.streak.current > 0;

  return (
    <article
      className="rounded-xl p-6 flex flex-col gap-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* ── Header: icon · title · recurrence ─────────────────────────────── */}
      <header className="flex items-start gap-3">
        <div
          className="flex items-center justify-center rounded-lg flex-shrink-0"
          style={{
            width: "40px",
            height: "40px",
            backgroundColor: `color-mix(in srgb, ${topicColor} 12%, var(--bg-elevated))`,
            border: `1px solid color-mix(in srgb, ${topicColor} 30%, var(--border))`,
          }}
        >
          <FontAwesomeIcon
            icon={topicIcon}
            aria-hidden="true"
            style={{ width: "18px", height: "18px", color: topicColor }}
          />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <h2
            className="text-base truncate"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-primary)",
              fontWeight: 600,
            }}
          >
            {habit.title}
          </h2>
          <p
            className="text-xs mt-0.5 flex items-center gap-2"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {habit.topicTitle && (
              <>
                <span className="truncate">{habit.topicTitle}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{formatRecurrence(habit.recurrenceInterval, labels)}</span>
          </p>
        </div>
      </header>

      {/* ── Stat pills ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2.5">
        {/* Streak pill — flame icon, current count, optional best sub-label. */}
        <div
          className="flex-1 min-w-[110px] flex flex-col gap-0.5 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: hasStreak
              ? "color-mix(in srgb, var(--accent-amber) 14%, var(--bg-elevated))"
              : "var(--bg-elevated)",
            border: hasStreak
              ? "1px solid color-mix(in srgb, var(--accent-amber) 32%, var(--border))"
              : "1px solid var(--border)",
          }}
        >
          <span
            className="text-[10px] uppercase tracking-wider flex items-center gap-1.5"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            <FontAwesomeIcon
              icon={faFire}
              aria-hidden="true"
              style={{
                width: "10px",
                height: "10px",
                color: hasStreak
                  ? "var(--accent-amber)"
                  : "var(--text-muted)",
              }}
            />
            {labels.statStreak}
          </span>
          <span
            className="text-base font-bold leading-tight"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: hasStreak
                ? "var(--accent-amber)"
                : "var(--text-muted)",
              lineHeight: 1.15,
            }}
          >
            {streakValueText}
          </span>
          {streakBestText && (
            <span
              className="text-[10px]"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                marginTop: "1px",
              }}
            >
              {streakBestText}
            </span>
          )}
        </div>
        {[
          { label: labels.statTotalYear, value: habit.totalYear, strong: true },
          { label: labels.statLast30, value: habit.totalLast30, strong: false },
          { label: labels.statLast7, value: habit.totalLast7, strong: false },
        ].map((pill) => (
          <div
            key={pill.label}
            className="flex-1 min-w-[90px] flex flex-col gap-0.5 px-3 py-2 rounded-lg"
            style={{
              backgroundColor: pill.strong
                ? "color-mix(in srgb, var(--accent-green) 10%, var(--bg-elevated))"
                : "var(--bg-elevated)",
              border: pill.strong
                ? "1px solid color-mix(in srgb, var(--accent-green) 28%, var(--border))"
                : "1px solid var(--border)",
            }}
          >
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {pill.label}
            </span>
            <span
              className="text-xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: pill.strong ? "var(--accent-green)" : "var(--text-primary)",
                lineHeight: 1.1,
              }}
            >
              {pill.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Year contribution grid ────────────────────────────────────────── */}
      <ContributionGrid
        year={year}
        completions={habit.completions}
        labels={labels.gridLabels}
      />
    </article>
  );
}
