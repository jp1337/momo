/**
 * Dashboard page — the home screen for authenticated users.
 *
 * Shows:
 *  - Time-aware greeting with the user's first name
 *  - Daily Quest Hero Card (live quest selected by algorithm)
 *  - Quick Wins section (tasks ≤ 15 min, uncompleted)
 *  - Stats row: coins, streak, level, total completions
 *  - Quick links to Tasks and Topics
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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faFire, faTrophy, faCircleCheck, faBullseye } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
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
 * Converts a coin count to a "level feel" description for atmospheric display.
 * Used to give the coins stat more storytelling character.
 */
function getCoinTier(coins: number): string {
  if (coins >= 1000) return "✦✦✦";
  if (coins >= 300) return "✦✦";
  if (coins >= 50) return "✦";
  return "·";
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

  // Determine subtitle based on quest state
  const subtitle =
    quest && quest.completedAt === null
      ? t("subtitle_quest")
      : quest && quest.completedAt !== null
      ? t("subtitle_done")
      : t("subtitle_empty");

  const coinTier = getCoinTier(stats.coins);

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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* ── Greeting ─────────────────────────────────────────────────────────── */}
      <div className="relative">
        {/* Atmospheric background glow behind greeting */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "-2rem",
            left: "-3rem",
            width: "300px",
            height: "180px",
            background:
              "radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-amber) 8%, transparent) 0%, transparent 70%)",
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
            {greeting}, {firstName}.
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
              letterSpacing: "0.01em",
            }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* ── Best-day insight chip ─────────────────────────────────────────────── */}
      {bestDayInsight && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-amber) 8%, var(--bg-surface))",
            border: "1px solid color-mix(in srgb, var(--accent-amber) 20%, var(--border))",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ color: "var(--accent-amber)" }}>✦</span>
          <span>{bestDayInsight}</span>
        </div>
      )}

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

      {/* ── Energy Check-in (above quest) ───────────────────────────────────── */}
      <section className="-mb-4">
        <EnergyCheckinCard
          energyLevel={cachedEnergyLevel}
          energyLevelDate={cachedEnergyLevelDate}
        />
      </section>

      {/* ── Daily Quest Hero Card ─────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_quest")}
        </h2>
        <DailyQuestCard
          quest={quest}
          postponesToday={postponesToday}
          postponeLimit={postponeLimit}
          emotionalClosureEnabled={emotionalClosureEnabled}
          userEnergyToday={userEnergyToday}
        />
      </section>

      {/* ── Focus Mode CTA ──────────────────────────────────────────────────── */}
      <Link
        href="/focus"
        className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-150 no-underline group"
        style={{
          backgroundColor: "color-mix(in srgb, var(--accent-green) 8%, var(--bg-surface))",
          border: "1px solid color-mix(in srgb, var(--accent-green) 25%, var(--border))",
        }}
      >
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-green) 15%, transparent)",
          }}
        >
          <FontAwesomeIcon
            icon={faBullseye}
            className="w-5 h-5"
            style={{ color: "var(--accent-green)" }}
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-sm font-semibold block"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              fontStyle: "italic",
              color: "var(--text-primary)",
            }}
          >
            {t("focus_cta")}
          </span>
          <span
            className="text-xs block mt-0.5"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("focus_cta_hint")}
          </span>
        </div>
        <span
          className="text-sm transition-transform group-hover:translate-x-1"
          style={{ color: "var(--accent-green)" }}
        >
          →
        </span>
      </Link>


      {/* ── Quick Wins ── interaktiv: Tasks direkt hier abhaken ─────────────── */}
      <QuickWinsSection tasks={sortedQuickWins} />

      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_overview")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(
            [
              {
                label: t("stat_coins"),
                value: String(stats.coins),
                sub: coinTier,
                icon: faCoins as IconDefinition,
                accent: "var(--coin-gold)",
                pulse: false,
              },
              {
                label: t("stat_streak"),
                value: `${stats.streakCurrent}d`,
                sub: (() => {
                  const fire = stats.streakCurrent >= 7 ? "🔥" : stats.streakCurrent >= 3 ? "↑" : "·";
                  return stats.streakShieldAvailable ? `${fire} ✨` : fire;
                })(),
                icon: faFire as IconDefinition,
                accent: stats.streakCurrent >= 3 ? "var(--accent-amber)" : "var(--text-muted)",
                pulse: stats.streakCurrent > 0,
              },
              {
                label: t("stat_level"),
                value: String(stats.level),
                sub: `${stats.coins} coins`,
                icon: faTrophy as IconDefinition,
                accent: "var(--accent-amber)",
                pulse: false,
              },
              {
                label: t("stat_completed"),
                value: String(totalCompletions),
                sub: totalCompletions >= 100 ? "✦✦✦" : totalCompletions >= 10 ? "✦" : "·",
                icon: faCircleCheck as IconDefinition,
                accent: "var(--accent-green)",
                pulse: false,
              },
            ] as { label: string; value: string; sub: string; icon: IconDefinition; accent: string; pulse: boolean }[]
          ).map((stat) => (
            <div
              key={stat.label}
              className="card-hover rounded-2xl p-5 flex flex-col gap-2"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Subtle accent glow top-right */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "60px",
                  height: "60px",
                  background: `radial-gradient(circle at top right, color-mix(in srgb, ${stat.accent} 12%, transparent) 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />
              <div className="flex items-center justify-between" style={{ position: "relative" }}>
                <span
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  {stat.label}
                </span>
                <FontAwesomeIcon
                  icon={stat.icon}
                  className={stat.pulse ? "streak-pulse w-4 h-4" : "w-4 h-4"}
                  style={{ color: stat.accent }}
                  aria-hidden="true"
                />
              </div>
              <div style={{ position: "relative" }}>
                <span
                  className="text-2xl font-semibold block"
                  style={{
                    fontFamily: "var(--font-display, 'Lora', serif)",
                    color: "var(--text-primary)",
                    lineHeight: 1.1,
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                    fontSize: "0.7rem",
                    color: stat.accent,
                    opacity: 0.7,
                    display: "block",
                    marginTop: "2px",
                  }}
                >
                  {stat.sub}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Quick links ──────────────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("navigate")}
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/tasks"
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            {t("all_tasks")}
          </Link>
          <Link
            href="/topics"
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              textDecoration: "none",
            }}
          >
            {t("all_topics")}
          </Link>
        </div>
      </section>
    </div>
  );
}
