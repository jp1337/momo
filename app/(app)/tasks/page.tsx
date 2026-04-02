/**
 * Tasks list page — Phase 2.
 *
 * Server component that fetches tasks and topics for the current user,
 * then passes them to the interactive TaskList client component.
 *
 * Groups tasks into:
 *  - Today & Overdue: tasks due today or in the past
 *  - Upcoming: tasks with future due dates
 *  - No due date: active tasks without a due date
 *  - Someday: SOMEDAY priority tasks with no due date
 *  - Completed: finished tasks
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserTasks } from "@/lib/tasks";
import { getUserTopics } from "@/lib/topics";
import { TaskList } from "@/components/tasks/task-list";
import { DueTodayBanner } from "@/components/tasks/due-today-banner";

export const metadata: Metadata = {
  title: "Tasks — Momo",
};

/**
 * Tasks list page.
 * Fetches all tasks and topics for the authenticated user, renders the task list.
 */
export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [tasks, topics] = await Promise.all([
    getUserTasks(session.user.id),
    getUserTopics(session.user.id),
  ]);

  // Count tasks that are due today or overdue (for the greeting banner)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueTodayCount = tasks.filter((t) => {
    if (t.completedAt !== null) return false;
    const effectiveDate = t.type === "RECURRING" ? t.nextDueDate : t.dueDate;
    if (!effectiveDate) return false;
    return new Date(effectiveDate + "T00:00:00") <= today;
  }).length;

  // Serialize to plain objects for client component
  const serializedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    dueDate: t.dueDate ?? null,
    nextDueDate: t.nextDueDate ?? null,
    topicId: t.topicId ?? null,
    notes: t.notes ?? null,
    coinValue: t.coinValue,
    createdAt: t.createdAt.toISOString(),
  }));

  const serializedTopics = topics.map((t) => ({
    id: t.id,
    title: t.title,
    color: t.color ?? null,
  }));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-semibold mb-2"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          Tasks
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {tasks.length === 0
            ? "No tasks yet — let's add your first one."
            : `${tasks.filter((t) => t.completedAt === null).length} active · ${tasks.filter((t) => t.completedAt !== null).length} completed`}
        </p>
      </div>

      {/* Due today / overdue greeting banner */}
      <DueTodayBanner dueTodayCount={dueTodayCount} />

      {/* Interactive task list */}
      <TaskList
        initialTasks={serializedTasks}
        topics={serializedTopics}
      />
    </div>
  );
}
