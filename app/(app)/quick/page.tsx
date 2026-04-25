/**
 * "Ich hab nur 5 Minuten" page — focused view for ultra-short tasks.
 *
 * Shows only uncompleted, non-snoozed tasks with estimatedMinutes <= 5.
 * Tasks are directly completable from this view with full animation support
 * (confetti, coin events, level-up overlay, achievement toasts).
 *
 * This is a Server Component that fetches data server-side.
 * Interactive task actions are delegated to the FiveMinuteView client component.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { tasks, users } from "@/lib/db/schema";
import { eq, isNull, and, or, lte } from "drizzle-orm";
import { getUserTopics } from "@/lib/topics";
import { FiveMinuteView } from "@/components/quick/five-minute-view";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "5 Min",
};

/**
 * Quick mode page — fetches 5-minute tasks and renders a focused, minimal view.
 */
export default async function QuickPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const t = await getTranslations("quick");
  const todayStr = new Date().toISOString().split("T")[0];

  const [quickTasks, topics, userRows] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          lte(tasks.estimatedMinutes, 5),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, todayStr))
        )
      )
      .orderBy(tasks.createdAt),
    getUserTopics(userId),
    db
      .select({ energyLevel: users.energyLevel, energyLevelDate: users.energyLevelDate })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);

  // Energy-aware sort: matching > untagged > mismatched. Same logic as
  // dashboard Quick Wins. The user energy is only considered when its
  // cached date matches the SSR-computed UTC today (best-effort; the canonical
  // check happens client-side in EnergyCheckinCard, but Quick view is fully
  // server-rendered so we accept the small UTC drift here).
  const userEnergy =
    userRows[0]?.energyLevelDate === todayStr ? userRows[0]?.energyLevel ?? null : null;
  function energyMatchScore(taskEnergy: "HIGH" | "MEDIUM" | "LOW" | null): number {
    if (!userEnergy) return 1;
    if (taskEnergy === userEnergy) return 0;
    if (taskEnergy === null) return 1;
    return 2;
  }
  const sortedQuickTasks = [...quickTasks].sort(
    (a, b) => energyMatchScore(a.energyLevel) - energyMatchScore(b.energyLevel)
  );

  // Serialize Date fields for client component transfer
  const serializedTasks = sortedQuickTasks.map((task) => ({
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
    energyLevel: task.energyLevel ?? null,
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
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-amber) 10%, transparent) 0%, transparent 70%)",
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
            {t("page_subtitle", { count: serializedTasks.length })}
          </p>
        </div>
      </div>

      {/* ── Interactive task view ─────────────────────────────────────── */}
      <FiveMinuteView
        initialTasks={serializedTasks}
        topics={serializedTopics}
      />
    </div>
  );
}
