"use client";

/**
 * TopicDetailView component — task list for a specific topic.
 *
 * Renders the tasks within a topic with full complete/edit/delete functionality.
 * Includes an "Add subtask" button that opens the TaskForm with the topic pre-selected.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { TaskItem } from "@/components/tasks/task-item";
import { TaskForm } from "@/components/tasks/task-form";

interface Task {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate: string | null;
  nextDueDate: string | null;
  topicId: string | null;
  coinValue: number;
  createdAt: string;
}

interface TopicDetailViewProps {
  topicId: string;
  topicTitle: string;
  initialTasks: Task[];
  topicColor: string | null;
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
}: TopicDetailViewProps) {
  const t = useTranslations("topics");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const editingTask = tasks.find((task) => task.id === editingTaskId);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?topicId=${topicId}`);
      if (res.ok) {
        const data = await res.json() as { tasks: Task[] };
        setTasks(data.tasks);
      }
    } catch {
      // silent fail
    }
  }, [topicId]);

  const handleComplete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
        if (res.ok) await refreshTasks();
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
        if (res.ok) await refreshTasks();
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

  const handleFormSuccess = useCallback(async () => {
    setEditingTaskId(null);
    setShowCreateForm(false);
    await refreshTasks();
  }, [refreshTasks]);

  const activeTasks = tasks.filter((task) => task.completedAt === null);
  const completedTasks = tasks.filter((task) => task.completedAt !== null);

  return (
    <div>
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

      {/* Active tasks */}
      {activeTasks.length > 0 && (
        <div className="flex flex-col gap-2 mb-4">
          {activeTasks.map((task) => (
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
                  notes: "",
                  type: editingTask.type,
                  priority: editingTask.priority,
                  recurrenceInterval:
                    editingTask.type === "RECURRING"
                      ? String(
                          (
                            editingTask as unknown as {
                              recurrenceInterval: number;
                            }
                          ).recurrenceInterval ?? 7
                        )
                      : "7",
                  dueDate: editingTask.dueDate ?? "",
                  coinValue: String(editingTask.coinValue),
                }
              : undefined
          }
          topics={[{ id: topicId, title: topicTitle, color: topicColor }]}
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
