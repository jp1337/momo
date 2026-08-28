"use client";

/**
 * BudgetBar — der monatliche Budgetstand, als Rand-Inhalt.
 *
 * Lebt seit Phase 2 im Rand von `/wishlist` (`wishlist-view.tsx`), nicht
 * mehr in einem eigenen Kasten in der Lesespalte. Der Rumpf ist eine Folge
 * von `RAIL_LINE`-Zeilen plus ein echter `role="progressbar"` — kein Grün/
 * Amber/Rot mehr (`getBarColor` ist weg): der Rand trägt nie Amber, `--done`
 * bedeutet ausschließlich "erledigt" und `--danger` ausschließlich
 * Zerstörung und Überfälligkeit. Der Balken ist deshalb immer `--ink-2`;
 * dass das Budget voll ist, sagt der Balken selbst (100 % gefüllt), und
 * "über Budget" steht als neutraler Text daneben.
 */

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations, useLocale } from "next-intl";
import { RAIL_LINE } from "@/components/ui/list";
import { Button } from "@/components/ui/button";

export interface BudgetBarProps {
  monthlyBudget: number | null;
  spentThisMonth: number;
  remaining: number | null;
  /** Summe aller je gekauften Wünsche, über alle Monate. Neu in Phase 2. */
  totalSpent: number;
  onBudgetUpdate: (newBudget: number | null) => void;
}

/**
 * Formats a number as a currency string (€) using the given locale.
 */
function formatCurrency(amount: number, locale: string): string {
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const inputClassName =
  "w-full rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] px-3 py-2 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--ink)] outline-none";

/**
 * Budgetstand des Rands: Ausgaben diesen Monat, ein Fortschrittsbalken,
 * Rest bzw. "über Budget", die Gesamtausgaben, ein Bearbeiten-Knopf.
 */
export function BudgetBar({
  monthlyBudget,
  spentThisMonth,
  remaining,
  totalSpent,
  onBudgetUpdate,
}: BudgetBarProps) {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    monthlyBudget !== null ? String(monthlyBudget) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const percent =
    monthlyBudget !== null && monthlyBudget > 0
      ? Math.min((spentThisMonth / monthlyBudget) * 100, 100)
      : 0;

  const handleSaveBudget = async () => {
    setSaveError(null);
    const parsed =
      budgetInput.trim() === "" ? null : parseFloat(budgetInput);

    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      setSaveError(t("budget_error_invalid"));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: parsed }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSaveError(data.error ?? t("budget_error_invalid"));
        return;
      }

      onBudgetUpdate(parsed);
      setIsEditing(false);
    } catch {
      setSaveError(tc("error_network"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <p className={RAIL_LINE}>
        {t("budget_this_month")} €{formatCurrency(spentThisMonth, locale)}
        {monthlyBudget !== null && <> / €{formatCurrency(monthlyBudget, locale)}</>}
      </p>

      {monthlyBudget !== null && monthlyBudget > 0 && (
        // `role="progressbar"` ist die benannte Ausnahme, die `countBoxes`
        // prüft — ein Fortschrittsbalken IST eine gefüllte Fläche, per
        // Definition. Ohne die Rolle zählen Spur UND Füllung als zwei Kästen.
        // Die aria-Werte sind kein Beiwerk: eine Rolle ohne sie ist ein leeres
        // Versprechen an den Screenreader.
        //
        // Guarded on `monthlyBudget > 0`, matching `percent`'s own guard
        // (Task 6 review Minor): at exactly 0, `aria-valuemax` would equal
        // `aria-valuemin`, a degenerate progressbar for a screen reader, and
        // the track could never visually fill regardless of spend.
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={monthlyBudget}
          aria-valuenow={Math.min(spentThisMonth, monthlyBudget)}
          aria-label={t("budget_this_month")}
          className="h-[6px] w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--raised)]"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full rounded-[var(--radius-pill)] bg-[var(--ink-2)]"
          />
        </div>
      )}

      {remaining !== null && (
        <p className={RAIL_LINE}>
          {remaining < 0 ? t("budget_over") : t("budget_left", { amount: `€${formatCurrency(remaining, locale)}` })}
        </p>
      )}

      {totalSpent > 0 && (
        <p className={RAIL_LINE}>
          {t("budget_total_spent", { amount: `€${formatCurrency(totalSpent, locale)}` })}
        </p>
      )}

      {monthlyBudget === null && !isEditing && (
        <p className={RAIL_LINE}>{t("budget_no_budget_hint")}</p>
      )}

      {!isEditing && (
        <Button
          variant="quiet"
          size="sm"
          onClick={() => {
            setBudgetInput(monthlyBudget !== null ? String(monthlyBudget) : "");
            setIsEditing(true);
          }}
        >
          {monthlyBudget === null ? t("budget_set") : t("budget_edit")}
        </Button>
      )}

      {isEditing && (
        <div className="flex flex-col gap-2">
          <label htmlFor="budget-input" className={RAIL_LINE}>
            {t("budget_label")}
          </label>
          <input
            id="budget-input"
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder={t("budget_placeholder")}
            min={0}
            step="0.01"
            className={inputClassName}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveBudget();
              if (e.key === "Escape") setIsEditing(false);
            }}
          />
          <div className="flex gap-2">
            <Button variant="quiet" size="sm" onClick={handleSaveBudget} disabled={isSaving}>
              {isSaving ? tc("saving") : tc("save")}
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setIsEditing(false)}>
              {tc("cancel")}
            </Button>
          </div>
          {saveError && (
            <p className="m-0 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--danger)]">
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
