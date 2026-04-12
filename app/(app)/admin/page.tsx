/**
 * Admin-Statistiken-Seite — systemweite Plattformstatistiken.
 *
 * Server Component. Zugriff nur für Nutzer, deren ID in der
 * ADMIN_USER_IDS Umgebungsvariable (kommagetrennt) steht.
 *
 * Zeigt:
 *  0. Version / Update-Status (GitHub Releases API, gecacht 24h)
 *  1. System-Übersicht (Nutzer, Aufgaben, Abschlüsse, Topics)
 *  2. Nutzerwachstum und Durchschnittswerte
 *  3. OAuth-Provider-Verteilung
 *  4. Top 10 Nutzer nach Abschlüssen
 *  5. Errungenschaften-Verteilung
 *  6. Wunschliste-Aggregat
 *
 * Not-admin users see an access denied message — no redirect.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminStatistics, getRecentCronRuns } from "@/lib/statistics";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faUsers,
  faListCheck,
  faCircleCheck,
  faFolderOpen,
  faClock,
  faCircleExclamation,
  faArrowUpRightFromSquare,
  faCircleInfo,
  faCodeBranch,
} from "@fortawesome/free-solid-svg-icons";
import { checkForUpdates } from "@/lib/update-checker";

export const metadata: Metadata = {
  title: "Admin — Momo",
};

// Force dynamic rendering so process.env.ADMIN_USER_IDS is read at request
// time, not baked in at build time (where it would be empty).
export const dynamic = "force-dynamic";

/**
 * Admin page. Shows platform-wide stats.
 * Renders an access denied message if the user is not in ADMIN_USER_IDS.
 */
export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Admin check: ADMIN_USER_IDS is a comma-separated list of user UUIDs
  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const isAdmin = adminIds.length > 0 && adminIds.includes(session.user.id);

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-20 flex flex-col items-center gap-4">
        <div
          className="rounded-xl p-8 text-center w-full"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <FontAwesomeIcon
            icon={faShieldHalved}
            className="w-10 h-10 mb-4"
            style={{ color: "var(--accent-red)" }}
            aria-hidden="true"
          />
          <h1
            className="text-xl font-semibold mb-2"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            Zugriff verweigert
          </h1>
          <p
            className="text-sm mb-4"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            Du hast keine Berechtigung, diese Seite aufzurufen.
          </p>
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            Setze diese User-ID in <code>ADMIN_USER_IDS</code>:
          </p>
          <code
            className="block text-xs px-3 py-2 rounded-lg select-all"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--accent-amber)",
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              border: "1px solid var(--border)",
            }}
          >
            {session.user.id}
          </code>
        </div>
      </div>
    );
  }

  const [stats, cronStatus, updateCheck] = await Promise.all([
    getAdminStatistics(),
    getRecentCronRuns(),
    checkForUpdates(),
  ]);
  const totalUsers = stats.totalUsers;

  const cronHistory = cronStatus.rows;
  const lastCron = cronHistory[0] ?? null;
  const minutesSinceLastCron = cronStatus.minutesSinceLastRun;
  const cronStale = minutesSinceLastCron === null || minutesSinceLastCron > 15;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      {/* Page title */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FontAwesomeIcon
            icon={faShieldHalved}
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
            Admin
          </h1>
        </div>
        <p
          className="text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Systemweite Statistiken und Plattformübersicht.
        </p>
      </div>

      {/* ── Section 0: Version / Update-Status ──────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Version
        </h2>
        <div
          className="rounded-xl p-5 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Current version row */}
          <div className="flex items-center gap-3">
            <FontAwesomeIcon
              icon={faCodeBranch}
              className="w-4 h-4 flex-shrink-0"
              style={{ color: "var(--text-muted)" }}
              aria-hidden="true"
            />
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              Installierte Version:
            </span>
            <code
              className="text-sm px-2 py-0.5 rounded"
              style={{
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              v{updateCheck.currentVersion}
            </code>
          </div>

          {/* Update disabled */}
          {updateCheck.disabled && (
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-3"
              style={{
                backgroundColor: "rgba(var(--text-muted-rgb, 128,128,128), 0.08)",
                border: "1px solid var(--border)",
              }}
            >
              <FontAwesomeIcon
                icon={faCircleInfo}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                aria-hidden="true"
              />
              <span
                className="text-sm"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                Update-Prüfung deaktiviert{" "}
                <code
                  style={{
                    fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                    fontSize: "0.75rem",
                  }}
                >
                  (DISABLE_UPDATE_CHECK=true)
                </code>
              </span>
            </div>
          )}

          {/* Check failed */}
          {!updateCheck.disabled && updateCheck.error && (
            <div
              className="flex items-center gap-2 rounded-lg px-4 py-3"
              style={{
                backgroundColor: "rgba(184,84,80,0.08)",
                border: "1px solid rgba(184,84,80,0.25)",
              }}
            >
              <FontAwesomeIcon
                icon={faCircleExclamation}
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "var(--accent-red)" }}
                aria-hidden="true"
              />
              <span
                className="text-sm"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--accent-red)",
                }}
              >
                Versionsprüfung fehlgeschlagen: {updateCheck.error}
              </span>
            </div>
          )}

          {/* Up to date */}
          {!updateCheck.disabled &&
            !updateCheck.error &&
            !updateCheck.updateAvailable && (
              <div
                className="flex items-center gap-2 rounded-lg px-4 py-3"
                style={{
                  backgroundColor: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.25)",
                }}
              >
                <FontAwesomeIcon
                  icon={faCircleCheck}
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--accent-green)" }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--accent-green)",
                  }}
                >
                  Momo ist aktuell — du verwendest die neueste Version.
                </span>
                {updateCheck.checkedAt && (
                  <span
                    className="text-xs ml-auto"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Geprüft:{" "}
                    {updateCheck.checkedAt.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            )}

          {/* Update available */}
          {!updateCheck.disabled && updateCheck.updateAvailable && (
            <div
              className="flex items-start gap-3 rounded-lg px-4 py-4"
              style={{
                backgroundColor: "rgba(240,165,0,0.08)",
                border: "1px solid rgba(240,165,0,0.3)",
              }}
            >
              <FontAwesomeIcon
                icon={faCircleInfo}
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: "var(--accent-amber)" }}
                aria-hidden="true"
              />
              <div className="flex-1 flex flex-col gap-1">
                <p
                  className="text-sm font-semibold"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--accent-amber)",
                  }}
                >
                  Version {updateCheck.latestVersion} ist verfügbar
                </p>
                <p
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  Installiert: v{updateCheck.currentVersion}
                  {updateCheck.checkedAt && (
                    <>
                      {" · "}Geprüft:{" "}
                      {updateCheck.checkedAt.toLocaleTimeString("de-DE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </p>
              </div>
              {updateCheck.releaseUrl && (
                <a
                  href={updateCheck.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    backgroundColor: "rgba(240,165,0,0.15)",
                    color: "var(--accent-amber)",
                    border: "1px solid rgba(240,165,0,0.3)",
                    textDecoration: "none",
                  }}
                >
                  Changelog ansehen
                  <FontAwesomeIcon
                    icon={faArrowUpRightFromSquare}
                    className="w-3 h-3"
                    aria-hidden="true"
                  />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 1: System-Übersicht ──────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          System-Übersicht
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Nutzer gesamt",
              value: stats.totalUsers,
              icon: faUsers,
            },
            {
              label: "Aufgaben gesamt",
              value: stats.totalTasks,
              icon: faListCheck,
            },
            {
              label: "Abschlüsse gesamt",
              value: stats.totalCompletions,
              icon: faCircleCheck,
            },
            {
              label: "Topics gesamt",
              value: stats.totalTopics,
              icon: faFolderOpen,
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

      {/* ── Section 2: Nutzerwachstum ────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Nutzerwachstum &amp; Aktivität
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Neue Nutzer (7 Tage)",
              value: stats.newUsersLast7Days,
            },
            {
              label: "Neue Nutzer (30 Tage)",
              value: stats.newUsersLast30Days,
            },
            {
              label: "Aktive Nutzer (7 Tage)",
              value: stats.activeUsersLast7Days,
            },
            {
              label: "Aktive Nutzer (30 Tage)",
              value: stats.activeUsersLast30Days,
            },
            {
              label: "Abschlüsse (7 Tage)",
              value: stats.completionsLast7Days,
            },
            {
              label: "Abschlüsse (30 Tage)",
              value: stats.completionsLast30Days,
            },
            {
              label: "Ø Level",
              value: stats.avgLevel.toFixed(1),
            },
            {
              label: "Ø Coins",
              value: stats.avgCoins,
            },
            {
              label: "Ø Streak",
              value: stats.avgStreak.toFixed(1),
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl p-4"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <p
                className="text-xs font-medium uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {card.label}
              </p>
              <p
                className="text-xl font-bold"
                style={{
                  fontFamily: "var(--font-display, 'Lora', serif)",
                  color: "var(--text-primary)",
                }}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 3: OAuth Provider ────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          OAuth Provider
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {stats.usersByProvider.length === 0 ? (
            <p
              className="p-4 text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              Keine Daten verfügbar.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  <th
                    className="px-4 py-3 text-left font-semibold"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Provider
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Nutzer
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Anteil
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.usersByProvider.map((row, idx) => (
                  <tr
                    key={row.provider}
                    style={{
                      borderBottom:
                        idx < stats.usersByProvider.length - 1
                          ? "1px solid var(--border)"
                          : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3 capitalize"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.provider}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.count}
                    </td>
                    <td
                      className="px-4 py-3 text-right"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {totalUsers > 0
                        ? `${Math.round((row.count / totalUsers) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Section 4: Top 10 Nutzer ─────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Top 10 Nutzer (nach Abschlüssen)
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {stats.topUsersByCompletions.length === 0 ? (
            <p
              className="p-4 text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              Noch keine Abschlüsse vorhanden.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--bg-elevated)",
                    }}
                  >
                    {["Rang", "Name / E-Mail", "Abschlüsse", "Coins", "Level"].map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left font-semibold"
                          style={{
                            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                            color: "var(--text-muted)",
                          }}
                        >
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stats.topUsersByCompletions.map((user, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom:
                          idx < stats.topUsersByCompletions.length - 1
                            ? "1px solid var(--border)"
                            : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3 font-medium"
                        style={{
                          fontFamily: "var(--font-display, 'Lora', serif)",
                          color: idx === 0 ? "var(--accent-amber)" : "var(--text-muted)",
                        }}
                      >
                        #{idx + 1}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <span className="block font-medium">
                          {user.name ?? "—"}
                        </span>
                        {user.email && (
                          <span
                            className="block text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {user.email}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold"
                        style={{
                          fontFamily: "var(--font-display, 'Lora', serif)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {user.completions}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--accent-amber)",
                        }}
                      >
                        {user.coins}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--text-primary)",
                        }}
                      >
                        {user.level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 5: Errungenschaften-Verteilung ───────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Errungenschaften-Verteilung
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {stats.achievementDistribution.length === 0 ? (
            <p
              className="p-4 text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              Keine Errungenschaften in der Datenbank.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: "var(--bg-elevated)",
                  }}
                >
                  {["Icon", "Errungenschaft", "Verdient von", "Anteil"].map(
                    (col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left font-semibold"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {stats.achievementDistribution.map((row, idx) => (
                  <tr
                    key={row.key}
                    style={{
                      borderBottom:
                        idx < stats.achievementDistribution.length - 1
                          ? "1px solid var(--border)"
                          : undefined,
                    }}
                  >
                    <td className="px-4 py-3 text-lg">{row.icon}</td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.title}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold"
                      style={{
                        fontFamily: "var(--font-display, 'Lora', serif)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {row.earnedBy}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {totalUsers > 0
                        ? `${Math.round((row.earnedBy / totalUsers) * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Section 6: Cron-Status ──────────────────────────────────────────── */}
      <section>
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Cron-Status (Push-Benachrichtigungen)
        </h2>

        {/* Status-Banner */}
        <div
          className="rounded-xl p-4 mb-4 flex items-center gap-3"
          style={{
            backgroundColor: cronStale ? "color-mix(in srgb, var(--accent-red) 12%, var(--bg-surface))" : "color-mix(in srgb, var(--accent-green) 12%, var(--bg-surface))",
            border: `1px solid ${cronStale ? "var(--accent-red)" : "var(--accent-green)"}`,
          }}
        >
          <FontAwesomeIcon
            icon={cronStale ? faCircleExclamation : faClock}
            className="w-4 h-4 flex-shrink-0"
            style={{ color: cronStale ? "var(--accent-red)" : "var(--accent-green)" }}
            aria-hidden="true"
          />
          <div>
            <p
              className="text-sm font-medium"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: cronStale ? "var(--accent-red)" : "var(--text-primary)",
              }}
            >
              {lastCron
                ? cronStale
                  ? `Cron läuft möglicherweise nicht — letzter Lauf vor ${minutesSinceLastCron} Minuten`
                  : `Cron aktiv — letzter Lauf vor ${minutesSinceLastCron} Minute${minutesSinceLastCron === 1 ? "" : "n"}`
                : "Noch kein Cron-Lauf verzeichnet"}
            </p>
            {lastCron && (
              <p
                className="text-xs mt-0.5"
                style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)" }}
              >
                {new Date(lastCron.ranAt).toLocaleString("de-DE", { timeZone: "UTC", timeZoneName: "short" })}
                {" · "}gesendet: {lastCron.sent} · fehlgeschlagen: {lastCron.failed}
                {lastCron.durationMs != null ? ` · ${lastCron.durationMs} ms` : ""}
              </p>
            )}
          </div>
        </div>

        {/* History-Tabelle */}
        {cronHistory.length > 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      backgroundColor: "var(--bg-elevated)",
                    }}
                  >
                    {["Zeitpunkt (UTC)", "Gesendet", "Fehler", "Dauer"].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left font-semibold"
                        style={{
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cronHistory.map((run, idx) => (
                    <tr
                      key={run.id}
                      style={{
                        borderBottom: idx < cronHistory.length - 1 ? "1px solid var(--border)" : undefined,
                      }}
                    >
                      <td
                        className="px-4 py-3"
                        style={{ fontFamily: "var(--font-body)", color: "var(--text-primary)" }}
                      >
                        {new Date(run.ranAt).toLocaleString("de-DE", { timeZone: "UTC", timeZoneName: "short" })}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold"
                        style={{ fontFamily: "var(--font-ui)", color: run.sent > 0 ? "var(--accent-green)" : "var(--text-muted)" }}
                      >
                        {run.sent}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ fontFamily: "var(--font-ui)", color: run.failed > 0 ? "var(--accent-red)" : "var(--text-muted)" }}
                      >
                        {run.failed}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)" }}
                      >
                        {run.durationMs != null ? `${run.durationMs} ms` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ── Section 7: Wunschliste ───────────────────────────────────────────── */}
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
        <div className="grid grid-cols-2 gap-4">
          <div
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
              Total gekauft
            </p>
            <p
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--accent-green)",
              }}
            >
              {stats.wishlistStats.totalBought}
            </p>
          </div>
          <div
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
              Total ausgegeben
            </p>
            <p
              className="text-2xl font-bold"
              style={{
                fontFamily: "var(--font-display, 'Lora', serif)",
                color: "var(--accent-amber)",
              }}
            >
              {stats.wishlistStats.totalSpent.toFixed(2)} €
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
