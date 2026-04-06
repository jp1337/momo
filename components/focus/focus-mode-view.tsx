"use client";

/**
 * FocusModeView — distraction-free view showing only Daily Quest + Quick Wins.
 *
 * Combines the DailyQuestCard hero and a flat list of quick-win tasks (<=15 min).
 * Full completion flow: confetti, coin counter update, level-up overlay, achievement toasts.
 * Designed for people with avoidance tendencies — minimal UI, calming atmosphere.
 *
 * No search, filter, stats, or navigation — pure focus.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullseye } from "@fortawesome/free-solid-svg-icons";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import { TaskItem } from "@/components/tasks/task-item";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

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

interface Task {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate: string | null;
  nextDueDate: string | null;
  topicId: string | null;
  notes: string | null;
  coinValue: number;
  createdAt: string;
  postponeCount?: number;
  estimatedMinutes?: number | null;
  energyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
  snoozedUntil?: string | null;
}

interface TopicOption {
  id: string;
  title: string;
  color?: string | null;
}

/** Response shape from POST /api/tasks/:id/complete */
interface CompleteApiResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
  streakCurrent?: number;
}

interface FocusModeViewProps {
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
  /** Quick-win tasks (estimatedMinutes <= 15, uncompleted, not snoozed) */
  initialTasks: Task[];
  /** Topic list for displaying topic tags on tasks */
  topics: TopicOption[];
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Interactive focus mode view.
 * Manages task state after initial server-fetched data.
 * Triggers confetti, level-up overlay, and achievement toasts on completion.
 */
export function FocusModeView({
  quest,
  postponesToday,
  postponeLimit,
  emotionalClosureEnabled,
  userEnergyToday,
  initialTasks,
  topics,
}: FocusModeViewProps) {
  const router = useRouter();
  const t = useTranslations("focus");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);

  const topicMap = new Map(topics.map((tp) => [tp.id, tp]));

  /** Re-fetch tasks from API and filter to quick-win criteria */
  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = (await res.json()) as { tasks: Task[] };
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = data.tasks.filter((task) => {
          if (task.completedAt !== null) return false;
          if (!task.estimatedMinutes || task.estimatedMinutes > 15) return false;
          if (task.snoozedUntil) {
            const snoozeDate = new Date(task.snoozedUntil + "T00:00:00");
            if (snoozeDate > today) return false;
          }
          return true;
        });
        setTasks(filtered);
      }
    } catch {
      router.refresh();
    }
  }, [router]);

  const handleComplete = useCallback(async (id: string) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) {
        const data = (await res.json()) as CompleteApiResponse;
        triggerSmallConfetti();
        dispatchCoinsEarned(data.coinsEarned ?? 0);
        if (data.newLevel) {
          setLevelUp(data.newLevel);
        }
        if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
          setPendingAchievements((prev) => [...prev, ...data.unlockedAchievements!]);
        }
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [refreshTasks]);

  const handleUncomplete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json()) as { task?: { coinValue?: number } };
        const refunded = data.task?.coinValue ?? 0;
        dispatchCoinsEarned(-refunded);
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [refreshTasks]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== id));
      }
    } catch {
      // silent fail
    }
  }, [t]);

  const handleInlineEdit = useCallback(async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? { ...task, title: newTitle } : task))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleEdit = useCallback(() => {
    // Focus mode doesn't open the full edit modal
  }, []);

  const handleGoToTopic = useCallback((topicId: string) => {
    router.push(`/topics/${topicId}`);
  }, [router]);

  // Sort: HIGH priority first, then by createdAt
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { HIGH: 0, NORMAL: 1, SOMEDAY: 2 };
    const pa = priorityOrder[a.priority] ?? 1;
    const pb = priorityOrder[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.createdAt < b.createdAt ? -1 : 1;
  });

  // "All done" state — quest completed and no quick wins left
  const questDone = quest !== null && quest.completedAt !== null;
  const allDone = questDone && tasks.length === 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Level-up overlay */}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          onDone={() => setLevelUp(null)}
        />
      )}

      {/* Achievement toast notifications */}
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onAllDone={() => setPendingAchievements([])}
        />
      )}

      {/* ── Daily Quest ──────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_quest")}
        </h2>
        <DailyQuestCard
          quest={quest}
          postponesToday={postponesToday}
          postponeLimit={postponeLimit}
          emotionalClosureEnabled={emotionalClosureEnabled}
          userEnergyToday={userEnergyToday}
        />
      </section>

      {/* ── Quick Wins task list ──────────────────────────────────────── */}
      {sortedTasks.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("section_quick_wins")}
            </h2>
            <span
              style={{
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                fontSize: "10px",
                color: "var(--accent-green)",
                opacity: 0.8,
              }}
            >
              — {t("quick_wins_hint")}
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task) => {
              const topic = task.topicId ? topicMap.get(task.topicId) : null;
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
                  className="mb-2"
                >
                  <TaskItem
                    id={task.id}
                    title={task.title}
                    type={task.type}
                    priority={task.priority}
                    completedAt={task.completedAt}
                    dueDate={task.dueDate}
                    nextDueDate={task.nextDueDate}
                    topicTitle={topic?.title}
                    topicColor={topic?.color}
                    topicId={task.topicId}
                    coinValue={task.coinValue}
                    postponeCount={task.postponeCount}
                    estimatedMinutes={task.estimatedMinutes}
                    energyLevel={task.energyLevel}
                    onComplete={handleComplete}
                    onUncomplete={handleUncomplete}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onInlineEdit={handleInlineEdit}
                    onGoToTopic={handleGoToTopic}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </section>
      )}

      {/* ── "All done" celebration ────────────────────────────────────── */}
      {allDone && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-12 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid color-mix(in srgb, var(--accent-green) 30%, var(--border))",
          }}
        >
          <p className="text-2xl mb-3" role="img" aria-label={t("completed_all")}>
            🎯
          </p>
          <p
            className="text-base font-medium mb-1"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("completed_all")}
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-4 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
              textDecoration: "none",
            }}
          >
            {t("back_to_dashboard")} →
          </Link>
        </motion.div>
      )}

      {/* ── Empty state — no quest and no quick wins at all ────────────── */}
      {!quest && initialTasks.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <FontAwesomeIcon
            icon={faBullseye}
            className="text-2xl mb-3"
            style={{ color: "var(--accent-green)", opacity: 0.6 }}
          />
          <p
            className="text-base font-medium mb-1"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("empty_title")}
          </p>
          <p
            className="text-sm mb-4"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("empty_subtitle")}
          </p>
          <Link
            href="/dashboard"
            className="text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
              textDecoration: "none",
            }}
          >
            {t("back_to_dashboard")} →
          </Link>
        </div>
      )}
    </div>
  );
}
