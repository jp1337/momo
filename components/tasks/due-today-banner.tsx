"use client";

/**
 * DueTodayBanner — personalized greeting shown on the Tasks page.
 *
 * Displays a time-of-day greeting and the number of tasks due today.
 * Hidden when no tasks are due today or overdue.
 */

import { useTranslations } from "next-intl";

interface DueTodayBannerProps {
  /** Number of active tasks that are due today or overdue */
  dueTodayCount: number;
}

/**
 * Greeting banner shown when tasks are due today or overdue.
 * Renders nothing when there are no due tasks.
 */
export function DueTodayBanner({ dueTodayCount }: DueTodayBannerProps) {
  const t = useTranslations("tasks");

  if (dueTodayCount === 0) return null;

  const hour = new Date().getHours();
  let greetingKey: string;
  if (hour < 5) greetingKey = "banner_greeting_night";
  else if (hour < 12) greetingKey = "banner_greeting_morning";
  else if (hour < 17) greetingKey = "banner_greeting_afternoon";
  else if (hour < 22) greetingKey = "banner_greeting_evening";
  else greetingKey = "banner_greeting_night";
  const greeting = t(greetingKey);

  const isOverdue = dueTodayCount > 3;

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6"
      style={{
        backgroundColor: isOverdue
          ? "rgba(184,84,80,0.08)"
          : "rgba(240,165,0,0.08)",
        border: `1px solid ${isOverdue ? "rgba(184,84,80,0.2)" : "rgba(240,165,0,0.2)"}`,
      }}
    >
      <span className="text-xl" role="img" aria-label="wave">
        {isOverdue ? "🔥" : "👋"}
      </span>
      <p
        className="text-sm font-medium"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-primary)",
        }}
      >
        {greeting}!{" "}
        <span style={{ color: isOverdue ? "var(--accent-red)" : "var(--accent-amber)" }}>
          {t("banner_task", { count: dueTodayCount })}
        </span>{" "}
        {t("banner_waits", { count: dueTodayCount })}
      </p>
    </div>
  );
}
