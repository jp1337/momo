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
