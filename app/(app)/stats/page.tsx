/**
 * Statistiken-Seite — umfassende Nutzerstatistiken.
 *
 * Server Component. Zeigt:
 *  1. Übersicht (Aufgaben, Abschlüsse, Streaks)
 *  2. Streak-Verlauf (90-Tage Sparkline)
 *  3. Fortschritt (Level, Coins, Level-Fortschrittsbalken)
 *  4. Aktivität (letzte 7/30 Tage, offene Aufgaben)
 *  5. Beste Wochentage (7-Spalten Balkenchart)
 *  6. Energie diese Woche
 *  7. Aufgaben nach Typ
 *  8. Aufgaben nach Priorität
 *  9. Topics mit Fortschritt (sortiert nach Completion-Rate)
 * 10. Errungenschaften (verdient vs. gesperrt)
 * 11. Wunschliste-Statistiken
 *
 * Requires: authentication (redirects to /login if no session)
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserStatistics } from "@/lib/statistics";
import { LEVELS, getNextLevel } from "@/lib/gamification";
import {
  getEnergyHistory,
  getEnergyLevelCounts,
  getEnergyCheckinDayCount,
} from "@/lib/energy";
import { EnergyWeekBlock } from "@/components/stats/energy-week-block";
import { WeekdayChart } from "@/components/stats/weekday-chart";
import { StreakSparkline } from "@/components/stats/streak-sparkline";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faFire,
  faTrophy,
  faCircleCheck,
  faListCheck,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import { resolveTopicIcon } from "@/lib/topic-icons";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Statistiken",
};

/**
 * Statistics page for the authenticated user.
 * Fetches data server-side and renders all stat sections.
 */
export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const [stats, energyWeekCounts, energyHistory, energyDayCount, t] =
    await Promise.all([
      getUserStatistics(userId),
      getEnergyLevelCounts(userId, 7),
      getEnergyHistory(userId, 14),
      getEnergyCheckinDayCount(userId),
      getTranslations("stats"),
    ]);

  // Level progression
  const currentLevelDef =
    LEVELS.find((l) => l.level === stats.level) ?? LEVELS[0];
  const nextLevelDef = getNextLevel(stats.level);
  const levelProgress = nextLevelDef
    ? Math.min(
        100,
        Math.round(
          ((stats.coins - currentLevelDef.minCoins) /
            (nextLevelDef.minCoins - currentLevelDef.minCoins)) *
            100
        )
      )
    : 100;

  // Task type totals for percentage calculations
  const totalByType =
    stats.tasksByType.ONE_TIME +
    stats.tasksByType.RECURRING +
    stats.tasksByType.DAILY_ELIGIBLE;

  // Task priority totals
  const totalByPriority =
    stats.tasksByPriority.HIGH +
    stats.tasksByPriority.NORMAL +
    stats.tasksByPriority.SOMEDAY;

  // Weekday labels
  const weekdayLabels = [
    t("weekday_mon"),
    t("weekday_tue"),
    t("weekday_wed"),
    t("weekday_thu"),
    t("weekday_fri"),
    t("weekday_sat"),
    t("weekday_sun"),
  ];

  // Best weekday
  const bestWeekdayCount = Math.max(...stats.completionsByWeekday);

  // Streak sparkline peak
  const streakPeak = Math.max(...stats.streakHistory, 0);

  /** Formats a Date to a locale-aware date string */
  function formatDate(date: Date): string {
    return date.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8">
      {/* Page title */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FontAwesomeIcon
            icon={faChartBar}
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
          {t("page_subtitle")}
        </p>
      </div>

      {/* ── Section 1: Übersicht ─────────────────────────────────────────────── */}
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
          {[
            {
              label: t("tasks_created"),
              value: stats.totalTasksCreated,
              icon: faListCheck,
            },
            {
              label: t("completions_total"),
              value: stats.totalCompletions,
              icon: faCircleCheck,
            },
            {
              label: t("current_streak"),
              value: `${stats.streakCurrent}d`,
              icon: faFire,
            },
            {
              label: t("best_streak"),
              value: `${stats.streakMax}d`,
              icon: faTrophy,
            },
          ].map((card) => (
            <div
              key={card.label}
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
                  {card.label}
                </span>
                <FontAwesomeIcon
                  icon={card.icon}
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
                {card.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Streak-Verlauf ────────────────────────────────────────── */}
      {stats.streakHistory.length > 0 && stats.streakHistory.some((v) => v > 0) && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("section_streak_history")}
          </h2>
          <StreakSparkline
            data={stats.streakHistory}
            todayLabel={t("streak_today", { count: stats.streakCurrent })}
            peakLabel={t("streak_peak", { count: streakPeak })}
          />
        </section>
      )}

      {/* ── Section 3: Fortschritt ───────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_progress")}
        </h2>
        <div
          className="rounded-xl p-6 flex flex-col gap-5"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Level badge + title */}
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold flex-shrink-0"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "2px solid var(--accent-amber)",
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--accent-amber)",
              }}
            >
              {stats.level}
            </div>
            <div>
              <p
                className="text-lg font-semibold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--text-primary)",
                }}
              >
                {currentLevelDef.title}
              </p>
              <p
                className="text-sm"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("level_label", { level: stats.level })}
                {nextLevelDef &&
                  ` ${t("level_next", { title: nextLevelDef.title, level: nextLevelDef.level })}`}
              </p>
            </div>
          </div>

          {/* Level progress bar */}
          <div>
            <div className="flex justify-between mb-2">
              <span
                className="text-xs"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("coins_label", { count: stats.coins })}
              </span>
              {nextLevelDef && (
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  {t("coins_goal", { count: nextLevelDef.minCoins })}
                </span>
              )}
            </div>
            <div
              className="w-full overflow-hidden"
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "var(--bg-elevated)",
              }}
            >
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  width: `${levelProgress}%`,
                  backgroundColor: "var(--accent-amber)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <p
              className="text-xs mt-1"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("level_percent", { percent: levelProgress })}
            </p>
          </div>

          {/* Coins summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("current_balance")}
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--accent-amber)",
                }}
              >
                {stats.coins}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("total_earned")}
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--accent-green)",
                }}
              >
                {stats.coinsEarnedAllTime}
              </p>
            </div>
          </div>

          {/* Member since */}
          <p
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("member_since", { date: formatDate(stats.memberSince) })}
          </p>
        </div>
      </section>

      {/* ── Section 4: Aktivität ─────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_activity")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: t("completions_7d"),
              value: stats.completionsLast7Days,
            },
            {
              label: t("completions_30d"),
              value: stats.completionsLast30Days,
            },
            { label: t("open_tasks"), value: stats.openTasks },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {item.label}
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--text-primary)",
                }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 5: Beste Wochentage ──────────────────────────────────────── */}
      {stats.completionsByWeekday.some((v) => v > 0) && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("section_weekdays")}
          </h2>
          <WeekdayChart
            data={stats.completionsByWeekday}
            labels={weekdayLabels}
            bestDayLabel={t("best_day")}
            bestDayCount={t("completions_count", { count: bestWeekdayCount })}
          />
        </section>
      )}

      {/* ── Energie-Verlauf ──────────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_energy")}
        </h2>
        <EnergyWeekBlock
          weekCounts={energyWeekCounts}
          history={energyHistory}
          isEmpty={energyDayCount === 0}
        />
      </section>

      {/* ── Section 6: Aufgaben nach Typ ─────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_tasks_by_type")}
        </h2>
        <div
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { label: t("type_one_time"), value: stats.tasksByType.ONE_TIME },
            { label: t("type_recurring"), value: stats.tasksByType.RECURRING },
            {
              label: t("type_daily_eligible"),
              value: stats.tasksByType.DAILY_ELIGIBLE,
            },
          ].map((row) => {
            const pct =
              totalByType > 0
                ? Math.round((row.value / totalByType) * 100)
                : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between mb-1">
                  <span
                    className="text-sm"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {row.value} ({pct}%)
                  </span>
                </div>
                <div
                  className="w-full overflow-hidden"
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      width: `${pct}%`,
                      backgroundColor: "var(--accent-amber)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 7: Aufgaben nach Priorität ──────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_tasks_by_priority")}
        </h2>
        <div
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { label: t("priority_high"), value: stats.tasksByPriority.HIGH },
            { label: t("priority_normal"), value: stats.tasksByPriority.NORMAL },
            { label: t("priority_someday"), value: stats.tasksByPriority.SOMEDAY },
          ].map((row) => {
            const pct =
              totalByPriority > 0
                ? Math.round((row.value / totalByPriority) * 100)
                : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between mb-1">
                  <span
                    className="text-sm"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {row.value} ({pct}%)
                  </span>
                </div>
                <div
                  className="w-full overflow-hidden"
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      width: `${pct}%`,
                      backgroundColor: "var(--accent-green)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Section 8: Topics ────────────────────────────────────────────────── */}
      {stats.topicsWithStats.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("section_topics", { count: stats.totalTopics })}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.topicsWithStats.map((topic) => {
              const pct =
                topic.totalTasks > 0
                  ? Math.round(
                      (topic.completedTasks / topic.totalTasks) * 100
                    )
                  : 0;
              // Color-code by completion rate
              const rateColor =
                pct < 25
                  ? "var(--accent-red, #e06c75)"
                  : pct >= 75
                    ? "var(--accent-green)"
                    : topic.color ?? "var(--accent-amber)";
              return (
                <div
                  key={topic.id}
                  className="rounded-xl p-5"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {topic.icon && (
                      <FontAwesomeIcon
                        icon={resolveTopicIcon(topic.icon)}
                        aria-hidden="true"
                        style={{
                          width: "1rem",
                          height: "1rem",
                          color: topic.color ?? "var(--accent-amber)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      className="text-sm font-medium truncate"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {topic.title}
                    </span>
                    <span
                      className="ml-auto text-xs flex-shrink-0"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {topic.completedTasks}/{topic.totalTasks}
                    </span>
                  </div>
                  <div
                    className="w-full overflow-hidden"
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "var(--bg-elevated)",
                    }}
                  >
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        width: `${pct}%`,
                        backgroundColor: rateColor,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <p
                      className="text-xs"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: rateColor,
                      }}
                    >
                      {t("topic_completed_pct", { percent: pct })}
                    </p>
                    {topic.completionsLast30Days > 0 && (
                      <p
                        className="text-xs"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {t("topic_completions_30d", {
                          count: topic.completionsLast30Days,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section 9: Errungenschaften ──────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_achievements", {
            earned: stats.achievements.filter((a) => a.earnedAt !== null).length,
            total: stats.achievements.length,
          })}
        </h2>
        {stats.achievements.length === 0 ? (
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("no_achievements")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.achievements.map((achievement) => {
              const earned = achievement.earnedAt !== null;
              return (
                <div
                  key={achievement.id}
                  className="rounded-xl p-4 flex items-start gap-3"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: `1px solid ${earned ? "var(--accent-amber)" : "var(--border)"}`,
                    opacity: earned ? 1 : 0.5,
                  }}
                >
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {earned ? (
                      achievement.icon
                    ) : (
                      <FontAwesomeIcon
                        icon={faLock}
                        className="w-5 h-5"
                        style={{ color: "var(--text-muted)" }}
                        aria-label={t("achievement_locked")}
                      />
                    )}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-sm font-semibold"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: earned
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                      }}
                    >
                      {achievement.title}
                    </span>
                    <span
                      className="text-xs mt-0.5"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {achievement.description}
                    </span>
                    {earned && achievement.earnedAt && (
                      <span
                        className="text-xs mt-1"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--accent-amber)",
                        }}
                      >
                        {t("achievement_earned_at", {
                          date: formatDate(achievement.earnedAt),
                        })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 10: Wunschliste ──────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_wishlist")}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: t("wishlist_bought"),
              value: stats.wishlistStats.bought,
              accent: "var(--accent-green)",
            },
            {
              label: t("wishlist_spent"),
              value: `${stats.wishlistStats.totalSpent.toFixed(2)} €`,
              accent: "var(--accent-amber)",
            },
            {
              label: t("wishlist_open"),
              value: stats.wishlistStats.open,
              accent: "var(--text-primary)",
            },
            {
              label: t("wishlist_discarded"),
              value: stats.wishlistStats.discarded,
              accent: "var(--text-muted)",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mb-2"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {card.label}
              </p>
              <p
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: card.accent,
                }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
