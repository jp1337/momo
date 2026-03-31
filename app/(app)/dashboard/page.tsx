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
import { getDailyQuestIncludingCompleted, selectDailyQuest, getUserStats } from "@/lib/daily-quest";
import { db } from "@/lib/db";
import { taskCompletions } from "@/lib/db/schema";
import { eq, count } from "drizzle-orm";
import { DailyQuestCard } from "@/components/dashboard/daily-quest-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

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
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

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
          {greeting}, {firstName}. 🪶
        </h1>
        <p
          className="mt-1 text-base"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {quest && quest.completedAt === null
            ? "Your quest awaits. One task at a time."
            : quest && quest.completedAt !== null
            ? "Quest complete — you did the thing today."
            : "Add some tasks and Momo will find your quest."}
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
          Daily Quest
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
          Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Coins",
              value: String(stats.coins),
              icon: "🪙",
            },
            {
              label: "Streak",
              value: `${stats.streakCurrent}d`,
              icon: "🔥",
            },
            {
              label: "Level",
              value: String(stats.level),
              icon: "⭐",
            },
            {
              label: "Completed",
              value: String(totalCompletions),
              icon: "✓",
            },
          ].map((stat) => (
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
                <span className="text-base" aria-hidden="true">
                  {stat.icon}
                </span>
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
          Navigate
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/tasks"
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            View all tasks →
          </a>
          <a
            href="/topics"
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            View topics →
          </a>
        </div>
      </section>
    </div>
  );
}
