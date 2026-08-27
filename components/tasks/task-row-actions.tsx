"use client";

/**
 * TaskRowActions — die Aktionen einer Aufgabenzeile.
 *
 * Das Markup aus task-item.tsx ("Edit and delete action buttons",
 * Bearbeiten, Löschen, Snooze-Menü, Aufteilen, Verschieben/Zum-Thema) ohne
 * Inline-Styles: die Design-Ratsche (`check:design`) zählt jedes
 * Style-Objekt-Attribut in einer NEUEN Datei gegen eine Baseline von 0 —
 * jede Farbe hier ist deshalb eine Klasse mit `var(--…)`, nicht ein
 * Style-Objekt. Das geht über die vier im Plan genannten Ersetzungen
 * hinaus (die nur die Farb-Style-Objekte nennen), weil der REST des
 * Markups genauso viele Inline-Styles trug.
 *
 * Der Hover-Zustand im Snooze-Menü trug amberfarben getönten Hintergrund
 * (`color-mix(in srgb, var(--accent-amber) 15%, transparent)`); das ist
 * jetzt `--raised` — Amber bleibt der EINEN Handlung der Seite vorbehalten
 * ("+ Neue Aufgabe"), auch an Stellen, die der aktuelle Zähler (Menü
 * standardmäßig geschlossen) nie sehen würde.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLayerGroup, faClock } from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { TaskBreakdownModal } from "@/components/tasks/task-breakdown-modal";
import { ConfirmButton } from "@/components/ui/confirm-button";

export interface TaskRowActionsProps {
  id: string;
  title: string;
  topicId?: string | null;
  isCompleted: boolean;
  /** Zeile befindet sich gerade in der Doppelklick-Inline-Umbenennung — Bearbeiten/Löschen verstecken sich dann, genau wie vorher. */
  isEditing: boolean;
  selectionMode?: boolean;
  snoozedUntil?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPromote?: (id: string) => void;
  onGoToTopic?: (topicId: string) => void;
  onBreakdown?: (id: string) => void;
  onSnooze?: (id: string, snoozedUntil: string) => void;
  onUnsnooze?: (id: string) => void;
}

/** Computes a YYYY-MM-DD date string N days from now. */
function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const ACTION_BTN =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border-0 bg-transparent p-2 text-[var(--ink-3)] transition-colors hover:bg-[var(--raised)]";

/**
 * Der Aktionscluster einer Zeile: Verschieben/Zum-Thema, Aufteilen,
 * Pausieren/Aufwecken, Bearbeiten, Löschen.
 *
 * @param props - siehe TaskRowActionsProps
 * @returns Die Aktionen, für `Row`s `actions`-Slot
 */
export function TaskRowActions({
  id,
  title,
  topicId,
  isCompleted,
  isEditing,
  selectionMode = false,
  snoozedUntil,
  onEdit,
  onDelete,
  onPromote,
  onGoToTopic,
  onBreakdown,
  onSnooze,
  onUnsnooze,
}: TaskRowActionsProps) {
  const t = useTranslations("tasks");
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const isSnoozed =
    snoozedUntil != null &&
    new Date(snoozedUntil + "T00:00:00") > new Date(new Date().toDateString());

  const hasSecondary = Boolean(
    (topicId === null && onPromote) ||
      (topicId && onGoToTopic) ||
      (!isCompleted && onBreakdown) ||
      (!isCompleted && onSnooze),
  );

  return (
    <span className="flex items-center gap-1">
      {hasSecondary && (
        <>
          {topicId === null && onPromote && (
            <button
              type="button"
              onClick={() => onPromote(id)}
              className={ACTION_BTN}
              aria-label={t("aria_promote")}
              title={t("aria_promote")}
            >
              ⤴
            </button>
          )}
          {topicId && onGoToTopic && (
            <button
              type="button"
              onClick={() => onGoToTopic(topicId)}
              className={ACTION_BTN}
              aria-label={t("aria_go_topic")}
              title={t("aria_go_topic")}
            >
              →
            </button>
          )}
          {!isCompleted && onBreakdown && (
            <button
              type="button"
              onClick={() => setShowBreakdownModal(true)}
              className={ACTION_BTN}
              aria-label={t("breakdown_btn")}
              title={t("breakdown_btn")}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {!isCompleted && onSnooze && isSnoozed && onUnsnooze && (
            <button
              type="button"
              onClick={() => onUnsnooze(id)}
              className={cn(ACTION_BTN, "text-[var(--ink-2)]")}
              aria-label={t("unsnooze_btn")}
              title={t("unsnooze_btn")}
            >
              <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
          {!isCompleted && onSnooze && !isSnoozed && (
            <DropdownMenu.Root open={showSnoozeMenu} onOpenChange={setShowSnoozeMenu}>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={ACTION_BTN}
                  aria-label={t("snooze_btn")}
                  title={t("snooze_btn")}
                >
                  <FontAwesomeIcon icon={faClock} className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={4}
                  className="z-50 min-w-[160px] rounded-[var(--radius-md)] bg-[var(--raised)] py-1 shadow-[var(--shadow-overlay)]"
                >
                  {[
                    { label: t("snooze_tomorrow"), days: 1 },
                    { label: t("snooze_next_week"), days: 7 },
                    { label: t("snooze_next_month"), days: 30 },
                  ].map(({ label, days }) => (
                    <DropdownMenu.Item
                      key={days}
                      onSelect={() => onSnooze(id, daysFromNow(days))}
                      className="w-full cursor-pointer px-3 py-2 text-left text-sm text-[var(--ink)] outline-none data-[highlighted]:bg-[var(--raised)]"
                    >
                      {label}
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="my-1 border-t border-[var(--hairline)]" />
                  <DropdownMenu.Item
                    // Menü offen halten, bis das Datum gewählt ist — Schließen
                    // passiert erst explizit nach onChange am Datumsfeld.
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer px-3 py-2 text-sm text-[var(--ink-3)] outline-none data-[highlighted]:bg-[var(--raised)]"
                    asChild
                  >
                    <label className="block">
                      {t("snooze_pick_date")}
                      <input
                        type="date"
                        className="sr-only"
                        min={daysFromNow(1)}
                        onChange={(e) => {
                          if (e.target.value) {
                            onSnooze(id, e.target.value);
                            setShowSnoozeMenu(false);
                          }
                        }}
                      />
                    </label>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </>
      )}

      {!isEditing && !selectionMode && (
        <>
          <button
            type="button"
            onClick={() => onEdit(id)}
            className={ACTION_BTN}
            aria-label={t("aria_edit")}
            title={t("aria_edit")}
          >
            ✎
          </button>
          <ConfirmButton
            onConfirm={() => onDelete(id)}
            confirmPrompt={t("confirm_delete")}
            className={cn(ACTION_BTN, "text-[var(--danger)]")}
            aria-label={t("aria_delete")}
          >
            ✕
          </ConfirmButton>
        </>
      )}

      {showBreakdownModal && (
        <TaskBreakdownModal
          task={{ id, title }}
          onCancel={() => setShowBreakdownModal(false)}
          onSuccess={() => {
            setShowBreakdownModal(false);
            onBreakdown?.(id);
          }}
        />
      )}
    </span>
  );
}
