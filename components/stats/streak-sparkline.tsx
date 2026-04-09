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
  const stepX = width / (data.length - 1 || 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: padTop + chartH - (v / max) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height} L0,${height} Z`;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* SVG Sparkline */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: "52px" }}
        role="img"
        aria-label="Streak history sparkline"
        preserveAspectRatio="none"
      >
        {/* Filled area */}
        <path
          d={areaPath}
          fill="color-mix(in srgb, var(--accent-amber) 15%, transparent)"
        />
        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent-amber)"
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
          fill="var(--accent-amber)"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Labels */}
      <div className="flex justify-between">
        <span
          className="text-xs font-medium"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--accent-amber)",
          }}
        >
          {todayLabel}
        </span>
        <span
          className="text-xs font-medium"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {peakLabel}
        </span>
      </div>
    </div>
  );
}
