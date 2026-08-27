"use client";

/**
 * TaskList — /tasks, im Lichtkegel-Layout.
 *
 * Ersetzt die frühere Datum-Sektionierung (Heute/Demnächst/Kein Datum/
 * Irgendwann) durch Prioritätsgruppen (`groupByPriority` aus
 * `task-groups.ts`): "HOCH · 2" ist eine Gruppenüberschrift, kein
 * amberfarbenes Abzeichen an jeder Zeile. Fälligkeit steht jetzt an jeder
 * Zeile selbst (`TaskRow`s `trailing`), Überfälligkeit als Summe im Rand
 * (`TasksRail`).
 *
 * Pausiert und Erledigt bleiben eigene, einklappbare Abschnitte (unverändert
 * in ihrer Funktion) — "Nach Thema"-Gruppierung mit ihrer Sequenz-Blockade
 * ebenfalls, nur mit `TaskRow` statt `TaskItem` und ohne Amber.
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "motion/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight, faCheckDouble, faListOl, faLock } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { PageFrame } from "@/components/ui/page-frame";
import { List, GroupHeading } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/search-filter-bar";
import type { FilterGroup } from "@/components/shared/search-filter-bar";
import { TasksRail } from "@/components/tasks/tasks-rail";
import { TaskRow } from "@/components/tasks/task-row";
import type { TaskRowProps } from "@/components/tasks/task-row";
import { groupByPriority } from "@/components/tasks/task-groups";
import { TaskForm } from "./task-form";
import { BulkActionBar } from "./bulk-action-bar";
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
  /** Die Seitenüberschrift (Fraunces, das eine Mal pro Seite) — kommt von der Server-Komponente. */
  pageTitle: string;
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
 * Liefert außerdem die Basis für die aktiven (weder erledigten noch
 * pausierten) Aufgaben, die `groupByPriority` weiterverarbeitet — bereits
 * nach Fälligkeit sortiert (überfällig zuerst), unverändert gegenüber vorher.
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

/** Response shape from POST /api/tasks/:id/complete */
interface CompleteApiResponse {
  coinsEarned?: number;
  newLevel?: { level: number; title: string } | null;
  unlockedAchievements?: AchievementItem[];
  streakCurrent?: number;
}

/**
 * Ein einklappbarer Abschnittskopf für Pausiert/Erledigt — dieselbe
 * Mono-Eyebrow-Optik wie `GroupHeading`, aber als klickbare Affordanz
 * (`role="button"`) mit Chevron, weil diese beiden Abschnitte weiterhin
 * ein-/ausklappbar sind. Zahl steht als Text in der Überschrift ("Pausiert
 * · 2"), nicht als separate gefüllte Pille — dieselbe Kodierung wie
 * `GroupHeading`s "Hoch · 2".
 *
 * Trägt ein echtes `<h2>` innerhalb der klickbaren Hülle (Task 8 Review,
 * "Also fix"): der `div[role="button"]` um einen bloßen `<span>` hatte die
 * beiden Abschnitte aus der Überschriftengliederung der Seite entfernt.
 * `!` auf Schriftart/Farbe aus demselben Grund wie bei `GroupHeading`
 * (siehe dort): `globals.css`s ungelayerte `h1`–`h6`-Regel schlägt jede
 * `@layer utilities`-Klasse unabhängig von Spezifität.
 */
function CollapsibleSectionHeading({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => e.key === "Enter" && onToggle()}
      className="mt-8 flex cursor-pointer select-none items-center gap-2 border-0 bg-transparent p-0 text-[var(--ink-3)]"
    >
      <FontAwesomeIcon
        icon={expanded ? faChevronDown : faChevronRight}
        className="h-2.5 w-2.5"
        aria-hidden="true"
      />
      <h2 className="m-0 font-[family-name:var(--font-mono)]! text-[0.6875rem] font-normal uppercase tracking-[0.16em] text-[var(--ink-3)]!">
        {title} · {count}
      </h2>
    </div>
  );
}

/**
 * Interactive task list with grouping, completion, and CRUD actions.
 * Manages its own task state after initial server-fetched data.
 * Triggers confetti, level-up overlay, and achievement toasts on task completion.
 */
export function TaskList({ initialTasks, topics, pageTitle }: TaskListProps) {
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

  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);
  const grouped = groupTasks(filteredTasks);
  const activeTasks = [...grouped.today, ...grouped.upcoming, ...grouped.noDate, ...grouped.someday];
  const hasAnyTasks = tasks.length > 0;
  const hasFilteredTasks = filteredTasks.length > 0;

  const activeCount = filteredTasks.filter((task) => task.completedAt === null).length;

  /** Aufgaben, deren Fälligkeit bereits verstrichen ist — die Rand-Kennzahl "überfällig". */
  const overdueCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredTasks.filter((task) => {
      if (task.completedAt !== null) return false;
      const effectiveDate = task.type === "RECURRING" ? task.nextDueDate : task.dueDate;
      if (!effectiveDate) return false;
      return new Date(effectiveDate + "T00:00:00") < today;
    }).length;
  }, [filteredTasks]);

  /** Summe der Münzbelohnung offener Aufgaben — die Rand-Kennzahl "Münzen möglich". */
  const coinSum = useMemo(
    () =>
      filteredTasks
        .filter((task) => task.completedAt === null)
        .reduce((sum, task) => sum + task.coinValue, 0),
    [filteredTasks],
  );

  /**
   * Baut die Props für eine `TaskRow` aus einer Aufgabe. Ein Ort statt sieben
   * fast identischer JSX-Blöcke (vorher: eine `TaskItem`-Kopie je Abschnitt).
   */
  const rowProps = useCallback(
    (
      task: Task,
      opts: { topicTitle?: string | null; topicColor?: string | null; isBlocked?: boolean } = {},
    ): TaskRowProps => {
      const topic = task.topicId ? topicMap.get(task.topicId) : null;
      return {
        id: task.id,
        title: task.title,
        type: task.type,
        priority: task.priority,
        completedAt: task.completedAt,
        dueDate: task.dueDate,
        nextDueDate: task.nextDueDate,
        topicTitle: opts.topicTitle !== undefined ? opts.topicTitle : (topic?.title ?? null),
        topicColor: opts.topicColor !== undefined ? opts.topicColor : (topic?.color ?? null),
        topicId: task.topicId,
        estimatedMinutes: task.estimatedMinutes,
        snoozedUntil: task.snoozedUntil,
        isBlocked: opts.isBlocked,
        selectionMode,
        isSelected: selectedIds.has(task.id),
        onComplete: handleComplete,
        onUncomplete: handleUncomplete,
        onEdit: setEditingTaskId,
        onDelete: handleDelete,
        onInlineEdit: handleInlineEdit,
        onPromote: handlePromote,
        onGoToTopic: handleGoToTopic,
        onBreakdown: handleBreakdown,
        onSnooze: handleSnooze,
        onUnsnooze: handleUnsnooze,
        onToggleSelect: toggleSelect,
      };
    },
    [
      topicMap,
      selectionMode,
      selectedIds,
      handleComplete,
      handleUncomplete,
      handleDelete,
      handleInlineEdit,
      handlePromote,
      handleGoToTopic,
      handleBreakdown,
      handleSnooze,
      handleUnsnooze,
      toggleSelect,
    ],
  );

  /**
   * Computes the topic-grouped view data: active tasks grouped by topic, then by sequential group.
   * Within each sequential group (taskGroup), tasks are sorted by sortOrder.
   */
  const topicGroupedData = useMemo(() => {
    if (!groupByTopic) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const topicLookup = new Map(topics.map((tp) => [tp.id, tp]));

    const activeTopicTasks = filteredTasks.filter((task) => {
      if (task.completedAt !== null) return false;
      if (task.snoozedUntil) {
        const snoozeDate = new Date(task.snoozedUntil + "T00:00:00");
        if (snoozeDate > today) return false;
      }
      return true;
    });

    // Group by topicId
    const byTopic = new Map<string | null, Task[]>();
    for (const task of activeTopicTasks) {
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
      for (const [groupName, groupTasksInner] of byGroup) {
        // Sort by sortOrder so sequential order is preserved
        const sorted = [...groupTasksInner].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
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

      <PageFrame
        rail={
          hasAnyTasks ? (
            <TasksRail
              open={activeCount}
              overdue={overdueCount}
              coins={coinSum}
              filters={filterGroups}
              activeFilters={{ priority: priorityFilter, topic: topicFilter }}
              onFilterChange={handleFilterChange}
              resultCount={filteredTasks.length}
              totalCount={tasks.length}
              isFiltering={isFiltering}
              onClear={clearAllFilters}
            />
          ) : undefined
        }
      >
        <h1 className="m-0 font-[family-name:var(--font-display)] text-[1.75rem] font-normal text-[var(--ink)]">
          {pageTitle}
        </h1>

        {/* Toolbar: Group toggle + Select mode + New Task */}
        <div className="flex flex-wrap justify-end gap-2">
          {hasAnyTasks && !selectionMode && topics.length > 0 && (
            <Button
              type="button"
              variant="quiet"
              size="sm"
              aria-pressed={groupByTopic}
              className={groupByTopic ? "border-[var(--ink-2)] text-[var(--ink)]" : undefined}
              onClick={() => setGroupByTopic((v) => !v)}
            >
              {groupByTopic ? t("view_by_date") : t("view_by_topic")}
            </Button>
          )}
          {hasAnyTasks && (
            selectionMode ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={selectedIds.size > 0 ? () => setSelectedIds(new Set()) : selectAllVisible}
                >
                  {selectedIds.size > 0 ? t("bulk_deselect_all") : t("bulk_select_all")}
                </Button>
                <Button type="button" variant="quiet" size="sm" onClick={clearSelection}>
                  {t("bulk_exit_select")}
                </Button>
              </div>
            ) : (
              <Button type="button" variant="quiet" size="sm" onClick={() => setSelectionMode(true)}>
                <FontAwesomeIcon icon={faCheckDouble} className="h-3.5 w-3.5" aria-hidden="true" />
                {t("bulk_select")}
              </Button>
            )
          )}
          {!selectionMode && (
            <Button type="button" variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
              {t("new_task")}
            </Button>
          )}
        </div>

        {/* Search — only shown when there are tasks; die Filter selbst stehen im Rand. */}
        {hasAnyTasks && (
          <SearchInput
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            placeholder={tSearch("placeholder_tasks")}
          />
        )}

        {/* Empty state — no tasks at all */}
        {!hasAnyTasks && (
          <EmptyState
            line={t("empty_generic")}
            action={
              <Button type="button" variant="quiet" size="md" onClick={() => setShowCreateForm(true)}>
                {t("empty_cta")}
              </Button>
            }
          />
        )}

        {/* No results from search/filter */}
        {hasAnyTasks && !hasFilteredTasks && isFiltering && (
          <EmptyState
            testId="no-results"
            line={tSearch("no_results")}
            action={
              <Button type="button" variant="quiet" size="md" onClick={clearAllFilters}>
                {tSearch("clear_filters")}
              </Button>
            }
          />
        )}

        {/* ── Prioritätsgruppen (Standardansicht) ─────────────────────────────── */}
        {!groupByTopic &&
          groupByPriority(activeTasks).map((group) => (
            <section key={group.key}>
              <GroupHeading>
                {t(`priority_${group.key.toLowerCase()}` as "priority_high" | "priority_normal" | "priority_someday")} ·{" "}
                {group.items.length}
              </GroupHeading>
              {/* AnimatePresence: eine Zeile verschwindet hier, sobald ihre
                  Aufgabe abgehakt oder gelöscht wird — die einzige Ansicht,
                  in der das während der Sitzung wirklich passiert (Snoozed/
                  Completed sind Archive, "Nach Thema" hat die Sequenz-
                  Blockade). Ersetzt die Austritts-Animation, die die
                  frühere "Heute"-Sektion hatte (Task 8 Review, "Also fix"). */}
              <List>
                <AnimatePresence initial={false}>
                  {group.items.map((task) => (
                    <TaskRow key={task.id} {...rowProps(task)} exitAnimation />
                  ))}
                </AnimatePresence>
              </List>
            </section>
          ))}

        {/* ── Nach-Thema-Ansicht ───────────────────────────────────────────────── */}
        {groupByTopic && topicGroupedData && topicGroupedData.map((topicSection) => (
          <section key={topicSection.topicId ?? "no-topic"}>
            {/* Topic header */}
            <div className="mt-8 flex items-center gap-2 first:mt-0">
              {topicSection.topicColor && (
                <span
                  aria-hidden="true"
                  className="h-[6px] w-[6px] shrink-0 rounded-[var(--radius-pill)]"
                  style={{ backgroundColor: topicSection.topicColor }}
                />
              )}
              {topicSection.topicId ? (
                <Link
                  href={`/topics/${topicSection.topicId}`}
                  className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)] no-underline transition-opacity hover:opacity-70"
                >
                  {topicSection.topicTitle}
                </Link>
              ) : (
                <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
                  {topicSection.topicTitle}
                </span>
              )}
              <span className="font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.16em] text-[var(--ink-3)]">
                · {topicSection.taskGroups.reduce((sum, g) => sum + g.tasks.length, 0)}
              </span>
            </div>

            {topicSection.taskGroups.map((group) => {
              const isSequential = group.groupName !== null;
              return (
                <div key={group.groupName ?? "__ungrouped__"}>
                  {/* Sequential group header */}
                  {group.groupName && (
                    <div className="mb-2 mt-3 flex items-center gap-2 px-1">
                      <FontAwesomeIcon
                        icon={faListOl}
                        className="h-3 w-3 text-[var(--ink-2)]"
                        aria-hidden="true"
                      />
                      <span className="font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--ink)]">
                        {group.groupName}
                      </span>
                      <span className="font-[family-name:var(--font-ui)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-2)]">
                        {t("sequential_label")}
                      </span>
                      <span className="ml-auto font-[family-name:var(--font-ui)] text-xs text-[var(--ink-3)]">
                        {t("sequential_progress", { current: 1, total: group.tasks.length })}
                      </span>
                    </div>
                  )}

                  {/*
                    Sequential groups get a left "stepper" rail: a thin line
                    with circular index badges next to each task. Non-sequential
                    groups stay flat.

                    Eine `<List>` pro Gruppe (Task 8 Review, F1): vorher stand
                    jede Zeile in ihrer EIGENEN `<List>`, wodurch jede Zeile
                    `:first-child` ihres eigenen `<ul>` war und `Row`s
                    `first:border-t-0` überall griff — keine Haarlinie
                    irgendwo in dieser Ansicht. Der Stufen-Kreis wandert dafür
                    von einem Wrapper-`<div>` pro Zeile (derselbe Fehler unter
                    anderem Namen: ein `<div>` zwischen `<ul>` und `<li>`
                    macht die `<li>` erneut zum alleinigen `:first-child`
                    ihres Wrappers) in `TaskRow`s eigene `stepBadge`-Prop —
                    positioniert innerhalb der Zeile selbst, die dafür
                    `pl-8` bekommt (siehe `task-row.tsx`).
                  */}
                  {isSequential ? (
                    <div className="relative mb-2">
                      <div
                        aria-hidden="true"
                        className="absolute bottom-4 left-4 top-4 w-[2px] rounded-[1px] bg-[var(--hairline)]"
                      />
                      <List>
                        {group.tasks.map((task, taskIndex) => {
                          // In a named sequential group, only the first task is actionable
                          const isBlocked = taskIndex > 0;
                          const isActiveStep = taskIndex === 0;
                          return (
                            <TaskRow
                              key={task.id}
                              {...rowProps(task, { isBlocked })}
                              stepBadge={
                                <div
                                  aria-hidden="true"
                                  className={cn(
                                    "absolute left-1 top-3.5 z-10 flex h-6 w-6 items-center justify-center rounded-[var(--radius-pill)] border-2 font-[family-name:var(--font-mono)] text-[11px] font-bold",
                                    isActiveStep
                                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--ground)]"
                                      : "border-[var(--hairline)] bg-transparent text-[var(--ink-3)]",
                                  )}
                                >
                                  {isBlocked ? (
                                    <FontAwesomeIcon icon={faLock} className="text-[9px]" />
                                  ) : (
                                    taskIndex + 1
                                  )}
                                </div>
                              }
                            />
                          );
                        })}
                      </List>
                    </div>
                  ) : (
                    <List className="mb-2">
                      {group.tasks.map((task) => (
                        <TaskRow key={task.id} {...rowProps(task)} />
                      ))}
                    </List>
                  )}
                </div>
              );
            })}
          </section>
        ))}

        {/* Snoozed — collapsible section */}
        {grouped.snoozed.length > 0 && (
          <>
            <CollapsibleSectionHeading
              title={t("section_snoozed")}
              count={grouped.snoozed.length}
              expanded={snoozedExpanded}
              onToggle={() => setSnoozedExpanded((v) => !v)}
            />
            {snoozedExpanded && (
              <List>
                {grouped.snoozed.map((task) => (
                  <TaskRow key={task.id} {...rowProps(task)} />
                ))}
              </List>
            )}
          </>
        )}

        {/* Completed — collapsible, collapsed by default */}
        {grouped.completed.length > 0 && (
          <>
            <CollapsibleSectionHeading
              title={t("section_completed")}
              count={grouped.completed.length}
              expanded={completedExpanded}
              onToggle={() => setCompletedExpanded((v) => !v)}
            />
            {completedExpanded && (
              <List>
                {grouped.completed.map((task) => (
                  <TaskRow key={task.id} {...rowProps(task)} />
                ))}
              </List>
            )}
          </>
        )}
      </PageFrame>

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
