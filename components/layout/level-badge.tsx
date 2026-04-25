"use client";

/**
 * LevelBadge — compact level indicator for the navbar.
 *
 * Shows "Lv. N" with a tier-aware color:
 *   1–3  → muted (Lehrling tier)
 *   4–6  → green  (Meister tier)
 *   7–9  → amber  (Experte tier)
 *   10   → legendary purple (Legende tier)
 *
 * Displays the level title on hover as a tooltip.
 */

interface LevelBadgeProps {
  level: number;
  title: string;
}

function tierColor(level: number): string {
  if (level >= 10) return "var(--rarity-legendary)";
  if (level >= 7) return "var(--accent-amber)";
  if (level >= 4) return "var(--accent-green)";
  return "var(--text-muted)";
}

function tierBg(level: number): string {
  if (level >= 10) return "color-mix(in srgb, var(--rarity-legendary) 12%, transparent)";
  if (level >= 7) return "color-mix(in srgb, var(--accent-amber) 12%, transparent)";
  if (level >= 4) return "color-mix(in srgb, var(--accent-green) 12%, transparent)";
  return "color-mix(in srgb, var(--text-muted) 10%, transparent)";
}

function tierBorder(level: number): string {
  if (level >= 10) return "color-mix(in srgb, var(--rarity-legendary) 30%, transparent)";
  if (level >= 7) return "color-mix(in srgb, var(--accent-amber) 30%, transparent)";
  if (level >= 4) return "color-mix(in srgb, var(--accent-green) 30%, transparent)";
  return "color-mix(in srgb, var(--text-muted) 20%, transparent)";
}

/**
 * Compact level badge displayed in the navbar alongside the coin counter.
 */
export function LevelBadge({ level, title }: LevelBadgeProps) {
  const color = tierColor(level);
  const bg = tierBg(level);
  const border = tierBorder(level);

  return (
    <span
      title={title}
      aria-label={`Level ${level}: ${title}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        height: "36px",
        padding: "0 10px",
        borderRadius: "8px",
        border: `1px solid ${border}`,
        backgroundColor: bg,
        fontFamily: "var(--font-ui)",
        fontSize: "0.78rem",
        fontWeight: 700,
        color,
        letterSpacing: "0.02em",
        cursor: "default",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.7, fontSize: "0.65rem" }}>Lv.</span>
      <span>{level}</span>
    </span>
  );
}
