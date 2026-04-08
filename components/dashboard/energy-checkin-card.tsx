"use client";

/**
 * EnergyCheckinCard — inline check-in widget at the top of the dashboard.
 *
 * Replaces the old prompt that lived inside DailyQuestCard, which was bound
 * to `!quest` and therefore practically invisible to anyone with at least
 * one eligible task.
 *
 * Renders in two states:
 *  1. **Not checked in** (no entry for today's local date): three large
 *     buttons HIGH / MEDIUM / LOW. Clicking one POSTs to /api/energy-checkin
 *     and the server may swap the daily quest for a better-matching task.
 *  2. **Already checked in**: collapses to a thin status bar showing the
 *     current level + an "Edit" button to expand back into picker mode.
 *
 * Why "today" is computed client-side: `users.energyLevelDate` is written
 * with the user's local date (via `getLocalDateString(timezone)` on the
 * server), but the dashboard SSR has no access to the user's IANA timezone
 * — comparing the raw date string against `new Date().toISOString()` (UTC)
 * was the source of the previous timezone bug. Doing the comparison in the
 * browser, where we know the real local timezone, sidesteps the issue
 * entirely without needing a `users.timezone` column.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

interface EnergyCheckinCardProps {
  /** Cached level on `users.energyLevel` — may be from any past day. */
  energyLevel: EnergyLevel | null;
  /** Cached date `users.energyLevelDate` — raw "YYYY-MM-DD" string. */
  energyLevelDate: string | null;
}

/** Shape of the response from POST /api/energy-checkin */
interface CheckinResponse {
  swapped: boolean;
  previousQuestId?: string;
  previousQuestTitle?: string;
  error?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns today's local date as a YYYY-MM-DD string, computed in the
 * browser's actual timezone (not UTC). The "en-CA" locale gives us the
 * ISO 8601 format we want.
 */
function clientLocalToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Visual style metadata for each energy level button. */
const LEVEL_STYLES: Record<
  EnergyLevel,
  { color: string; icon: string }
> = {
  HIGH: { color: "var(--accent-amber)", icon: "⚡" },
  MEDIUM: { color: "var(--accent-green)", icon: "☀" },
  LOW: { color: "var(--text-muted)", icon: "🌙" },
};

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Inline energy check-in card.
 *
 * Self-contained: handles its own API call, state, and post-checkin
 * notification banner. After a successful check-in it triggers
 * `router.refresh()` so the parent dashboard pulls the (possibly new)
 * quest and re-renders DailyQuestCard with fresh data.
 */
export function EnergyCheckinCard({
  energyLevel,
  energyLevelDate,
}: EnergyCheckinCardProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();

  // Compute "is today" in the browser's local timezone — this is the
  // fix for the SSR UTC-vs-local mismatch that caused the previous bug.
  const today = clientLocalToday();
  const isCheckedInToday = energyLevelDate === today && energyLevel !== null;

  // UI state
  const [expanded, setExpanded] = useState(!isCheckedInToday);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState<EnergyLevel | null>(null);
  const [swapNotice, setSwapNotice] = useState<{
    previousId: string;
    previousTitle: string;
  } | null>(null);

  /**
   * Sends the check-in to the server. On success: refreshes the dashboard,
   * collapses the card, and shows a transient swap notification if the
   * daily quest changed.
   */
  async function submitCheckin(level: EnergyLevel) {
    if (submitting) return;
    setSubmitting(level);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/energy-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyLevel: level, timezone }),
      });

      const data = (await res.json()) as CheckinResponse;
      if (!res.ok) {
        console.error("Energy check-in failed:", data.error);
        return;
      }

      if (data.swapped && data.previousQuestId && data.previousQuestTitle) {
        setSwapNotice({
          previousId: data.previousQuestId,
          previousTitle: data.previousQuestTitle,
        });
      } else {
        setSwapNotice(null);
      }

      setExpanded(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      console.error("Error during energy check-in:", err);
    } finally {
      setSubmitting(null);
    }
  }

  /** Restores the previous quest after a swap (Undo link). */
  async function handleUndoSwap() {
    if (!swapNotice || pending) return;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/daily-quest/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: swapNotice.previousId, timezone }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        console.error("Undo failed:", data.error);
        return;
      }
      setSwapNotice(null);
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Error undoing quest swap:", err);
    }
  }

  // ── Collapsed status bar ────────────────────────────────────────────────
  if (isCheckedInToday && !expanded) {
    const style = LEVEL_STYLES[energyLevel];
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl px-4 py-2.5 flex items-center justify-between gap-3"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: `1px solid color-mix(in srgb, ${style.color} 25%, var(--border))`,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span aria-hidden="true" style={{ fontSize: "1.1rem" }}>
            {style.icon}
          </span>
          <span
            className="text-sm truncate"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("energy_card_subtitle_collapsed", {
              level: t(`energy_${energyLevel.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low"),
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-opacity duration-150"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: style.color,
            backgroundColor: `color-mix(in srgb, ${style.color} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${style.color} 25%, transparent)`,
          }}
        >
          {t("energy_card_change")}
        </button>

        {/* Swap notification — shown briefly after a successful re-roll */}
        <AnimatePresence>
          {swapNotice && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute"
            />
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ── Expanded picker ─────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex flex-col gap-1">
        <h3
          className="text-base font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            fontStyle: "italic",
            color: "var(--text-primary)",
          }}
        >
          {t("energy_checkin_title")}
        </h3>
        <p
          className="text-xs"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("energy_checkin_subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5" role="group" aria-label={t("energy_checkin_title")}>
        {(Object.keys(LEVEL_STYLES) as EnergyLevel[]).map((level) => {
          const style = LEVEL_STYLES[level];
          const isCurrent = isCheckedInToday && energyLevel === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => submitCheckin(level)}
              disabled={submitting !== null}
              aria-pressed={isCurrent}
              className="flex-1 min-w-[90px] px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: isCurrent
                  ? `color-mix(in srgb, ${style.color} 18%, var(--bg-elevated))`
                  : `color-mix(in srgb, ${style.color} 8%, var(--bg-elevated))`,
                border: `1px solid color-mix(in srgb, ${style.color} ${isCurrent ? 50 : 25}%, var(--border))`,
                color: style.color,
              }}
            >
              <span className="block text-lg mb-1" aria-hidden="true">
                {style.icon}
              </span>
              {t(`energy_${level.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low")}
            </button>
          );
        })}
      </div>

      {submitting && (
        <p
          className="text-xs text-center"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
          aria-live="polite"
        >
          {t("energy_checking_in")}
        </p>
      )}

      {/* Swap notification — visible while in picker mode after a re-roll */}
      <AnimatePresence>
        {swapNotice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-amber) 10%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            <span className="truncate">
              {t("energy_card_swapped", { title: swapNotice.previousTitle })}
            </span>
            <button
              type="button"
              onClick={handleUndoSwap}
              className="flex-shrink-0 underline cursor-pointer"
              style={{ color: "var(--accent-amber)" }}
            >
              {t("energy_card_swapped_undo")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
