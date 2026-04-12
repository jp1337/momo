"use client";

/**
 * VacationModeSettings component.
 *
 * Renders the vacation mode toggle and end date picker. When activated,
 * all recurring tasks are paused until the end date; habit streaks are
 * preserved. A daily cron job auto-deactivates vacation mode once the
 * end date has passed.
 *
 * @module components/settings/vacation-mode-settings
 */

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";

interface VacationModeSettingsProps {
  /** Whether vacation mode is currently active (from DB) */
  initialActive: boolean;
  /** Current vacation end date (YYYY-MM-DD) or null */
  initialEndDate: string | null;
}

/**
 * Vacation mode settings: enable toggle + end date picker + early-end button.
 *
 * @param props - Component props
 * @returns Vacation mode settings section
 */
export function VacationModeSettings({
  initialActive,
  initialEndDate,
}: VacationModeSettingsProps) {
  const t = useTranslations("settings");

  const [active, setActive] = useState(initialActive);
  const [endDate, setEndDate] = useState(initialEndDate ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  /** Returns the user's IANA timezone. */
  const getTimezone = () =>
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  /** Returns today's date as YYYY-MM-DD in local timezone. */
  const getTodayStr = () =>
    new Date().toLocaleDateString("en-CA");

  /** Persist a vacation mode change to the server. */
  const save = useCallback(
    async (enabled: boolean, date?: string) => {
      setSaving(true);
      setMessage(null);
      try {
        const body: Record<string, unknown> = {
          active: enabled,
          timezone: getTimezone(),
        };
        if (enabled && date) {
          body.endDate = date;
        }

        const res = await fetch("/api/settings/vacation-mode", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");

        setMessageType("success");
        setMessage(
          enabled
            ? t("vacation_mode_saved")
            : t("vacation_mode_deactivated")
        );
        return true;
      } catch (err) {
        console.error("[VacationModeSettings] Save failed:", err);
        setMessageType("error");
        setMessage(err instanceof Error ? err.message : "Save failed");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [t]
  );

  /** Toggle vacation mode on with a valid end date. */
  async function handleActivate() {
    if (!endDate) return;
    const today = getTodayStr();
    if (endDate < today) {
      setMessageType("error");
      setMessage(t("vacation_mode_date_past"));
      return;
    }
    const ok = await save(true, endDate);
    if (ok) setActive(true);
  }

  /** Deactivate vacation mode early. */
  async function handleDeactivate() {
    const ok = await save(false);
    if (ok) {
      setActive(false);
      setEndDate("");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <>
          {/* Active state: show info banner + end button */}
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent-amber) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent-amber) 30%, transparent)",
            }}
          >
            <span
              className="text-lg"
              role="img"
              aria-label="vacation"
            >
              🏖️
            </span>
            <div className="flex flex-col gap-0.5 flex-1">
              <span
                className="text-sm font-medium"
                style={{
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {t("vacation_mode_active_until", { date: endDate })}
              </span>
              <span
                className="text-xs"
                style={{
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {t("vacation_mode_active_hint")}
              </span>
            </div>
            <button
              onClick={handleDeactivate}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {t("vacation_mode_end_now")}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Inactive state: date picker + activate button */}
          <p
            className="text-sm"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("vacation_mode_hint")}
          </p>

          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1">
              <label
                className="text-xs font-medium"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {t("vacation_mode_end_date")}
              </label>
              <input
                type="date"
                value={endDate}
                min={getTodayStr()}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg px-3 py-1.5 text-sm border"
                style={{
                  background: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-body)",
                }}
              />
            </div>

            <button
              onClick={handleActivate}
              disabled={saving || !endDate}
              className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  !endDate || saving
                    ? "var(--bg-tertiary)"
                    : "var(--accent-amber)",
                color:
                  !endDate || saving
                    ? "var(--text-muted)"
                    : "var(--bg-primary)",
                fontFamily: "var(--font-ui)",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {t("vacation_mode_activate")}
            </button>
          </div>
        </>
      )}

      {/* Status message */}
      {message && (
        <p
          className="text-xs"
          style={{
            color:
              messageType === "success"
                ? "var(--accent-green)"
                : "var(--accent-red)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
