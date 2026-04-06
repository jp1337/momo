"use client";

/**
 * ProfileSettings component — allows the user to edit their profile
 * (name, email, profile picture) inline within the settings page.
 *
 * PATCHes /api/user/profile on save.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface ProfileSettingsProps {
  initialName: string | null;
  initialEmail: string | null;
  initialImage: string | null;
  providerBadgeLabel: string;
}

/** Max file size before upload: 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Profile editing section for the settings page.
 * Toggles between view mode (read-only display) and edit mode (inline form).
 */
export function ProfileSettings({
  initialName,
  initialEmail,
  initialImage,
  providerBadgeLabel,
}: ProfileSettingsProps) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName ?? "");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage);
  const [imageData, setImageData] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCancel() {
    setEditing(false);
    setName(initialName ?? "");
    setEmail(initialEmail ?? "");
    setImagePreview(initialImage);
    setImageData(undefined);
    setError(null);
    setStatus("idle");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(t("profile_err_image_too_large"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(t("profile_err_invalid_image"));
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageData(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveImage() {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    setError(null);

    // Client-side validation
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError(t("profile_err_name_empty"));
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError(t("profile_err_email_invalid"));
      return;
    }

    // Build payload — only include changed fields
    const payload: Record<string, unknown> = {};
    if (trimmedName !== (initialName ?? "")) payload.name = trimmedName;
    if (trimmedEmail !== (initialEmail ?? "")) payload.email = trimmedEmail || null;
    if (imageData !== undefined) payload.image = imageData;

    if (Object.keys(payload).length === 0) {
      // Nothing changed
      setEditing(false);
      return;
    }

    setStatus("saving");
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string; code?: string };
        if (data.code === "EMAIL_TAKEN") {
          setError(t("profile_err_email_taken"));
        } else if (data.code === "INVALID_IMAGE") {
          setError(t("profile_err_invalid_image"));
        } else {
          setError(data.error ?? tc("error_network"));
        }
        setStatus("idle");
        return;
      }

      setStatus("saved");
      setEditing(false);
      setTimeout(() => setStatus("idle"), 2000);
      // Refresh server components to update navbar avatar + session data
      router.refresh();
    } catch {
      setError(tc("error_network"));
      setStatus("idle");
    }
  }

  // ─── View Mode ─────────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="flex items-center gap-4">
        {/* Avatar */}
        {imagePreview ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imagePreview}
            alt={initialName ?? "User avatar"}
            width={56}
            height={56}
            className="rounded-full object-cover"
            style={{ border: "2px solid var(--border)", width: 56, height: 56 }}
          />
        ) : (
          <div
            className="rounded-full flex items-center justify-center text-lg font-semibold"
            style={{
              width: 56,
              height: 56,
              backgroundColor: "var(--bg-elevated)",
              color: "var(--accent-amber)",
              fontFamily: "var(--font-display)",
            }}
          >
            {(initialName ?? "?").charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + email + provider */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="font-medium"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
          >
            {initialName ?? t("account_anonymous")}
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {initialEmail ?? "—"}
          </span>
          <span
            className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium w-fit"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
              border: "1px solid var(--border)",
            }}
          >
            {providerBadgeLabel}
          </span>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditing(true)}
          className="self-start px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("profile_edit_btn")}
        </button>

        {status === "saved" && (
          <span
            className="self-start text-xs mt-2"
            style={{ fontFamily: "var(--font-ui)", color: "var(--accent-green)" }}
          >
            {t("profile_saved")}
          </span>
        )}
      </div>
    );
  }

  // ─── Edit Mode ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Avatar with upload */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group rounded-full transition-opacity"
          style={{ width: 56, height: 56 }}
          title={t("profile_image_hint")}
        >
          {imagePreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagePreview}
              alt="Avatar preview"
              width={56}
              height={56}
              className="rounded-full object-cover group-hover:opacity-70 transition-opacity"
              style={{ border: "2px solid var(--border)", width: 56, height: 56 }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center text-lg font-semibold group-hover:opacity-70 transition-opacity"
              style={{
                width: 56,
                height: 56,
                backgroundColor: "var(--bg-elevated)",
                color: "var(--accent-amber)",
                fontFamily: "var(--font-display)",
              }}
            >
              {(name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          {/* Camera overlay */}
          <div
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col gap-1">
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            {t("profile_image_hint")}
          </span>
          {imagePreview && (
            <button
              type="button"
              onClick={handleRemoveImage}
              className="text-xs text-left transition-colors"
              style={{ color: "var(--accent-red)", fontFamily: "var(--font-ui)" }}
            >
              {t("profile_image_remove")}
            </button>
          )}
        </div>
      </div>

      {/* Name field */}
      <div className="flex flex-col gap-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
        >
          {t("profile_name_label")}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="rounded-lg text-sm transition-colors"
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            outline: "none",
          }}
        />
      </div>

      {/* Email field */}
      <div className="flex flex-col gap-1">
        <label
          className="text-sm font-medium"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
        >
          {t("profile_email_label")}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          className="rounded-lg text-sm transition-colors"
          style={{
            padding: "8px 12px",
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            outline: "none",
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent-red) 10%, var(--bg-elevated))",
            color: "var(--accent-red)",
            border: "1px solid color-mix(in srgb, var(--accent-red) 30%, var(--border))",
            fontFamily: "var(--font-ui)",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCancel}
          disabled={status === "saving"}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("profile_cancel_btn")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent-amber)",
            color: "var(--bg-primary)",
            border: "1px solid var(--accent-amber)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {status === "saving" ? t("profile_saving") : t("profile_save_btn")}
        </button>
      </div>
    </div>
  );
}
