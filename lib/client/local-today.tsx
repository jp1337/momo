"use client";

/**
 * "Today" for client components that also render on the server.
 *
 * Client components are server-rendered first. Reading `new Date()` during
 * render made the server use its own clock (UTC in Docker) and the browser the
 * user's, so around midnight — or all evening west of UTC — "Today" became
 * "Tomorrow", task groups moved, and hydration failed: React discarded the
 * server HTML. `useLocalToday` renders the server's value (the user's stored
 * timezone, provided by the (app) layout) during the server render and
 * hydration, then switches to the browser's date without a mismatch.
 */

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

const ServerTodayContext = createContext<string | null>(null);

/**
 * Supplies the server's "today" for hydration.
 *
 * @param serverToday - YYYY-MM-DD in the user's stored timezone
 */
export function LocalTodayProvider({ serverToday, children }: { serverToday: string; children: ReactNode }) {
  return <ServerTodayContext.Provider value={serverToday}>{children}</ServerTodayContext.Provider>;
}

/** The browser's local date as YYYY-MM-DD ("en-CA" formats ISO-style). */
function browserToday(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** The date has no change event; any re-render picks up a new day. */
function subscribeToNothing(): () => void {
  return () => {};
}

/**
 * Today's local date as YYYY-MM-DD, safe to use during render.
 * Outside a LocalTodayProvider the server render falls back to the server's
 * own date, as before.
 *
 * @returns YYYY-MM-DD
 */
export function useLocalToday(): string {
  const serverToday = useContext(ServerTodayContext);
  return useSyncExternalStore(subscribeToNothing, browserToday, () => serverToday ?? browserToday());
}

/**
 * Local midnight of a YYYY-MM-DD date, for comparing with due dates.
 *
 * @param day - YYYY-MM-DD
 * @returns Date at 00:00 local time
 */
export function localMidnight(day: string): Date {
  return new Date(`${day}T00:00:00`);
}

/**
 * Adds days to a YYYY-MM-DD date in local time.
 * Not via toISOString(): that is UTC, so "tomorrow" picked between midnight
 * and 01:00 in Berlin came out as today.
 *
 * @param day - YYYY-MM-DD
 * @param days - number of days to add (may be negative)
 * @returns YYYY-MM-DD
 */
export function addDays(day: string, days: number): string {
  const d = localMidnight(day);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}
