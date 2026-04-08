/**
 * EnergyWeekBlock — weekly energy summary for the Stats page.
 *
 * Shows three count pills (HIGH / MEDIUM / LOW) for the last 7 days plus a
 * 14-day mini-chart so the user can spot patterns ("most LOW days are
 * Mondays") without ever leaving the Stats page.
 *
 * Pure server component — receives pre-fetched data via props from
 * `app/(app)/stats/page.tsx`.
 */

import type { EnergyCheckin, EnergyLevelCounts } from "@/lib/energy";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EnergyWeekBlockProps {
  /** Counts per level for the last 7 days. */
  weekCounts: EnergyLevelCounts;
  /** Last 14 days of one-per-day check-ins (oldest → newest). */
  history: EnergyCheckin[];
  /** True iff the user has zero historical check-ins overall. */
  isEmpty: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Visual identity per energy level — colors and emoji icons. */
const LEVEL_META: Record<
  "HIGH" | "MEDIUM" | "LOW",
  { color: string; icon: string; labelDe: string }
> = {
  HIGH: { color: "var(--accent-amber)", icon: "⚡", labelDe: "Hoch" },
  MEDIUM: { color: "var(--accent-green)", icon: "☀", labelDe: "Mittel" },
  LOW: { color: "var(--text-muted)", icon: "🌙", labelDe: "Niedrig" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Builds a 14-element array of slots aligned to the last 14 calendar days
 * (oldest → newest), each containing the level (or null) recorded on that
 * day. Days without a check-in are rendered as a thin neutral bar.
 */
function buildChartSlots(history: EnergyCheckin[]): Array<{
  date: string;
  level: "HIGH" | "MEDIUM" | "LOW" | null;
}> {
  const byDate = new Map(history.map((h) => [h.date, h.level]));
  const slots: Array<{ date: string; level: "HIGH" | "MEDIUM" | "LOW" | null }> = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    // Use the same en-CA YYYY-MM-DD format that the rest of the app uses.
    const key = d.toLocaleDateString("en-CA");
    slots.push({ date: key, level: byDate.get(key) ?? null });
  }
  return slots;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Weekly energy summary block. Renders the three count pills + the
 * 14-day mini-chart, or an empty-state hint if the user has never
 * checked in.
 */
export function EnergyWeekBlock({ weekCounts, history, isEmpty }: EnergyWeekBlockProps) {
  if (isEmpty) {
    return (
      <div
        className="rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Noch keine Energie-Daten — checke dich morgens ein, dann siehst du hier dein Muster.
        </p>
      </div>
    );
  }

  const slots = buildChartSlots(history);

  return (
    <div
      className="rounded-xl p-6 flex flex-col gap-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Three count pills — last 7 days */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(LEVEL_META) as Array<"HIGH" | "MEDIUM" | "LOW">).map((level) => {
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
              <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>
                {meta.icon}
              </span>
              <div className="flex flex-col">
                <span
                  className="text-xs uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  {meta.labelDe}
                </span>
                <span
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "var(--font-display, 'Lora', serif)",
                    color: meta.color,
                  }}
                >
                  {count}d
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 14-day mini-chart — column per day, height fixed, color = level */}
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wider mb-2"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Letzte 14 Tage
        </p>
        <div
          className="grid items-end gap-1.5"
          style={{ gridTemplateColumns: "repeat(14, 1fr)", height: "44px" }}
          role="img"
          aria-label="14-Tage Energie-Verlauf"
        >
          {slots.map((slot, i) => {
            const meta = slot.level ? LEVEL_META[slot.level] : null;
            const height = slot.level === "HIGH" ? "100%" : slot.level === "MEDIUM" ? "65%" : slot.level === "LOW" ? "35%" : "12%";
            return (
              <div
                key={i}
                title={`${slot.date}${slot.level ? ` — ${LEVEL_META[slot.level].labelDe}` : " — kein Check-in"}`}
                style={{
                  height,
                  borderRadius: "3px",
                  backgroundColor: meta
                    ? `color-mix(in srgb, ${meta.color} 70%, transparent)`
                    : "var(--bg-elevated)",
                  border: meta
                    ? `1px solid color-mix(in srgb, ${meta.color} 50%, transparent)`
                    : "1px solid var(--border)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
