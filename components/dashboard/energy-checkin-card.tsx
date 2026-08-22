"use client";

/**
 * EnergyCheckinCard — the dashboard's meta line (weekday · energy · streak).
 *
 * Replaces the old prompt that lived inside DailyQuestCard, which was bound
 * to `!quest` and therefore practically invisible to anyone with at least
 * one eligible task.
 *
 * Fix round 2 (2026-08-22): Task 6 said "merge the energy check-in into the
 * meta line" but only did half the job — once energy was SET, the meta line
 * showed it as a quiet text button; until it was set, a separate 177px block
 * (heading + three filled tiles) appeared above the quest instead. That
 * block was fix round 1's finding: the only filled surfaces left on the
 * page, sitting directly above the one thing that must arrive first. This
 * round finishes the merge instead of just shrinking the tiles: there is no
 * card anymore, checked-in or not.
 *
 *  1. **Already checked in, not expanded**: the meta line reads
 *     "saturday · Medium", where "Medium" is a quiet text button
 *     (`meta_energy_change_aria`) that reopens the choice. Unchanged from
 *     round 1.
 *  2. **Not checked in, or expanded to change**: the meta line instead reads
 *     "saturday · High energy · Medium · Low energy" — the three levels as
 *     quiet text actions, in the same register as the quest's own
 *     "Complete" / "aufteilen" / "Not today" row. No tiles, no icons, no
 *     `--raised` fill on any of them — they are peers being chosen among,
 *     not a primary action, so none of them gets a surface. Only the
 *     currently-selected one (when changing an existing check-in) is marked,
 *     via weight + a checkmark, not colour.
 *
 * Fix round 3 (2026-08-22): round 2 grew each choice's tap target with
 * `-my-4 py-4` — real padding cancelled by an equal negative margin, so the
 * clickable box was bigger than the space it reserved in layout. At 375px
 * the row wraps, and the two invisible overflow regions of the first and
 * last choice then overlapped each other across the wrap boundary — worst
 * in German ("Viel Energie" / "Wenig Energie", 31×32px overlap), because a
 * longer label pushes the wrap point earlier. Whichever choice sits later
 * in the DOM wins ties in that overlap, so a tap on "Wenig Energie" could
 * register as "Viel Energie" — the opposite of what was pressed. Fixed by
 * dropping the negative margin: `py-4` is now genuine padding on a real
 * `inline-flex flex-wrap` row, so the browser's own box layout — not an
 * invisible bleed past the box edge — is what makes each target ≥44px
 * tall, and wrapped rows are pushed apart by their own real height instead
 * of colliding. Verified at 375×800 in de/ru/en: zero pairwise overlap.
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
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type EnergyLevel = "HIGH" | "MEDIUM" | "LOW";

const LEVELS: readonly EnergyLevel[] = ["HIGH", "MEDIUM", "LOW"];

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

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Meta line, including the energy check-in when it's still open for today.
 *
 * Self-contained: handles its own API call, state, and post-checkin
 * notification. After a successful check-in it triggers `router.refresh()`
 * so the parent dashboard pulls the (possibly new) quest and re-renders
 * DailyQuestCard with fresh data — the meta line's own text
 * (weekday/streak/insight) also comes from that refreshed props.
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
   * collapses the choices, and shows a transient swap notification if the
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

  // Show the choices whenever there's nothing checked in yet, or the user
  // asked to change today's level by clicking the word in the meta line.
  const showChoices = !isCheckedInToday || expanded;

  return (
    <>
      {/* ── Metazeile: Wochentag, Energie, Streak ─────────────────────────
          Ersetzt drei fruehere Flaechen (Energie-Karte, Insight-Chip,
          Stat-Tiles). Alles Mono, alles gedimmt — es ist Kontext, keine
          Handlung, mit EINER Ausnahme: das Energiewort selbst ist die
          Aenderungs-Kontrolle (Task 6 round 2) — kein zweites Element dafuer.
          Fix round 2: die drei Wahlmoeglichkeiten leben jetzt IN dieser
          Zeile statt in einer eigenen Flaeche darunter — kein Kasten mehr in
          keinem der beiden Zustaende. */}
      <div
        data-testid="quest-meta"
        className="flex items-center gap-3 flex-wrap font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] text-[var(--ink-3)]"
      >
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-1">
          <span>{weekdayLabel} ·</span>
          {showChoices ? (
            submitting !== null ? (
              <span aria-live="polite">{t("energy_checking_in")}</span>
            ) : (
              <span
                className="inline-flex flex-wrap items-center gap-x-1 gap-y-1 align-middle"
                role="group"
                aria-label={t("energy_checkin_title")}
              >
                {LEVELS.map((level, i) => {
                  const isCurrent = isCheckedInToday && energyLevel === level;
                  const label = t(
                    `energy_${level.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low"
                  );
                  return (
                    <span key={level} className="inline-flex items-center">
                      {i > 0 && (
                        <span aria-hidden="true" className="mr-1 text-[var(--ink-3)]">
                          ·
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => submitCheckin(level)}
                        aria-pressed={isCurrent}
                        aria-label={t("meta_energy_set_aria", { level: label })}
                        className={cn(
                          "inline-flex cursor-pointer items-center rounded-[var(--radius-sm)] border-0 bg-transparent px-1.5 py-4",
                          "font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] transition-colors",
                          "hover:bg-[var(--raised)] hover:underline underline-offset-2",
                          isCurrent ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-2)]"
                        )}
                      >
                        {isCurrent && "✓ "}
                        {label}
                      </button>
                    </span>
                  );
                })}
              </span>
            )
          ) : (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={t("meta_energy_change_aria", { level: energyWord })}
              className="bg-transparent border-0 p-0 m-0 cursor-pointer font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] text-[var(--ink-2)] hover:underline underline-offset-2"
            >
              {energyWord}
            </button>
          )}
        </span>
        {streakText && <span>· {streakText}</span>}
        {bestDayInsight && <span>· {bestDayInsight}</span>}
      </div>

      {/* Swap notification — quiet text, no fill or border (fix round 2):
          previously lived inside the now-deleted picker card with a
          --raised/--hairline treatment; that made sense for a box that
          already existed, but building a new box just to host this transient
          line would reintroduce exactly the surface fix round 1 removed. */}
      <AnimatePresence>
        {swapNotice && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="m-0 flex items-center gap-2 overflow-hidden font-[family-name:var(--font-mono)] text-[0.6875rem] text-[var(--ink-3)]"
          >
            <span className="truncate">
              {t("energy_card_swapped", { title: swapNotice.previousTitle })}
            </span>
            <button
              type="button"
              onClick={handleUndoSwap}
              className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[var(--ink-2)] underline hover:text-[var(--ink)]"
            >
              {t("energy_card_swapped_undo")}
            </button>
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
