"use client";

/**
 * NotificationHistory component.
 *
 * Fetches and displays the last 50 notification delivery attempts from
 * GET /api/settings/notification-history. Shows channel, title, timestamp,
 * and delivery status. Failed entries expand on click to reveal the error.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faPaperPlane,
  faMobileScreen,
  faEnvelope,
  faCircleCheck,
  faCircleXmark,
  faArrowsRotate,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { faTelegram } from "@fortawesome/free-brands-svg-icons";

interface NotificationLogEntry {
  id: string;
  channel: string;
  title: string;
  body: string | null;
  status: "sent" | "failed";
  error: string | null;
  sentAt: string;
}

/** Maps channel identifiers to display labels and FontAwesome icons. */
const CHANNEL_META: Record<string, { label: string; icon: typeof faBell; color: string }> = {
  "web-push": { label: "Web Push", icon: faBell, color: "var(--accent-blue)" },
  ntfy: { label: "ntfy", icon: faPaperPlane, color: "var(--accent-green)" },
  pushover: { label: "Pushover", icon: faMobileScreen, color: "var(--accent-purple)" },
  telegram: { label: "Telegram", icon: faTelegram, color: "#2AABEE" },
  email: { label: "Email", icon: faEnvelope, color: "var(--accent-amber)" },
};

/**
 * Formats a timestamp into a locale-aware relative or absolute string.
 */
function formatTime(isoString: string, locale: string): string {
  const date = new Date(isoString);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return locale === "de" ? "Gerade eben" : locale === "fr" ? "À l'instant" : "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHours < 24) return `${diffHours}h`;

  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Notification history list — displays recent notification delivery attempts.
 */
export function NotificationHistory() {
  const t = useTranslations("settings");
  const [entries, setEntries] = useState<NotificationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Detect locale for time formatting
  const locale = typeof document !== "undefined"
    ? (document.documentElement.lang || "en")
    : "en";

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const res = await fetch("/api/settings/notification-history");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg animate-pulse"
            style={{ backgroundColor: "var(--bg-hover)" }}
          />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          {t("notif_history_error_load")}
        </p>
        <button
          onClick={() => fetchHistory(true)}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-hover)",
          }}
        >
          {t("notif_history_refresh")}
        </button>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <p
        className="text-sm text-center py-6"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        {t("notif_history_empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Refresh button */}
      <div className="flex justify-end mb-1">
        <button
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md transition-colors"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-hover)",
          }}
        >
          <FontAwesomeIcon
            icon={faArrowsRotate}
            className={refreshing ? "animate-spin" : ""}
            style={{ fontSize: "0.7rem" }}
          />
          {t("notif_history_refresh")}
        </button>
      </div>

      {/* Entry list */}
      <div
        className="rounded-lg overflow-hidden divide-y"
        style={{
          backgroundColor: "var(--bg-base)",
          borderColor: "var(--border)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header row — desktop only */}
        <div
          className="hidden sm:grid grid-cols-[7rem_6rem_1fr_5rem] gap-3 px-4 py-2 text-xs font-medium"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--text-muted)",
            backgroundColor: "var(--bg-hover)",
          }}
        >
          <span>{t("notif_history_col_time")}</span>
          <span>{t("notif_history_col_channel")}</span>
          <span>{t("notif_history_col_title")}</span>
          <span className="text-right">{t("notif_history_col_status")}</span>
        </div>

        {entries.map((entry) => {
          const meta = CHANNEL_META[entry.channel] ?? { label: entry.channel, icon: faBell, color: "var(--text-muted)" };
          const isFailed = entry.status === "failed";
          const isExpanded = expandedId === entry.id;
          const hasDetail = isFailed ? !!entry.error : !!entry.body;

          return (
            <div key={entry.id}>
              {/* Main row */}
              <div
                className={`
                  grid grid-cols-[1fr_auto] sm:grid-cols-[7rem_6rem_1fr_5rem] gap-2 sm:gap-3
                  px-4 py-2.5 items-center transition-colors text-sm
                  ${hasDetail ? "cursor-pointer hover:bg-[var(--bg-hover)]" : ""}
                `}
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--text-primary)",
                }}
                onClick={() => hasDetail && setExpandedId(isExpanded ? null : entry.id)}
              >
                {/* Time */}
                <span
                  className="text-xs hidden sm:block"
                  style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
                >
                  {formatTime(entry.sentAt, locale)}
                </span>

                {/* Channel badge */}
                <span className="hidden sm:flex items-center gap-1.5 text-xs">
                  <FontAwesomeIcon icon={meta.icon} style={{ color: meta.color, fontSize: "0.75rem" }} />
                  <span style={{ color: "var(--text-secondary)" }}>{meta.label}</span>
                </span>

                {/* Mobile: stacked title + body + meta */}
                <div className="sm:hidden flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-sm truncate font-medium"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {entry.title}
                  </span>
                  {entry.body && (
                    <span
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
                    >
                      {entry.body}
                    </span>
                  )}
                  <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    <FontAwesomeIcon icon={meta.icon} style={{ color: meta.color, fontSize: "0.65rem" }} />
                    <span>{meta.label}</span>
                    <span>{formatTime(entry.sentAt, locale)}</span>
                  </div>
                </div>

                {/* Desktop: title + body stacked */}
                <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                  <span
                    className="truncate text-sm font-medium"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {entry.title}
                  </span>
                  {entry.body && (
                    <span
                      className="truncate text-xs"
                      style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
                    >
                      {entry.body}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center justify-end gap-1.5">
                  <FontAwesomeIcon
                    icon={isFailed ? faCircleXmark : faCircleCheck}
                    style={{
                      color: isFailed ? "var(--accent-red)" : "var(--accent-green)",
                      fontSize: "0.8rem",
                    }}
                  />
                  <span
                    className="text-xs hidden sm:inline"
                    style={{
                      color: isFailed ? "var(--accent-red)" : "var(--accent-green)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {isFailed ? t("notif_history_status_failed") : t("notif_history_status_sent")}
                  </span>
                  {hasDetail && (
                    <FontAwesomeIcon
                      icon={isExpanded ? faChevronUp : faChevronDown}
                      style={{ color: "var(--text-muted)", fontSize: "0.6rem" }}
                    />
                  )}
                </div>
              </div>

              {/* Expanded detail: error for failed, full body for all */}
              {isExpanded && (
                <div
                  className="px-4 pb-3 pt-1 text-xs flex flex-col gap-1"
                  style={{
                    fontFamily: "var(--font-body)",
                    backgroundColor: isFailed
                      ? "color-mix(in srgb, var(--accent-red) 5%, transparent)"
                      : "color-mix(in srgb, var(--accent-amber) 4%, transparent)",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {entry.body && (
                    <p style={{ color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                      {entry.body}
                    </p>
                  )}
                  {isFailed && entry.error && (
                    <p style={{ color: "var(--accent-red)", margin: 0, marginTop: entry.body ? "6px" : 0 }}>
                      {entry.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
