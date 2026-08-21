"use client";

/**
 * QuickWinsSection — the dashboard's Quick Wins list.
 *
 * Task 8 ("Lichtkegel"): the three-card, bordered-box layout is gone. A
 * task row is content, not an affordance, so it gets no fill and no box
 * (spec rule 3: "an edge only where it says something"). The only edge
 * left is a hairline BETWEEN rows — a separator saying "these are
 * distinct items" is information; a box around all of them was not.
 *
 * The row's font size carries the effort: see `effortStep()` below. This
 * keeps the list unmistakably secondary to the Daily Quest above it —
 * no colour, no surface, nothing amber or green competing for attention.
 *
 * Tasks can be marked complete directly here (the circle button on the
 * left). On completion: confetti, coins, level-up overlay and achievement
 * toast, same as everywhere else tasks are completed. The row itself does
 * not link anywhere — there is currently no per-row detail view to link to.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

export interface QuickWinTask {
  id: string;
  title: string;
  estimatedMinutes: number | null;
  energyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
}

interface CompleteApiResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
}

interface QuickWinsSectionProps {
  tasks: QuickWinTask[];
}

/**
 * Maps a task's estimated duration to one of three effort steps. The step
 * drives the row's font size: effort is visible before the title is read.
 *
 * Three discrete steps, not a continuous scale — a continuous scale
 * collides with minimum sizes and browser zoom.
 *
 * `estimatedMinutes` is an enum, not a free integer: `5 | 15 | 30 | 60 |
 * null` (see `lib/validators/index.ts`). The steps map onto it as:
 *   5 → small, 15 and 30 → medium, 60 → large, null → medium.
 *
 * On the dashboard specifically, only `small` and `medium` are reachable —
 * the Quick Wins query in `app/(app)/dashboard/page.tsx` filters
 * `lte(tasks.estimatedMinutes, 15)`, so a 60-minute task never appears in
 * this list. `large` is exercised once `/tasks` is migrated to the same
 * token system in a later plan.
 *
 * @param minutes - Estimated duration (5, 15, 30, 60) or null
 * @returns "small" (≤5 min), "medium" (≤30 min or no estimate), "large" (>30 min)
 */
export function effortStep(minutes: number | null): "small" | "medium" | "large" {
  if (minutes === null) return "medium";
  if (minutes <= 5) return "small";
  if (minutes <= 30) return "medium";
  return "large";
}

/** Tailwind font-size utility per effort step — never below 0.875rem so browser zoom still works. */
const EFFORT_TEXT = {
  small: "text-[0.875rem]",
  medium: "text-[1rem]",
  large: "text-[1.25rem]",
} as const;

export function QuickWinsSection({ tasks: initialTasks }: QuickWinsSectionProps) {
  const t = useTranslations("dashboard");
  const [tasks, setTasks] = useState<QuickWinTask[]>(initialTasks);
  const [completing, setCompleting] = useState<Set<string>>(new Set());
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);

  const handleComplete = async (id: string) => {
    if (completing.has(id)) return;
    setCompleting((prev) => new Set([...prev, id]));
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) {
        const data = (await res.json()) as CompleteApiResponse;
        triggerSmallConfetti();
        dispatchCoinsEarned(data.coinsEarned ?? 0);
        if (data.newLevel) setLevelUp(data.newLevel);
        if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
          setPendingAchievements((prev) => [...prev, ...data.unlockedAchievements!]);
        }
        setTasks((prev) => prev.filter((task) => task.id !== id));
      }
    } catch {
      // silent fail
    } finally {
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (tasks.length === 0) return null;

  return (
    <section>
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          onDone={() => setLevelUp(null)}
        />
      )}
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onAllDone={() => setPendingAchievements([])}
        />
      )}

      <p className="m-0 mb-3 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
        {t("section_quick_wins")} — {t("quick_wins_hint")}
      </p>

      <ul className="m-0 list-none p-0">
        <AnimatePresence initial={false}>
          {tasks.map((task) => {
            const step = effortStep(task.estimatedMinutes);
            const isCompleting = completing.has(task.id);
            return (
              <motion.li
                key={task.id}
                data-testid="quick-win-row"
                data-effort={step}
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 overflow-hidden border-t border-t-[var(--hairline)] bg-transparent py-3 first:border-t-0"
              >
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={isCompleting}
                  aria-label={t("quick_win_complete_aria")}
                  className="-m-2.5 flex shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-0 bg-transparent p-2.5 transition-colors hover:bg-[var(--raised)] disabled:cursor-wait"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-[18px] w-[18px] rounded-[var(--radius-pill)] border-2 transition-colors",
                      isCompleting
                        ? "border-[var(--done)] bg-[var(--done)]"
                        : "border-[var(--ink-3)] bg-transparent"
                    )}
                  />
                </button>

                <span
                  data-testid="quick-win-title"
                  className={cn(
                    "min-w-0 flex-1 truncate font-[family-name:var(--font-mono)] text-[var(--ink-2)]",
                    EFFORT_TEXT[step]
                  )}
                >
                  {task.title}
                </span>

                <span className="shrink-0 font-[family-name:var(--font-mono)] text-[0.6875rem] tabular-nums text-[var(--ink-3)]">
                  {task.estimatedMinutes ?? "—"} min
                </span>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}
