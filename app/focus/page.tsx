/**
 * Focus Mode — /focus
 *
 * Two-phase experience:
 *  1. Selection: user picks 1–3 tasks to work on
 *  2. Work: one task at a time, full-screen, immersive
 *
 * Fetches all open, non-snoozed tasks from the DB and passes them
 * to the client component for the selection phase.
 *
 * Renders without Navbar/Sidebar (own layout.tsx outside (app)).
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, topics } from "@/lib/db/schema";
import { eq, isNull, and, or, lte, asc, desc } from "drizzle-orm";
import { FocusModeView } from "@/components/focus/focus-mode-view";

export const metadata: Metadata = {
  title: "Fokus-Modus — Momo",
};

/**
 * Fetches open tasks for the focus mode selection phase.
 * Sorted: HIGH priority first, then by coinValue descending.
 */
export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const todayStr = new Date().toISOString().split("T")[0];

  const [openTasks, allTopics] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        priority: tasks.priority,
        coinValue: tasks.coinValue,
        topicId: tasks.topicId,
        estimatedMinutes: tasks.estimatedMinutes,
        energyLevel: tasks.energyLevel,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, todayStr))
        )
      )
      .orderBy(asc(tasks.priority), desc(tasks.coinValue))
      .limit(60),
    db
      .select({ id: topics.id, title: topics.title, color: topics.color })
      .from(topics)
      .where(eq(topics.userId, userId)),
  ]);

  // Drizzle returns priority as string — sort HIGH before NORMAL before SOMEDAY
  const PRIORITY_ORDER: Record<string, number> = { HIGH: 0, NORMAL: 1, SOMEDAY: 2 };
  const sorted = [...openTasks].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  );

  const serializedTasks = sorted.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority as "HIGH" | "NORMAL" | "SOMEDAY",
    coinValue: t.coinValue,
    topicId: t.topicId ?? null,
    estimatedMinutes: t.estimatedMinutes ?? null,
    energyLevel: t.energyLevel as "HIGH" | "MEDIUM" | "LOW" | null,
  }));

  const serializedTopics = allTopics.map((tp) => ({
    id: tp.id,
    title: tp.title,
    color: tp.color ?? null,
  }));

  return (
    <FocusModeView initialTasks={serializedTasks} topics={serializedTopics} />
  );
}
