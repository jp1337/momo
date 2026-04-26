/**
 * EnergyWeekBlock — 90-day GitHub-style energy heatmap for the Stats page.
 *
 * Renders:
 *   1. Three count pills (HIGH / MEDIUM / LOW) for the last 7 days.
 *   2. A 13-week × 7-day calendar heatmap coloured by energy level.
 *   3. A compact legend below the grid.
 *
 * Async server component — fetches its own locale and translations.
 * Receives pre-fetched data via props from `app/(app)/stats/page.tsx`.
 */

import { getTranslations, getLocale } from "next-intl/server";
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

const LEVEL_META: Record<EnergyLevel, { color: string; icon: string; labelKey: "energy_level_high" | "energy_level_medium" | "energy_level_low" }> = {
  HIGH:   { color: "var(--accent-amber)", icon: "⚡", labelKey: "energy_level_high" },
  MEDIUM: { color: "var(--accent-green)", icon: "☀",  labelKey: "energy_level_medium" },
  LOW:    { color: "#818cf8",             icon: "🌙", labelKey: "energy_level_low" },
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
    return (
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <p
          className="text-sm"
          style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}
        >
          {t("energy_empty_hint")}
        </p>
      </div>
    );
  }

  const weeks = buildHeatmap(history);

  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* ── Count pills (last 7 days) ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(LEVEL_META) as EnergyLevel[]).map((level) => {
          const meta = LEVEL_META[level];
          const count = weekCounts[level];
          return (
            <div
              key={level}
              className="flex-1 min-w-[110px] flex items-center gap-2.5 px-4 py-3 rounded-lg"
              style={{
                backgroundColor: `color-mix(in srgb, ${meta.color} 8%, var(--bg-elevated))`,
                border: `1px solid color-mix(in srgb, ${meta.color} 25%, var(--border))`,
              }}
            >
              <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>{meta.icon}</span>
              <div className="flex flex-col">
                <span
                  className="text-xs uppercase tracking-wider"
                  style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}
                >
                  {t(meta.labelKey)}
                </span>
                <span
                  className="text-xl font-bold"
                  style={{ fontFamily: "var(--font-display, 'Lora', serif)", color: meta.color }}
                >
                  {count}d
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Heatmap ───────────────────────────────────────────────────────── */}
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wider mb-3"
          style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}
        >
          {t("energy_heatmap_header")}
        </p>

        <div className="flex gap-2 overflow-x-auto pb-1" role="img" aria-label={t("energy_heatmap_aria")}>
          {/* Weekday labels */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{ gap: "3px", paddingTop: "18px" }}
          >
            {weekdayLabels.map((label, i) => (
              <div
                key={i}
                style={{
                  height: "12px",
                  lineHeight: "12px",
                  fontSize: "9px",
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                  visibility: [0, 2, 4, 6].includes(i) ? "visible" : "hidden",
                  userSelect: "none",
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex flex-col" style={{ gap: "3px" }}>
            {/* Month label row */}
            <div className="flex" style={{ gap: "3px", height: "14px" }}>
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  style={{
                    width: "12px",
                    flexShrink: 0,
                    fontSize: "9px",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                    overflow: "visible",
                    whiteSpace: "nowrap",
                    userSelect: "none",
                  }}
                >
                  {getMonthLabel(weeks, wi, monthLabels)}
                </div>
              ))}
            </div>

            {/* Day rows (Mon–Sun) */}
            {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
              <div key={dayIndex} className="flex" style={{ gap: "3px" }}>
                {weeks.map((week, wi) => {
                  const slot = week[dayIndex];
                  const meta = slot.level ? LEVEL_META[slot.level] : null;
                  return (
                    <div
                      key={wi}
                      title={
                        slot.inRange
                          ? `${slot.date}${slot.level ? ` — ${t(LEVEL_META[slot.level].labelKey)}` : ` — ${t("energy_no_checkin")}`}`
                          : undefined
                      }
                      style={{
                        width: "12px",
                        height: "12px",
                        flexShrink: 0,
                        borderRadius: "2px",
                        backgroundColor: !slot.inRange
                          ? "transparent"
                          : slot.level
                          ? `color-mix(in srgb, ${meta!.color} 75%, transparent)`
                          : "var(--bg-elevated)",
                        border: slot.inRange && !slot.level
                          ? "1px solid var(--border)"
                          : "none",
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-4 mt-3 flex-wrap"
          style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)" }}
        >
          {(Object.keys(LEVEL_META) as EnergyLevel[]).map((level) => {
            const meta = LEVEL_META[level];
            return (
              <div key={level} className="flex items-center gap-1.5">
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    backgroundColor: `color-mix(in srgb, ${meta.color} 75%, transparent)`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                  {meta.icon} {t(meta.labelKey)}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>{t("energy_no_checkin")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
