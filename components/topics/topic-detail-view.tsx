"use client";

/**
 * TopicDetailView component — task list for a specific topic.
 *
 * Renders the tasks within a topic with full complete/edit/delete functionality.
 * Includes an "Add subtask" button that opens the TaskForm with the topic pre-selected.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TaskItem } from "@/components/tasks/task-item";
import { TaskForm } from "@/components/tasks/task-form";
import { SortableTaskList } from "@/components/topics/sortable-task-list";
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
  recurrenceInterval?: number | null;
  estimatedMinutes?: number | null;
  snoozedUntil?: string | null;
  sortOrder: number;
}

interface TopicDetailViewProps {
  topicId: string;
  topicTitle: string;
  initialTasks: Task[];
  topicColor: string | null;
  /** Topic's default energy level — passed through to TaskForm so the
   *  energy picker can show the inheritance hint. */
  topicDefaultEnergyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
  /** Whether the topic enforces sequential ordering for daily quest selection. */
  topicSequential?: boolean;
}

/**
 * Interactive task list scoped to a single topic.
 * Shows active tasks first, then completed tasks.
 */
export function TopicDetailView({
  topicId,
  topicTitle,
  initialTasks,
  topicColor,
  topicDefaultEnergyLevel = null,
  topicSequential = false,
}: TopicDetailViewProps) {
  const t = useTranslations("topics");
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);

  const editingTask = tasks.find((task) => task.id === editingTaskId);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?topicId=${topicId}`);
      if (res.ok) {
        const data = await res.json() as { tasks: Task[] };
        setTasks(data.tasks);
      }
    } catch {
      // Network failure — fall back to a full SSR refresh so the page isn't stale
      router.refresh();
    }
  }, [topicId, router]);

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const res = await fetch(`/api/tasks/${id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone }),
        });
        if (res.ok) {
          const data = await res.json() as {
            coinsEarned?: number;
            newLevel?: { level: number; title: string } | null;
            unlockedAchievements?: AchievementItem[];
          };

          triggerSmallConfetti();

          dispatchCoinsEarned(data.coinsEarned ?? 0);
          if (data.newLevel) setLevelUp(data.newLevel);
          if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
            setPendingAchievements((prev) => [...prev, ...data.unlockedAchievements!]);
          }

          await refreshTasks();
        }
      } catch {
        // silent fail
      }
    },
    [refreshTasks]
  );

  const handleUncomplete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/tasks/${id}/complete`, { method: "DELETE" });
        if (res.ok) {
          const data = await res.json() as { task?: { coinValue?: number } };
          const refunded = data.task?.coinValue ?? 0;
          dispatchCoinsEarned(-refunded);
          await refreshTasks();
        }
      } catch {
        // silent fail
      }
    },
    [refreshTasks]
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm(t("detail_confirm_delete"))) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) setTasks((prev) => prev.filter((task) => task.id !== id));
    } catch {
      // silent fail
    }
  }, [t]);

  const handleBreakdown = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const handleSnooze = useCallback(async (id: string, snoozedUntil: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozedUntil }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, snoozedUntil } : t))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleUnsnooze = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/snooze`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, snoozedUntil: null } : t))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleReorder = useCallback(
    async (taskIds: string[]) => {
      // Optimistic update — reorder tasks in local state
      const snapshot = [...tasks];
      setTasks((prev) => {
        const taskMap = new Map(prev.map((t) => [t.id, t]));
        const reordered = taskIds
          .map((id, index) => {
            const task = taskMap.get(id);
            return task ? { ...task, sortOrder: index } : null;
          })
          .filter(Boolean) as Task[];
        // Keep non-active tasks (completed, snoozed) unchanged
        const activeIds = new Set(taskIds);
        const rest = prev.filter((t) => !activeIds.has(t.id));
        return [...reordered, ...rest];
      });

      try {
        const res = await fetch(`/api/topics/${topicId}/reorder`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds }),
        });
        if (!res.ok) {
          // Revert on failure
          setTasks(snapshot);
        }
      } catch {
        setTasks(snapshot);
      }
    },
    [tasks, topicId]
  );

  const handleFormSuccess = useCallback(async () => {
    setEditingTaskId(null);
    setShowCreateForm(false);
    await refreshTasks();
  }, [refreshTasks]);

  const completedCount = tasks.filter((t) => t.completedAt !== null).length;
  const totalCount = tasks.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const accentColor = topicColor ?? "var(--accent-amber)";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const snoozedTasks = tasks.filter((task) => {
    if (!task.snoozedUntil || task.completedAt !== null) return false;
    return new Date(task.snoozedUntil + "T00:00:00") > today;
  });
  const snoozedIds = new Set(snoozedTasks.map((t) => t.id));
  const activeTasks = tasks
    .filter((task) => task.completedAt === null && !snoozedIds.has(task.id))
    .sort((a, b) => a.sortOrder - b.sortOrder || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const completedTasks = tasks.filter((task) => task.completedAt !== null);

  return (
    <div>
      {/* Progress bar — driven by live tasks state so it updates without a reload */}
      <div
        className="rounded-2xl px-6 py-4 mb-6"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderLeft: `4px solid ${accentColor}`,
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("tasks_completed", { completed: completedCount, total: totalCount })}
          </span>
          <span
            className="text-sm font-semibold"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: progressPercent === 100 ? "var(--accent-green)" : accentColor,
            }}
          >
            {progressPercent}%
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor:
                progressPercent === 100 ? "var(--accent-green)" : accentColor,
            }}
          />
        </div>
      </div>

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

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-lg font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {t("detail_tasks")}
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          {t("detail_add")}
        </button>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("detail_empty")}
          </p>
        </div>
      )}

      {/* Sequential hint — shown when this topic enforces ordered quest selection */}
      {topicSequential && activeTasks.length > 0 && (
        <div
          className="mb-3 px-3 py-2 rounded-lg text-xs flex items-start gap-2"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
            backgroundColor: `color-mix(in srgb, ${topicColor ?? "var(--accent-amber)"} 8%, var(--bg-surface))`,
            border: `1px solid color-mix(in srgb, ${topicColor ?? "var(--accent-amber)"} 25%, transparent)`,
          }}
        >
          <span aria-hidden="true">⛓</span>
          <span>{t("detail_sequential_hint")}</span>
        </div>
      )}

      {/* Active tasks — drag-and-drop reorderable */}
      {activeTasks.length > 0 && (
        <div className="mb-4">
          <SortableTaskList
            tasks={activeTasks}
            topicTitle={topicTitle}
            topicColor={topicColor}
            onReorder={handleReorder}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onEdit={setEditingTaskId}
            onDelete={handleDelete}
            onBreakdown={handleBreakdown}
            onSnooze={handleSnooze}
            onUnsnooze={handleUnsnooze}
          />
        </div>
      )}

      {/* Snoozed tasks */}
      {snoozedTasks.length > 0 && (
        <>
          <h3
            className="text-xs font-semibold uppercase tracking-wide mb-2 mt-6"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("detail_snoozed", { count: snoozedTasks.length })}
          </h3>
          <div className="flex flex-col gap-2">
            {snoozedTasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                type={task.type}
                priority={task.priority}
                completedAt={task.completedAt}
                dueDate={task.dueDate}
                nextDueDate={task.nextDueDate}
                topicTitle={topicTitle}
                topicColor={topicColor}
                coinValue={task.coinValue}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onEdit={setEditingTaskId}
                onDelete={handleDelete}
                onBreakdown={handleBreakdown}
                snoozedUntil={task.snoozedUntil}
                onSnooze={handleSnooze}
                onUnsnooze={handleUnsnooze}
              />
            ))}
          </div>
        </>
      )}

      {/* Completed tasks */}
      {completedTasks.length > 0 && (
        <>
          <h3
            className="text-xs font-semibold uppercase tracking-wide mb-2 mt-6"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("detail_completed", { count: completedTasks.length })}
          </h3>
          <div className="flex flex-col gap-2">
            {completedTasks.map((task) => (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                type={task.type}
                priority={task.priority}
                completedAt={task.completedAt}
                dueDate={task.dueDate}
                nextDueDate={task.nextDueDate}
                topicTitle={topicTitle}
                topicColor={topicColor}
                coinValue={task.coinValue}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onEdit={setEditingTaskId}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {/* Task form modal */}
      {(showCreateForm || editingTaskId) && (
        <TaskForm
          initialData={
            editingTask
              ? {
                  id: editingTask.id,
                  title: editingTask.title,
                  topicId: editingTask.topicId,
                  notes: editingTask.notes ?? "",
                  type: editingTask.type,
                  priority: editingTask.priority,
                  recurrenceInterval:
                    editingTask.type === "RECURRING"
                      ? String(editingTask.recurrenceInterval ?? 7)
                      : "7",
                  dueDate: editingTask.dueDate ?? "",
                  coinValue: String(editingTask.coinValue),
                  estimatedMinutes: ([5, 15, 30, 60] as const).includes(editingTask.estimatedMinutes as 5 | 15 | 30 | 60)
                    ? (editingTask.estimatedMinutes as 5 | 15 | 30 | 60)
                    : null,
                }
              : undefined
          }
          topics={[{ id: topicId, title: topicTitle, color: topicColor, defaultEnergyLevel: topicDefaultEnergyLevel }]}
          defaultTopicId={topicId}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingTaskId(null);
          }}
        />
      )}
    </div>
  );
}
