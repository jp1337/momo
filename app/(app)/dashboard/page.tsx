/**
 * Dashboard page — the home screen for authenticated users.
 *
 * Shows:
 *  - Welcome message with the user's name
 *  - Daily Quest placeholder (to be implemented in Phase 3)
 *  - Quick stats cards (tasks, coins, streak) — placeholders for now
 *
 * This is a Server Component. Data fetching will be added in Phase 2/3.
 */

import { auth } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard page — shows the daily quest and quick stats.
 * Currently renders placeholder content while the task system is built.
 */
export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name ?? "there";
  // Use first name for the greeting
  const firstName = userName.split(" ")[0];

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
          Good day, {firstName}. 🪶
        </h1>
        <p
          className="mt-1 text-base"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Here&apos;s what&apos;s waiting for you today.
        </p>
      </div>

      {/* Daily Quest card */}
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
        <div
          className="rounded-2xl p-6 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              color: "var(--text-muted)",
            }}
          >
            ✦ Your daily quest will appear here once you&apos;ve added some tasks.
          </p>
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            Head to{" "}
            <a href="/tasks" style={{ color: "var(--accent-amber)" }}>
              Tasks
            </a>{" "}
            to add your first task.
          </p>
        </div>
      </section>

      {/* Quick stats */}
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Open tasks", value: "—", icon: "✓" },
            { label: "Coins earned", value: "0", icon: "🪙" },
            { label: "Current streak", value: "0 days", icon: "🔥" },
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
    </div>
  );
}
