"use client";

/**
 * LevelBadge — compact level indicator for the navbar.
 *
 * Shows "Lv. N" with a tier-aware ink shade:
 *   1–3  → muted    (Lehrling tier)
 *   4–6  → ink-2    (Meister tier)
 *   7+   → ink      (Experte/Legende tier)
 *
 * Displays the level title on hover as a tooltip.
 */

interface LevelBadgeProps {
  level: number;
  title: string;
}

/**
 * Tier-Farbe eines Levels — eine Ink-Leiter, keine Bedeutungsfarben.
 *
 * Vorher: ab Level 4 --accent-green, ab Level 7 --accent-amber, ab Level 10
 * violett. Zwei davon sind Verstöße, die sich auf JEDER Seite zeigen:
 * Chrome ist ausschließlich Ink (Spec §5), und --done heißt ausschließlich
 * "erledigt" — ein Level ist nichts Erledigtes. Die Stufen bleiben
 * unterscheidbar, nur über Helligkeit statt über Farbe.
 *
 * Das Violett für Legendary lebt weiter auf /achievements, wo eine
 * Seltenheitsstufe Inhalt ist und keine Navigation. Diese Seite ist
 * Phase 2.
 */
function tierColor(level: number): string {
  if (level >= 10) return "var(--ink)";
  if (level >= 7) return "var(--ink)";
  if (level >= 4) return "var(--ink-2)";
  return "var(--ink-3)";
}

/** Fläche der Badge-Pille — eine Stufe für alle Tiers, die Unterscheidung steckt in `tierColor`. */
function tierBg(): string {
  return "color-mix(in srgb, var(--ink) 8%, transparent)";
}

/** Kante der Badge-Pille — eine Stufe für alle Tiers. */
function tierBorder(): string {
  return "color-mix(in srgb, var(--ink) 20%, transparent)";
}

/**
 * Compact level badge displayed in the navbar alongside the coin counter.
 */
export function LevelBadge({ level, title }: LevelBadgeProps) {
  const color = tierColor(level);
  const bg = tierBg();
  const border = tierBorder();

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
