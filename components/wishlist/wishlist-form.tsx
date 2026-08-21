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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    marginBottom: "6px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const chipStyle = (isSelected: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
    fontSize: "13px",
    fontWeight: 500,
    padding: "8px 14px",
    borderRadius: "8px",
    border: isSelected
      ? "1px solid var(--accent-amber)"
      : "1px solid var(--border)",
    backgroundColor: isSelected
      ? "color-mix(in srgb, var(--accent-amber) 15%, var(--bg-elevated))"
      : "var(--bg-elevated)",
    color: isSelected ? "var(--accent-amber)" : "var(--text-muted)",
    cursor: "pointer",
    outline: "none",
  });

  const disclosureRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    backgroundColor: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    outline: "none",
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent
        title={isEditing ? t("form_title_edit") : t("form_title_new")}
        size="md"
      >
        {/* Error */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{
              backgroundColor: "rgba(184,84,80,0.12)",
              color: "var(--accent-red)",
              border: "1px solid rgba(184,84,80,0.3)",
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              fontSize: "17px",
              fontWeight: 500,
              outline: "none",
            }}
          />

          {/* More options disclosure */}
          <div>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              style={disclosureRowStyle}
              aria-expanded={showMore}
            >
              <span className="flex-1 text-left" style={{ color: "var(--text-muted)" }}>
                {t("form_toggle_more")}
              </span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className="w-3.5 h-3.5"
                style={{
                  transform: showMore ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s ease",
                  color: "var(--text-muted)",
                }}
              />
            </button>

            <AnimatePresence initial={false}>
              {showMore && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="flex flex-col gap-4 pt-4 px-1">
                    {/* Price */}
                    <div>
                      <label htmlFor="wishlist-price" style={labelStyle}>
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
                        style={{ ...inputStyle, maxWidth: "180px" }}
                      />
                    </div>

                    {/* Priority chips */}
                    <div>
                      <label style={labelStyle}>{t("form_label_priority")}</label>
                      <ToggleGroup.Root
                        type="single"
                        value={formData.priority}
                        onValueChange={(v) =>
                          v && setFormData((prev) => ({ ...prev, priority: v as WishlistFormData["priority"] }))
                        }
                        aria-label={t("form_label_priority")}
                        className="flex gap-2 flex-wrap"
                      >
                        {(["WANT", "NICE_TO_HAVE", "SOMEDAY"] as const).map((p) => (
                          <ToggleGroup.Item
                            key={p}
                            value={p}
                            style={chipStyle(formData.priority === p)}
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
                      <label htmlFor="wishlist-url" style={labelStyle}>
                        {t("form_label_url")}
                      </label>
                      <input
                        id="wishlist-url"
                        name="url"
                        type="url"
                        value={formData.url}
                        onChange={handleChange}
                        placeholder={t("form_placeholder_url")}
                        style={inputStyle}
                      />
                    </div>

                    {/* Coin unlock threshold */}
                    <div>
                      <label htmlFor="wishlist-coins" style={labelStyle}>
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
                        style={{ ...inputStyle, maxWidth: "180px" }}
                      />
                      <p
                        className="mt-1 text-xs"
                        style={{
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                        }}
                      >
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
              <button
                type="button"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  backgroundColor: "transparent",
                }}
              >
                {tc("cancel")}
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--accent-amber)",
                color: "var(--bg-primary)",
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting
                ? t("form_saving")
                : isEditing
                ? t("form_save")
                : t("form_create")}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
