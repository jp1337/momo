"use client";

/**
 * TaskList component — grouped task list wrapper.
 *
 * Groups tasks into sections:
 *  1. Today — tasks due today or overdue
 *  2. Upcoming — tasks with future due dates
 *  3. No date — tasks with no due date (excluding SOMEDAY priority)
 *  4. Someday — SOMEDAY priority tasks with no due date
 *  5. Snoozed — tasks snoozed into the future (collapsible)
 *  6. Completed — tasks with completedAt set (collapsible, collapsed by default)
 *
 * Also supports a "by topic" view that groups active tasks under their topic.
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faChevronDown, faChevronRight, faCheckDouble, faListOl, faLock, faMoon, faSun, faLeaf, faStar } from "@fortawesome/free-solid-svg-icons";
import { TaskItem } from "./task-item";
import { TaskForm } from "./task-form";
import { BulkActionBar } from "./bulk-action-bar";
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
  taskGroup?: string | null;
  sortOrder?: number;
}

interface TopicOption {
  id: string;
  title: string;
  color?: string | null;
  defaultEnergyLevel?: "HIGH" | "MEDIUM" | "LOW" | null;
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

  type EmptyConfig = {
    icon: typeof faMoon;
    iconColor: string;
    haloColor: string;
    headline: string;
    sub: string;
  };

  let config: EmptyConfig;

  if (hour < 5) {
    config = { icon: faMoon, iconColor: "var(--text-secondary)", haloColor: "var(--text-muted)", headline: t("empty_night"), sub: t("empty_night_sub") };
  } else if (hour < 12) {
    config = { icon: faSun, iconColor: "var(--accent-amber)", haloColor: "var(--accent-amber)", headline: t("empty_morning"), sub: t("empty_morning_sub") };
  } else if (hour < 17) {
    config = { icon: faLeaf, iconColor: "var(--accent-green)", haloColor: "var(--accent-green)", headline: t("empty_afternoon"), sub: t("empty_afternoon_sub") };
  } else if (hour < 22) {
    config = { icon: faStar, iconColor: "var(--accent-amber)", haloColor: "var(--accent-amber)", headline: t("empty_evening"), sub: t("empty_evening_sub") };
  } else {
    config = { icon: faMoon, iconColor: "var(--text-secondary)", haloColor: "var(--text-muted)", headline: t("empty_latenight"), sub: t("empty_latenight_sub") };
  }

  const { icon, iconColor, haloColor, headline, sub } = config;

  return (
    <div
      className="relative rounded-2xl p-12 sm:p-16 text-center overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px dashed var(--border)",
      }}
    >
      {/* Soft halo behind the icon */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: `radial-gradient(circle, color-mix(in srgb, ${haloColor} 12%, transparent) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* FA icon in a styled circle */}
      <div
        className="relative mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: `color-mix(in srgb, ${iconColor} 14%, transparent)`,
        }}
        role="img"
        aria-label={headline}
      >
        <FontAwesomeIcon icon={icon} style={{ fontSize: 28, color: iconColor }} />
      </div>
      <p
        className="relative text-xl font-semibold mb-2"
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          fontStyle: "italic",
          color: "var(--text-primary)",
        }}
      >
        {headline}
      </p>
      <p
        className="relative text-sm max-w-sm mx-auto"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
          lineHeight: 1.6,
        }}
      >
        {sub}
      </p>

      {/* Inline keyboard hint — encourages discovering the N shortcut */}
      <p
        className="relative text-xs mt-6"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
          opacity: 0.7,
        }}
      >
        {t("empty_kbd_hint")}{" "}
        <kbd
          style={{
            padding: "2px 7px",
            fontSize: "0.7rem",
            borderRadius: "4px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
          }}
        >
          N
        </kbd>
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
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [groupByTopic, setGroupByTopic] = useState(false);

  /* ─── Search & Filter state ─────────────────────────────────────────────── */
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  /* ─── Bulk selection state ───────────────────────────────────────────── */
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, []);

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

  const selectAllVisible = useCallback(() => {
    const ids = filteredTasks.filter((t) => t.completedAt === null).map((t) => t.id);
    setSelectedIds(new Set(ids));
  }, [filteredTasks]);

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
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((task) => task.id !== id));
      }
    } catch {
      // silent fail
    }
  }, []);

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

  /* ─── Bulk action handlers ───────────────────────────────────────────── */

  const handleBulkDelete = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", taskIds: [...selectedIds] }),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((task) => !selectedIds.has(task.id)));
        clearSelection();
      }
    } catch {
      // silent fail
    }
  }, [selectedIds, clearSelection]);

  const handleBulkComplete = useCallback(async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", taskIds: [...selectedIds], timezone }),
      });
      if (res.ok) {
        clearSelection();
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [selectedIds, clearSelection, refreshTasks]);

  const handleBulkChangeTopic = useCallback(async (topicId: string | null) => {
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changeTopic", taskIds: [...selectedIds], topicId }),
      });
      if (res.ok) {
        clearSelection();
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [selectedIds, clearSelection, refreshTasks]);

  const handleBulkSetPriority = useCallback(async (priority: "HIGH" | "NORMAL" | "SOMEDAY") => {
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPriority", taskIds: [...selectedIds], priority }),
      });
      if (res.ok) {
        clearSelection();
        await refreshTasks();
      }
    } catch {
      // silent fail
    }
  }, [selectedIds, clearSelection, refreshTasks]);

  const hasNonCompletedSelected = useMemo(() => {
    return [...selectedIds].some((id) => {
      const task = tasks.find((t) => t.id === id);
      return task && task.completedAt === null;
    });
  }, [selectedIds, tasks]);

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

  /**
   * Computes the topic-grouped view data: active tasks grouped by topic, then by sequential group.
   * Within each sequential group (taskGroup), tasks are sorted by sortOrder.
   */
  const topicGroupedData = useMemo(() => {
    if (!groupByTopic) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topicLookup = new Map(topics.map((tp) => [tp.id, tp]));

    const activeTasks = filteredTasks.filter((task) => {
      if (task.completedAt !== null) return false;
      if (task.snoozedUntil) {
        const snoozeDate = new Date(task.snoozedUntil + "T00:00:00");
        if (snoozeDate > today) return false;
      }
      return true;
    });

    // Group by topicId
    const byTopic = new Map<string | null, Task[]>();
    for (const task of activeTasks) {
      const key = task.topicId ?? null;
      if (!byTopic.has(key)) byTopic.set(key, []);
      byTopic.get(key)!.push(task);
    }

    const result: Array<{
      topicId: string | null;
      topicTitle: string;
      topicColor: string | undefined | null;
      taskGroups: Array<{
        groupName: string | null;
        tasks: Task[];
      }>;
    }> = [];

    for (const [topicId, topicTasks] of byTopic) {
      const topicData = topicId ? topicLookup.get(topicId) : undefined;

      // Sub-group by taskGroup
      const byGroup = new Map<string | null, Task[]>();
      for (const task of topicTasks) {
        const gKey = task.taskGroup ?? null;
        if (!byGroup.has(gKey)) byGroup.set(gKey, []);
        byGroup.get(gKey)!.push(task);
      }

      const taskGroups: Array<{ groupName: string | null; tasks: Task[] }> = [];
      for (const [groupName, groupTasks] of byGroup) {
        // Sort by sortOrder so sequential order is preserved
        const sorted = [...groupTasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        taskGroups.push({ groupName, tasks: sorted });
      }

      // Named groups first (sequential), ungrouped tasks last
      taskGroups.sort((a, b) => {
        if (a.groupName === null && b.groupName !== null) return 1;
        if (a.groupName !== null && b.groupName === null) return -1;
        return 0;
      });

      result.push({
        topicId,
        topicTitle: topicData?.title ?? t("form_no_topic"),
        topicColor: topicData?.color,
        taskGroups,
      });
    }

    // Topics with IDs first (sorted by title), no-topic last
    result.sort((a, b) => {
      if (!a.topicId && b.topicId) return 1;
      if (a.topicId && !b.topicId) return -1;
      return a.topicTitle.localeCompare(b.topicTitle);
    });

    return result;
  }, [filteredTasks, groupByTopic, topics, t]);

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

      {/* Toolbar: Group toggle + Select mode + New Task */}
      <div className="flex justify-end gap-2 mb-6">
        {hasAnyTasks && !selectionMode && topics.length > 0 && (
          <button
            onClick={() => setGroupByTopic((v) => !v)}
            className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: groupByTopic
                ? "color-mix(in srgb, var(--accent-amber) 15%, var(--bg-surface))"
                : "var(--bg-surface)",
              color: groupByTopic ? "var(--accent-amber)" : "var(--text-muted)",
              border: groupByTopic
                ? "1px solid color-mix(in srgb, var(--accent-amber) 40%, var(--border))"
                : "1px solid var(--border)",
            }}
          >
            {groupByTopic ? t("view_by_date") : t("view_by_topic")}
          </button>
        )}
        {hasAnyTasks && (
          selectionMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={selectedIds.size > 0 ? () => setSelectedIds(new Set()) : selectAllVisible}
                className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {selectedIds.size > 0 ? t("bulk_deselect_all") : t("bulk_select_all")}
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("bulk_exit_select")}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSelectionMode(true)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              <FontAwesomeIcon icon={faCheckDouble} className="w-3.5 h-3.5" />
              {t("bulk_select")}
            </button>
          )
        )}
        {!selectionMode && (
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
        )}
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

      {/* ── Date-grouped view (default) ─────────────────────────────────────── */}
      {!groupByTopic && (
        <>
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
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(task.id)}
                    onToggleSelect={toggleSelect}
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
        </>
      )}

      {/* ── Topic-grouped view ───────────────────────────────────────────────── */}
      {groupByTopic && topicGroupedData && topicGroupedData.length === 0 && !grouped.completed.length && !grouped.snoozed.length && (
        <div className="mt-4" />
      )}
      {groupByTopic && topicGroupedData && topicGroupedData.map((topicSection) => (
        <div key={topicSection.topicId ?? "no-topic"} className="mt-6 first:mt-0">
          {/* Topic header */}
          <div className="flex items-center gap-2 mb-3">
            {topicSection.topicColor && (
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: topicSection.topicColor,
                  flexShrink: 0,
                }}
              />
            )}
            {topicSection.topicId ? (
              <Link
                href={`/topics/${topicSection.topicId}`}
                className="text-sm font-semibold uppercase tracking-wide transition-opacity hover:opacity-70"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                }}
              >
                {topicSection.topicTitle}
              </Link>
            ) : (
              <span
                className="text-sm font-semibold uppercase tracking-wide"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {topicSection.topicTitle}
              </span>
            )}
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              {topicSection.taskGroups.reduce((sum, g) => sum + g.tasks.length, 0)}
            </span>
          </div>

          {topicSection.taskGroups.map((group) => {
            const isSequential = group.groupName !== null;
            return (
            <div key={group.groupName ?? "__ungrouped__"}>
              {/* Sequential group header — explicit "step-by-step" visual */}
              {group.groupName && (
                <div
                  className="flex items-center gap-2 mb-2 mt-3 px-1"
                >
                  <FontAwesomeIcon
                    icon={faListOl}
                    className="w-3 h-3"
                    style={{ color: "var(--accent-amber)" }}
                    aria-hidden="true"
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {group.groupName}
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.12em] font-semibold"
                    style={{
                      color: "var(--accent-amber)",
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      opacity: 0.85,
                    }}
                  >
                    {t("sequential_label")}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
                    {t("sequential_progress", { current: 1, total: group.tasks.length })}
                  </span>
                </div>
              )}

              {/*
                Sequential groups get a left "stepper" rail: a thin amber line
                with circular index badges next to each task. Non-sequential
                groups stay flat.
              */}
              <div
                className={`flex flex-col gap-2 mb-2 ${isSequential ? "relative pl-8" : ""}`}
                style={isSequential ? { borderLeft: "0px" } : undefined}
              >
                {/* Connecting rail line for sequential groups */}
                {isSequential && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "11px",
                      top: "16px",
                      bottom: "16px",
                      width: "2px",
                      backgroundColor: "color-mix(in srgb, var(--accent-amber) 25%, var(--border))",
                      borderRadius: "1px",
                    }}
                  />
                )}
                {group.tasks.map((task, taskIndex) => {
                  // In a named sequential group, only the first task is actionable
                  const isBlocked = isSequential && taskIndex > 0;
                  const isActiveStep = isSequential && taskIndex === 0;
                  return (
                    <div
                      key={task.id}
                      className="relative"
                      style={{ opacity: isBlocked ? 0.55 : 1, pointerEvents: isBlocked ? "none" : undefined }}
                    >
                      {/* Step index badge for sequential groups */}
                      {isSequential && (
                        <div
                          aria-hidden="true"
                          style={{
                            position: "absolute",
                            left: "-32px",
                            top: "14px",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isActiveStep
                              ? "var(--accent-amber)"
                              : "var(--bg-surface)",
                            color: isActiveStep ? "var(--bg-primary)" : "var(--text-muted)",
                            border: `2px solid ${isActiveStep ? "var(--accent-amber)" : "var(--border)"}`,
                            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                            fontSize: "11px",
                            fontWeight: 700,
                            zIndex: 1,
                          }}
                        >
                          {isBlocked ? (
                            <FontAwesomeIcon icon={faLock} style={{ fontSize: "9px" }} />
                          ) : (
                            taskIndex + 1
                          )}
                        </div>
                      )}
                      <TaskItem
                        id={task.id}
                        title={task.title}
                        type={task.type}
                        priority={task.priority}
                        completedAt={task.completedAt}
                        dueDate={task.dueDate}
                        nextDueDate={task.nextDueDate}
                        topicTitle={topicSection.topicTitle !== t("form_no_topic") ? topicSection.topicTitle : undefined}
                        topicColor={topicSection.topicColor}
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
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(task.id)}
                        onToggleSelect={toggleSelect}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      ))}

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

      {/* Completed — collapsible, collapsed by default */}
      {grouped.completed.length > 0 && (
        <>
          <div
            className="flex items-center gap-3 mb-3 mt-6 cursor-pointer select-none"
            onClick={() => setCompletedExpanded((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setCompletedExpanded((v) => !v)}
          >
            <FontAwesomeIcon
              icon={completedExpanded ? faChevronDown : faChevronRight}
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
              {t("section_completed")}
            </h2>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              {grouped.completed.length}
            </span>
          </div>
          {completedExpanded && (
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
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(task.id)}
                    onToggleSelect={toggleSelect}
                  />
                );
              })}
            </div>
          )}
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
                  estimatedMinutes: ([5, 15, 30, 60] as const).includes(
                    editingTask.estimatedMinutes as 5 | 15 | 30 | 60
                  )
                    ? (editingTask.estimatedMinutes as 5 | 15 | 30 | 60)
                    : null,
                  energyLevel: editingTask.energyLevel ?? null,
                  taskGroup: editingTask.taskGroup ?? "",
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

      {/* Bulk action bar — visible when tasks are selected */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        topics={topics}
        hasNonCompleted={hasNonCompletedSelected}
        onDelete={handleBulkDelete}
        onComplete={handleBulkComplete}
        onChangeTopic={handleBulkChangeTopic}
        onSetPriority={handleBulkSetPriority}
        onClearSelection={clearSelection}
      />
    </div>
  );
}
