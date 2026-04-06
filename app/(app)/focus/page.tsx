/**
 * Focus Mode page — distraction-free view showing only Daily Quest + Quick Wins.
 *
 * Strips away stats, quick links, and navigation noise. Shows only:
 *  - The Daily Quest hero card (with energy check-in, postpone, complete)
 *  - Quick win tasks (estimatedMinutes <= 15, uncompleted, not snoozed)
 *
 * Designed for people with avoidance tendencies — minimal stimulation,
 * maximum focus on the one or two things that matter right now.
 *
 * This is a Server Component that fetches data server-side.
 * Interactive actions are delegated to the FocusModeView client component.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, users } from "@/lib/db/schema";
import { eq, isNull, and, or, lte } from "drizzle-orm";
import { getDailyQuestIncludingCompleted, selectDailyQuest } from "@/lib/daily-quest";
import { getUserTopics } from "@/lib/topics";
import { FocusModeView } from "@/components/focus/focus-mode-view";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Focus — Momo",
};

/**
 * Focus mode page — fetches daily quest and quick-win tasks,
 * then renders a calming, distraction-free view.
 */
export default async function FocusPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const t = await getTranslations("focus");
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch quest, quick-win tasks, topics, and postpone data in parallel
  const [rawQuest, quickWinTasks, topics, userPostponeData] = await Promise.all([
    selectDailyQuest(userId).catch(() => getDailyQuestIncludingCompleted(userId)),
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          lte(tasks.estimatedMinutes, 15),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, todayStr))
        )
      )
      .limit(10)
      .orderBy(tasks.createdAt),
    getUserTopics(userId),
    db
      .select({
        questPostponesToday: users.questPostponesToday,
        questPostponedDate: users.questPostponedDate,
        questPostponeLimit: users.questPostponeLimit,
        emotionalClosureEnabled: users.emotionalClosureEnabled,
        energyLevel: users.energyLevel,
        energyLevelDate: users.energyLevelDate,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  // Compute actual postponesToday (reset if date differs)
  const postponeData = userPostponeData[0];
  const postponesToday = postponeData?.questPostponedDate === todayStr
    ? (postponeData?.questPostponesToday ?? 0)
    : 0;
  const postponeLimit = postponeData?.questPostponeLimit ?? 3;
  const emotionalClosureEnabled = postponeData?.emotionalClosureEnabled ?? true;

  // Energy check-in: if set today, pass it; otherwise null triggers the check-in prompt
  const userEnergyToday = postponeData?.energyLevelDate === todayStr
    ? (postponeData?.energyLevel ?? null)
    : null;

  // Serialize Date fields — Next.js cannot pass Date objects from Server to Client Components
  const quest = rawQuest
    ? {
        ...rawQuest,
        completedAt: rawQuest.completedAt
          ? rawQuest.completedAt.toISOString()
          : null,
        createdAt: rawQuest.createdAt.toISOString(),
        topic: rawQuest.topic
          ? {
              ...rawQuest.topic,
              createdAt: rawQuest.topic.createdAt.toISOString(),
            }
          : null,
      }
    : null;

  const serializedTasks = quickWinTasks.map((task) => ({
    id: task.id,
    title: task.title,
    type: task.type as "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE",
    priority: task.priority as "HIGH" | "NORMAL" | "SOMEDAY",
    completedAt: null,
    dueDate: task.dueDate ?? null,
    nextDueDate: task.nextDueDate ?? null,
    topicId: task.topicId ?? null,
    notes: task.notes ?? null,
    coinValue: task.coinValue,
    createdAt: task.createdAt.toISOString(),
    postponeCount: task.postponeCount ?? 0,
    estimatedMinutes: task.estimatedMinutes ?? null,
    energyLevel: task.energyLevel as "HIGH" | "MEDIUM" | "LOW" | null,
    snoozedUntil: null,
  }));

  const serializedTopics = topics.map((tp) => ({
    id: tp.id,
    title: tp.title,
    color: tp.color ?? null,
  }));

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Header with atmospheric glow ─────────────────────────────── */}
      <div className="relative mb-8">
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-2rem",
            left: "-3rem",
            width: "280px",
            height: "160px",
            background:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-green) 10%, transparent) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1
            className="text-3xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              fontStyle: "italic",
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            {t("page_title")}
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
              letterSpacing: "0.01em",
            }}
          >
            {t("page_subtitle")}
          </p>
        </div>
      </div>

      {/* ── Interactive focus view ───────────────────────────────────── */}
      <FocusModeView
        quest={quest}
        postponesToday={postponesToday}
        postponeLimit={postponeLimit}
        emotionalClosureEnabled={emotionalClosureEnabled}
        userEnergyToday={userEnergyToday}
        initialTasks={serializedTasks}
        topics={serializedTopics}
      />
    </div>
  );
}
