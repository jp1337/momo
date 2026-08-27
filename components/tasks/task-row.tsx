"use client";

/**
 * TaskRow — eine Aufgabe als Zeile.
 *
 * Ersetzt (auf `/tasks`) das alte Layout von `components/tasks/task-item.tsx`
 * (803 Zeilen, sechs Metadaten, fünf davon farbcodiert). Die Zeile ist jetzt
 * nichts als Text:
 *
 * | Feld | vorher | jetzt |
 * |---|---|---|
 * | Priorität | Chip, amber/rot/grau getönt | Gruppenüberschrift in task-list (`groupByPriority`) |
 * | Thema | Chip mit Füllung und Rahmen in der Themenfarbe | Mono-Eyebrow + 6-px-Punkt (`dotColor`) |
 * | Dauer | grüner "60 min"-Chip PLUS Aufwandsgröße — dieselbe Information zweimal | die Aufwandsgröße (`effort`), Minuten rechts in Mono (`trailing`) |
 * | Fälligkeit | Text, --accent-red bei Überfälligkeit | Text rechts, --danger nur bei Überfälligkeit |
 * | Coins | Text plus Münz-Icon an jeder Zeile | Summe im Rand (`tasks-rail.tsx`) |
 * | Energie | Chip amber/grün/grau | entfällt in der Zeile; steuert weiter die Auswahl im Backend |
 *
 * Der wiederkehrend-Pfeil (↺) und der "täglich wählbar"-Stern (★, amber)
 * aus task-item.tsx entfallen ebenfalls — der Stern wäre ein zweites Amber
 * auf jeder täglich wählbaren Zeile und verstieße gegen "Amber höchstens
 * einmal, dokumentweit"; die Wiederkehr-Info steckt bereits in `trailing`
 * ("Nächste: …").
 *
 * Die Wisch-Vorschau (grün/rot) ist eine vereinfachte Variante des
 * Originals: `task-item.tsx` ließ die Zeile über einer FESTEN Farbfläche
 * gleiten (zwei Ebenen). `Row` ist ein einzelnes Element (ein `<li>`), das
 * hier komplett per `animate={{x}}` verschoben wird — die Farbflächen
 * liegen deshalb IN dieser Zeile und wandern mit ihr statt dahinter fix zu
 * bleiben. Die Richtung bleibt lesbar (Farbe + Text erscheinen beim
 * Ausschlag), das "Loch"-Reveal-Detail des Originals nicht.
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Row, effortStep } from "@/components/ui/list";
import { TaskRowActions } from "@/components/tasks/task-row-actions";
import { useTaskSwipe } from "@/components/tasks/use-task-swipe";

export interface TaskRowProps {
  id: string;
  title: string;
  type: "ONE_TIME" | "RECURRING" | "DAILY_ELIGIBLE";
  priority: "HIGH" | "NORMAL" | "SOMEDAY";
  completedAt: string | null;
  dueDate?: string | null;
  nextDueDate?: string | null;
  topicTitle?: string | null;
  topicColor?: string | null;
  topicId?: string | null;
  estimatedMinutes?: number | null;
  snoozedUntil?: string | null;
  isBlocked?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** Called after inline title edit is saved */
  onInlineEdit?: (id: string, newTitle: string) => void;
  /** Called when the user promotes a standalone task to a topic (topicId === null) */
  onPromote?: (id: string) => void;
  /** Called when the user wants to navigate to the task's existing topic */
  onGoToTopic?: (topicId: string) => void;
  /** Called after a successful task breakdown (task is deleted) */
  onBreakdown?: (id: string) => void;
  /** Called when the user snoozes a task until a specific date */
  onSnooze?: (id: string, snoozedUntil: string) => void;
  /** Called when the user unsnoozes (wakes up) a snoozed task */
  onUnsnooze?: (id: string) => void;
  /** Toggle selection for this task (bulk mode) */
  onToggleSelect?: (id: string) => void;
  /**
   * Der Stufen-Kreis einer sequenziellen Themengruppe (Nummer oder
   * Schloss-Symbol) — vom Aufrufer fertig gerendert. Sitzt, wenn gesetzt,
   * absolut INNERHALB der Zeile (die Zeile bekommt dafür `pl-8`), nicht in
   * einem eigenen Wrapper außerhalb: ein Wrapper pro Zeile würde jede Zeile
   * wieder zum `:first-child` ihrer `<List>` machen und die Haarlinie
   * kosten (Task 8 Review, F1) — genau der Fehler, den diese Prop behebt.
   */
  stepBadge?: ReactNode;
  /**
   * Aktiviert die Austritts-Animation (Höhe + Innenabstand + Deckkraft auf
   * 0), wenn die Zeile aus einer `<AnimatePresence>`-Liste entfernt wird —
   * `Row`s `as`-Prop existiert genau dafür (Task-4-Review R13). Nur die
   * Standardansicht (Prioritätsgruppen) setzt das: dort verschwindet eine
   * Zeile, sobald die Aufgabe abgehakt oder gelöscht wird — Muster wie
   * `quick-wins-section.tsx`.
   */
  exitAnimation?: boolean;
}

/**
 * Eine Aufgabenzeile.
 *
 * @param props - siehe TaskRowProps
 * @returns Eine Row ohne Fläche, ohne Rahmen, ohne Chip
 */
export function TaskRow(props: TaskRowProps) {
  const t = useTranslations("tasks");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.title);
  const [isAnimating, setIsAnimating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompletingRef = useRef(false);

  const isCompleted = props.completedAt !== null;
  const displayDate = props.type === "RECURRING" ? props.nextDueDate : props.dueDate;

  /**
   * Formatiert ein YYYY-MM-DD-Datum für die rechte Spalte.
   * Wörtlich die Logik aus task-item.tsx formatDueDate().
   */
  function formatDueDate(dateStr: string): { text: string; overdue: boolean } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr + "T00:00:00");
    if (due < today) {
      const diffDays = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
      return {
        text: diffDays === 1 ? t("date_yesterday") : t("date_overdue", { days: diffDays }),
        overdue: true,
      };
    }
    if (due.getTime() === today.getTime()) return { text: t("date_today"), overdue: false };
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (due.getTime() === tomorrow.getTime())
      return { text: t("date_tomorrow"), overdue: false };
    return {
      text: due.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      overdue: false,
    };
  }

  const due = displayDate ? formatDueDate(displayDate) : null;

  /**
   * Abhaken mit 300-ms-Verzögerung für die Fade-Animation. Gehört hier
   * (nicht in `useTaskSwipe`), weil sie zur Abhak-Animation gehört, nicht
   * zur Wischgeste selbst — Wisch UND Klick lösen dieselbe Funktion aus.
   */
  const handleCheckboxChange = () => {
    if (isCompleted) {
      props.onUncomplete(props.id);
      return;
    }
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    setIsAnimating(true);
    setTimeout(() => {
      props.onComplete(props.id);
      setIsAnimating(false);
      isCompletingRef.current = false;
    }, 300);
  };

  const swipe = useTaskSwipe({
    onComplete: handleCheckboxChange,
    onDelete: () => props.onDelete(props.id),
    disabled: isEditing || isCompleted,
  });

  /**
   * Hält die Wisch-Vorschauflächen für die Dauer der Rückfeder-Animation im
   * DOM, nachdem der Finger losgelassen wurde — sonst verschwinden sie
   * schlagartig (`isSwiping` wird sofort false), während die Zeile selbst
   * noch sichtbar zurückfedert. Das Original ließ die Farbe mit der Zeile
   * verblassen.
   *
   * Bewusst NICHT `swipe.isSwiping || isUnsnapping` mit einem separaten,
   * anfangs-`false`-Flag: das flackert einmal auf `false` (Panel unmountet),
   * bevor der Effekt `isUnsnapping` setzt (Panel remountet FRISCH, ohne
   * Übergang — kein Fade, ein Sprung). `panelMounted` bleibt dagegen beim
   * Loslassen einfach `true` (unverändert seit Gestenbeginn) und wird erst
   * per Timeout wieder `false` — keine Lücke, in der das Element fehlt.
   */
  const [panelMounted, setPanelMounted] = useState(false);
  useEffect(() => {
    if (swipe.isSwiping) {
      setPanelMounted(true);
      return;
    }
    const id = setTimeout(() => setPanelMounted(false), 300);
    return () => clearTimeout(id);
  }, [swipe.isSwiping]);

  const handleTitleDoubleClick = () => {
    if (isCompleted || !props.onInlineEdit) return;
    setEditValue(props.title);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitInlineEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== props.title) {
      props.onInlineEdit?.(props.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitInlineEdit();
    } else if (e.key === "Escape") {
      setEditValue(props.title);
      setIsEditing(false);
    }
  };

  return (
    <Row
      as={motion.li}
      testId="task-row"
      effort={effortStep(props.estimatedMinutes ?? null)}
      dimmed={isCompleted}
      dotColor={props.topicColor ?? null}
      className={cn(
        "relative overflow-hidden",
        isCompleted ? "touch-auto" : "touch-pan-y",
        props.stepBadge && "pl-8",
        props.isBlocked && !isCompleted && "pointer-events-none opacity-55",
      )}
      animate={{
        opacity: isAnimating ? 0.4 : isCompleted ? 0.6 : 1,
        x: swipe.swipeX,
      }}
      {...(props.exitAnimation
        ? { exit: { opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 } }
        : {})}
      transition={{
        opacity: { duration: 0.25 },
        x: swipe.isSwiping ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 },
        ...(props.exitAnimation
          ? { height: { duration: 0.2 }, paddingTop: { duration: 0.2 }, paddingBottom: { duration: 0.2 } }
          : {}),
      }}
      onTouchStart={swipe.handlers.onTouchStart}
      onTouchMove={swipe.handlers.onTouchMove}
      onTouchEnd={swipe.handlers.onTouchEnd}
      lead={
        <>
          {/* Stufen-Kreis (sequenzielle Themengruppe) — absolut INNERHALB
              der Zeile (siehe TaskRowProps.stepBadge), links im Raum, den
              `pl-8` oben reserviert. Positioniert sich unabhaengig von der
              DOM-Tiefe gegen die Zeile selbst (`relative` auf `<Row>`), da
              positionierte Vorfahren dazwischen fehlen. */}
          {props.stepBadge}
          {/* Wisch-Vorschau rechts: Abhaken (--done). Nur waehrend aktivem
              Wischen (oder dem Zurueckfedern danach, `panelMounted`) im
              DOM — sonst zaehlt countBoxes (design-rules.spec.ts) die volle,
              deckende Flaeche auch bei opacity:0. countBoxes hat seit Task 8
              Review (F6) denselben Opazitaets-Guard wie countAmber; das
              Mounten ist trotzdem an die Geste gebunden — voruebergehendes
              Feedback muss im Ruhezustand nicht im DOM stehen. */}
          {panelMounted && !isCompleted && (
            <motion.span
              aria-hidden="true"
              animate={{ opacity: Math.max(0, Math.min(swipe.progress, 1)) }}
              transition={{ duration: swipe.isSwiping ? 0 : 0.2 }}
              className="pointer-events-none absolute inset-y-0 left-0 flex min-w-[90px] items-center gap-2 bg-[var(--done)] px-4 text-[var(--ground)]"
            >
              <svg width="16" height="13" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {swipe.progress > 0.5 && (
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold">
                  {t("swipe_complete")}
                </span>
              )}
            </motion.span>
          )}
          {/* Wisch-Vorschau links: Löschen (--danger) */}
          {panelMounted && (
            <motion.span
              aria-hidden="true"
              animate={{ opacity: Math.max(0, Math.min(-swipe.progress, 1)) }}
              transition={{ duration: swipe.isSwiping ? 0 : 0.2 }}
              className="pointer-events-none absolute inset-y-0 right-0 flex min-w-[90px] items-center justify-end gap-2 bg-[var(--danger)] px-4 text-[var(--ground)]"
            >
              {swipe.progress < -0.5 && (
                <span className="font-[family-name:var(--font-ui)] text-xs font-semibold">
                  {t("swipe_delete")}
                </span>
              )}
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </motion.span>
          )}

          {props.selectionMode ? (
            <button
              type="button"
              onClick={() => props.onToggleSelect?.(props.id)}
              aria-label={props.isSelected ? t("bulk_exit_select") : t("bulk_select")}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2 bg-transparent p-0 transition-colors",
                props.isSelected ? "border-[var(--ink)] bg-[var(--ink)]" : "border-[var(--ink-3)]",
              )}
            >
              {props.isSelected && (
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
          ) : props.isBlocked && !isCompleted ? (
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-2 border-[var(--ink-3)] text-[10px] opacity-50"
            >
              🔒
            </span>
          ) : (
            <button
              type="button"
              onClick={() => (isCompleted ? props.onUncomplete(props.id) : handleCheckboxChange())}
              disabled={props.isBlocked && !isCompleted}
              aria-label={isCompleted ? t("aria_uncomplete") : t("aria_complete")}
              className="-m-2 flex cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border-0 bg-transparent p-2 transition-colors hover:bg-[var(--raised)] disabled:cursor-not-allowed"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-[18px] w-[18px] rounded-[var(--radius-pill)] border-2",
                  isCompleted ? "border-[var(--done)] bg-[var(--done)]" : "border-[var(--ink-3)] bg-transparent",
                )}
              />
            </button>
          )}
        </>
      }
      title={
        isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitInlineEdit}
            onKeyDown={handleInputKeyDown}
            autoFocus
            className="w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] px-1 py-1 font-[family-name:var(--font-mono)] text-inherit text-[var(--ink)] outline-none"
          />
        ) : (
          // `title=` gibt den vollen Text auf Hover zurück — auf Touch
          // (375px, wo der Titel bei langem `trailing`-Text auf einen
          // Buchstaben schrumpft) hilft das NICHT, dort gibt es kein Hover.
          // Der eigentliche Grund liegt in `Row` selbst (Task 4): Titel und
          // Trailing teilen sich eine Zeile. Das ist außerhalb dieses
          // Umlaufs — dieser Kommentar hält nur fest, dass das Problem
          // unbehoben bleibt, nicht gemildert.
          <span
            data-testid="task-row-title"
            title={props.title}
            onDoubleClick={handleTitleDoubleClick}
            className="cursor-text"
          >
            {props.title}
          </span>
        )
      }
      eyebrow={props.topicTitle ?? undefined}
      trailing={
        due ? (
          <span className={due.overdue ? "text-[var(--danger)]" : undefined}>
            {props.type === "RECURRING" ? t("date_next", { date: due.text }) : due.text}
          </span>
        ) : props.estimatedMinutes ? (
          `${props.estimatedMinutes} min`
        ) : undefined
      }
      actions={
        <TaskRowActions
          id={props.id}
          title={props.title}
          topicId={props.topicId}
          isCompleted={isCompleted}
          isEditing={isEditing}
          selectionMode={props.selectionMode}
          snoozedUntil={props.snoozedUntil}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onPromote={props.onPromote}
          onGoToTopic={props.onGoToTopic}
          onBreakdown={props.onBreakdown}
          onSnooze={props.onSnooze}
          onUnsnooze={props.onUnsnooze}
        />
      }
    />
  );
}
