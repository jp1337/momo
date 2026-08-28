/**
 * StreakSparkline — SVG sparkline showing streak history over time.
 *
 * Pure server component. Renders an inline SVG with a line + filled area.
 * No client-side JS, no chart library.
 */

interface StreakSparklineProps {
  /** Array of streak values, oldest → newest */
  data: number[];
  /** Label for today's streak value */
  todayLabel: string;
  /** Label for the peak streak value */
  peakLabel: string;
}

/**
 * SVG sparkline chart for streak history.
 *
 * @param props - Streak data and localized labels
 */
export function StreakSparkline({ data, todayLabel, peakLabel }: StreakSparklineProps) {
  if (data.length === 0 || data.every((v) => v === 0)) {
    return null;
  }

  const width = 400;
  const height = 52;
  const padTop = 4;
  const padBottom = 2;
  const chartH = height - padTop - padBottom;

  const max = Math.max(...data, 1);
  // Rechts bleibt Platz für den Punkt am Ende der Linie (Task 4): sein
  // Mittelpunkt lag vorher exakt auf `width`, also hing seine halbe Fläche
  // über der Lesespalte — bei `preserveAspectRatio="none"` und 640px Maß
  // gemessene 5px. Das ist kein gewollter Ausbruch (der trüge
  // `data-breakout`), sondern ein Rand, der fehlte; sichtbar wurde er erst,
  // als /progress?tab=stats in `MIGRATED_PAGES` kam. `padRight` ist größer
  // als `r`, damit der Punkt auch nach der horizontalen Streckung innen
  // bleibt.
  const padRight = 4;
  const stepX = (width - padRight) / (data.length - 1 || 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: padTop + chartH - (v / max) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L0,${height} Z`;

  return (
    <div className="flex flex-col gap-3">
      {/* SVG Sparkline */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[52px]"
        role="img"
        aria-label="Streak history sparkline"
        preserveAspectRatio="none"
      >
        {/* Filled area */}
        <path
          d={areaPath}
          fill="color-mix(in srgb, var(--ink-3) 18%, transparent)"
        />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--ink-2)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Current value dot */}
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="3"
          fill="var(--ink-2)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Labels */}
      <div className="flex justify-between font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] tabular-nums">
        <span className="text-[var(--amber)]">{todayLabel}</span>
        <span className="text-[var(--ink-3)]">{peakLabel}</span>
      </div>
    </div>
  );
}
