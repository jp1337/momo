/**
 * Tasks list page — Lichtkegel-Layout (Task 8).
 *
 * Server component that fetches tasks and topics for the current user,
 * then passes them to the interactive TaskList client component, which
 * groups active tasks by priority (`groupByPriority`) instead of by due
 * date, and renders the page's rail (open/overdue/coins counters, filters)
 * itself — that state (`filteredTasks`, `priorityFilter`, `topicFilter`)
 * lives in `TaskList`, so the rail is built there too.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserTasks } from "@/lib/tasks";
import { getUserTopics } from "@/lib/topics";
import { TaskList } from "@/components/tasks/task-list";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Tasks",
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

  const t = await getTranslations("tasks");

  const [tasks, topics] = await Promise.all([
    getUserTasks(session.user.id),
    getUserTopics(session.user.id),
  ]);

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
    postponeCount: t.postponeCount ?? 0,
    estimatedMinutes: t.estimatedMinutes ?? null,
    recurrenceInterval: t.recurrenceInterval ?? null,
    snoozedUntil: t.snoozedUntil ?? null,
    energyLevel: t.energyLevel ?? null,
    taskGroup: t.taskGroup ?? null,
    sortOrder: t.sortOrder,
  }));

  const serializedTopics = topics.map((t) => ({
    id: t.id,
    title: t.title,
    color: t.color ?? null,
    defaultEnergyLevel: t.defaultEnergyLevel ?? null,
  }));

  return (
    <TaskList
      initialTasks={serializedTasks}
      topics={serializedTopics}
      pageTitle={t("page_title")}
    />
  );
}
