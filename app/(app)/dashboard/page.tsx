/**
 * Dashboard page — the home screen for authenticated users.
 *
 * Shows:
 *  - Small, mono greeting with the user's first name
 *  - Meta line above the quest: weekday, energy state, streak
 *  - Daily Quest Hero Card (live quest selected by algorithm)
 *  - Quick Wins section (tasks ≤ 15 min, uncompleted)
 *
 * Task 6 stripped the stat tiles, the quick-link section and the standalone
 * Focus Mode banner — coins/level already live in the navbar, tasks/topics
 * links already live in the sidebar, and the focus entry point moves into
 * the quest row itself in Task 7.
 *
 * This is a Server Component that fetches data server-side.
 * Interactive quest actions are delegated to the DailyQuestCard client component.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getDailyQuestIncludingCompleted, selectDailyQuest } from "@/lib/daily-quest";
import { getUserStats } from "@/lib/gamification";
import { db } from "@/lib/db";
import { taskCompletions, users, tasks, topics } from "@/lib/db/schema";
import { eq, count, lte, isNull, isNotNull, and, or, min, sql } from "drizzle-orm";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import { EnergyCheckinCard } from "@/components/dashboard/energy-checkin-card";
import { QuickWinsSection } from "@/components/dashboard/quick-wins-section";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Returns the translation key for the time-of-day greeting.
 *
 * @param hour - Current hour (0–23)
 * @returns One of: "greeting_night" | "greeting_morning" | "greeting_afternoon" | "greeting_evening"
 */
function getGreetingKey(hour: number): string {
  if (hour < 5) return "greeting_night";
  if (hour < 12) return "greeting_morning";
  if (hour < 17) return "greeting_afternoon";
  return "greeting_evening";
}

/**
 * Dashboard page — loads the daily quest and user stats, then renders the UI.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const userName = session.user?.name ?? "there";
  const firstName = userName.split(" ")[0];

  const t = await getTranslations("dashboard");

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch timezone first — selectDailyQuest uses it to compute "today" correctly.
  // Without this, the UTC-based fallback can clear the quest set by the briefing
  // for users in non-UTC timezones who open the app after midnight UTC.
  const tzRow = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const userTimezone = tzRow[0]?.timezone ?? null;

  // Fetch quest, stats, completion count, postpone data, quick wins, sequential group minimums,
  // weekday completion pattern and topic count in parallel.
  const [rawQuest, stats, completionCountRows, userPostponeData, quickWinTasks, groupMinRows, weekdayRows, topicCountRows] = await Promise.all([
    // Try to get (or select) the daily quest — pass timezone for consistent date handling
    selectDailyQuest(userId, userTimezone).catch(() => getDailyQuestIncludingCompleted(userId)),
    getUserStats(userId),
    db
      .select({ count: count() })
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId)),
    // Fetch postpone counters and energy check-in state from users table
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
    // Quick wins: uncompleted, non-snoozed tasks with estimatedMinutes <= 15.
    // Over-fetch (limit 50) so JS can filter blocked sequential tasks and still
    // have enough candidates for the energy-aware sort before slicing to 3.
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        estimatedMinutes: tasks.estimatedMinutes,
        coinValue: tasks.coinValue,
        energyLevel: tasks.energyLevel,
        taskGroup: tasks.taskGroup,
        sortOrder: tasks.sortOrder,
        topicId: tasks.topicId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          lte(tasks.estimatedMinutes, 15),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, todayStr))
        )
      )
      .limit(50),
    // Minimum sortOrder per (topicId, taskGroup) for all active sequential groups.
    // Used to identify blocked tasks: only the task with the minimum sortOrder
    // in each group is available; predecessors must be completed first.
    db
      .select({
        topicId: tasks.topicId,
        taskGroup: tasks.taskGroup,
        minSortOrder: min(tasks.sortOrder),
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          isNotNull(tasks.taskGroup),
          isNotNull(tasks.topicId),
        )
      )
      .groupBy(tasks.topicId, tasks.taskGroup),
    // Completions by ISO weekday (1=Mon … 7=Sun) — used for the best-day insight chip.
    db
      .select({
        dow: sql<number>`EXTRACT(ISODOW FROM ${taskCompletions.completedAt})::int`,
        n: count(),
      })
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId))
      .groupBy(sql`EXTRACT(ISODOW FROM ${taskCompletions.completedAt})`),
    // Topic count — used to detect brand-new users (no topics → show empty state).
    db.select({ count: count() }).from(topics).where(eq(topics.userId, userId)),
  ]);

  // Compute actual postponesToday (reset if date differs)
  const postponeData = userPostponeData[0];
  const postponesToday = postponeData?.questPostponedDate === todayStr
    ? (postponeData?.questPostponesToday ?? 0)
    : 0;
  const postponeLimit = postponeData?.questPostponeLimit ?? 3;
  const emotionalClosureEnabled = postponeData?.emotionalClosureEnabled ?? true;

  // Energy state — we deliberately do NOT compare against todayStr (which is
  // UTC) here. The raw level + date are passed to EnergyCheckinCard, which
  // does the comparison in the browser using the user's actual local date.
  // This is the structural fix for the timezone bug that hid the prompt for
  // users east or west of UTC around midnight.
  const cachedEnergyLevel = postponeData?.energyLevel ?? null;
  const cachedEnergyLevelDate = postponeData?.energyLevelDate ?? null;
  // For the "matches your energy" badge on DailyQuestCard we still need a
  // best-effort server-side decision — accept the cached value when its
  // date string equals the SSR-computed UTC today (close enough for the
  // badge; the canonical render happens client-side after refresh).
  const userEnergyToday = cachedEnergyLevelDate === todayStr ? cachedEnergyLevel : null;

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

  const totalCompletions = completionCountRows[0]?.count ?? 0;

  // Build a lookup of (topicId::taskGroup) -> minSortOrder for all active sequential groups.
  // A task is "blocked" if it belongs to a sequential group but is not the first pending task.
  const groupMinMap = new Map<string, number>();
  for (const row of groupMinRows) {
    if (row.topicId && row.taskGroup && row.minSortOrder !== null) {
      groupMinMap.set(`${row.topicId}::${row.taskGroup}`, row.minSortOrder);
    }
  }

  const unblockedQuickWins = quickWinTasks.filter((task) => {
    if (!task.taskGroup || !task.topicId) return true; // standalone task — always available
    const minOrder = groupMinMap.get(`${task.topicId}::${task.taskGroup}`);
    // Available only when this task has the minimum sortOrder in its group
    return minOrder === undefined || task.sortOrder === minOrder;
  });

  // Energy-aware Quick Wins sort: tasks matching today's reported energy
  // come first, untagged tasks second, mismatched last. The same ordering
  // logic also drives the 5-min view (see app/(app)/quick/page.tsx).
  // Slice to 3 after filtering and sorting.
  function energyMatchScore(taskEnergy: "HIGH" | "MEDIUM" | "LOW" | null): number {
    if (!userEnergyToday) return 1; // no check-in → preserve original order roughly
    if (taskEnergy === userEnergyToday) return 0; // perfect match
    if (taskEnergy === null) return 1; // untagged is universally OK
    return 2; // mismatch
  }
  const sortedQuickWins = [...unblockedQuickWins]
    .sort((a, b) => energyMatchScore(a.energyLevel) - energyMatchScore(b.energyLevel))
    .slice(0, 3);

  // Determine greeting based on time of day
  const hour = new Date().getHours();
  const greeting = t(getGreetingKey(hour) as Parameters<typeof t>[0]);

  // Empty-state detection — no topics means a brand-new user who just completed onboarding.
  const topicCount = topicCountRows[0]?.count ?? 0;
  const isNewUser = topicCount === 0 && totalCompletions === 0;

  // Best-day insight — only show when the user has meaningful history (≥10 completions).
  // ISO weekday keys: 1=Mon … 7=Sun. Map to translation keys.
  const dowKeys = ["insight_day_mon","insight_day_tue","insight_day_wed","insight_day_thu","insight_day_fri","insight_day_sat","insight_day_sun"] as const;
  let bestDayInsight: string | null = null;
  if (totalCompletions >= 10 && weekdayRows.length > 0) {
    const best = weekdayRows.reduce((a, b) => (b.n > a.n ? b : a));
    const dayKey = dowKeys[best.dow - 1]; // dow 1=Mon → index 0
    if (dayKey) {
      const dayName = t(dayKey as Parameters<typeof t>[0]);
      bestDayInsight = t("insight_best_day" as Parameters<typeof t>[0], { day: dayName });
    }
  }

  // Wochentag als Wort — der Nutzer liest "donnerstag", nicht ein Datum.
  const weekdayKeys = ["meta_day_mon","meta_day_tue","meta_day_wed","meta_day_thu","meta_day_fri","meta_day_sat","meta_day_sun"] as const;
  const isoDow = ((new Date().getDay() + 6) % 7); // 0 = Montag
  const weekdayLabel = t(weekdayKeys[isoDow] as Parameters<typeof t>[0]);

  const energyLabel = userEnergyToday
    ? t(`energy_${userEnergyToday.toLowerCase()}` as Parameters<typeof t>[0])
    : t("meta_energy_unknown" as Parameters<typeof t>[0]);

  return (
    // Wider on lg+ and bigger gaps between sections — gives the dashboard
    // breathing room on desktop without restructuring the natural top-down
    // reading order. Anti-procrastination users do better with a single
    // linear scan path than with a multi-column dashboard.
    <div className="max-w-4xl lg:max-w-5xl mx-auto flex flex-col gap-8 lg:gap-12">
      {/* ── Greeting ─────────────────────────────────────────────────────────── */}
      {/* Begrüßung, nicht die Hauptsache der Seite — Fraunces ist für die Quest
          reserviert. Bleibt vorerst ein h1 (siehe Task-6-Brief Step 3b): erst
          Task 7 macht die Quest zur h1 und demotet dieses Element zu <p>. */}
      <h1 className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] font-normal tracking-[0.01em] text-[var(--ink-2)]">
        {greeting}, {firstName}.
      </h1>

      {/* ── New-user empty state ──────────────────────────────────────────────── */}
      {isNewUser && (
        <div
          className="rounded-xl px-6 py-8 flex flex-col items-center text-center gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--accent-green) 12%, transparent)" }}
            aria-hidden="true"
          >
            🌱
          </div>
          <div>
            <p
              className="text-lg font-semibold mb-1"
              style={{ fontFamily: "var(--font-display, 'Lora', serif)", fontStyle: "italic", color: "var(--text-primary)" }}
            >
              {t("empty_state_title" as Parameters<typeof t>[0])}
            </p>
            <p
              className="text-sm max-w-sm"
              style={{ fontFamily: "var(--font-ui, 'DM Sans', sans-serif)", color: "var(--text-muted)" }}
            >
              {t("empty_state_body" as Parameters<typeof t>[0])}
            </p>
          </div>
          <Link
            href="/topics"
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 no-underline"
            style={{
              backgroundColor: "var(--accent-green)",
              color: "#ffffff",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            {t("empty_state_cta" as Parameters<typeof t>[0])}
          </Link>
        </div>
      )}

      {/* ── Metazeile: Wochentag, Energie, Streak ─────────────────────────────
          Ersetzt drei fruehere Flaechen (Energie-Karte, Insight-Chip,
          Stat-Tiles). Alles Mono, alles gedimmt — es ist Kontext, keine
          Handlung. */}
      <div
        data-testid="quest-meta"
        className="flex items-center justify-between gap-3 flex-wrap font-[family-name:var(--font-mono)] text-[0.6875rem] tracking-[0.06em] text-[var(--ink-3)]"
      >
        <span>{weekdayLabel} · {energyLabel}</span>
        <span className="flex gap-4">
          <span>{t("meta_streak", { days: stats.streakCurrent })}</span>
          {bestDayInsight && <span>{bestDayInsight}</span>}
        </span>
      </div>

      <EnergyCheckinCard
        energyLevel={cachedEnergyLevel}
        energyLevelDate={cachedEnergyLevelDate}
      />

      {/* ── Daily Quest Hero Card ─────────────────────────────────────────────── */}
      <section>
        <DailyQuestCard
          quest={quest}
          postponesToday={postponesToday}
          postponeLimit={postponeLimit}
          emotionalClosureEnabled={emotionalClosureEnabled}
          userEnergyToday={userEnergyToday}
        />
      </section>

      {/* ── Quick Wins ── interaktiv: Tasks direkt hier abhaken ─────────────── */}
      <QuickWinsSection tasks={sortedQuickWins} />
    </div>
  );
}
