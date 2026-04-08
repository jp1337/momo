"use client";

/**
 * CalendarFeedSection — settings panel for the private iCal calendar feed.
 *
 * States:
 *  - inactive: single "Generate feed URL" button + helper text
 *  - active:   shows "active since <date>", Rotate + Revoke buttons
 *  - just-created / rotated: one-time display of the full URL with a
 *    "this will never be shown again" warning banner and a Copy button
 *
 * Backed by `POST /api/settings/calendar-feed` (rotate) and
 * `DELETE /api/settings/calendar-feed` (revoke). The URL is never persisted
 * on the client after the user leaves this section — if they miss the
 * one-time display, they rotate again.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendarDays,
  faCopy,
  faCheck,
  faRotate,
  faTrash,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";

interface CalendarFeedSectionProps {
  initialActive: boolean;
  initialCreatedAt: string | null;
}

export function CalendarFeedSection({
  initialActive,
  initialCreatedAt,
}: CalendarFeedSectionProps) {
  const t = useTranslations("settings");
  const [active, setActive] = useState(initialActive);
  const [createdAt, setCreatedAt] = useState<string | null>(initialCreatedAt);
  const [plaintextUrl, setPlaintextUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRotate(isRotation: boolean) {
    setError(null);
    if (isRotation) {
      const ok =
        typeof window === "undefined"
          ? true
          : window.confirm(t("calendar_feed_rotate_confirm"));
      if (!ok) return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/calendar-feed", { method: "POST" });
      if (!res.ok) {
        setError(t("calendar_feed_err_generic"));
        return;
      }
      const data = (await res.json()) as { url: string; createdAt: string };
      setPlaintextUrl(data.url);
      setActive(true);
      setCreatedAt(data.createdAt);
      setCopied(false);
    } catch {
      setError(t("calendar_feed_err_network"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setError(null);
    const ok =
      typeof window === "undefined"
        ? true
        : window.confirm(t("calendar_feed_revoke_confirm"));
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settings/calendar-feed", { method: "DELETE" });
      if (!res.ok) {
        setError(t("calendar_feed_err_generic"));
        return;
      }
      setActive(false);
      setCreatedAt(null);
      setPlaintextUrl(null);
    } catch {
      setError(t("calendar_feed_err_network"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!plaintextUrl) return;
    try {
      await navigator.clipboard.writeText(plaintextUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("calendar_feed_err_copy"));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status line */}
      <p
        className="text-sm flex items-center gap-2"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        <FontAwesomeIcon icon={faCalendarDays} />
        {active && createdAt
          ? t("calendar_feed_active", {
              date: new Date(createdAt).toLocaleDateString(),
            })
          : t("calendar_feed_inactive")}
      </p>

      {/* One-time URL display */}
      {plaintextUrl && (
        <div
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px dashed var(--accent)",
          }}
        >
          <p
            className="text-xs flex items-start gap-2"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <FontAwesomeIcon
              icon={faTriangleExclamation}
              style={{ color: "var(--accent)", marginTop: "2px" }}
            />
            <span>{t("calendar_feed_warning_once")}</span>
          </p>
          <div className="flex gap-2 items-stretch">
            <code
              className="flex-1 text-xs break-all rounded px-3 py-2 min-w-0"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-body)",
              }}
            >
              {plaintextUrl}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded text-xs font-medium flex items-center gap-1 shrink-0"
              style={{
                backgroundColor: "var(--accent)",
                color: "white",
                fontFamily: "var(--font-ui)",
              }}
              aria-label={t("calendar_feed_copy_url")}
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              {copied ? t("calendar_feed_copied") : t("calendar_feed_copy_url")}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!active ? (
          <button
            type="button"
            onClick={() => handleRotate(false)}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
              fontFamily: "var(--font-ui)",
            }}
          >
            {busy ? t("calendar_feed_working") : t("calendar_feed_create")}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleRotate(true)}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)",
              }}
            >
              <FontAwesomeIcon icon={faRotate} />
              {t("calendar_feed_rotate")}
            </button>
            <button
              type="button"
              onClick={handleRevoke}
              disabled={busy}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{
                backgroundColor: "transparent",
                color: "#c95151",
                border: "1px solid #c9515166",
                fontFamily: "var(--font-ui)",
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
              {t("calendar_feed_revoke")}
            </button>
          </>
        )}
      </div>

      {/* How-to hints */}
      <ul
        className="text-xs flex flex-col gap-1 mt-1"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        <li>{t("calendar_feed_help_google")}</li>
        <li>{t("calendar_feed_help_apple")}</li>
        <li>{t("calendar_feed_help_outlook")}</li>
      </ul>

      {error && (
        <p
          className="text-xs"
          style={{ color: "#c95151", fontFamily: "var(--font-ui)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
