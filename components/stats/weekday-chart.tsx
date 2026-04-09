/**
 * WeekdayChart — 7-column bar chart showing completions by weekday.
 *
 * Pure server component. Renders CSS grid bars, no chart library.
 * Highlights the best day with the accent color.
 */

interface WeekdayChartProps {
  /** Completions per weekday, 7 elements (0=Mon … 6=Sun) */
  data: number[];
  /** Translated weekday labels (Mon–Sun) */
  labels: string[];
  /** Label for the "Best day" annotation */
  bestDayLabel: string;
  /** Formatted "{count} completions" string for the best day */
  bestDayCount: string;
}

/**
 * Bar chart showing task completions by day of the week.
 *
 * @param props - Weekday data and localized labels
 */
export function WeekdayChart({
  data,
  labels,
  bestDayLabel,
  bestDayCount,
}: WeekdayChartProps) {
  const max = Math.max(...data, 1);
  const bestIdx = data.indexOf(Math.max(...data));
  const hasData = data.some((v) => v > 0);

  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Bar chart */}
      <div
        className="grid items-end gap-2"
        style={{ gridTemplateColumns: "repeat(7, 1fr)", height: "80px" }}
        role="img"
        aria-label="Completions by weekday"
      >
        {data.map((value, i) => {
          const pct = max > 0 ? (value / max) * 100 : 0;
          const isBest = i === bestIdx && hasData;
          return (
            <div key={i} className="flex flex-col items-center gap-1 h-full justify-end">
              {/* Value label */}
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: isBest ? "var(--accent-amber)" : "var(--text-muted)",
                  fontSize: "0.65rem",
                }}
              >
                {value > 0 ? value : ""}
              </span>
              {/* Bar */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "32px",
                  height: `${Math.max(pct, 4)}%`,
                  borderRadius: "4px 4px 2px 2px",
                  backgroundColor: isBest
                    ? "var(--accent-amber)"
                    : "color-mix(in srgb, var(--accent-green) 50%, var(--bg-elevated))",
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Weekday labels */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
      >
        {labels.map((label, i) => {
          const isBest = i === bestIdx && hasData;
          return (
            <span
              key={i}
              className="text-center text-xs font-medium"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: isBest ? "var(--accent-amber)" : "var(--text-muted)",
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Best day annotation */}
      {hasData && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {bestDayLabel}:
          </span>
          <span
            className="text-xs font-semibold"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
            }}
          >
            {labels[bestIdx]} — {bestDayCount}
          </span>
        </div>
      )}
    </div>
  );
}
