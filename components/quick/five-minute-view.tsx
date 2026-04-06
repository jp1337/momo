"use client";

/**
 * FiveMinuteView — focused, distraction-free task view for 5-minute tasks.
 *
 * Displays a flat list of tasks with estimatedMinutes <= 5.
 * Tasks are directly completable with full animation support
 * (confetti, coin counter update, level-up overlay, achievement toasts).
 *
 * No search, filter, or create functionality — this is a consumption view.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";
import { TaskItem } from "@/components/tasks/task-item";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

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

interface FiveMinuteViewProps {
  initialTasks: Task[];
  topics: TopicOption[];
}

/** Response shape from POST /api/tasks/:id/complete */
interface CompleteApiResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
  streakCurrent?: number;
}

/**
 * Interactive 5-minute task view.
 * Manages task state after initial server-fetched data.
 * Triggers confetti, level-up overlay, and achievement toasts on completion.
 */
export function FiveMinuteView({ initialTasks, topics }: FiveMinuteViewProps) {
  const router = useRouter();
  const t = useTranslations("quick");
  const tTasks = useTranslations("tasks");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);

  const topicMap = new Map(topics.map((tp) => [tp.id, tp]));

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = (await res.json()) as { tasks: Task[] };
        // Filter to only 5-min, uncompleted, non-snoozed tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const filtered = data.tasks.filter((task) => {
          if (task.completedAt !== null) return false;
          if (!task.estimatedMinutes || task.estimatedMinutes > 5) return false;
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

  // No-op handlers for edit modal (not used in quick mode)
  const handleEdit = useCallback(() => {
    // Quick mode doesn't open the full edit modal
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

  // "All done" state — user completed all quick tasks this session
  const allDone = initialTasks.length > 0 && tasks.length === 0;

  return (
    <div>
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

      {/* Task list */}
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

      {/* "All done" celebration */}
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
            {tTasks("empty_evening").includes("Perfekt") ? "🎉" : "🎉"}
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
            href="/tasks"
            className="inline-block mt-4 text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
              textDecoration: "none",
            }}
          >
            {tTasks("page_title")} →
          </Link>
        </motion.div>
      )}

      {/* Empty state — no 5-min tasks at all */}
      {initialTasks.length === 0 && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <FontAwesomeIcon
            icon={faBolt}
            className="text-2xl mb-3"
            style={{ color: "var(--accent-amber)", opacity: 0.6 }}
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
            href="/tasks"
            className="text-sm font-medium transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
              textDecoration: "none",
            }}
          >
            {t("empty_link")}
          </Link>
        </div>
      )}
    </div>
  );
}
