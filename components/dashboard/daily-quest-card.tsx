"use client";

/**
 * DailyQuestCard component — hero card displayed on the dashboard.
 *
 * Features:
 * - Displays the current daily quest task with priority and type badges
 * - "Complete" button: calls POST /api/tasks/:id/complete and shows celebration
 * - "Not today" button: calls POST /api/daily-quest/postpone and refreshes
 * - Empty state when no quest is available
 * - Celebration state after completing the quest
 * - Framer Motion entrance animation (fade + slide up)
 *
 * Receives all data as props — no direct data fetching.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

/**
 * Priority badge visual styles (labels are computed inside component with i18n).
 */
const PRIORITY_STYLES = {
  HIGH: {
    backgroundColor: "var(--accent-red)",
    color: "white",
  },
  NORMAL: {
    backgroundColor: "var(--accent-amber)",
    color: "black",
  },
  SOMEDAY: {
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-muted)",
  },
} as const;

// ─── Component ─────────────────────────────────────────────────────────────────

/** Response shape from POST /api/tasks/:id/complete */
interface CompleteResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
  streakCurrent?: number;
}

/**
 * Hero card for the daily quest.
 * Manages completing and postponing the quest via API calls.
 * Triggers confetti, level-up overlay, and achievement toasts on completion.
 */
export function DailyQuestCard({ quest, postponesToday, postponeLimit, emotionalClosureEnabled, userEnergyToday }: DailyQuestCardProps) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPostponing, setIsPostponing] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [localPostponesToday, setLocalPostponesToday] = useState(postponesToday);
  const postponesLeft = postponeLimit - localPostponesToday;
  const isPostponeLimitReached = postponesLeft <= 0;
  const [isCompleted, setIsCompleted] = useState(
    quest?.completedAt !== null && quest?.completedAt !== undefined
  );
  const [coinsEarned, setCoinsEarned] = useState<number | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);

  const PRIORITY_LABELS: Record<"HIGH" | "NORMAL" | "SOMEDAY", string> = {
    HIGH: t("quest_label_high"),
    NORMAL: t("quest_label_normal"),
    SOMEDAY: t("quest_label_someday"),
  };

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

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (data.error === "LIMIT_REACHED") {
          setLocalPostponesToday(postponeLimit);
        } else {
          console.error("Failed to postpone quest:", data.error);
        }
        return;
      }

      const data = (await res.json()) as { postponesToday?: number };
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

  /**
   * Calls POST /api/energy-checkin with the selected energy level, then refreshes.
   */
  async function handleEnergyCheckin(level: "HIGH" | "MEDIUM" | "LOW") {
    if (isCheckingIn) return;
    setIsCheckingIn(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/energy-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyLevel: level, timezone }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        console.error("Energy check-in failed:", data.error);
        return;
      }

      router.refresh();
    } catch (err) {
      console.error("Error during energy check-in:", err);
    } finally {
      setIsCheckingIn(false);
    }
  }

  // Whether to show the energy check-in prompt
  const showEnergyCheckin = !quest && userEnergyToday === null;

  const priorityStyle = quest ? PRIORITY_STYLES[quest.priority] : null;
  const priorityLabel = quest ? PRIORITY_LABELS[quest.priority] : null;
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

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--accent-amber)",
        boxShadow:
          "0 0 20px color-mix(in srgb, var(--accent-amber) 15%, transparent), var(--shadow-md)",
      }}
    >
      {/* Energy check-in — shown before quest selection when no energy is set today */}
      {showEnergyCheckin && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3
              className="text-lg font-semibold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                fontStyle: "italic",
                color: "var(--text-primary)",
              }}
            >
              {t("energy_checkin_title")}
            </h3>
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("energy_checkin_subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { level: "HIGH" as const, color: "var(--accent-amber)", icon: "⚡" },
                { level: "MEDIUM" as const, color: "var(--accent-green)", icon: "☀" },
                { level: "LOW" as const, color: "var(--text-muted)", icon: "🌙" },
              ] as const
            ).map(({ level, color, icon }) => (
              <button
                key={level}
                onClick={() => handleEnergyCheckin(level)}
                disabled={isCheckingIn}
                className="flex-1 min-w-[100px] px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: `color-mix(in srgb, ${color} 10%, var(--bg-elevated))`,
                  border: `1px solid color-mix(in srgb, ${color} 30%, var(--border))`,
                  color: color,
                }}
              >
                <span className="block text-lg mb-1">{icon}</span>
                {t(`energy_${level.toLowerCase()}` as "energy_high" | "energy_medium" | "energy_low")}
              </button>
            ))}
          </div>
          {isCheckingIn && (
            <p
              className="text-xs text-center"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("energy_checking_in")}
            </p>
          )}
        </div>
      )}

      {/* No quest — empty state (shown after energy check-in when no tasks exist) */}
      {!quest && !showEnergyCheckin && (
        <div className="flex flex-col gap-3">
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
            }}
          >
            {t("quest_no_quest")}
          </p>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            <a href="/tasks" style={{ color: "var(--accent-amber)" }}>
              {t("quest_no_quest_hint")}
            </a>
          </p>
        </div>
      )}

      {/* Quest completed — celebration state */}
      {quest && isCompleted && (
        <div className="flex flex-col gap-3">
          <p
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("quest_done")}
          </p>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
              textDecoration: "line-through",
            }}
          >
            {quest.title}
          </p>
          {coinsEarned !== null && (
            <p
              className="text-sm font-medium"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--coin-gold)",
              }}
            >
              {t("quest_done_hint", { coins: coinsEarned })}
            </p>
          )}
          {coinsEarned === null && (
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
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
            {/* Topic tag */}
            {quest.topic && (
              <span
                className="text-xs px-2 py-0.5 rounded self-start"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: quest.topic.color ?? "var(--text-muted)",
                  backgroundColor: quest.topic.color
                    ? `${quest.topic.color}22`
                    : "rgba(122,144,127,0.12)",
                  border: `1px solid ${quest.topic.color ?? "var(--border)"}44`,
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

            {/* Task title */}
            <h3
              className="text-xl font-semibold leading-snug"
              style={{
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                color: "var(--text-primary)",
              }}
            >
              {quest.title}
            </h3>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Priority badge */}
              {priorityStyle && priorityLabel && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    ...priorityStyle,
                  }}
                >
                  {priorityLabel}
                </span>
              )}

              {/* Type badge */}
              {typeLabel && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  {typeLabel}
                </span>
              )}

              {/* Energy match badge */}
              {quest.energyLevel && userEnergyToday && quest.energyLevel === userEnergyToday && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--accent-green)",
                    backgroundColor: "color-mix(in srgb, var(--accent-green) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--accent-green) 25%, transparent)",
                  }}
                >
                  {t("energy_match_badge")}
                </span>
              )}

              {/* Coin value — show ×2 bonus badge if task was often postponed */}
              <span
                className="text-xs inline-flex items-center gap-1"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--coin-gold)",
                }}
              >
                {quest.postponeCount >= 3
                  ? `+${quest.coinValue * 2}`
                  : `+${quest.coinValue}`}{" "}
                <FontAwesomeIcon icon={faCoins} className="w-3 h-3" aria-hidden="true" />
                {quest.postponeCount >= 3 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--accent-amber) 20%, transparent)",
                      color: "var(--accent-amber)",
                      border: "1px solid color-mix(in srgb, var(--accent-amber) 40%, transparent)",
                    }}
                  >
                    {t("quest_bonus_coins")}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2 items-center">
            {/* Complete button */}
            <button
              onClick={handleComplete}
              disabled={isCompleting || isPostponing}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--accent-green)",
                color: "white",
              }}
            >
              {isCompleting ? t("quest_completing") : t("quest_complete_btn")}
            </button>

            {/* Not today button — disabled when limit reached */}
            {!isPostponeLimitReached ? (
              <button
                onClick={handleNotToday}
                disabled={isCompleting || isPostponing}
                className="px-5 py-2.5 rounded-xl text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                }}
              >
                {isPostponing ? t("quest_postponing") : t("quest_postpone_btn")}
              </button>
            ) : (
              <span
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--accent-red)",
                  backgroundColor: "color-mix(in srgb, var(--accent-red) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--accent-red) 30%, transparent)",
                }}
              >
                {t("quest_postpones_none")}
              </span>
            )}

            {/* Postpone counter hint */}
            {!isPostponeLimitReached && (
              <span
                className="text-xs ml-1"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                  opacity: 0.7,
                }}
              >
                {t("quest_postpones_left", { count: postponesLeft })}
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
    </>
  );
}
