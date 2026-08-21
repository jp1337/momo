"use client";

/**
 * EnergyCheckinCard — the dashboard's meta line (weekday · energy · streak)
 * plus the check-in picker that appears beneath it.
 *
 * Replaces the old prompt that lived inside DailyQuestCard, which was bound
 * to `!quest` and therefore practically invisible to anyone with at least
 * one eligible task.
 *
 * Renders the meta line's `data-testid="quest-meta"` row unconditionally,
 * then one of two things below it:
 *  1. **Not checked in** (no entry for today's local date): three large
 *     buttons HIGH / MEDIUM / LOW. Clicking one POSTs to /api/energy-checkin
 *     and the server may swap the daily quest for a better-matching task.
 *  2. **Already checked in, not expanded**: nothing. The meta line already
 *     states today's energy level in plain text — a second status bar here
 *     would repeat the same fact ~65px away (Task 6 round 1 finding). The
 *     energy word IN the meta line is itself a button (Task 6 round 2
 *     finding): clicking it sets `expanded`, which reopens the same picker
 *     as case 1 so the level can be changed. The meta line stays the one
 *     place energy lives on the page — it is both the display and the
 *     control for it.
 *
 * Why "today" is computed client-side: `users.energyLevelDate` is written
 * with the user's local date (via `getLocalDateString(timezone)` on the
 * server), but the dashboard SSR has no access to the user's IANA timezone
 * — comparing the raw date string against `new Date().toISOString()` (UTC)
 * was the source of the previous timezone bug. Doing the comparison in the
 * browser, where we know the real local timezone, sidesteps the issue
 * entirely without needing a `users.timezone` column. This component still
 * owns that comparison exclusively — the weekday/streak/insight text it
 * receives as props is presentational only and never decides "is this
 * already set for today?".
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

interface EnergyCheckinCardProps {
  /** Cached level on `users.energyLevel` — may be from any past day. */
  energyLevel: EnergyLevel | null;
  /** Cached date `users.energyLevelDate` — raw "YYYY-MM-DD" string. */
  energyLevelDate: string | null;
  /** Pre-translated weekday word, e.g. "friday" / "freitag". */
  weekdayLabel: string;
  /** Pre-formatted streak fragment, e.g. "5 Tage Serie" — omit (null) at a
   *  zero streak: a "0 days streak" line is a daily reproach, not a fact
   *  worth stating, for an app built for people who avoid and procrastinate. */
  streakText: string | null;
  /** Pre-translated best-day insight sentence, or null when not applicable. */
  bestDayInsight: string | null;
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

/**
 * Icon per energy level. Fix round 1 (2026-08-21): the three buttons used
 * to be colour-coded (HIGH amber, MEDIUM green, LOW muted) so that whenever
 * the picker was open — i.e. the user had not checked in yet today — the
 * dashboard silently had a second amber element next to the quest's "start
 * now", breaking the "exactly one" rule for a very common first-visit-of-
 * the-day state. HIGH/MEDIUM/LOW are a choice among peers, not a primary
 * action or a "done" state, so none of them should carry an accent colour
 * at all; the icon alone identifies the level, and selection is shown by
 * weight/border/checkmark instead (see the button markup below).
 */
const LEVEL_ICONS: Record<EnergyLevel, string> = {
  HIGH: "⚡",
  MEDIUM: "☀",
  LOW: "🌙",
};

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Meta line + energy check-in picker.
 *
 * Self-contained: handles its own API call, state, and post-checkin
 * notification banner. After a successful check-in it triggers
 * `router.refresh()` so the parent dashboard pulls the (possibly new)
 * quest and re-renders DailyQuestCard with fresh data — the meta line's
 * own text (weekday/streak/insight) also comes from that refreshed props.
 */
export function EnergyCheckinCard({
  energyLevel,
  energyLevelDate,
  weekdayLabel,
  streakText,
  bestDayInsight,
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
        // keep expanded so the user can see the swap notice and hit Undo
      } else {
        setSwapNotice(null);
        setExpanded(false);
      }
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

  const energyWord =
    isCheckedInToday && energyLevel
      ? t(`energy_${energyLevel.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low")
      : t("meta_energy_unknown");

  // Show the picker whenever there's nothing checked in yet, or the user
  // asked to change today's level by clicking the word in the meta line.
  const showPicker = !isCheckedInToday || expanded;

  return (
    <>
      {/* ── Metazeile: Wochentag, Energie, Streak ─────────────────────────
          Ersetzt drei fruehere Flaechen (Energie-Karte, Insight-Chip,
          Stat-Tiles). Alles Mono, alles gedimmt — es ist Kontext, keine
          Handlung, mit EINER Ausnahme: das Energiewort selbst ist die
          Aenderungs-Kontrolle (Task 6 round 2) — kein zweites Element dafuer. */}
      <div
        data-testid="quest-meta"
        className="flex items-center gap-3 flex-wrap font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] text-[var(--ink-3)]"
      >
        <span>
          {weekdayLabel} ·{" "}
          {isCheckedInToday ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t("meta_energy_change_aria", { level: energyWord })}
              className="bg-transparent border-0 p-0 m-0 cursor-pointer font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] text-[var(--ink-2)] hover:underline underline-offset-2"
            >
              {energyWord}
            </button>
          ) : (
            energyWord
          )}
        </span>
        {streakText && <span>· {streakText}</span>}
        {bestDayInsight && <span>· {bestDayInsight}</span>}
      </div>

      {showPicker && (
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
            {(Object.keys(LEVEL_ICONS) as EnergyLevel[]).map((level) => {
              const isCurrent = isCheckedInToday && energyLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => submitCheckin(level)}
                  disabled={submitting !== null}
                  aria-pressed={isCurrent}
                  className={`flex-1 min-w-[90px] rounded-[var(--radius-md)] border bg-[var(--raised)] px-3 py-3 text-sm transition-all
                    duration-150 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer font-[family-name:var(--font-ui)] ${
                    isCurrent
                      ? "border-[var(--ink-2)] font-semibold text-[var(--ink)]"
                      : "border-[var(--hairline)] font-medium text-[var(--ink-2)]"
                  }`}
                >
                  <span className="block text-lg mb-1" aria-hidden="true">
                    {LEVEL_ICONS[level]}
                  </span>
                  {isCurrent && <span aria-hidden="true">✓ </span>}
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

          {/* Swap notification — visible while in picker mode after a re-roll.
              Fixed alongside the picker buttons above (fix round 1): this
              also carried --accent-amber as a second accent, which the
              amber-once rule does not allow — moved to the same quiet
              --raised/--hairline/--ink-2 treatment as everything else that
              isn't the page's one action. */}
          <AnimatePresence>
            {swapNotice && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--hairline)]
                  bg-[var(--raised)] px-3 py-2 text-xs font-[family-name:var(--font-ui)] text-[var(--ink)]"
              >
                <span className="truncate">
                  {t("energy_card_swapped", { title: swapNotice.previousTitle })}
                </span>
                <button
                  type="button"
                  onClick={handleUndoSwap}
                  className="flex-shrink-0 cursor-pointer text-[var(--ink-2)] underline hover:text-[var(--ink)]"
                >
                  {t("energy_card_swapped_undo")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
