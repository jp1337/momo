"use client";

/**
 * TimezoneSettings — IANA timezone picker for the settings page.
 *
 * Displays the browser-detected timezone, lets the user pick a different
 * one from a grouped dropdown, and auto-saves on change via
 * PATCH /api/settings/timezone.
 *
 * @module components/settings/timezone-settings
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";

interface TimezoneSettingsProps {
  /** The user's stored timezone from DB (null = not explicitly set) */
  initialTimezone: string | null;
}

/**
 * Groups an array of IANA timezone identifiers by their region prefix
 * (e.g. "Europe", "America"). Timezones without a slash go into "Other".
 *
 * @param timezones - IANA timezone identifiers
 * @returns Map of region → sorted timezone list
 */
function groupTimezones(timezones: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const tz of timezones) {
    const slash = tz.indexOf("/");
    const region = slash > 0 ? tz.slice(0, slash) : "Other";
    const existing = groups.get(region);
    if (existing) {
      existing.push(tz);
    } else {
      groups.set(region, [tz]);
    }
  }
  return groups;
}

/**
 * Returns all IANA timezone identifiers supported by the runtime,
 * grouped by region for use in a <select> with <optgroup>.
 *
 * @returns Grouped timezone map
 */
function getGroupedTimezones(): Map<string, string[]> {
  try {
    const all = Intl.supportedValuesOf("timeZone");
    return groupTimezones(all);
  } catch {
    // Fallback for older runtimes
    const fallback = [
      "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos", "Africa/Nairobi",
      "America/Anchorage", "America/Argentina/Buenos_Aires", "America/Bogota",
      "America/Chicago", "America/Denver", "America/Halifax", "America/Los_Angeles",
      "America/Mexico_City", "America/New_York", "America/Phoenix", "America/Santiago",
      "America/Sao_Paulo", "America/Toronto", "America/Vancouver",
      "Asia/Bangkok", "Asia/Colombo", "Asia/Dubai", "Asia/Hong_Kong", "Asia/Istanbul",
      "Asia/Jakarta", "Asia/Karachi", "Asia/Kolkata", "Asia/Seoul", "Asia/Shanghai",
      "Asia/Singapore", "Asia/Taipei", "Asia/Tokyo",
      "Australia/Brisbane", "Australia/Melbourne", "Australia/Perth", "Australia/Sydney",
      "Europe/Amsterdam", "Europe/Athens", "Europe/Berlin", "Europe/Brussels",
      "Europe/Bucharest", "Europe/Budapest", "Europe/Dublin", "Europe/Helsinki",
      "Europe/Istanbul", "Europe/Lisbon", "Europe/London", "Europe/Madrid",
      "Europe/Moscow", "Europe/Oslo", "Europe/Paris", "Europe/Prague",
      "Europe/Rome", "Europe/Stockholm", "Europe/Vienna", "Europe/Warsaw", "Europe/Zurich",
      "Pacific/Auckland", "Pacific/Fiji", "Pacific/Honolulu",
      "UTC",
    ];
    return groupTimezones(fallback);
  }
}

/**
 * Timezone settings: grouped IANA timezone dropdown with auto-save.
 *
 * @param props - Component props
 * @returns Timezone settings UI
 */
export function TimezoneSettings({ initialTimezone }: TimezoneSettingsProps) {
  const t = useTranslations("settings");

  const [browserTimezone, setBrowserTimezone] = useState<string>("");
  const [selectedTimezone, setSelectedTimezone] = useState<string>(initialTimezone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [groupedTimezones, setGroupedTimezones] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setBrowserTimezone(detected);
    if (!initialTimezone) {
      setSelectedTimezone(detected);
    }
    setGroupedTimezones(getGroupedTimezones());
  }, [initialTimezone]);

  /** Persist the timezone to the server. */
  const saveTimezone = useCallback(
    async (timezone: string) => {
      setSaving(true);
      setMessage(null);
      try {
        const res = await fetch("/api/settings/timezone", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Save failed");

        setMessageType("success");
        setMessage(t("timezone_saved"));
      } catch (err) {
        console.error("[TimezoneSettings] Save failed:", err);
        setMessageType("error");
        setMessage(t("timezone_save_error"));
      } finally {
        setSaving(false);
      }
    },
    [t]
  );

  /** Handle dropdown change — auto-save immediately. */
  function handleChange(newTimezone: string) {
    setSelectedTimezone(newTimezone);
    saveTimezone(newTimezone);
  }

  /** Reset to browser-detected timezone. */
  function handleUseBrowser() {
    if (browserTimezone && browserTimezone !== selectedTimezone) {
      setSelectedTimezone(browserTimezone);
      saveTimezone(browserTimezone);
    }
  }

  // Sort regions for consistent display order
  const sortedRegions = Array.from(groupedTimezones.keys()).sort();

  return (
    <div className="flex flex-col gap-3">
      {/* Browser-detected timezone info */}
      {browserTimezone && (
        <div
          className="flex items-center gap-2 text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          <FontAwesomeIcon
            icon={faGlobe}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          />
          <span>{t("timezone_detected", { timezone: browserTimezone })}</span>
        </div>
      )}

      {/* Timezone dropdown */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label
            className="text-xs font-medium"
            htmlFor="timezone-select"
            style={{
              color: "var(--text-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("timezone_select_label")}
          </label>
          <select
            id="timezone-select"
            value={selectedTimezone}
            onChange={(e) => handleChange(e.target.value)}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-sm border appearance-none"
            style={{
              background: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {sortedRegions.map((region) => (
              <optgroup key={region} label={region}>
                {groupedTimezones.get(region)!.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* "Use browser timezone" button — only when different */}
        {browserTimezone && browserTimezone !== selectedTimezone && (
          <button
            onClick={handleUseBrowser}
            disabled={saving}
            className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {t("timezone_use_browser")}
          </button>
        )}
      </div>

      {/* Hint when saved timezone differs from browser */}
      {browserTimezone &&
        selectedTimezone &&
        browserTimezone !== selectedTimezone &&
        !message && (
          <p
            className="text-xs"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("timezone_differs_hint", { browserTz: browserTimezone })}
          </p>
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
