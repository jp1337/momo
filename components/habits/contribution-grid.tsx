/**
 * ContributionGrid — GitHub-style year heatmap for a single habit.
 *
 * Pure server component. Renders a 53-week × 7-day grid where each cell
 * represents a calendar day in the requested year. Cells are tinted
 * by completion count on that day (0 → empty, 1 → soft green, 2 → mid,
 * 3+ → strong). Month labels above the grid, weekday labels on the left.
 *
 * Pattern reference: components/stats/energy-week-block.tsx — same
 * CSS Grid + inline-style + CSS-variable approach. No charting library.
 *
 * ISO weeks start on Monday (European convention, consistent with the
 * rest of Momo). The grid is padded with empty placeholder cells before
 * Jan 1 and after Dec 31 so it always renders as a clean rectangle.
 */

import type { DailyCompletion } from "@/lib/habits";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface ContributionGridProps {
  /** Calendar year to render (e.g. 2026) */
  year: number;
  /** Only days with count > 0, sorted ascending by date */
  completions: DailyCompletion[];
  /** Pre-translated tooltip and aria strings (server-side from getTranslations) */
  labels: {
    /** e.g. "{count} Abschlüsse im Jahr {year}" — call site supplies count & year */
    gridAriaLabel: string;
    /** e.g. "{date} — {count} Abschlüsse" — tooltip template */
    tooltipOne: string;
    tooltipOther: string;
    /** Three-letter month short names in the current UI locale, index 0 = Jan */
    monthLabels: [string, string, string, string, string, string, string, string, string, string, string, string];
    /** Two-letter weekday short names starting on Monday */
    weekdayLabels: [string, string, string, string, string, string, string];
    /** Empty-day tooltip, e.g. "{date} — noch nichts" */
    tooltipEmpty: string;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the Monday on or before the given date (ISO week start).
 * Mutates and returns a fresh Date so the caller can't accidentally
 * mutate a shared instance.
 */
function mondayOnOrBefore(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // getUTCDay(): Sun=0, Mon=1, ..., Sat=6 — shift so Mon=0
  const shifted = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - shifted);
  return d;
}

/** YYYY-MM-DD for a UTC-midnight Date, using UTC getters. */
function toYmd(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns a fill color for a cell based on completion count. Uses
 * `color-mix` on `var(--accent-green)` so the component works in both
 * light and dark mode without a theme switch.
 */
function cellColor(count: number): { bg: string; border: string } {
  if (count <= 0) {
    return {
      bg: "var(--bg-elevated)",
      border: "1px solid var(--border)",
    };
  }
  const strength = count === 1 ? 30 : count === 2 ? 55 : 85;
  const borderStrength = Math.min(strength + 10, 95);
  return {
    bg: `color-mix(in srgb, var(--accent-green) ${strength}%, transparent)`,
    border: `1px solid color-mix(in srgb, var(--accent-green) ${borderStrength}%, transparent)`,
  };
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Renders the full year contribution grid. Server component — no client JS.
 */
export function ContributionGrid({ year, completions, labels }: ContributionGridProps) {
  // Index completions by date for O(1) lookups during cell build.
  const byDate = new Map(completions.map((c) => [c.date, c.count]));

  // Build the grid: start on the Monday on/before Jan 1, end on the Sunday
  // on/after Dec 31. Cells outside the year render as inactive placeholders
  // so the rectangle stays clean regardless of the year's layout.
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const gridStart = mondayOnOrBefore(jan1);
  const gridEnd = mondayOnOrBefore(dec31);
  gridEnd.setUTCDate(gridEnd.getUTCDate() + 6); // Sunday after Dec 31

  // One column per ISO week, one row per weekday (Mon → Sun).
  const weekCount =
    Math.round((gridEnd.getTime() - gridStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  interface Cell {
    date: string;
    count: number;
    inYear: boolean;
    month: number; // 0-11
  }

  const cells: Cell[] = [];
  const cursor = new Date(gridStart);
  for (let w = 0; w < weekCount; w++) {
    for (let dow = 0; dow < 7; dow++) {
      const dateStr = toYmd(cursor);
      const inYear = cursor.getUTCFullYear() === year;
      cells.push({
        date: dateStr,
        count: inYear ? byDate.get(dateStr) ?? 0 : -1, // -1 = placeholder
        inYear,
        month: cursor.getUTCMonth(),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  // Compute month-label positions: for each of the 12 months, find the
  // first column whose in-year cells contain that month. We render the
  // label centered above that column.
  const monthColumns: Array<{ month: number; col: number }> = [];
  for (let m = 0; m < 12; m++) {
    for (let w = 0; w < weekCount; w++) {
      // Check any cell in this column that's in-year and matches the month.
      const colStart = w * 7;
      let found = false;
      for (let dow = 0; dow < 7; dow++) {
        const c = cells[colStart + dow];
        if (c.inYear && c.month === m) {
          found = true;
          break;
        }
      }
      if (found) {
        monthColumns.push({ month: m, col: w });
        break;
      }
    }
  }

  const inYearCount = cells.filter((c) => c.inYear && c.count > 0).length;
  // Sum actual completions (not unique days) for the aria summary.
  const totalForAria = completions.reduce(
    (sum, c) => (c.date.startsWith(`${year}-`) ? sum + c.count : sum),
    0
  );
  const ariaLabel = labels.gridAriaLabel
    .replace("{count}", String(totalForAria))
    .replace("{year}", String(year));

  return (
    <div
      className="w-full overflow-x-auto"
      style={{ scrollbarWidth: "thin" }}
    >
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: "auto 1fr",
          gridTemplateRows: "auto 1fr",
          gap: "6px",
          minWidth: "100%",
        }}
      >
        {/* Top-left spacer (above weekday labels, left of month labels) */}
        <div aria-hidden="true" />

        {/* Month labels row */}
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${weekCount}, minmax(10px, 1fr))`,
            gap: "3px",
            position: "relative",
            height: "14px",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            fontSize: "10px",
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          {monthColumns.map(({ month, col }) => (
            <span
              key={month}
              style={{
                gridColumn: `${col + 1} / span 4`,
                whiteSpace: "nowrap",
              }}
            >
              {labels.monthLabels[month]}
            </span>
          ))}
        </div>

        {/* Weekday labels column (Mon / Wed / Fri only, every other row) */}
        <div
          aria-hidden="true"
          style={{
            display: "grid",
            gridTemplateRows: "repeat(7, minmax(10px, 1fr))",
            gap: "3px",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            fontSize: "10px",
            color: "var(--text-muted)",
            paddingRight: "4px",
          }}
        >
          {labels.weekdayLabels.map((lbl, i) => (
            <span
              key={i}
              style={{
                gridRow: `${i + 1}`,
                lineHeight: 1,
                visibility: i % 2 === 0 ? "visible" : "hidden",
                alignSelf: "center",
              }}
            >
              {lbl}
            </span>
          ))}
        </div>

        {/* The grid itself */}
        <div
          role="img"
          aria-label={ariaLabel}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${weekCount}, minmax(10px, 1fr))`,
            gridTemplateRows: "repeat(7, minmax(10px, 1fr))",
            gridAutoFlow: "column",
            gap: "3px",
          }}
        >
          {cells.map((c, i) => {
            const style = cellColor(c.inYear ? c.count : 0);
            const isPlaceholder = !c.inYear;
            let tooltip: string;
            if (isPlaceholder) {
              tooltip = c.date;
            } else if (c.count === 0) {
              tooltip = labels.tooltipEmpty.replace("{date}", c.date);
            } else if (c.count === 1) {
              tooltip = labels.tooltipOne.replace("{date}", c.date);
            } else {
              tooltip = labels.tooltipOther
                .replace("{date}", c.date)
                .replace("{count}", String(c.count));
            }
            return (
              <div
                key={i}
                title={tooltip}
                role="gridcell"
                aria-hidden={isPlaceholder}
                style={{
                  aspectRatio: "1",
                  minWidth: "10px",
                  borderRadius: "2px",
                  backgroundColor: style.bg,
                  border: style.border,
                  opacity: isPlaceholder ? 0.35 : 1,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Invisible sanity hint for screen readers when the year is empty */}
      {inYearCount === 0 && (
        <span className="sr-only">{ariaLabel}</span>
      )}
    </div>
  );
}
