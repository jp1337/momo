/**
 * Wochenrückblick (Weekly Review) page.
 *
 * Server Component. Displays the user's weekly performance summary:
 *  1. Summary cards (completions, postponements, coins, streak)
 *  2. Top topics by completions this week
 *  3. Motivational message based on performance
 *
 * Requires: authentication (redirects to /login if no session)
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getWeeklyReview } from "@/lib/weekly-review";
import { getTranslations } from "next-intl/server";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarWeek,
  faCircleCheck,
  faForward,
  faCoins,
  faFire,
  faPlus,
  faFolderOpen,
} from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Wochenrückblick",
};

/**
 * Formats a YYYY-MM-DD date string to a localized short date.
 * E.g. "2026-04-06" → "6. Apr" (German) or "Apr 6" (English)
 */
function formatShortDate(dateStr: string, locale: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(locale === "de" ? "de-DE" : locale === "fr" ? "fr-FR" : "en-US", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Weekly Review page for the authenticated user.
 * Fetches weekly review data server-side and renders all sections.
 */
export default async function ReviewPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const t = await getTranslations("review");

  // Fetch user timezone
  const userRows = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const timezone = userRows[0]?.timezone ?? null;

  const review = await getWeeklyReview(userId, timezone);

  // Determine locale for date formatting
  const navT = await getTranslations("nav");
  // Detect locale from translated nav key (heuristic)
  const locale = navT("dashboard") === "Dashboard"
    ? (navT("tasks") === "Tasks" ? "en" : "de")
    : "fr";

  // Delta badge logic
  const delta = review.completionsThisWeek - review.completionsLastWeek;
  let deltaText: string;
  let deltaColor: string;
  if (delta > 0) {
    deltaText = t("vs_last_week_up", { delta: String(delta) });
    deltaColor = "var(--accent-green)";
  } else if (delta < 0) {
    deltaText = t("vs_last_week_down", { delta: String(delta) });
    deltaColor = "var(--accent-red)";
  } else {
    deltaText = t("vs_last_week_same");
    deltaColor = "var(--text-muted)";
  }

  // Motivational message
  let motivationKey: string;
  if (review.completionsThisWeek >= 10) {
    motivationKey = "motivation_great";
  } else if (review.completionsThisWeek >= 5) {
    motivationKey = "motivation_good";
  } else if (review.completionsThisWeek >= 1) {
    motivationKey = "motivation_ok";
  } else {
    motivationKey = "motivation_zero";
  }

  const weekSubtitle = t("page_subtitle", {
    start: formatShortDate(review.weekStart, locale),
    end: formatShortDate(review.weekEnd, locale),
  });

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FontAwesomeIcon
            icon={faCalendarWeek}
            className="w-5 h-5"
            style={{ color: "var(--accent-amber)" }}
            aria-hidden="true"
          />
          <h1
            className="text-3xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("page_title")}
          </h1>
        </div>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {weekSubtitle}
        </p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_summary")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Completed */}
          <div
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
                {t("completed")}
              </span>
              <FontAwesomeIcon
                icon={faCircleCheck}
                className="w-4 h-4"
                style={{ color: "var(--accent-green)" }}
                aria-hidden="true"
              />
            </div>
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {review.completionsThisWeek}
            </span>
            <span
              className="text-xs font-medium"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: deltaColor,
              }}
            >
              {deltaText}
            </span>
          </div>

          {/* Postponed */}
          <div
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
                {t("postponed")}
              </span>
              <FontAwesomeIcon
                icon={faForward}
                className="w-4 h-4"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
            </div>
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {review.postponementsThisWeek}
            </span>
          </div>

          {/* Coins earned */}
          <div
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
                {t("coins_earned")}
              </span>
              <FontAwesomeIcon
                icon={faCoins}
                className="w-4 h-4"
                style={{ color: "var(--coin-gold)" }}
                aria-hidden="true"
              />
            </div>
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--coin-gold)",
              }}
            >
              {review.coinsEarnedThisWeek}
            </span>
          </div>

          {/* Streak */}
          <div
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
                {t("streak")}
              </span>
              <FontAwesomeIcon
                icon={faFire}
                className="w-4 h-4"
                style={{ color: "var(--accent-red)" }}
                aria-hidden="true"
              />
            </div>
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {review.streakCurrent}d
            </span>
            <span
              className="text-xs"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("streak_max")}: {review.streakMax}d
            </span>
          </div>

          {/* Tasks created */}
          <div
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
                {t("tasks_created")}
              </span>
              <FontAwesomeIcon
                icon={faPlus}
                className="w-4 h-4"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
            </div>
            <span
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--text-primary)",
              }}
            >
              {review.tasksCreatedThisWeek}
            </span>
          </div>
        </div>
      </section>

      {/* ── Top Topics ────────────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_topics")}
        </h2>
        {review.topTopics.length === 0 ? (
          <div
            className="rounded-xl p-6 text-center"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <FontAwesomeIcon
              icon={faFolderOpen}
              className="w-8 h-8 mb-2"
              style={{ color: "var(--text-muted)", opacity: 0.5 }}
              aria-hidden="true"
            />
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("no_topics")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {review.topTopics.map((topic) => (
              <div
                key={topic.title}
                className="rounded-xl p-5 flex items-center gap-3"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <FontAwesomeIcon
                  icon={resolveTopicIcon(topic.icon)}
                  className="w-5 h-5 flex-shrink-0"
                  style={{ color: "var(--accent-amber)" }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium truncate"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {topic.title}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {t("completions", { count: topic.completions })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Motivational Message ───────────────────────────────────────────── */}
      <section>
        <div
          className="rounded-xl p-6 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderLeft: "4px solid var(--accent-amber)",
          }}
        >
          <p
            className="text-lg italic"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t(motivationKey)}
          </p>
        </div>
      </section>
    </div>
  );
}
