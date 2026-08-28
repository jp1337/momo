"use client";

/**
 * WishlistForm component — modal form for creating and editing wishlist items.
 *
 * Designed for capture speed: only the title is visible by default. Price,
 * priority, URL, and coin-unlock threshold live behind a single "More options"
 * disclosure. Edit mode auto-expands the disclosure when those fields hold
 * non-default data so saved values stay visible.
 *
 * Validates inputs client-side; closes on success.
 */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WishlistFormData {
  title: string;
  price: string;
  url: string;
  priority: "WANT" | "NICE_TO_HAVE" | "SOMEDAY";
  coinUnlockThreshold: string;
}

interface WishlistFormProps {
  /** If provided, the form is in edit mode */
  initialData?: Partial<WishlistFormData> & { id?: string };
  /** Called when the form is successfully submitted */
  onSuccess: () => void;
  /** Called when the modal should be closed without saving */
  onCancel: () => void;
}

const DEFAULT_FORM: WishlistFormData = {
  title: "",
  price: "",
  url: "",
  priority: "WANT",
  coinUnlockThreshold: "",
};

/**
 * Detects whether the form has any "advanced" data that should auto-expand
 * the "More options" section in edit mode.
 */
function hasAdvancedData(data: Partial<WishlistFormData>): boolean {
  return Boolean(
    (data.price && data.price.length > 0) ||
      (data.url && data.url.length > 0) ||
      (data.priority && data.priority !== "WANT") ||
      (data.coinUnlockThreshold && data.coinUnlockThreshold.length > 0),
  );
}

/**
 * Modal form for creating or editing a wishlist item.
 * Submits to POST /api/wishlist or PATCH /api/wishlist/:id.
 */
export function WishlistForm({
  initialData,
  onSuccess,
  onCancel,
}: WishlistFormProps) {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<WishlistFormData>({
    ...DEFAULT_FORM,
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMore, setShowMore] = useState(() => hasAdvancedData(initialData ?? {}));

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({ ...DEFAULT_FORM, ...initialData });
    setShowMore(hasAdvancedData(initialData ?? {}));
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.title.trim()) {
      setError(t("form_error_title"));
      return;
    }

    if (formData.url.trim()) {
      try {
        new URL(formData.url.trim());
      } catch {
        setError(t("form_error_url"));
        return;
      }
    }

    const priceValue = formData.price.trim()
      ? parseFloat(formData.price)
      : null;

    if (priceValue !== null && (isNaN(priceValue) || priceValue < 0)) {
      setError(t("form_error_price"));
      return;
    }

    const coinThreshold = formData.coinUnlockThreshold.trim()
      ? parseInt(formData.coinUnlockThreshold, 10)
      : null;

    if (coinThreshold !== null && (isNaN(coinThreshold) || coinThreshold < 0)) {
      setError(t("form_error_coins"));
      return;
    }

    const payload = {
      title: formData.title.trim(),
      price: priceValue,
      url: formData.url.trim() || null,
      priority: formData.priority,
      coinUnlockThreshold: coinThreshold,
    };

    setIsSubmitting(true);
    try {
      const url = isEditing
        ? `/api/wishlist/${initialData!.id}`
        : "/api/wishlist";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t("form_error_title"));
        return;
      }

      onSuccess();
    } catch {
      setError(tc("error_network"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName =
    "w-full rounded-[var(--radius-sm)] border border-[var(--hairline)] bg-[var(--raised)] px-3 py-2 font-[family-name:var(--font-ui)] text-sm text-[var(--ink)] outline-none";

  const labelClassName =
    "mb-2 block font-[family-name:var(--font-ui)] text-xs font-semibold uppercase tracking-[0.04em] text-[var(--ink-3)]";

  const chipClassName = (isSelected: boolean) =>
    cn(
      "rounded-[var(--radius-sm)] border px-3 py-2 font-[family-name:var(--font-ui)] text-[0.8125rem] font-medium outline-none",
      isSelected
        ? "border-[var(--ink-2)] bg-[var(--raised)] text-[var(--ink)]"
        : "border-[var(--hairline)] bg-transparent text-[var(--ink-3)]",
    );

  const disclosureRowClassName =
    "flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--raised)] px-3 py-3 font-[family-name:var(--font-ui)] text-sm font-medium text-[var(--ink)] outline-none";

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        title={isEditing ? t("form_title_edit") : t("form_title_new")}
        size="md"
      >
        {/* Error — stays --danger: a failed submit, not a status badge. */}
        {error && (
          <p
            role="alert"
            className="m-0 mb-4 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-4 py-3 font-[family-name:var(--font-ui)] text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title — large, autofocus, the only essential field */}
          <input
            id="wishlist-title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            placeholder={t("form_placeholder_title")}
            autoFocus
            maxLength={200}
            className="w-full rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--raised)] px-4 py-3 font-[family-name:var(--font-mono)] text-[1.0625rem] font-medium text-[var(--ink)] outline-none"
          />

          {/* More options disclosure */}
          <div>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className={disclosureRowClassName}
              aria-expanded={showMore}
            >
              <span className="flex-1 text-left text-[var(--ink-3)]">
                {t("form_toggle_more")}
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={cn(
                  "h-3.5 w-3.5 text-[var(--ink-3)] transition-transform duration-150",
                  showMore ? "rotate-180" : "rotate-0",
                )}
              />
            </button>

            <AnimatePresence initial={false}>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-4 px-1 pt-4">
                    {/* Price */}
                    <div>
                      <label htmlFor="wishlist-price" className={labelClassName}>
                        {t("form_label_price")}
                      </label>
                      <input
                        id="wishlist-price"
                        name="price"
                        type="number"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder={t("form_placeholder_price")}
                        min={0}
                        max={999999}
                        step="0.01"
                        className={cn(inputClassName, "max-w-[180px]")}
                      />
                    </div>

                    {/* Priority chips */}
                    <div>
                      <label className={labelClassName}>{t("form_label_priority")}</label>
                      <ToggleGroup.Root
                        type="single"
                        value={formData.priority}
                        onValueChange={(v) =>
                          v && setFormData((prev) => ({ ...prev, priority: v as WishlistFormData["priority"] }))
                        }
                        aria-label={t("form_label_priority")}
                        className="flex flex-wrap gap-2"
                      >
                        {(["WANT", "NICE_TO_HAVE", "SOMEDAY"] as const).map((p) => (
                          <ToggleGroup.Item
                            key={p}
                            value={p}
                            className={chipClassName(formData.priority === p)}
                          >
                            {p === "WANT" && t("priority_want")}
                            {p === "NICE_TO_HAVE" && t("priority_nice")}
                            {p === "SOMEDAY" && t("priority_someday")}
                          </ToggleGroup.Item>
                        ))}
                      </ToggleGroup.Root>
                    </div>

                    {/* URL */}
                    <div>
                      <label htmlFor="wishlist-url" className={labelClassName}>
                        {t("form_label_url")}
                      </label>
                      <input
                        id="wishlist-url"
                        name="url"
                        type="url"
                        value={formData.url}
                        onChange={handleChange}
                        placeholder={t("form_placeholder_url")}
                        className={inputClassName}
                      />
                    </div>

                    {/* Coin unlock threshold */}
                    <div>
                      <label htmlFor="wishlist-coins" className={labelClassName}>
                        {t("form_label_coins")}
                      </label>
                      <input
                        id="wishlist-coins"
                        name="coinUnlockThreshold"
                        type="number"
                        value={formData.coinUnlockThreshold}
                        onChange={handleChange}
                        placeholder={t("form_placeholder_coins")}
                        min={0}
                        step={1}
                        className={cn(inputClassName, "max-w-[180px]")}
                      />
                      <p className="mt-1 font-[family-name:var(--font-ui)] text-xs text-[var(--ink-3)]">
                        {t("form_help_coins")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="quiet" size="md" disabled={isSubmitting} className="flex-1">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" variant="quiet" size="md" disabled={isSubmitting} className="flex-1">
              {isSubmitting
                ? t("form_saving")
                : isEditing
                ? t("form_save")
                : t("form_create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
