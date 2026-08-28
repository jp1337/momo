import { cn } from "@/lib/utils";

/**
 * WeekdayChart — 7-column bar chart showing completions by weekday.
 *
 * Pure server component. Renders CSS grid bars, no chart library.
 * Highlights the best day with the ink color scale (no amber — the
 * page's one amber is `streak-sparkline.tsx`'s "today" label).
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
    <div className="flex flex-col gap-4">
      {/* Bar chart */}
      <div
        className="grid h-[80px] items-end gap-2 [grid-template-columns:repeat(7,1fr)]"
        role="img"
        aria-label={bestDayLabel}
      >
        {data.map((value, i) => {
          const pct = max > 0 ? (value / max) * 100 : 0;
          const isBest = i === bestIdx && hasData;
          return (
            <div key={i} className="flex h-full flex-col items-center justify-end gap-1">
              <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--ink-3)]">
                {value > 0 ? value : ""}
              </span>
              {/* `role="gridcell"` ist die benannte Diagramm-Ausnahme, die
                  `countBoxes` prüft: eine Marke IST eine gefüllte Fläche, per
                  Definition — ihre Höhe kodiert die Abschlusszahl. Ohne sie
                  zählt jeder der sieben Balken als Kasten. Dieselbe Ausnahme,
                  die `contribution-grid.tsx` seit Task 11 benutzt. */}
              <div
                role="gridcell"
                className={cn(
                  "w-full max-w-[32px]",
                  isBest ? "bg-[var(--ink-2)]" : "bg-[var(--hairline)]",
                )}
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
          );
        })}
      </div>

      {/* Weekday labels */}
      <div className="grid gap-2 [grid-template-columns:repeat(7,1fr)]">
        {labels.map((label, i) => (
          <span
            key={i}
            className="text-center font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Best day annotation */}
      {hasData && (
        <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
          <span>{bestDayLabel}:</span>
          <span className="text-[var(--ink)]">{labels[bestIdx]}</span>
          <span>— {bestDayCount}</span>
        </div>
      )}
    </div>
  );
}
