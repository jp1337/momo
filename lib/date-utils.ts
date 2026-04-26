/**
 * Timezone-aware date utilities.
 *
 * All streak and due-date calculations must use the user's local date,
 * not the server's UTC clock. A user in UTC+2 completing a task at 23:50
 * local time should get credit for that day, not the next UTC day.
 */

/**
 * Returns today's date as a YYYY-MM-DD string in the given IANA timezone.
 * Falls back to the server's local time if no timezone is provided.
 *
 * @param timezone - IANA timezone identifier (e.g. "Europe/Berlin", "America/New_York")
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * getLocalDateString("Europe/Berlin") // "2026-04-03" even when UTC says "2026-04-02"
 */
export function getLocalDateString(timezone?: string | null): string {
  const now = new Date();

  if (timezone) {
    try {
      // en-CA locale produces YYYY-MM-DD format natively
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);
    } catch {
      // Invalid timezone string — fall through to server local time
    }
  }

  // Fallback: server local time (UTC in production containers)
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns tomorrow's date as a YYYY-MM-DD string in the given IANA timezone.
 *
 * Calendar arithmetic is performed on the user's local date string (not on
 * the server's UTC clock), so UTC− users near midnight never get the wrong day.
 *
 * @param timezone - IANA timezone identifier
 * @returns Tomorrow's date string in YYYY-MM-DD format
 */
export function getLocalTomorrowString(timezone?: string | null): string {
  // Derive today in the user's local calendar, then add 1 day at UTC midnight
  const todayStr = getLocalDateString(timezone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const tomorrowUtc = new Date(Date.UTC(y, m - 1, d + 1));

  if (timezone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(tomorrowUtc);
    } catch {
      // Invalid timezone — fall through
    }
  }

  const yyyy = tomorrowUtc.getUTCFullYear();
  const mm = String(tomorrowUtc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tomorrowUtc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns yesterday's date as a YYYY-MM-DD string in the given IANA timezone.
 *
 * Calendar arithmetic is performed on the user's local date string (not on
 * the server's UTC clock), so UTC− users near midnight never get the wrong day.
 *
 * @param timezone - IANA timezone identifier
 * @returns Yesterday's date string in YYYY-MM-DD format
 */
export function getLocalYesterdayString(timezone?: string | null): string {
  // Derive today in the user's local calendar, then subtract 1 day at UTC midnight
  const todayStr = getLocalDateString(timezone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const yesterdayUtc = new Date(Date.UTC(y, m - 1, d - 1));

  if (timezone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(yesterdayUtc);
    } catch {
      // Invalid timezone — fall through
    }
  }

  const yyyy = yesterdayUtc.getUTCFullYear();
  const mm = String(yesterdayUtc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(yesterdayUtc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns a Date representing local midnight (00:00:00) in the given timezone,
 * expressed as a UTC timestamp for use in DB timestamp comparisons.
 *
 * Handles non-integer offsets (e.g. India UTC+5:30, Nepal UTC+5:45) by
 * extracting both hour and minute components from Intl.DateTimeFormat.
 *
 * @param dateStr - Local date string in YYYY-MM-DD format
 * @param timezone - IANA timezone identifier (e.g. "Europe/Berlin")
 * @returns UTC Date object corresponding to midnight in the given timezone
 *
 * @example
 * // For Europe/Berlin (UTC+2 in summer), 2026-04-26 local midnight = 2026-04-25T22:00:00Z
 * getLocalMidnightUtc("2026-04-26", "Europe/Berlin")
 */
export function getLocalMidnightUtc(dateStr: string, timezone?: string | null): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcMidnight = new Date(Date.UTC(y, m - 1, d));

  if (!timezone) return utcMidnight;

  try {
    // Find what hour:minute UTC midnight maps to in the local timezone
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(utcMidnight);

    const localHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const localMin = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    const localMinutesIntoDay = localHour * 60 + localMin;

    // localMinutesIntoDay tells us how far past midnight (local) UTC midnight falls.
    // If > 720 (noon), UTC midnight is in the "previous" local day → UTC is behind local.
    const offsetMinutes =
      localMinutesIntoDay > 12 * 60
        ? -(24 * 60 - localMinutesIntoDay)
        : localMinutesIntoDay;

    return new Date(utcMidnight.getTime() - offsetMinutes * 60_000);
  } catch {
    return utcMidnight;
  }
}

/**
 * Returns the day before yesterday as a YYYY-MM-DD string in the given IANA timezone.
 *
 * Used by the Streak Shield to detect exactly-one-day gaps (streakLastDate === dayBeforeYesterday
 * means the user missed exactly one day).
 *
 * @param timezone - IANA timezone identifier
 * @returns Day-before-yesterday's date string in YYYY-MM-DD format
 */
export function getLocalDayBeforeYesterdayString(timezone?: string | null): string {
  const todayStr = getLocalDateString(timezone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const dbyUtc = new Date(Date.UTC(y, m - 1, d - 2));

  if (timezone) {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(dbyUtc);
    } catch {
      // Invalid timezone — fall through
    }
  }

  const yyyy = dbyUtc.getUTCFullYear();
  const mm = String(dbyUtc.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dbyUtc.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
