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
  topic: Topic | null;
}

interface DailyQuestCardProps {
  /** The current daily quest task, or null if none exists */
  quest: QuestTask | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

/**
 * Priority badge visual config.
 */
const PRIORITY_CONFIG = {
  HIGH: {
    label: "High",
    style: {
      backgroundColor: "var(--accent-red)",
      color: "white",
    },
  },
  NORMAL: {
    label: "Normal",
    style: {
      backgroundColor: "var(--accent-amber)",
      color: "black",
    },
  },
  SOMEDAY: {
    label: "Someday",
    style: {
      backgroundColor: "var(--bg-elevated)",
      color: "var(--text-muted)",
    },
  },
} as const;

/**
 * Task type badge visual config.
 */
const TYPE_CONFIG = {
  ONE_TIME: { label: "One-time" },
  RECURRING: { label: "Recurring" },
  DAILY_ELIGIBLE: { label: "Quest eligible" },
} as const;

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Hero card for the daily quest.
 * Manages completing and postponing the quest via API calls.
 */
export function DailyQuestCard({ quest }: DailyQuestCardProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isPostponing, setIsPostponing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(
    quest?.completedAt !== null && quest?.completedAt !== undefined
  );
  const [coinsEarned, setCoinsEarned] = useState<number | null>(null);

  /**
   * Calls POST /api/tasks/:id/complete, then switches to celebration state.
   */
  async function handleComplete() {
    if (!quest || isCompleting || isCompleted) return;
    setIsCompleting(true);

    try {
      const res = await fetch(`/api/tasks/${quest.id}/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        console.error("Failed to complete quest:", data.error);
        return;
      }

      const data = (await res.json()) as { coinsEarned?: number };
      setCoinsEarned(data.coinsEarned ?? quest.coinValue);
      setIsCompleted(true);
      // Refresh server data for stats update
      router.refresh();
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
    if (!quest || isPostponing || isCompleted) return;
    setIsPostponing(true);

    try {
      const res = await fetch("/api/daily-quest/postpone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: quest.id }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        console.error("Failed to postpone quest:", data.error);
        return;
      }

      // Refresh to show the new (empty) quest state
      router.refresh();
    } catch (err) {
      console.error("Error postponing quest:", err);
    } finally {
      setIsPostponing(false);
    }
  }

  const priorityCfg = quest ? PRIORITY_CONFIG[quest.priority] : null;
  const typeCfg = quest ? TYPE_CONFIG[quest.type] : null;

  return (
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
      {/* No quest — empty state */}
      {!quest && (
        <div className="flex flex-col gap-3">
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
            }}
          >
            ✦ No quest for today yet.
          </p>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            Head to{" "}
            <a href="/tasks" style={{ color: "var(--accent-amber)" }}>
              Tasks
            </a>{" "}
            to add your first task — Momo will pick one for you each day.
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
            Quest complete! ✨
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
              +{coinsEarned} ◎ earned — come back tomorrow.
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
              Come back tomorrow for your next quest.
            </p>
          )}
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
                {quest.topic.icon ? `${quest.topic.icon} ` : ""}
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
              {priorityCfg && (
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    ...priorityCfg.style,
                  }}
                >
                  {priorityCfg.label}
                </span>
              )}

              {/* Type badge */}
              {typeCfg && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  {typeCfg.label}
                </span>
              )}

              {/* Coin value */}
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--coin-gold)",
                }}
              >
                +{quest.coinValue} ◎
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
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
              {isCompleting ? "Completing…" : "✓ Complete"}
            </button>

            {/* Not today button */}
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
              {isPostponing ? "Postponing…" : "Not today →"}
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}
