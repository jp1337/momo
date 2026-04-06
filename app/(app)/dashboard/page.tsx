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
import { taskCompletions, users, tasks } from "@/lib/db/schema";
import { eq, count, lte, isNull, and, or } from "drizzle-orm";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faFire, faTrophy, faCircleCheck, faBolt } from "@fortawesome/free-solid-svg-icons";
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

  // Fetch quest, stats, completion count, postpone data, and quick wins in parallel
  const [rawQuest, stats, completionCountRows, userPostponeData, quickWinTasks, fiveMinCountRows] = await Promise.all([
    // Try to get (or select) the daily quest
    selectDailyQuest(userId).catch(() => getDailyQuestIncludingCompleted(userId)),
    getUserStats(userId),
    db
      .select({ count: count() })
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId)),
    // Fetch postpone counters from users table
    db
      .select({
        questPostponesToday: users.questPostponesToday,
        questPostponedDate: users.questPostponedDate,
        questPostponeLimit: users.questPostponeLimit,
        emotionalClosureEnabled: users.emotionalClosureEnabled,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    // Quick wins: uncompleted, non-snoozed tasks with estimatedMinutes <= 15
    db
      .select({ id: tasks.id, title: tasks.title, estimatedMinutes: tasks.estimatedMinutes, coinValue: tasks.coinValue })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          lte(tasks.estimatedMinutes, 15),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, todayStr))
        )
      )
      .limit(3),
    // Count of 5-minute tasks for the "5 Min" CTA
    db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          isNull(tasks.completedAt),
          lte(tasks.estimatedMinutes, 5),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, todayStr))
        )
      ),
  ]);

  // Compute actual postponesToday (reset if date differs)
  const postponeData = userPostponeData[0];
  const postponesToday = postponeData?.questPostponedDate === todayStr
    ? (postponeData?.questPostponesToday ?? 0)
    : 0;
  const postponeLimit = postponeData?.questPostponeLimit ?? 3;
  const emotionalClosureEnabled = postponeData?.emotionalClosureEnabled ?? true;

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
  const fiveMinCount = fiveMinCountRows[0]?.count ?? 0;

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
        />
      </section>

      {/* ── 5-Minute CTA ── only shown when quick tasks exist ────────────────── */}
      {fiveMinCount > 0 && (
        <Link
          href="/quick"
          className="flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-150 no-underline group"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-amber) 8%, var(--bg-surface))",
            border: "1px solid color-mix(in srgb, var(--accent-amber) 25%, var(--border))",
          }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
            }}
          >
            <FontAwesomeIcon
              icon={faBolt}
              className="w-5 h-5"
              style={{ color: "var(--accent-amber)" }}
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
              {t("five_min_cta")}
            </span>
            <span
              className="text-xs block mt-0.5"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("five_min_cta_count", { count: fiveMinCount })}
            </span>
          </div>
          <span
            className="text-sm transition-transform group-hover:translate-x-1"
            style={{ color: "var(--accent-amber)" }}
          >
            →
          </span>
        </Link>
      )}

      {/* ── Quick Wins ── only shown if there are short tasks ────────────────── */}
      {quickWinTasks.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-3">
            <h2
              className="text-xs font-semibold uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("section_quick_wins")}
            </h2>
            <span
              style={{
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                fontSize: "10px",
                color: "var(--accent-green)",
                opacity: 0.8,
              }}
            >
              — {t("quick_wins_hint")}
            </span>
          </div>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            {quickWinTasks.map((task, i) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  borderBottom:
                    i < quickWinTasks.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: "var(--accent-green)",
                      flexShrink: 0,
                      opacity: 0.7,
                    }}
                  />
                  <Link
                    href="/tasks"
                    className="text-sm truncate"
                    style={{
                      fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                      color: "var(--text-primary)",
                      textDecoration: "none",
                    }}
                  >
                    {task.title}
                  </Link>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded ml-3 flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--accent-green)",
                    backgroundColor:
                      "color-mix(in srgb, var(--accent-green) 10%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--accent-green) 20%, transparent)",
                  }}
                >
                  {task.estimatedMinutes} min
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
                sub: stats.streakCurrent >= 7 ? "🔥" : stats.streakCurrent >= 3 ? "↑" : "·",
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
              className="rounded-xl p-5 flex flex-col gap-2"
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
