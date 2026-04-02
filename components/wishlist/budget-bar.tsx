"use client";

/**
 * BudgetBar component — animated progress bar showing monthly budget usage.
 *
 * Features:
 * - Animated progress bar (Framer Motion width animation on mount)
 * - Color changes: green < 80%, amber 80–100%, red > 100%
 * - Shows budget used / total in human-readable format
 * - "Edit budget" inline button that opens a small input to update the budget
 * - Calls PATCH /api/settings/budget to save changes
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface BudgetBarProps {
  monthlyBudget: number | null;
  spentThisMonth: number;
  remaining: number | null;
  /** Called when budget is successfully updated, with the new value */
  onBudgetUpdate: (newBudget: number | null) => void;
}

/**
 * Formats a number as a currency string (€).
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Returns the fill color based on percent spent.
 */
function getBarColor(percent: number): string {
  if (percent >= 100) return "var(--accent-red)";
  if (percent >= 80) return "var(--accent-amber)";
  return "var(--accent-green)";
}

/**
 * Animated budget progress bar with inline edit capability.
 */
export function BudgetBar({
  monthlyBudget,
  spentThisMonth,
  remaining,
  onBudgetUpdate,
}: BudgetBarProps) {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
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

  const barColor = getBarColor(
    monthlyBudget !== null ? (spentThisMonth / (monthlyBudget || 1)) * 100 : 0
  );

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

  const inputStyle: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
    fontSize: "14px",
    outline: "none",
    width: "120px",
  };

  // No budget configured yet
  if (monthlyBudget === null && !isEditing) {
    return (
      <div
        className="rounded-xl p-4 flex items-center justify-between gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div>
          <p
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("budget_no_budget")}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("budget_no_budget_hint")}
          </p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm px-3 py-1.5 rounded-lg font-medium flex-shrink-0"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
          }}
        >
          {t("budget_set")}
        </button>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-sm font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("budget_this_month")}
          </span>
          <span
            className="font-semibold"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-primary)",
              fontSize: "1.1rem",
            }}
          >
            €{formatCurrency(spentThisMonth)}
            {monthlyBudget !== null && (
              <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                {" "}
                / €{formatCurrency(monthlyBudget)}
              </span>
            )}
          </span>
          {remaining !== null && (
            <span
              className="text-sm"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color:
                  remaining < 0 ? "var(--accent-red)" : "var(--text-muted)",
              }}
            >
              ({remaining < 0
                ? t("budget_over")
                : t("budget_left", { amount: `€${formatCurrency(remaining)}` })})
            </span>
          )}
        </div>

        {!isEditing && (
          <button
            onClick={() => {
              setBudgetInput(monthlyBudget !== null ? String(monthlyBudget) : "");
              setIsEditing(true);
            }}
            className="text-xs flex-shrink-0"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {t("budget_edit")}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {monthlyBudget !== null && (
        <div
          className="relative h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-elevated)" }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
      )}

      {/* Inline edit form */}
      {isEditing && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <label
            htmlFor="budget-input"
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
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
            style={inputStyle}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveBudget();
              if (e.key === "Escape") setIsEditing(false);
            }}
          />
          <button
            onClick={handleSaveBudget}
            disabled={isSaving}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              backgroundColor: "var(--accent-amber)",
              color: "var(--bg-primary)",
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? tc("saving") : tc("save")}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="text-xs px-2 py-1.5 rounded-lg"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              color: "var(--text-muted)",
            }}
          >
            {tc("cancel")}
          </button>
          {saveError && (
            <p
              className="w-full text-xs mt-1"
              style={{
                color: "var(--accent-red)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
