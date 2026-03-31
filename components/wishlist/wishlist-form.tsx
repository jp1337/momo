"use client";

/**
 * WishlistForm component — modal form for creating and editing wishlist items.
 *
 * Handles both create (no initialData) and edit (with initialData) modes.
 * Validates inputs client-side before submitting to the API.
 * Closes the modal on successful save.
 */

import { useState, useEffect } from "react";

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

/**
 * Default empty form state.
 */
const DEFAULT_FORM: WishlistFormData = {
  title: "",
  price: "",
  url: "",
  priority: "WANT",
  coinUnlockThreshold: "",
};

/**
 * Modal form for creating or editing a wishlist item.
 * Submits to POST /api/wishlist or PATCH /api/wishlist/:id.
 */
export function WishlistForm({
  initialData,
  onSuccess,
  onCancel,
}: WishlistFormProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<WishlistFormData>({
    ...DEFAULT_FORM,
    ...initialData,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when initialData changes
  useEffect(() => {
    setFormData({ ...DEFAULT_FORM, ...initialData });
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
      setError("Title is required");
      return;
    }

    // Validate URL if provided
    if (formData.url.trim()) {
      try {
        new URL(formData.url.trim());
      } catch {
        setError("URL must be a valid URL (e.g. https://example.com)");
        return;
      }
    }

    const priceValue = formData.price.trim()
      ? parseFloat(formData.price)
      : null;

    if (priceValue !== null && (isNaN(priceValue) || priceValue < 0)) {
      setError("Price must be a valid non-negative number");
      return;
    }

    const coinThreshold = formData.coinUnlockThreshold.trim()
      ? parseInt(formData.coinUnlockThreshold, 10)
      : null;

    if (coinThreshold !== null && (isNaN(coinThreshold) || coinThreshold < 0)) {
      setError("Coin threshold must be a valid non-negative integer");
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
        setError(data.error ?? "Failed to save item");
        return;
      }

      onSuccess();
    } catch {
      setError("Network error — please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
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
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "6px",
    color: "var(--text-muted)",
    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {/* Modal */}
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-lg"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {isEditing ? "Edit Wishlist Item" : "Add to Wishlist"}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label htmlFor="wishlist-title" style={labelStyle}>
              Title <span style={{ color: "var(--accent-red)" }}>*</span>
            </label>
            <input
              id="wishlist-title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="What do you want?"
              autoFocus
              style={{
                ...inputStyle,
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
              }}
              maxLength={200}
            />
          </div>

          {/* Price + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="wishlist-price" style={labelStyle}>
                Price (€)
              </label>
              <input
                id="wishlist-price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                min={0}
                max={999999}
                step="0.01"
                style={inputStyle}
              />
            </div>

            <div>
              <label htmlFor="wishlist-priority" style={labelStyle}>
                Priority
              </label>
              <select
                id="wishlist-priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="WANT">Want</option>
                <option value="NICE_TO_HAVE">Nice to have</option>
                <option value="SOMEDAY">Someday</option>
              </select>
            </div>
          </div>

          {/* URL */}
          <div>
            <label htmlFor="wishlist-url" style={labelStyle}>
              Product URL (optional)
            </label>
            <input
              id="wishlist-url"
              name="url"
              type="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://example.com/product"
              style={inputStyle}
            />
          </div>

          {/* Coin unlock threshold */}
          <div>
            <label htmlFor="wishlist-coins" style={labelStyle}>
              Coin unlock threshold (optional)
            </label>
            <input
              id="wishlist-coins"
              name="coinUnlockThreshold"
              type="number"
              value={formData.coinUnlockThreshold}
              onChange={handleChange}
              placeholder="e.g. 100"
              min={0}
              step={1}
              style={inputStyle}
            />
            <p
              className="mt-1 text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              }}
            >
              You must have this many coins before buying this item.
            </p>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--accent-amber)",
                color: "var(--bg-primary)",
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save changes"
                : "Add to wishlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
