"use client";

/**
 * ActiveSessions — settings section listing all active login sessions.
 * Shows device/browser info, IP address, timestamps, and revoke actions.
 * The current session is marked and cannot be revoked.
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { SessionSummary } from "@/lib/sessions";
import {
  faDesktop,
  faMobileScreenButton,
  faTabletScreenButton,
  faGlobe,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ActiveSessionsProps {
  initialSessions: SessionSummary[];
}

/**
 * Returns a device icon based on OS.
 */
function getDeviceIcon(os: string) {
  if (os === "iOS" || os === "Android") return faMobileScreenButton;
  if (os === "iPadOS") return faTabletScreenButton;
  if (os === "Windows" || os === "macOS" || os === "Linux" || os === "Chrome OS")
    return faDesktop;
  return faGlobe;
}

/**
 * Formats an ISO date string as a relative time or short date.
 */
function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function ActiveSessions({ initialSessions }: ActiveSessionsProps) {
  const t = useTranslations("settings");
  const [sessions, setSessions] = useState<SessionSummary[]>(initialSessions);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  const revokeOne = useCallback(
    async (sessionId: string) => {
      if (!window.confirm(t("session_revoke_confirm"))) return;

      setMessage(null);
      setLoading(sessionId);
      try {
        const res = await fetch(`/api/auth/sessions/${sessionId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Unknown error");
        }
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setMessageType("success");
        setMessage(t("session_revoked"));
      } catch {
        setMessageType("error");
        setMessage(t("session_err_generic"));
      } finally {
        setLoading(null);
      }
    },
    [t]
  );

  const revokeAll = useCallback(async () => {
    if (!window.confirm(t("session_revoke_all_confirm"))) return;

    setMessage(null);
    setLoading("__all__");
    try {
      const res = await fetch("/api/auth/sessions/revoke-others", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Request failed");
      }
      const data = await res.json();
      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setMessageType("success");
      setMessage(t("session_all_revoked", { count: data.revoked }));
    } catch {
      setMessageType("error");
      setMessage(t("session_err_generic"));
    } finally {
      setLoading(null);
    }
  }, [t]);

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div>
      <h3
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.15rem",
          fontWeight: 600,
          marginBottom: "0.25rem",
        }}
      >
        {t("section_active_sessions")}
      </h3>
      <p
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          marginBottom: "1rem",
        }}
      >
        {t("active_sessions_hint")}
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {sessions.map((session) => (
          <li
            key={session.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid var(--border)",
              backgroundColor: session.isCurrent
                ? "color-mix(in srgb, var(--accent-green) 8%, var(--bg-elevated))"
                : "var(--bg-elevated)",
              marginBottom: "0.5rem",
            }}
          >
            {/* Device icon */}
            <div
              style={{
                flexShrink: 0,
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.5rem",
                backgroundColor: "var(--bg-surface)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: session.isCurrent
                  ? "var(--accent-green)"
                  : "var(--text-muted)",
              }}
            >
              <FontAwesomeIcon
                icon={getDeviceIcon(session.os)}
                style={{ fontSize: "1rem" }}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  {session.deviceLabel === "Unknown"
                    ? t("session_unknown_device")
                    : session.deviceLabel}
                </span>
                {session.isCurrent && (
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      padding: "0.1rem 0.4rem",
                      borderRadius: "999px",
                      backgroundColor:
                        "color-mix(in srgb, var(--accent-green) 20%, transparent)",
                      color: "var(--accent-green)",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {t("session_this_device")}
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginTop: "0.15rem",
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                {session.ipAddress && session.ipAddress !== "unknown" && (
                  <span>{t("session_ip_label", { ip: session.ipAddress })}</span>
                )}
                {session.createdAt && (
                  <span>
                    {t("session_created", {
                      date: formatRelativeDate(session.createdAt),
                    })}
                  </span>
                )}
                {session.lastActiveAt && (
                  <span>
                    {t("session_last_active", {
                      date: formatRelativeDate(session.lastActiveAt),
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Revoke button */}
            {!session.isCurrent && (
              <button
                type="button"
                onClick={() => revokeOne(session.id)}
                disabled={loading !== null}
                style={{
                  flexShrink: 0,
                  fontFamily: "var(--font-ui)",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  padding: "0.35rem 0.75rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--accent-red, #ef4444)",
                  backgroundColor: "transparent",
                  color: "var(--accent-red, #ef4444)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  transition: "background-color 0.15s, opacity 0.15s",
                }}
                onMouseOver={(e) => {
                  if (!loading)
                    e.currentTarget.style.backgroundColor =
                      "color-mix(in srgb, var(--accent-red, #ef4444) 10%, transparent)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {loading === session.id ? (
                  t("session_revoking")
                ) : (
                  <>
                    <FontAwesomeIcon
                      icon={faRightFromBracket}
                      style={{ marginRight: "0.35rem", fontSize: "0.75rem" }}
                    />
                    {t("session_revoke_btn")}
                  </>
                )}
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Status message */}
      {message && (
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            marginTop: "0.5rem",
            color:
              messageType === "success"
                ? "var(--accent-green)"
                : "var(--accent-red, #ef4444)",
          }}
        >
          {message}
        </p>
      )}

      {/* Revoke all button */}
      {otherSessions.length > 0 ? (
        <button
          type="button"
          onClick={revokeAll}
          disabled={loading !== null}
          style={{
            marginTop: "0.75rem",
            width: "100%",
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            fontWeight: 500,
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid var(--accent-red, #ef4444)",
            backgroundColor: "transparent",
            color: "var(--accent-red, #ef4444)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "background-color 0.15s, opacity 0.15s",
          }}
          onMouseOver={(e) => {
            if (!loading)
              e.currentTarget.style.backgroundColor =
                "color-mix(in srgb, var(--accent-red, #ef4444) 10%, transparent)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {loading === "__all__"
            ? t("session_revoking")
            : t("session_revoke_all_btn")}
        </button>
      ) : (
        <p
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            marginTop: "0.5rem",
            fontStyle: "italic",
          }}
        >
          {t("session_no_other")}
        </p>
      )}
    </div>
  );
}
