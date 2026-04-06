"use client";

/**
 * TaskList component — grouped task list wrapper.
 *
 * Groups tasks into sections:
 *  1. Today — tasks due today or overdue
 *  2. Upcoming — tasks with future due dates
 *  3. No date — tasks with no due date (excluding SOMEDAY priority)
 *  4. Someday — SOMEDAY priority tasks with no due date
 *  5. Completed — tasks with completedAt set
 *
 * Each section renders TaskItem components and handles
 * complete/uncomplete/edit/delete actions.
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import type { FilterGroup } from "@/components/shared/search-filter-bar";
import { triggerSmallConfetti } from "@/components/animations/confetti";
import { LevelUpOverlay } from "@/components/animations/level-up-overlay";
import { AchievementToast } from "@/components/animations/achievement-toast";
import type { AchievementItem } from "@/components/animations/achievement-toast";
import { dispatchCoinsEarned } from "@/lib/client/coin-events";

interface Task {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate: string | null;
  nextDueDate: string | null;
  topicId: string | null;
  notes: string | null;
  coinValue: number;
  createdAt: string;
  postponeCount?: number;
  estimatedMinutes?: number | null;
  energyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
  recurrenceInterval?: number | null;
  snoozedUntil?: string | null;
}

interface TopicOption {
  id: string;
  title: string;
  color?: string | null;
}

interface TaskListProps {
  initialTasks: Task[];
  topics: TopicOption[];
}

interface GroupedTasks {
  today: Task[];
  upcoming: Task[];
  noDate: Task[];
  someday: Task[];
  snoozed: Task[];
  completed: Task[];
}

/**
 * Groups tasks into display sections based on due date, priority, and completion.
 */
function groupTasks(tasks: Task[]): GroupedTasks {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Extract snoozed tasks first (uncompleted tasks with a future snooze date)
  const snoozed = tasks.filter((t) => {
    if (!t.snoozedUntil || t.completedAt !== null) return false;
    const snoozeDate = new Date(t.snoozedUntil + "T00:00:00");
    return snoozeDate > today;
  });
  const snoozedIds = new Set(snoozed.map((t) => t.id));

  const active = tasks.filter((t) => t.completedAt === null && !snoozedIds.has(t.id));
  const completed = tasks.filter((t) => t.completedAt !== null);

  const todayTasks: Task[] = [];
  const upcomingTasks: Task[] = [];
  const noDateTasks: Task[] = [];
  const somedayTasks: Task[] = [];

  for (const task of active) {
    const effectiveDate =
      task.type === "RECURRING" ? task.nextDueDate : task.dueDate;

    if (effectiveDate) {
      const due = new Date(effectiveDate + "T00:00:00");
      if (due <= today) {
        todayTasks.push(task);
      } else {
        upcomingTasks.push(task);
      }
    } else if (task.priority === "SOMEDAY") {
      somedayTasks.push(task);
    } else {
      noDateTasks.push(task);
    }
  }

  // Sort today tasks: overdue first, then by creation date
  todayTasks.sort((a, b) => {
    const dateA = a.type === "RECURRING" ? a.nextDueDate : a.dueDate;
    const dateB = b.type === "RECURRING" ? b.nextDueDate : b.dueDate;
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    return 0;
  });

  // Sort upcoming by due date
  upcomingTasks.sort((a, b) => {
    const dateA = a.type === "RECURRING" ? a.nextDueDate : a.dueDate;
    const dateB = b.type === "RECURRING" ? b.nextDueDate : b.dueDate;
    if (dateA && dateB) return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    return 0;
  });

  // Sort snoozed by snooze date ascending (earliest wake-up first)
  snoozed.sort((a, b) => (a.snoozedUntil! < b.snoozedUntil! ? -1 : 1));

  return {
    today: todayTasks,
    upcoming: upcomingTasks,
    noDate: noDateTasks,
    someday: somedayTasks,
    snoozed,
    completed,
  };
}

/**
 * Section header for task groups.
 */
function SectionHeader({
  title,
  count,
}: {
  title: string;
  count: number;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
      <h2
        className="text-sm font-semibold uppercase tracking-wide"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {title}
      </h2>
      <span
        className="text-xs px-1.5 py-0.5 rounded-full"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-muted)",
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
        }}
      >
        {count}
      </span>
    </div>
  );
}

/**
 * Time-aware empty state shown when there are no tasks.
 * Displays different motivating messages based on the current hour.
 */
function EmptyState() {
  const t = useTranslations("tasks");
  const hour = new Date().getHours();
  let emoji: string;
  let headline: string;
  let sub: string;

  if (hour < 5) {
    emoji = "🌙";
    headline = t("empty_night");
    sub = t("empty_night_sub");
  } else if (hour < 12) {
    emoji = "☀️";
    headline = t("empty_morning");
    sub = t("empty_morning_sub");
  } else if (hour < 17) {
    emoji = "🌿";
    headline = t("empty_afternoon");
    sub = t("empty_afternoon_sub");
  } else if (hour < 22) {
    emoji = "🎉";
    headline = t("empty_evening");
    sub = t("empty_evening_sub");
  } else {
    emoji = "🌙";
    headline = t("empty_latenight");
    sub = t("empty_latenight_sub");
  }

  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px dashed var(--border)",
      }}
    >
      <p className="text-2xl mb-3" role="img" aria-label={headline}>
        {emoji}
      </p>
      <p
        className="text-base font-medium mb-1"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          color: "var(--text-primary)",
        }}
      >
        {headline}
      </p>
      <p
        className="text-sm"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {sub}
      </p>
    </div>
  );
}

/** Response shape from POST /api/tasks/:id/complete */
interface CompleteApiResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
  streakCurrent?: number;
}

/**
 * Interactive task list with grouping, completion, and CRUD actions.
 * Manages its own task state after initial server-fetched data.
 * Triggers confetti, level-up overlay, and achievement toasts on task completion.
 */
export function TaskList({ initialTasks, topics }: TaskListProps) {
  const router = useRouter();
  const t = useTranslations("tasks");
  const tSearch = useTranslations("search");
  const tCommon = useTranslations("common");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementItem[]>([]);
  const [snoozedExpanded, setSnoozedExpanded] = useState(false);

  /* ─── Search & Filter state ─────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)),
      );
    }
    if (priorityFilter) {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (topicFilter) {
      result = result.filter((t) => t.topicId === topicFilter);
    }
    return result;
  }, [tasks, searchQuery, priorityFilter, topicFilter]);

  const isFiltering =
    searchQuery.length > 0 || priorityFilter !== null || topicFilter !== null;

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        key: "priority",
        label: tSearch("filter_priority"),
        options: [
          { value: "HIGH", label: tCommon("priority_high") },
          { value: "NORMAL", label: tCommon("priority_normal") },
          { value: "SOMEDAY", label: tCommon("priority_someday") },
        ],
      },
      ...(topics.length > 0
        ? [
            {
              key: "topic",
              label: tSearch("filter_topic"),
              options: topics.map((tp) => ({
                value: tp.id,
                label: tp.title,
                color: tp.color,
              })),
            },
          ]
        : []),
    ],
    [topics, tSearch, tCommon],
  );

  const handleFilterChange = useCallback(
    (key: string, value: string | null) => {
      if (key === "priority") setPriorityFilter(value);
      if (key === "topic") setTopicFilter(value);
    },
    [],
  );

  const clearAllFilters = useCallback(() => {
    setSearchQuery("");
    setPriorityFilter(null);
    setTopicFilter(null);
  }, []);

  const editingTask = tasks.find((t) => t.id === editingTaskId);

  const refreshTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json() as { tasks: Task[] };
        setTasks(data.tasks);
      }
    } catch {
      // Network failure — fall back to a full SSR refresh so the page isn't stale
      router.refresh();
    }
  }, [router]);

  const handleComplete = useCallback(async (id: string) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch(`/api/tasks/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      if (res.ok) {
        const data = (await res.json()) as CompleteApiResponse;

        // Fire a small confetti burst on task completion
        triggerSmallConfetti();

        // Notify CoinCounter in the navbar about earned coins
        dispatchCoinsEarned(data.coinsEarned ?? 0);

        // Show level-up overlay if user leveled up
        if (data.newLevel) {
          setLevelUp(data.newLevel);
        }

        // Queue achievement toasts
        if (data.unlockedAchievements && data.unlockedAchievements.length > 0) {
          setPendingAchievements((prev) => [...prev, ...data.unlockedAchievements!]);
        }

        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [refreshTasks]);

  const handleUncomplete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/complete`, { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json()) as { task?: { coinValue?: number } };
        const refunded = data.task?.coinValue ?? 0;
        dispatchCoinsEarned(-refunded);
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [refreshTasks]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm(t("confirm_delete"))) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== id));
      }
    } catch {
      // silent fail
    }
  }, [t]);

  const handleFormSuccess = useCallback(async () => {
    setEditingTaskId(null);
    setShowCreateForm(false);
    await refreshTasks();
  }, [refreshTasks]);

  const handlePromote = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/promote-to-topic`, { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { topic: { id: string } };
        router.push(`/topics/${data.topic.id}`);
      }
      // 409: task already has topic — shouldn't be reachable via UI, ignore silently
    } catch {
      // silent fail — task unchanged
    }
  }, [router]);

  const handleGoToTopic = useCallback((topicId: string) => {
    router.push(`/topics/${topicId}`);
  }, [router]);

  const handleBreakdown = useCallback(async (id: string) => {
    // Task was deleted during breakdown — remove from local state and refresh
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleInlineEdit = useCallback(async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t))
        );
      }
    } catch {
      // silent fail — title reverts to original on the next refresh
    }
  }, []);

  const handleSnooze = useCallback(async (id: string, snoozedUntil: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snoozedUntil }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, snoozedUntil } : t))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const handleUnsnooze = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}/snooze`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, snoozedUntil: null } : t))
        );
      }
    } catch {
      // silent fail
    }
  }, []);

  const topicMap = new Map(topics.map((t) => [t.id, t]));
  const grouped = groupTasks(filteredTasks);
  const hasAnyTasks = tasks.length > 0;
  const hasFilteredTasks = filteredTasks.length > 0;

  const activeCount = filteredTasks.filter((task) => task.completedAt === null).length;
  const completedCount = filteredTasks.filter((task) => task.completedAt !== null).length;
  const subtitle =
    tasks.length === 0
      ? t("page_subtitle_empty")
      : t("page_subtitle", { active: activeCount, completed: completedCount });

  return (
    <div>
      {/* Level-up overlay */}
      {levelUp && (
        <LevelUpOverlay
          level={levelUp.level}
          title={levelUp.title}
          onDone={() => setLevelUp(null)}
        />
      )}

      {/* Achievement toast notifications */}
      {pendingAchievements.length > 0 && (
        <AchievementToast
          achievements={pendingAchievements}
          onAllDone={() => setPendingAchievements([])}
        />
      )}

      {/* Live task count subtitle */}
      <p
        className="text-base mb-6"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {subtitle}
      </p>

      {/* New Task button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          {t("new_task")}
        </button>
      </div>

      {/* Search & Filter bar — only shown when there are tasks */}
      {hasAnyTasks && (
        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder={tSearch("placeholder_tasks")}
          filters={filterGroups}
          activeFilters={{ priority: priorityFilter, topic: topicFilter }}
          onFilterChange={handleFilterChange}
          resultCount={filteredTasks.length}
          totalCount={tasks.length}
          onClearAll={clearAllFilters}
        />
      )}

      {/* Empty state — no tasks at all */}
      {!hasAnyTasks && <EmptyState />}

      {/* No results from search/filter */}
      {hasAnyTasks && !hasFilteredTasks && isFiltering && (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px dashed var(--border)",
          }}
        >
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="text-2xl mb-3"
            style={{ color: "var(--text-muted)" }}
          />
          <p
            className="text-base font-medium mb-1"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {tSearch("no_results")}
          </p>
          <p
            className="text-sm mb-4"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {tSearch("no_results_hint")}
          </p>
          <button
            onClick={clearAllFilters}
            className="text-sm font-medium underline transition-opacity hover:opacity-80"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--accent-amber)",
            }}
          >
            {tSearch("clear_filters")}
          </button>
        </div>
      )}

      {/* Today */}
      <SectionHeader title={t("section_today")} count={grouped.today.length} />
      <AnimatePresence>
        <div className="flex flex-col gap-2">
          {grouped.today.map((task) => {
            const topic = task.topicId ? topicMap.get(task.topicId) : null;
            return (
              <TaskItem
                key={task.id}
                id={task.id}
                title={task.title}
                type={task.type}
                priority={task.priority}
                completedAt={task.completedAt}
                dueDate={task.dueDate}
                nextDueDate={task.nextDueDate}
                topicTitle={topic?.title}
                topicColor={topic?.color}
                topicId={task.topicId}
                coinValue={task.coinValue}
                onComplete={handleComplete}
                onUncomplete={handleUncomplete}
                onEdit={setEditingTaskId}
                onDelete={handleDelete}
                onInlineEdit={handleInlineEdit}
                onPromote={handlePromote}
                onGoToTopic={handleGoToTopic}
                postponeCount={task.postponeCount}
                estimatedMinutes={task.estimatedMinutes}
                energyLevel={task.energyLevel}
                onBreakdown={handleBreakdown}
                snoozedUntil={task.snoozedUntil}
                onSnooze={handleSnooze}
                onUnsnooze={handleUnsnooze}
              />
            );
          })}
        </div>
      </AnimatePresence>

      {/* Upcoming */}
      <SectionHeader title={t("section_upcoming")} count={grouped.upcoming.length} />
      <div className="flex flex-col gap-2">
        {grouped.upcoming.map((task) => {
          const topic = task.topicId ? topicMap.get(task.topicId) : null;
          return (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topic?.title}
              topicColor={topic?.color}
              topicId={task.topicId}
              coinValue={task.coinValue}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={setEditingTaskId}
              onDelete={handleDelete}
              onInlineEdit={handleInlineEdit}
              onPromote={handlePromote}
              onGoToTopic={handleGoToTopic}
              postponeCount={task.postponeCount}
              estimatedMinutes={task.estimatedMinutes}
              energyLevel={task.energyLevel}
              onBreakdown={handleBreakdown}
              snoozedUntil={task.snoozedUntil}
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
            />
          );
        })}
      </div>

      {/* No date */}
      <SectionHeader title={t("section_no_date")} count={grouped.noDate.length} />
      <div className="flex flex-col gap-2">
        {grouped.noDate.map((task) => {
          const topic = task.topicId ? topicMap.get(task.topicId) : null;
          return (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topic?.title}
              topicColor={topic?.color}
              topicId={task.topicId}
              coinValue={task.coinValue}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={setEditingTaskId}
              onDelete={handleDelete}
              onInlineEdit={handleInlineEdit}
              onPromote={handlePromote}
              onGoToTopic={handleGoToTopic}
              postponeCount={task.postponeCount}
              estimatedMinutes={task.estimatedMinutes}
              energyLevel={task.energyLevel}
              onBreakdown={handleBreakdown}
              snoozedUntil={task.snoozedUntil}
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
            />
          );
        })}
      </div>

      {/* Someday */}
      <SectionHeader title={t("section_someday")} count={grouped.someday.length} />
      <div className="flex flex-col gap-2">
        {grouped.someday.map((task) => {
          const topic = task.topicId ? topicMap.get(task.topicId) : null;
          return (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              type={task.type}
              priority={task.priority}
              completedAt={task.completedAt}
              dueDate={task.dueDate}
              nextDueDate={task.nextDueDate}
              topicTitle={topic?.title}
              topicColor={topic?.color}
              topicId={task.topicId}
              coinValue={task.coinValue}
              onComplete={handleComplete}
              onUncomplete={handleUncomplete}
              onEdit={setEditingTaskId}
              onDelete={handleDelete}
              onInlineEdit={handleInlineEdit}
              onPromote={handlePromote}
              onGoToTopic={handleGoToTopic}
              postponeCount={task.postponeCount}
              estimatedMinutes={task.estimatedMinutes}
              energyLevel={task.energyLevel}
              onBreakdown={handleBreakdown}
              snoozedUntil={task.snoozedUntil}
              onSnooze={handleSnooze}
              onUnsnooze={handleUnsnooze}
            />
          );
        })}
      </div>

      {/* Snoozed — collapsible section */}
      {grouped.snoozed.length > 0 && (
        <>
          <div
            className="flex items-center gap-3 mb-3 mt-6 cursor-pointer select-none"
            onClick={() => setSnoozedExpanded((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSnoozedExpanded((v) => !v)}
          >
            <FontAwesomeIcon
              icon={snoozedExpanded ? faChevronDown : faChevronRight}
              className="w-3 h-3"
              style={{ color: "var(--text-muted)" }}
            />
            <h2
              className="text-sm font-semibold uppercase tracking-wide"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
              }}
            >
              {t("section_snoozed")}
            </h2>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              {grouped.snoozed.length}
            </span>
          </div>
          {snoozedExpanded && (
            <div className="flex flex-col gap-2">
              {grouped.snoozed.map((task) => {
                const topic = task.topicId ? topicMap.get(task.topicId) : null;
                return (
                  <TaskItem
                    key={task.id}
                    id={task.id}
                    title={task.title}
                    type={task.type}
                    priority={task.priority}
                    completedAt={task.completedAt}
                    dueDate={task.dueDate}
                    nextDueDate={task.nextDueDate}
                    topicTitle={topic?.title}
                    topicColor={topic?.color}
                    topicId={task.topicId}
                    coinValue={task.coinValue}
                    onComplete={handleComplete}
                    onUncomplete={handleUncomplete}
                    onEdit={setEditingTaskId}
                    onDelete={handleDelete}
                    onInlineEdit={handleInlineEdit}
                    onPromote={handlePromote}
                    onGoToTopic={handleGoToTopic}
                    postponeCount={task.postponeCount}
                    estimatedMinutes={task.estimatedMinutes}
                    energyLevel={task.energyLevel}
                    onBreakdown={handleBreakdown}
                    snoozedUntil={task.snoozedUntil}
                    onSnooze={handleSnooze}
                    onUnsnooze={handleUnsnooze}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Completed */}
      {grouped.completed.length > 0 && (
        <>
          <SectionHeader title={t("section_completed")} count={grouped.completed.length} />
          <div className="flex flex-col gap-2">
            {grouped.completed.map((task) => {
              const topic = task.topicId ? topicMap.get(task.topicId) : null;
              return (
                <TaskItem
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  type={task.type}
                  priority={task.priority}
                  completedAt={task.completedAt}
                  dueDate={task.dueDate}
                  nextDueDate={task.nextDueDate}
                  topicTitle={topic?.title}
                  topicColor={topic?.color}
                  topicId={task.topicId}
                  coinValue={task.coinValue}
                  onComplete={handleComplete}
                  onUncomplete={handleUncomplete}
                  onEdit={setEditingTaskId}
                  onDelete={handleDelete}
                  onInlineEdit={handleInlineEdit}
                  onPromote={handlePromote}
                  onGoToTopic={handleGoToTopic}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Task form modal */}
      {(showCreateForm || editingTaskId) && (
        <TaskForm
          initialData={
            editingTask
              ? {
                  id: editingTask.id,
                  title: editingTask.title,
                  topicId: editingTask.topicId,
                  notes: editingTask.notes ?? "",
                  type: editingTask.type,
                  priority: editingTask.priority,
                  recurrenceInterval: editingTask.type === "RECURRING"
                    ? String(editingTask.recurrenceInterval ?? 7)
                    : "7",
                  dueDate: editingTask.dueDate ?? "",
                  coinValue: String(editingTask.coinValue),
                }
              : undefined
          }
          topics={topics}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingTaskId(null);
          }}
        />
      )}
    </div>
  );
}
