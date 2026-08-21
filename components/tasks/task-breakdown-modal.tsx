"use client";

/**
 * TaskBreakdownModal — splits a task into multiple subtasks inside a new topic.
 *
 * User enters 2–10 subtask titles. On confirm, calls POST /api/tasks/:id/breakdown.
 * The original task is deleted and the user is redirected to the new topic.
 *
 * Built on Radix UI Dialog primitive — focus trap, scroll lock, Esc key, ARIA.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TaskBreakdownModalProps {
  /** The task to break down */
  task: { id: string; title: string };
  /** Called when the modal should be closed without saving */
  onCancel: () => void;
  /** Called after a successful breakdown (before navigation) */
  onSuccess?: () => void;
}

/**
 * Modal for breaking a task into subtasks.
 */
export function TaskBreakdownModal({ task, onCancel, onSuccess }: TaskBreakdownModalProps) {
  const t = useTranslations("tasks");
  const tc = useTranslations("common");
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function addStep() {
    if (steps.length < 10) {
      setSteps((prev) => [...prev, ""]);
    }
  }

  function removeStep(index: number) {
    if (steps.length > 2) {
      setSteps((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const filledSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (filledSteps.length < 2) {
      setError(t("breakdown_min_hint"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/breakdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subtaskTitles: filledSteps }),
      });

      const data = (await res.json()) as { error?: string; topicId?: string };
      if (!res.ok) {
        setError(data.error ?? t("breakdown_error"));
        return;
      }
      onSuccess?.();
      router.push(`/topics?open=${data.topicId ?? ""}`);
      router.refresh();
    } catch {
      setError(t("breakdown_error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent title={t("breakdown_title")} size="md">
        {/* Original task name */}
        <p className="text-sm mb-1 font-[family-name:var(--font-ui)] text-[var(--ink-2)]">
          {t("breakdown_hint")}
        </p>
        {/*
         * The reference chip: was amber text on an amber-tinted fill — a
         * second lit element competing with the dashboard's quest, per the
         * fix-round-2 finding. It's a passive label, not an affordance, so
         * it takes the Badge primitive's `neutral` variant (--raised fill,
         * --ink-2 text, no hairline — see badge.tsx) instead of any accent.
         */}
        <Badge
          variant="neutral"
          className="mb-4 block w-fit px-3 py-2 text-sm font-medium font-[family-name:var(--font-mono)] whitespace-normal"
        >
          {task.title}
        </Badge>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 px-4 py-3 rounded-[var(--radius-md)] text-sm font-[family-name:var(--font-ui)] text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {steps.map((step, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="text-xs w-6 text-center flex-shrink-0 font-[family-name:var(--font-ui)] text-[var(--ink-2)]">
                {index + 1}.
              </span>
              <input
                type="text"
                value={step}
                onChange={(e) => updateStep(index, e.target.value)}
                placeholder={`${t("breakdown_subtask_label", { n: index + 1 })}...`}
                maxLength={255}
                className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] text-[var(--ink)] font-[family-name:var(--font-mono)] text-sm outline-none"
              />
              {steps.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  className="flex-shrink-0 text-lg leading-none text-[var(--ink-2)] opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Remove step"
                >
                  ×
                </button>
              )}
            </div>
          ))}

          {/*
           * Add-step affordance: was amber text — the fix-round-2 finding's
           * second occurrence. A plain in-flow text action gets --ink-2 with
           * an --ink hover, the same quiet treatment as every other
           * secondary action on the migrated pages (no fill, no accent).
           */}
          {steps.length < 10 && (
            <button
              type="button"
              onClick={addStep}
              className="text-sm self-start transition-colors font-[family-name:var(--font-ui)] text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              {t("breakdown_add_step")}
            </button>
          )}

          {/*
           * Footer: the submit button was a filled amber surface with a
           * hardcoded dark-hex label color — amber as a button fill is
           * forbidden outright (amber is light, never a surface).
           *
           * Both actions use the shared `quiet` Button variant, not
           * `primary`. This dialog opens over the dashboard while its one
           * amber element ("jetzt anfangen" / quest_start) is still on
           * screen behind the scrim — the page's "exactly one amber
           * element" rule is scoped to the page, and a page with an open
           * dialog is still one page. Giving Confirm `primary` (amber
           * text) would make two. Rule 1 covers this exact case: a screen
           * that needs two equally weighted things gives amber to neither.
           * A modal already has the user's full attention from the scrim
           * and focus trap alone — it doesn't need amber to say "this
           * matters", so quiet-for-both costs nothing here.
           */}
          <div className="flex gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="quiet" disabled={isSubmitting} className="flex-1">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" variant="quiet" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? tc("saving") : t("breakdown_confirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
