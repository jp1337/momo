/**
 * ProgressTabs — der Dispatcher der vier Tabs von /progress.
 *
 * Jeder Tab besitzt seinen eigenen `PageFrame` samt Rand und bekommt die
 * gemeinsame Kopfzeile als `header` gereicht. Das ist der Grund, warum die
 * Seite selbst nur noch auth, Tab-Wahl und Kopfzeile kennt: ein Rand gehört
 * zu einem Tab, nicht zu einer Route (Spec §3).
 */

import type { ReactNode } from "react";
import { HabitsTab } from "./tabs/habits-tab";
import { AchievementsTab } from "./tabs/achievements-tab";
import { ReviewTab } from "./tabs/review-tab";
import { StatsTab } from "./tabs/stats-tab";

export type Tab = "habits" | "achievements" | "review" | "stats";
export const VALID_TABS: Tab[] = ["habits", "achievements", "review", "stats"];

export interface ProgressTabsProps {
  tab: Tab;
  userId: string;
  /** Die eine Fraunces-Überschrift plus die Tab-Leiste. Jeder Tab rendert sie als erstes Kind seiner Lesespalte. */
  header: ReactNode;
  /** Roher `?year=`-Wert; nur der Habits-Tab wertet ihn aus. */
  yearParam?: string;
}

/**
 * Wählt den Tab. Jeder Zweig holt seine eigenen Daten; nur der aktive läuft.
 *
 * @param props.tab - der gewählte Tab
 * @param props.userId - der angemeldete Nutzer
 * @param props.header - die gemeinsame Kopfzeile, die jeder Tab als erstes rendert
 * @param props.yearParam - roher `?year=`-Wert, nur für den Habits-Tab
 * @returns Den Inhalt des gewählten Tabs
 */
export async function ProgressTabs({ tab, userId, header, yearParam }: ProgressTabsProps) {
  if (tab === "achievements") return <AchievementsTab userId={userId} header={header} />;
  if (tab === "review") return <ReviewTab userId={userId} header={header} />;
  if (tab === "stats") return <StatsTab userId={userId} header={header} />;
  return <HabitsTab userId={userId} header={header} yearParam={yearParam} />;
}
