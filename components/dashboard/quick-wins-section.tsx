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
 * The row's font size carries the effort: see `effortStep()` in
 * `components/ui/list.tsx`. This keeps the list unmistakably secondary to
 * the Daily Quest above it — no colour, no surface, nothing amber or green
 * competing for attention.
 *
 * Tasks can be marked complete directly here (the circle button on the
 * left). On completion: confetti, coins, level-up overlay and achievement
 * toast, same as everywhere else tasks are completed. The row itself does
 * not link anywhere — there is currently no per-row detail view to link to.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { List, Row, effortStep } from "@/components/ui/list";
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

      <List>
        <AnimatePresence initial={false}>
          {tasks.map((task) => (
            <Row
              key={task.id}
              testId="quick-win-row"
              effort={effortStep(task.estimatedMinutes)}
              lead={
                <button
                  type="button"
                  onClick={() => handleComplete(task.id)}
                  disabled={completing.has(task.id)}
                  aria-label={t("quick_win_complete_aria", { title: task.title })}
                  className="-m-2 flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-0 bg-transparent p-2 transition-colors hover:bg-[var(--raised)] disabled:cursor-wait"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-[18px] w-[18px] rounded-[var(--radius-pill)] border-2 transition-colors",
                      completing.has(task.id)
                        ? "border-[var(--done)] bg-[var(--done)]"
                        : "border-[var(--ink-3)] bg-transparent",
                    )}
                  />
                </button>
              }
              title={<span data-testid="quick-win-title">{task.title}</span>}
              trailing={`${task.estimatedMinutes ?? "—"} min`}
            />
          ))}
        </AnimatePresence>
      </List>
    </section>
  );
}
