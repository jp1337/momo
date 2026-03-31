"use client";

/**
 * TaskList component — grouped task list wrapper.
 *
 * Groups tasks into sections:
 *  1. Today — tasks due today or overdue
 *  2. Upcoming — tasks with future due dates
 *  3. No date — tasks with no due date (excluding SOMEDAY priority)
 *  4. Someday — SOMEDAY priority tasks with no due date
 *  5. Completed — tasks with completedAt set
 *
 * Each section renders TaskItem components and handles
 * complete/uncomplete/edit/delete actions.
 */

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";

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
}

interface TopicOption {
  id: string;
  title: string;
  color?: string | null;
}

interface TaskListProps {
  initialTasks: Task[];
  topics: TopicOption[];
}

interface GroupedTasks {
  today: Task[];
  upcoming: Task[];
  noDate: Task[];
  someday: Task[];
  completed: Task[];
}

/**
 * Groups tasks into display sections based on due date, priority, and completion.
 */
function groupTasks(tasks: Task[]): GroupedTasks {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = tasks.filter((t) => t.completedAt === null);
  const completed = tasks.filter((t) => t.completedAt !== null);

  const todayTasks: Task[] = [];
  const upcomingTasks: Task[] = [];
  const noDateTasks: Task[] = [];
  const somedayTasks: Task[] = [];

  for (const task of active) {
    const effectiveDate =
      task.type === "RECURRING" ? task.nextDueDate : task.dueDate;

    if (effectiveDate) {
      const due = new Date(effectiveDate + "T00:00:00");
      if (due <= today) {
        todayTasks.push(task);
      } else {
        upcomingTasks.push(task);
      }
    } else if (task.priority === "SOMEDAY") {
      somedayTasks.push(task);
    } else {
      noDateTasks.push(task);
    }
  }

  // Sort today tasks: overdue first, then by creation date
  todayTasks.sort((a, b) => {
    const dateA = a.type === "RECURRING" ? a.nextDueDate : a.dueDate;
    const dateB = b.type === "RECURRING" ? b.nextDueDate : b.dueDate;
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    return 0;
  });

  // Sort upcoming by due date
  upcomingTasks.sort((a, b) => {
    const dateA = a.type === "RECURRING" ? a.nextDueDate : a.dueDate;
    const dateB = b.type === "RECURRING" ? b.nextDueDate : b.dueDate;
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    return 0;
  });

  return {
    today: todayTasks,
    upcoming: upcomingTasks,
    noDate: noDateTasks,
    someday: somedayTasks,
    completed,
  };
}

/**
 * Section header for task groups.
 */
function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
      <h2
        className="text-sm font-semibold uppercase tracking-wide"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {title}
      </h2>
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

/**
 * Empty state message for when there are no tasks.
 */
function EmptyState() {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px dashed var(--border)",
      }}
    >
      <p
        className="text-2xl mb-3"
        role="img"
        aria-label="Seedling"
      >
        🌱
      </p>
      <p
        className="text-base font-medium mb-1"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          color: "var(--text-primary)",
        }}
      >
        No tasks yet
      </p>
      <p
        className="text-sm"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        Add your first task to get started — one step at a time.
      </p>
    </div>
  );
}

/**
 * Interactive task list with grouping, completion, and CRUD actions.
 * Manages its own task state after initial server-fetched data.
 */
export function TaskList({ initialTasks, topics }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const editingTask = tasks.find((t) => t.id === editingTaskId);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json() as { tasks: Task[] };
        setTasks(data.tasks);
      }
    } catch {
      // silent fail — stale data is better than crashed UI
    }
  }, []);

  const handleComplete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "POST" });
      if (res.ok) {
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
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [refreshTasks]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleFormSuccess = useCallback(async () => {
    setEditingTaskId(null);
    setShowCreateForm(false);
    await refreshTasks();
  }, [refreshTasks]);

  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const grouped = groupTasks(tasks);
  const hasAnyTasks = tasks.length > 0;

  return (
    <div>
      {/* New Task button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          + New Task
        </button>
      </div>

      {/* Empty state */}
      {!hasAnyTasks && <EmptyState />}

      {/* Today */}
      <SectionHeader title="Today & Overdue" count={grouped.today.length} />
      <AnimatePresence>
        <div className="flex flex-col gap-2">
          {grouped.today.map((task) => {
            const topic = task.topicId ? topicMap.get(task.topicId) : null;
            return (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                type={task.type}
                priority={task.priority}
                completedAt={task.completedAt}
                dueDate={task.dueDate}
                nextDueDate={task.nextDueDate}
                topicTitle={topic?.title}
                topicColor={topic?.color}
                coinValue={task.coinValue}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onEdit={setEditingTaskId}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      </AnimatePresence>

      {/* Upcoming */}
      <SectionHeader title="Upcoming" count={grouped.upcoming.length} />
      <div className="flex flex-col gap-2">
        {grouped.upcoming.map((task) => {
          const topic = task.topicId ? topicMap.get(task.topicId) : null;
          return (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topic?.title}
              topicColor={topic?.color}
              coinValue={task.coinValue}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={setEditingTaskId}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      {/* No date */}
      <SectionHeader title="No due date" count={grouped.noDate.length} />
      <div className="flex flex-col gap-2">
        {grouped.noDate.map((task) => {
          const topic = task.topicId ? topicMap.get(task.topicId) : null;
          return (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topic?.title}
              topicColor={topic?.color}
              coinValue={task.coinValue}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={setEditingTaskId}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      {/* Someday */}
      <SectionHeader title="Someday" count={grouped.someday.length} />
      <div className="flex flex-col gap-2">
        {grouped.someday.map((task) => {
          const topic = task.topicId ? topicMap.get(task.topicId) : null;
          return (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topic?.title}
              topicColor={topic?.color}
              coinValue={task.coinValue}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={setEditingTaskId}
              onDelete={handleDelete}
            />
          );
        })}
      </div>

      {/* Completed */}
      {grouped.completed.length > 0 && (
        <>
          <SectionHeader title="Completed" count={grouped.completed.length} />
          <div className="flex flex-col gap-2">
            {grouped.completed.map((task) => {
              const topic = task.topicId ? topicMap.get(task.topicId) : null;
              return (
                <TaskItem
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  type={task.type}
                  priority={task.priority}
                  completedAt={task.completedAt}
                  dueDate={task.dueDate}
                  nextDueDate={task.nextDueDate}
                  topicTitle={topic?.title}
                  topicColor={topic?.color}
                  coinValue={task.coinValue}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onEdit={setEditingTaskId}
                  onDelete={handleDelete}
                />
              );
            })}
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
                  recurrenceInterval: editingTask.type === "RECURRING"
                    ? String((editingTask as unknown as { recurrenceInterval: number }).recurrenceInterval ?? 7)
                    : "7",
                  dueDate: editingTask.dueDate ?? "",
                  coinValue: String(editingTask.coinValue),
                }
              : undefined
          }
          topics={topics}
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
