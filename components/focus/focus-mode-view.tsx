"use client";

/**
 * FocusModeView — two-phase focus session.
 *
 * Phase 1 (select): Pick 1–3 tasks to work on.
 * Phase 2 (work): One task at a time, full-screen, distraction-free.
 * Phase 3 (done): Celebration with summary.
 *
 * Runs outside the app shell — no Navbar or Sidebar present.
 *
 * Task 9 ("Lichtkegel"): `/focus` has no rail — one stage, one thing
 * matters. The eight bordered, filled task bars and the dual amber/green
 * "Temple Halo" ambient glow are gone; rows are `List`/`Row` (a hairline
 * between them, no fill, no border), and the page carries exactly one
 * Fraunces element (the headline in whichever phase is showing — the
 * select/empty/done title, or the chosen task itself in the work phase)
 * and exactly one amber element (the "start"/"done"/"back" primary action,
 * as `Button variant="primary"`'s text colour — never a fill).
 *
 * Priority colour-coding and the per-row coin badge are dropped: `Row` has
 * no slot for either (dotColor is the user's topic colour, not priority),
 * and a `--coin-gold` badge is a second amber source on every row — the
 * same reasoning that moved coin totals off `TaskRow` (see there).
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faForward } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { PageFrame } from "@/components/ui/page-frame";
import { List, Row, effortStep } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = "select" | "work" | "done";

interface FocusTask {
  id: string;
  title: string;
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  coinValue: number;
  topicId: string | null;
  estimatedMinutes: number | null;
  energyLevel: "HIGH" | "MEDIUM" | "LOW" | null;
}

interface TopicOption {
  id: string;
  title: string;
  color: string | null;
}

interface FocusModeViewProps {
  initialTasks: FocusTask[];
  topics: TopicOption[];
}

const MAX_SELECTION = 3;

// ─── Stage headline ─────────────────────────────────────────────────────────

/**
 * The page's one Fraunces element, whichever phase is showing. Kept as a
 * single named style object (rather than an inline object literal on each
 * heading) so the ratchet counts zero inline styles for it —
 * `fontVariationSettings` is the one value a CSS custom property cannot
 * carry (same reasoning as `dashboard/daily-quest-card.tsx`'s
 * `questTitleStyle`).
 */
const stageTitleStyle: React.CSSProperties = {
  fontVariationSettings: '"SOFT" 50, "WONK" 1, "opsz" 130',
};

const stageTitleClass =
  "m-0 max-w-[26ch] font-[family-name:var(--font-display)] font-normal " +
  "text-[clamp(1.75rem,4.1vw,2.85rem)] leading-[1.08] tracking-[-0.022em] text-balance text-[var(--ink)]";

// ─── Selection Phase ─────────────────────────────────────────────────────────

function SelectionPhase({
  tasks,
  topics,
  onStart,
  onExit,
}: {
  tasks: FocusTask[];
  topics: TopicOption[];
  onStart: (selected: FocusTask[]) => void;
  onExit: () => void;
}) {
  const t = useTranslations("focus");
  const topicMap = new Map(topics.map((tp) => [tp.id, tp]));
  const [selected, setSelected] = useState<FocusTask[]>([]);

  const toggle = useCallback((task: FocusTask) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === task.id)) {
        return prev.filter((s) => s.id !== task.id);
      }
      if (prev.length >= MAX_SELECTION) return prev;
      return [...prev, task];
    });
  }, []);

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-8"
      >
        <PageFrame>
          <div className="flex flex-col gap-4">
            <h1 data-testid="focus-title" className={stageTitleClass} style={stageTitleStyle}>
              {t("empty_title")}
            </h1>
            <EmptyState
              line={t("empty_subtitle")}
              action={
                <Button variant="quiet" onClick={onExit}>
                  {t("empty_back")}
                </Button>
              }
            />
          </div>
        </PageFrame>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col px-6 py-8 sm:px-8"
    >
      <PageFrame>
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="m-0 font-[family-name:var(--font-mono)] text-[0.6875rem] font-normal uppercase tracking-[0.16em] text-[var(--ink-3)]">
              {t("page_title")}
            </p>
            <h1 data-testid="focus-title" className={stageTitleClass} style={stageTitleStyle}>
              {t("select_title")}
            </h1>
            <p className="m-0 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
              {t("select_subtitle")}
            </p>
          </div>
          <Button variant="quiet" size="icon" onClick={onExit} aria-label={t("work_exit")}>
            <FontAwesomeIcon icon={faXmark} />
          </Button>
        </div>

        <List>
          {tasks.map((task) => {
            const isSelected = selected.some((s) => s.id === task.id);
            const isDisabled = !isSelected && selected.length >= MAX_SELECTION;
            const topic = task.topicId ? topicMap.get(task.topicId) : null;

            return (
              <Row
                key={task.id}
                testId="focus-row"
                effort={effortStep(task.estimatedMinutes)}
                title={task.title}
                eyebrow={topic?.title}
                dotColor={topic?.color ?? null}
                trailing={task.estimatedMinutes ? `${task.estimatedMinutes} min` : undefined}
                className={cn(isDisabled && "pointer-events-none opacity-40")}
                lead={
                  <button
                    type="button"
                    onClick={() => toggle(task)}
                    disabled={isDisabled}
                    aria-label={
                      isSelected
                        ? t("deselect_task_aria", { title: task.title })
                        : t("select_task_aria", { title: task.title })
                    }
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2 bg-transparent p-0 transition-colors disabled:cursor-not-allowed",
                      isSelected ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--ink-3)]",
                    )}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" className="text-[var(--ground)]">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                }
              />
            );
          })}
        </List>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-t-[var(--hairline)] pt-6">
          <span className="font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]">
            {t("select_selected", { selected: selected.length, max: MAX_SELECTION })}
          </span>
          <Button variant="primary" size="lg" disabled={selected.length === 0} onClick={() => onStart(selected)}>
            {t("select_start")}
          </Button>
        </div>
      </PageFrame>
    </motion.div>
  );
}

// ─── Work Phase ──────────────────────────────────────────────────────────────

function WorkPhase({
  tasks,
  topics,
  currentIndex,
  onComplete,
  onSkip,
  onExit,
  isCompleting,
  completionError,
}: {
  tasks: FocusTask[];
  topics: TopicOption[];
  currentIndex: number;
  onComplete: () => void;
  onSkip: () => void;
  onExit: () => void;
  isCompleting: boolean;
  completionError: boolean;
}) {
  const t = useTranslations("focus");
  const topicMap = new Map(topics.map((tp) => [tp.id, tp]));
  const task = tasks[currentIndex];
  const topic = task.topicId ? topicMap.get(task.topicId) : null;
  const total = tasks.length;

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-8">
      <PageFrame>
        {/* Top bar: progress dots + exit. Contained to the reading column,
            not full-bleed — this is a stage, not a toolbar. */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {tasks.map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  "h-2 rounded-[var(--radius-pill)] transition-[width,background-color]",
                  i === currentIndex ? "w-6 bg-[var(--ink)]" : "w-2 bg-[var(--hairline)]",
                )}
              />
            ))}
            <span className="font-[family-name:var(--font-mono)] text-[0.75rem] text-[var(--ink-3)]">
              {currentIndex + 1} / {total}
            </span>
          </div>
          <Button variant="quiet" size="sm" onClick={onExit} aria-label={t("work_exit")}>
            <FontAwesomeIcon icon={faXmark} />
            {t("work_exit")}
          </Button>
        </div>

        {/* The stage: the one task that matters, directly on --ground — no
            card, no border, no shadow. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="flex flex-col items-center gap-2 py-12 text-center"
          >
            {topic && (
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-[6px] w-[6px] shrink-0 rounded-[var(--radius-pill)]"
                  // Die einzige verbleibende Öffnung für die frei gewählte
                  // Nutzerfarbe (Spec §5) — als 6-px-Punkt, wie `Row`s
                  // eigener `dotColor`. Kein Token kann einen aus der
                  // Datenbank kommenden Hex-Wert abbilden.
                  style={{ backgroundColor: topic.color ?? undefined }}
                />
                <span className="font-[family-name:var(--font-mono)] text-[0.75rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
                  {topic.title}
                </span>
              </span>
            )}

            <h2 data-testid="focus-title" className={stageTitleClass} style={stageTitleStyle}>
              {task.title}
            </h2>

            {task.estimatedMinutes ? (
              <span className="font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink-3)]">
                {task.estimatedMinutes} min
              </span>
            ) : null}

            <div className="mt-6 flex flex-col items-center gap-3">
              <Button variant="primary" size="lg" onClick={onComplete} disabled={isCompleting}>
                {t("work_done_btn")}
              </Button>

              <button
                type="button"
                onClick={onSkip}
                disabled={isCompleting}
                className="cursor-pointer border-0 bg-transparent p-2 font-[family-name:var(--font-ui)] text-[0.85rem] text-[var(--ink-2)] transition-colors hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faForward} className="mr-2 text-[0.75rem]" />
                {t("work_skip")}
              </button>

              {completionError && (
                <p className="m-0 font-[family-name:var(--font-ui)] text-[0.75rem] text-[var(--danger)]">
                  {t("work_completion_error")}
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </PageFrame>
    </div>
  );
}

// ─── Done Phase ───────────────────────────────────────────────────────────────

function DonePhase({
  completedCount,
  totalCoins,
  onExit,
}: {
  completedCount: number;
  totalCoins: number;
  onExit: () => void;
}) {
  const t = useTranslations("focus");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh flex-col justify-center px-6 py-12 sm:px-8"
    >
      <PageFrame>
        <div className="flex flex-col items-center gap-4 text-center">
          <motion.span
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
            aria-hidden="true"
            className="text-[4rem] leading-none"
          >
            🎯
          </motion.span>

          <motion.h1
            data-testid="focus-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className={stageTitleClass}
            style={stageTitleStyle}
          >
            {t("done_title")}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-center gap-4 font-[family-name:var(--font-ui)] text-sm text-[var(--ink-2)]"
          >
            {completedCount > 0 && <span>{t("done_tasks", { count: completedCount })}</span>}
            {totalCoins > 0 && <span>{t("done_coins", { coins: totalCoins })}</span>}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Button variant="primary" size="lg" onClick={onExit}>
              {t("done_back")}
            </Button>
          </motion.div>
        </div>
      </PageFrame>
    </motion.div>
  );
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Orchestrates the three focus phases.
 */
export function FocusModeView({ initialTasks, topics }: FocusModeViewProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [selected, setSelected] = useState<FocusTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState(false);

  const handleStart = useCallback((tasks: FocusTask[]) => {
    setSelected(tasks);
    setCurrentIndex(0);
    setPhase("work");
  }, []);

  const handleExit = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const advance = useCallback(
    (tasks: FocusTask[], idx: number) => {
      if (idx + 1 >= tasks.length) {
        setPhase("done");
      } else {
        setCurrentIndex(idx + 1);
      }
    },
    []
  );

  const handleComplete = useCallback(async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    setCompletionError(false);
    const task = selected[currentIndex];
    let succeeded = false;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          coinsEarned?: number;
          newLevel?: { level: number; title: string } | null;
          unlockedAchievements?: AchievementItem[];
        };
        triggerSmallConfetti();
        dispatchCoinsEarned(data.coinsEarned ?? 0);
        setCompletedCount((c) => c + 1);
        setTotalCoins((c) => c + (data.coinsEarned ?? 0));
        if (data.newLevel) setLevelUp(data.newLevel);
        if (data.unlockedAchievements?.length) {
          setAchievements((prev) => [...prev, ...data.unlockedAchievements!]);
        }
        succeeded = true;
      }
    } catch {
      // network failure — show error, do not advance
    }
    setIsCompleting(false);
    if (succeeded) {
      advance(selected, currentIndex);
    } else {
      setCompletionError(true);
    }
  }, [isCompleting, selected, currentIndex, advance]);

  const handleSkip = useCallback(() => {
    advance(selected, currentIndex);
  }, [selected, currentIndex, advance]);

  return (
    <>
      {/* Overlays — always mounted regardless of phase */}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          onDone={() => setLevelUp(null)}
        />
      )}
      {achievements.length > 0 && (
        <AchievementToast
          achievements={achievements}
          onAllDone={() => setAchievements([])}
        />
      )}

      <AnimatePresence mode="wait">
        {phase === "select" && (
          <motion.div key="select" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <SelectionPhase
              tasks={initialTasks}
              topics={topics}
              onStart={handleStart}
              onExit={handleExit}
            />
          </motion.div>
        )}
        {phase === "work" && (
          <motion.div key="work" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
            <WorkPhase
              tasks={selected}
              topics={topics}
              currentIndex={currentIndex}
              onComplete={handleComplete}
              onSkip={handleSkip}
              onExit={handleExit}
              isCompleting={isCompleting}
              completionError={completionError}
            />
          </motion.div>
        )}
        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <DonePhase
              completedCount={completedCount}
              totalCoins={totalCoins}
              onExit={handleExit}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
