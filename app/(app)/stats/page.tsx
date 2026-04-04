/**
 * Statistiken-Seite — umfassende Nutzerstatistiken.
 *
 * Server Component. Zeigt:
 *  1. Übersicht (Aufgaben, Abschlüsse, Streaks)
 *  2. Fortschritt (Level, Coins, Level-Fortschrittsbalken)
 *  3. Aktivität (letzte 7/30 Tage, offene Aufgaben)
 *  4. Aufgaben nach Typ
 *  5. Aufgaben nach Priorität
 *  6. Topics mit Fortschritt
 *  7. Errungenschaften (verdient vs. gesperrt)
 *  8. Wunschliste-Statistiken
 *
 * Requires: authentication (redirects to /login if no session)
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserStatistics } from "@/lib/statistics";
import { LEVELS, getNextLevel } from "@/lib/gamification";
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

export const metadata: Metadata = {
  title: "Statistiken — Momo",
};

/** Formats a Date to a German locale date string */
function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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
  const stats = await getUserStatistics(userId);

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
            Statistiken
          </h1>
        </div>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Dein persönlicher Überblick über Fortschritt und Aktivität.
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
          Übersicht
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Aufgaben erstellt",
              value: stats.totalTasksCreated,
              icon: faListCheck,
            },
            {
              label: "Abschlüsse gesamt",
              value: stats.totalCompletions,
              icon: faCircleCheck,
            },
            {
              label: "Aktueller Streak",
              value: `${stats.streakCurrent}d`,
              icon: faFire,
            },
            {
              label: "Bester Streak",
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

      {/* ── Section 2: Fortschritt ───────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Fortschritt
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
                Level {stats.level}
                {nextLevelDef && ` → ${nextLevelDef.title} (Level ${nextLevelDef.level})`}
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
                {stats.coins} Coins
              </span>
              {nextLevelDef && (
                <span
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  Ziel: {nextLevelDef.minCoins} Coins
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
              {levelProgress}% zum nächsten Level
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
                Aktuelles Guthaben
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
                Gesamt verdient
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
            Mitglied seit {formatDate(stats.memberSince)}
          </p>
        </div>
      </section>

      {/* ── Section 3: Aktivität ─────────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Aktivität
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: "Abschlüsse letzte 7 Tage",
              value: stats.completionsLast7Days,
            },
            {
              label: "Abschlüsse letzte 30 Tage",
              value: stats.completionsLast30Days,
            },
            { label: "Offene Aufgaben", value: stats.openTasks },
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

      {/* ── Section 4: Aufgaben nach Typ ─────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Aufgaben nach Typ
        </h2>
        <div
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { label: "Einmalig", value: stats.tasksByType.ONE_TIME },
            { label: "Wiederkehrend", value: stats.tasksByType.RECURRING },
            {
              label: "Tagesquest-fähig",
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

      {/* ── Section 5: Aufgaben nach Priorität ──────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Aufgaben nach Priorität
        </h2>
        <div
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { label: "Hoch", value: stats.tasksByPriority.HIGH },
            { label: "Normal", value: stats.tasksByPriority.NORMAL },
            { label: "Irgendwann", value: stats.tasksByPriority.SOMEDAY },
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

      {/* ── Section 6: Topics ────────────────────────────────────────────────── */}
      {stats.topicsWithStats.length > 0 && (
        <section>
          <h2
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            Topics ({stats.totalTopics})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.topicsWithStats.map((topic) => {
              const pct =
                topic.totalTasks > 0
                  ? Math.round(
                      (topic.completedTasks / topic.totalTasks) * 100
                    )
                  : 0;
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
                        backgroundColor:
                          topic.color ?? "var(--accent-amber)",
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
                    {pct}% abgeschlossen
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section 7: Errungenschaften ──────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Errungenschaften (
          {stats.achievements.filter((a) => a.earnedAt !== null).length}/
          {stats.achievements.length})
        </h2>
        {stats.achievements.length === 0 ? (
          <p
            className="text-sm"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            Keine Errungenschaften gefunden.
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
                        aria-label="Gesperrt"
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
                        Verdient am {formatDate(achievement.earnedAt)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 8: Wunschliste ───────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Wunschliste
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Gekauft",
              value: stats.wishlistStats.bought,
              accent: "var(--accent-green)",
            },
            {
              label: "Ausgegeben",
              value: `${stats.wishlistStats.totalSpent.toFixed(2)} €`,
              accent: "var(--accent-amber)",
            },
            {
              label: "Offen",
              value: stats.wishlistStats.open,
              accent: "var(--text-primary)",
            },
            {
              label: "Verworfen",
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
