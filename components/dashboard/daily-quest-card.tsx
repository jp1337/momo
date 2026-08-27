"use client";

/**
 * DailyQuestCard component — the page's one lit thing on the dashboard.
 *
 * Task 7 ("Lichtkegel"): the quest is no longer a bordered, shadowed card.
 * It has no background, no border and no shadow — it sits directly on
 * `--ground`, lit from above by a wide, soft amber wash (`.lichtkegel` in
 * globals.css) and headlined in large Fraunces. That headline is this
 * page's `<h1>` — the dashboard greeting above it was demoted to `<p>` in
 * the same change (see `app/(app)/dashboard/page.tsx`), so all three quest
 * states below render the identical `data-testid="quest-title"` `<h1>` and
 * the page never has more than one.
 *
 * Amber budget: exactly one element on the dashboard may carry amber as a
 * text colour — the "jetzt anfangen" / quest_start action below, plus the
 * light pool itself (a background gradient, not a text colour). Every
 * other formerly-amber element here (eyebrow label, priority badge,
 * bonus-coin chip) has moved to `--ink-3`, or been dropped.
 *
 * Features:
 * - Displays the current daily quest task, its topic tag and effort badges
 * - Action row is quiet text, not filled buttons — "Complete" and
 *   "Not today" used to be a green-filled and a grey-filled button; both
 *   are text now so they don't compete with the one amber action
 * - "Complete": calls POST /api/tasks/:id/complete and shows celebration
 * - "Not today": calls POST /api/daily-quest/postpone and refreshes
 * - "aufteilen" (breakdown): opens TaskBreakdownModal for the quest task
 * - Empty state and celebration (completed) state — both still render the
 *   page's h1, in the empty state as the "no quest" text, in the completed
 *   state as the struck-through, dimmed title
 * - At full strength on arrival; only the surrounding sections settle in after
 *
 * Receives all data as props — no direct data fetching.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";
import { triggerConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";
import { EmotionalClosure } from "@/components/animations/emotional-closure";
import { TaskBreakdownModal } from "@/components/tasks/task-breakdown-modal";
import { stageTitleClassName } from "@/components/ui/list";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  title: string;
  color: string | null;
  icon: string | null;
}

interface QuestTask {
  id: string;
  title: string;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  coinValue: number;
  completedAt: string | null;
  postponeCount: number;
  energyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
  topic: Topic | null;
}

interface DailyQuestCardProps {
  /** The current daily quest task, or null if none exists */
  quest: QuestTask | null;
  /** How many times the user has postponed their quest today */
  postponesToday: number;
  /** The user's configured daily postpone limit */
  postponeLimit: number;
  /** Whether to show an affirmation/quote after quest completion */
  emotionalClosureEnabled: boolean;
  /** The user's self-reported energy level for today, or null if not yet checked in */
  userEnergyToday: "HIGH" | "MEDIUM" | "LOW" | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

// ─── Component ─────────────────────────────────────────────────────────────────

/** Response shape from POST /api/tasks/:id/complete */
interface CompleteResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
  streakCurrent?: number;
}

/**
 * Hero light for the daily quest.
 * Manages completing, postponing and breaking down the quest via API calls.
 * Triggers confetti, level-up overlay, and achievement toasts on completion.
 */
export function DailyQuestCard({ quest, postponesToday, postponeLimit, emotionalClosureEnabled, userEnergyToday }: DailyQuestCardProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPostponing, setIsPostponing] = useState(false);
  const [localPostponesToday, setLocalPostponesToday] = useState(postponesToday);
  const postponesLeft = postponeLimit - localPostponesToday;
  const isPostponeLimitReached = postponesLeft <= 0;
  const [isCompleted, setIsCompleted] = useState(
    quest?.completedAt !== null && quest?.completedAt !== undefined
  );
  const [coinsEarned, setCoinsEarned] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  const TYPE_LABELS: Record<"ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE", string> = {
    ONE_TIME: t("quest_label_onetime"),
    RECURRING: t("quest_label_recurring"),
    DAILY_ELIGIBLE: t("quest_label_eligible"),
  };

  /**
   * Calls POST /api/tasks/:id/complete, then triggers animations and switches to celebration state.
   */
  async function handleComplete() {
    if (!quest || isCompleting || isCompleted) return;
    setIsCompleting(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/tasks/${quest.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });

      const data = (await res.json()) as CompleteResponse & { error?: string };
      if (!res.ok) {
        console.error("Failed to complete quest:", data.error);
        return;
      }

      const earned = data.coinsEarned ?? quest.coinValue;
      setCoinsEarned(earned);
      setIsCompleted(true);

      // Notify CoinCounter in the navbar about earned coins
      dispatchCoinsEarned(earned);

      // Always fire confetti on quest completion
      triggerConfetti();

      // Show level-up overlay if user leveled up
      if (data.newLevel) {
        setLevelUp(data.newLevel);
      }

      // Queue achievement toasts
      if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
        setPendingAchievements(data.unlockedAchievements);
      }

      // Refresh server data for stats update (deferred so animations play first)
      setTimeout(() => {
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Error completing quest:", err);
    } finally {
      setIsCompleting(false);
    }
  }

  /**
   * Calls POST /api/daily-quest/postpone, then refreshes the page.
   */
  async function handleNotToday() {
    if (!quest || isPostponing || isCompleted || isPostponeLimitReached) return;
    setIsPostponing(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/daily-quest/postpone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: quest.id, timezone }),
      });

      const data = (await res.json()) as { error?: string; postponesToday?: number };

      if (!res.ok) {
        if (data.error === "LIMIT_REACHED") {
          setLocalPostponesToday(postponeLimit);
        } else {
          console.error("Failed to postpone quest:", data.error);
        }
        return;
      }

      if (data.postponesToday !== undefined) {
        setLocalPostponesToday(data.postponesToday);
      }

      // Refresh to show the new (empty) quest state
      router.refresh();
    } catch (err) {
      console.error("Error postponing quest:", err);
    } finally {
      setIsPostponing(false);
    }
  }

  /** Opens the breakdown modal for the current quest task. */
  function handleBreakdown() {
    if (!quest) return;
    setShowBreakdownModal(true);
  }

  // Energy check-in is now handled by EnergyCheckinCard, rendered above
  // this card on the dashboard. DailyQuestCard only consumes the resulting
  // userEnergyToday prop to show the "matches your energy" badge.

  const typeLabel = quest ? TYPE_LABELS[quest.type] : null;

  return (
    <>
    {/* Level-up overlay — shown above all content when user levels up */}
    {levelUp && (
      <LevelUpOverlay
        level={levelUp.level}
        title={levelUp.title}
        onDone={() => setLevelUp(null)}
      />
    )}

    {/* Achievement toast — shown bottom-right for each unlocked achievement */}
    {pendingAchievements.length > 0 && (
      <AchievementToast
        achievements={pendingAchievements}
        onAllDone={() => setPendingAchievements([])}
      />
    )}

    {/* Breakdown modal — splits the quest task into subtasks under a new topic */}
    {showBreakdownModal && quest && (
      <TaskBreakdownModal
        task={{ id: quest.id, title: quest.title }}
        onCancel={() => setShowBreakdownModal(false)}
        onSuccess={() => setShowBreakdownModal(false)}
      />
    )}

    {/*
     * Keine Eintrittsanimation (2026-08-22, Spec §7). Vorher fuhr die
     * Quest aus opacity 0 / y 16 hoch und war dabei dunkler als die Liste
     * unter ihr. Umkehrung: die Quest steht bei Ankunft sofort auf voller
     * Stärke; nur die Peripherie beruhigt sich danach (siehe
     * quick-wins-section.tsx).
     */}
    <div
      data-testid="quest-light"
      className="lichtkegel flex flex-col gap-4"
    >
      {/* No quest — empty state. Still supplies the page's h1: the dashboard
          has no other h1 in this state, and the design requires exactly one. */}
      {!quest && (
        <div className="flex flex-col gap-3">
          <h1 data-testid="quest-title" className={`${stageTitleClassName} text-[var(--ink)]`}>
            {t("quest_no_quest")}
          </h1>
          <p className="m-0 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
            <Link href="/tasks" className="font-medium text-[var(--amber)] no-underline">
              {t("quest_no_quest_hint")}
            </Link>
          </p>
        </div>
      )}

      {/* Quest completed — celebration state */}
      {quest && isCompleted && (
        <div className="flex flex-col gap-3">
          <p className="m-0 font-[family-name:var(--font-ui)] text-sm font-medium text-[var(--ink-2)]">
            {t("quest_done")}
          </p>
          <h1
            data-testid="quest-title"
            className={`${stageTitleClassName} text-[var(--ink-3)] line-through`}
          >
            {quest.title}
          </h1>
          {coinsEarned !== null ? (
            <p className="m-0 font-[family-name:var(--font-ui)] text-sm font-medium text-[var(--ink-2)]">
              {t("quest_done_hint", { coins: coinsEarned })}
            </p>
          ) : (
            <p className="m-0 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
              {t("quest_comeback")}
            </p>
          )}
          <EmotionalClosure enabled={emotionalClosureEnabled} />
        </div>
      )}

      {/* Active quest */}
      {quest && !isCompleted && (
        <>
          {/* Quest header */}
          <div className="flex flex-col gap-2">
            {/* Eyebrow label — theatricality without amber; the eyebrow is
                context, not the page's one action. */}
            <span className="self-start font-[family-name:var(--font-ui)] text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {t("quest_eyebrow_label")}
            </span>

            {/* Topic tag — colour comes from user data (lib/db topics.color),
                not a literal in this file, so it stays inline: a CSS custom
                property can't carry a runtime hex value from the database. */}
            {quest.topic && (
              <span
                className="self-start inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-[family-name:var(--font-ui)]"
                style={{
                  color: quest.topic.color ?? "var(--ink-2)",
                  backgroundColor: quest.topic.color
                    ? `${quest.topic.color}22`
                    : "color-mix(in srgb, var(--ink-2) 12%, transparent)",
                  border: `1px solid ${quest.topic.color ?? "var(--hairline)"}44`,
                }}
              >
                {quest.topic.icon && (
                  <FontAwesomeIcon
                    icon={resolveTopicIcon(quest.topic.icon)}
                    className="w-3 h-3 mr-1"
                    aria-hidden="true"
                  />
                )}
                {quest.topic.title}
              </span>
            )}

            {/* Task title — this IS the page's h1. The Daily Quest is the one
                lit thing today; it reads as a headline, lit from above by
                the .lichtkegel wash on the container, not boxed. */}
            <h1 data-testid="quest-title" className={`${stageTitleClassName} text-[var(--ink)]`}>
              {quest.title}
            </h1>

            {/* Labels row — text only, no chip: a filled or bordered pill
                around a label is the box the box-rule (§2, "keine Chips um
                Text") forbids, and none of them carry amber either.
                Priority is dropped entirely here: the daily-quest algorithm
                already picked the one task that matters today, and a
                HIGH/NORMAL/SOMEDAY label next to a headline-sized title
                added noise without adding a decision the user needs to make. */}
            <div className="flex flex-wrap items-center gap-2">
              {typeLabel && (
                <span className="font-[family-name:var(--font-ui)] text-xs text-[var(--ink-3)]">
                  {typeLabel}
                </span>
              )}

              {quest.energyLevel && userEnergyToday && quest.energyLevel === userEnergyToday && (
                <span className="font-[family-name:var(--font-ui)] text-xs text-[var(--ink-3)]">
                  {t("energy_match_badge")}
                </span>
              )}

              {/* Coin value + postpone bonus — meta, not amber (--coin-gold
                  was an alias for --amber; moved to --ink-3 to keep the
                  amber budget at exactly one element on the page). */}
              <span className="inline-flex items-center gap-1 font-[family-name:var(--font-ui)] text-xs text-[var(--ink-3)]">
                {quest.postponeCount >= 3
                  ? `+${quest.coinValue * 2}`
                  : `+${quest.coinValue}`}{" "}
                <FontAwesomeIcon icon={faCoins} className="w-3 h-3" aria-hidden="true" />
                {quest.postponeCount >= 3 && (
                  <span className="ml-1 font-semibold">{t("quest_bonus_coins")}</span>
                )}
              </span>
            </div>
          </div>

          {/* Action row — quiet text, not filled buttons. "Complete" was a
              green-filled button and "Not today" a grey-filled one; a filled
              button in the quest competes with the light, and green is
              reserved for "done" only (see spec §4 rule 2). Exactly one
              action carries amber: the first one, "jetzt anfangen" — it is
              this page's one action, not a label. */}
          <div className="flex flex-wrap items-center gap-6 pt-2 font-[family-name:var(--font-ui)] text-sm">
            <Link href="/focus" className="font-medium text-[var(--amber)] no-underline">
              {t("quest_start")}
            </Link>
            <button
              type="button"
              onClick={handleComplete}
              disabled={isCompleting || isPostponing}
              className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[var(--ink-2)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isCompleting ? t("quest_completing") : t("quest_complete_btn")}
            </button>
            <button
              type="button"
              onClick={handleBreakdown}
              className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              {t("quest_breakdown")}
            </button>
            <button
              type="button"
              onClick={handleNotToday}
              disabled={isCompleting || isPostponing || isPostponeLimitReached}
              className="cursor-pointer border-0 bg-transparent p-0 font-medium text-[var(--ink-2)] hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPostponing ? t("quest_postponing") : t("quest_postpone_btn")}
            </button>
            {!isPostponeLimitReached && (
              <span className="text-xs text-[var(--ink-3)]">
                {t("quest_postpones_left", { count: postponesLeft })}
              </span>
            )}
          </div>
        </>
      )}
    </div>
    </>
  );
}
