/**
 * EnergyWeekBlock — 90-day GitHub-style energy heatmap for the Stats page.
 *
 * Renders:
 *   1. Up to three mono count lines (HIGH / MEDIUM / LOW) for the last 7
 *      days — a level with zero check-ins is a missing metric and renders
 *      nothing (see `EmptyState`'s doc comment: leerraum is not a defect).
 *   2. A 13-week × 7-day calendar heatmap coloured by energy level.
 *   3. A compact legend below the grid.
 *
 * Async server component — fetches its own locale and translations.
 * Receives pre-fetched data via props from `app/(app)/stats/page.tsx`.
 */

import { getTranslations, getLocale } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { EnergyCheckin, EnergyLevelCounts } from "@/lib/energy";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EnergyWeekBlockProps {
  /** Counts per level for the last 7 days. */
  weekCounts: EnergyLevelCounts;
  /** Last 90 days of one-per-day check-ins (oldest → newest). */
  history: EnergyCheckin[];
  /** True iff the user has zero historical check-ins overall. */
  isEmpty: boolean;
}

type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

interface DaySlot {
  date: string;
  level: EnergyLevel | null;
  /** False for days outside the 90-day window or in the future. */
  inRange: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Label lookup for the three energy levels. */
const LEVEL_META: Record<EnergyLevel, { labelKey: "energy_level_high" | "energy_level_medium" | "energy_level_low" }> = {
  HIGH:   { labelKey: "energy_level_high" },
  MEDIUM: { labelKey: "energy_level_medium" },
  LOW:    { labelKey: "energy_level_low" },
};

/**
 * The three energy levels as one ink ramp instead of three accent colors —
 * a ramp encodes an ordering; three accent colors would claim three
 * categories that don't exist. Literal Tailwind classes, keyed by level:
 * a class built at render time (`` `bg-[color-mix(...,${var},...)]` ``)
 * would render with no matching stylesheet rule, since Tailwind's scanner
 * only generates CSS for class strings that appear literally in the
 * source. This map keeps the three arbitrary-value classes fully literal.
 */
const LEVEL_CELL_BG: Record<EnergyLevel, string> = {
  HIGH: "bg-[color-mix(in_srgb,var(--ink)_75%,transparent)]",
  MEDIUM: "bg-[color-mix(in_srgb,var(--ink-2)_75%,transparent)]",
  LOW: "bg-[color-mix(in_srgb,var(--ink-3)_75%,transparent)]",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a 13-week grid (columns) × 7-day grid (rows = Mon–Sun).
 * Weeks run oldest-left → newest-right. Days outside the 90-day window
 * are flagged as `inRange: false` so they render as transparent.
 */
function buildHeatmap(history: EnergyCheckin[]): DaySlot[][] {
  const byDate = new Map<string, EnergyLevel>(history.map((h) => [h.date, h.level]));

  const now = new Date();
  // today in UTC as YYYY-MM-DD
  const todayStr = now.toISOString().split("T")[0];
  const today = new Date(todayStr + "T00:00:00Z");

  // Monday of the current week (Mo = 1, but getUTCDay 0=Sun)
  const mondayOffset = (today.getUTCDay() + 6) % 7;
  const currentMonday = new Date(today);
  currentMonday.setUTCDate(today.getUTCDate() - mondayOffset);

  // Start: Monday 12 weeks before current Monday → 13 columns total
  const startMonday = new Date(currentMonday);
  startMonday.setUTCDate(currentMonday.getUTCDate() - 12 * 7);

  // "90 days" window: today back 89 days
  const windowStart = new Date(today);
  windowStart.setUTCDate(today.getUTCDate() - 89);

  const weeks: DaySlot[][] = [];
  for (let w = 0; w < 13; w++) {
    const week: DaySlot[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startMonday);
      date.setUTCDate(startMonday.getUTCDate() + w * 7 + d);
      const dateStr = date.toISOString().split("T")[0];
      const inRange = date >= windowStart && date <= today;
      week.push({ date: dateStr, level: byDate.get(dateStr) ?? null, inRange });
    }
    weeks.push(week);
  }

  return weeks;
}

/**
 * Returns the month abbreviation to show above a week column, or "" if the
 * month has already been labelled in a previous column.
 */
function getMonthLabel(weeks: DaySlot[][], weekIndex: number, monthLabels: string[]): string {
  const monday = weeks[weekIndex][0];
  if (!monday.inRange) return "";
  const month = new Date(monday.date + "T00:00:00Z").getUTCMonth();
  if (weekIndex === 0) return monthLabels[month];
  const prevMonday = weeks[weekIndex - 1][0];
  const prevMonth = new Date(prevMonday.date + "T00:00:00Z").getUTCMonth();
  return month !== prevMonth ? monthLabels[month] : "";
}

/** Generates locale-aware weekday abbreviations (Mon–Sun order). */
function buildWeekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // 2024-01-01 was a Monday; use Mon–Sun for labels
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return fmt.format(d);
  });
}

/** Generates locale-aware month abbreviations. */
function buildMonthLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: "short" });
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(2024, i, 1));
    return fmt.format(d);
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export async function EnergyWeekBlock({ weekCounts, history, isEmpty }: EnergyWeekBlockProps) {
  const [t, locale] = await Promise.all([getTranslations("stats"), getLocale()]);

  const weekdayLabels = buildWeekdayLabels(locale);
  const monthLabels = buildMonthLabels(locale);

  if (isEmpty) {
    return <EmptyState line={t("energy_empty_hint")} />;
  }

  const weeks = buildHeatmap(history);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Count lines (last 7 days) ─────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        {(Object.keys(LEVEL_META) as EnergyLevel[]).map((level) => {
          const count = weekCounts[level];
          if (count === 0) return null;
          return (
            <p
              key={level}
              className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] tabular-nums text-[var(--ink-3)]"
            >
              {count} {t(LEVEL_META[level].labelKey)}
            </p>
          );
        })}
      </div>

      {/* ── Heatmap ───────────────────────────────────────────────────────── */}
      <div>
        <p className="m-0 mb-3 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
          {t("energy_heatmap_header")}
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1" role="img" aria-label={t("energy_heatmap_aria")}>
          {/* Weekday labels */}
          <div className="flex flex-shrink-0 flex-col gap-1 pt-4">
            {weekdayLabels.map((label, i) => (
              <div
                key={i}
                className={cn(
                  "h-3 select-none font-[family-name:var(--font-mono)] text-[9px] leading-3 text-[var(--ink-3)]",
                  [0, 2, 4, 6].includes(i) ? "visible" : "invisible",
                )}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex flex-col gap-1">
            {/* Month label row */}
            <div className="flex h-3 gap-1">
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="w-3 shrink-0 select-none overflow-visible whitespace-nowrap font-[family-name:var(--font-mono)] text-[9px] leading-3 text-[var(--ink-3)]"
                >
                  {getMonthLabel(weeks, wi, monthLabels)}
                </div>
              ))}
            </div>

            {/* Day rows (Mon–Sun) */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
              <div key={dayIndex} className="flex gap-1">
                {weeks.map((week, wi) => {
                  const slot = week[dayIndex];
                  const bgClass = !slot.inRange
                    ? "bg-transparent"
                    : slot.level
                    ? LEVEL_CELL_BG[slot.level]
                    : "bg-[var(--raised)]";
                  return (
                    <div
                      key={wi}
                      role="gridcell"
                      title={
                        slot.inRange
                          ? `${slot.date}${slot.level ? ` — ${t(LEVEL_META[slot.level].labelKey)}` : ` — ${t("energy_no_checkin")}`}`
                          : undefined
                      }
                      className={cn("h-3 w-3 shrink-0", bgClass)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-4 font-[family-name:var(--font-mono)] text-[0.6875rem] text-[var(--ink-3)]">
          {(Object.keys(LEVEL_META) as EnergyLevel[]).map((level) => (
            <div key={level} className="flex items-center gap-2">
              <div className={cn("h-2.5 w-2.5 shrink-0", LEVEL_CELL_BG[level])} />
              <span>{t(LEVEL_META[level].labelKey)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 bg-[var(--raised)]" />
            <span>{t("energy_no_checkin")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
