"use client";

/**
 * QuickWinsSection — interaktive Quick-Wins-Liste auf dem Dashboard.
 *
 * Tasks können direkt hier als erledigt markiert werden (Haken-Button links).
 * Nach dem Abhaken: Konfetti, Münzen, Level-Up-Overlay und Achievement-Toast.
 * Der Task-Titel verlinkt weiterhin auf /tasks für die Detailansicht.
 */

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
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

      <div className="flex items-baseline gap-3 mb-3">
        <h2
          className="text-xs font-semibold uppercase tracking-widest"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("section_quick_wins")}
        </h2>
        <span
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            fontSize: "10px",
            color: "var(--accent-green)",
            opacity: 0.8,
          }}
        >
          — {t("quick_wins_hint")}
        </span>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <AnimatePresence initial={false}>
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                backgroundColor: "var(--bg-surface)",
                borderBottom:
                  i < tasks.length - 1 ? "1px solid var(--border)" : "none",
                overflow: "hidden",
              }}
            >
              {/* Complete button — circle that fills on click */}
              <button
                onClick={() => handleComplete(task.id)}
                disabled={completing.has(task.id)}
                aria-label={t("quick_win_complete_aria")}
                className="flex-shrink-0 transition-all duration-150"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: `2px solid ${completing.has(task.id) ? "var(--accent-green)" : "color-mix(in srgb, var(--accent-green) 60%, transparent)"}`,
                  backgroundColor: completing.has(task.id)
                    ? "var(--accent-green)"
                    : "transparent",
                  cursor: completing.has(task.id) ? "wait" : "pointer",
                  flexShrink: 0,
                }}
              />

              {/* Task title — links to /tasks for full view */}
              <Link
                href="/tasks"
                className="text-sm truncate flex-1 transition-opacity hover:opacity-70"
                style={{
                  fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                  color: "var(--text-primary)",
                  textDecoration: "none",
                }}
              >
                {task.title}
              </Link>

              {/* Duration badge */}
              <span
                className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--accent-green)",
                  backgroundColor:
                    "color-mix(in srgb, var(--accent-green) 10%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--accent-green) 20%, transparent)",
                }}
              >
                {task.estimatedMinutes} min
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}
