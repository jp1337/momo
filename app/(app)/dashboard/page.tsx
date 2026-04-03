/**
 * Dashboard page — the home screen for authenticated users.
 *
 * Shows:
 *  - Greeting with the user's first name
 *  - Daily Quest Hero Card (live quest selected by algorithm)
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
import { taskCompletions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faFire, faTrophy, faCircleCheck } from "@fortawesome/free-solid-svg-icons";
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

  // Fetch quest, stats, and completion count in parallel
  const [rawQuest, stats, completionCountRows] = await Promise.all([
    // Try to get (or select) the daily quest
    selectDailyQuest(userId).catch(() => getDailyQuestIncludingCompleted(userId)),
    getUserStats(userId),
    db
      .select({ count: count() })
      .from(taskCompletions)
      .where(eq(taskCompletions.userId, userId)),
  ]);

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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Greeting */}
      <div>
        <h1
          className="text-3xl font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          {greeting}, {firstName}.
        </h1>
        <p
          className="mt-1 text-base"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* Daily Quest Hero Card */}
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
        <DailyQuestCard quest={quest} />
      </section>

      {/* Stats row */}
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
                icon: faCoins as IconDefinition,
                pulse: false,
              },
              {
                label: t("stat_streak"),
                value: `${stats.streakCurrent}d`,
                icon: faFire as IconDefinition,
                pulse: stats.streakCurrent > 0,
              },
              {
                label: t("stat_level"),
                value: String(stats.level),
                icon: faTrophy as IconDefinition,
                pulse: false,
              },
              {
                label: t("stat_completed"),
                value: String(totalCompletions),
                icon: faCircleCheck as IconDefinition,
                pulse: false,
              },
            ] as { label: string; value: string; icon: IconDefinition; pulse: boolean }[]
          ).map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-5 flex flex-col gap-2"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="flex items-center justify-between">
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
                  style={{ color: "var(--text-muted)" }}
                  aria-hidden="true"
                />
              </div>
              <span
                className="text-2xl font-semibold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--text-primary)",
                }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Quick links */}
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
            }}
          >
            {t("all_topics")}
          </Link>
        </div>
      </section>
    </div>
  );
}
