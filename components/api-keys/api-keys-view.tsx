"use client";

/**
 * ApiKeysView — interactive API key management UI.
 *
 * Features:
 *  - List of active API keys (prefix, name, readonly badge, expiry, last used)
 *  - "New key" form: name, readonly checkbox, expiry selector
 *  - One-time modal showing the plaintext key after creation (copy button)
 *  - Revoke button per key
 */

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKey,
  faPlus,
  faTrash,
  faCopy,
  faCheck,
  faXmark,
  faLockOpen,
  faLock,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslations, useLocale } from "next-intl";
import type { ApiKeyRecord } from "@/lib/api-keys";

interface ApiKeysViewProps {
  initialKeys: ApiKeyRecord[];
}

/**
 * Interactive API key management page component.
 * Manages key creation, one-time display, and revocation client-side.
 */
export function ApiKeysView({ initialKeys }: ApiKeysViewProps) {
  const t = useTranslations("api_keys");
  const locale = useLocale();
  const [keys, setKeys] = useState<ApiKeyRecord[]>(initialKeys);
  const [showForm, setShowForm] = useState(false);
  const [newKeyPlaintext, setNewKeyPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formReadonly, setFormReadonly] = useState(false);
  const [formExpiry, setFormExpiry] = useState<string>("90d");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const expiryOptions = [
    { value: "30d", label: t("expiry_30d") },
    { value: "90d", label: t("expiry_90d") },
    { value: "1y", label: t("expiry_1y") },
    { value: "", label: t("expiry_never") },
  ];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/user/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          readonly: formReadonly,
          expiresIn: formExpiry || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? t("error_create"));
        return;
      }

      setKeys((prev) => [data.record, ...prev]);
      setNewKeyPlaintext(data.key);
      setShowForm(false);
      setFormName("");
      setFormReadonly(false);
      setFormExpiry("90d");
    } catch {
      setFormError(t("error_network"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(keyId: string) {
    try {
      const res = await fetch(`/api/user/api-keys/${keyId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId));
      }
    } catch {
      // Silent failure — key will remain in list until page reload
    }
  }

  function handleCopy() {
    if (!newKeyPlaintext) return;
    navigator.clipboard.writeText(newKeyPlaintext).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function formatDate(date: Date | string | null): string {
    if (!date) return "–";
    return new Date(date).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* One-time key display modal */}
      {newKeyPlaintext && (
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--accent-amber)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--accent-amber)",
                }}
              >
                {t("new_key_created")}
              </p>
              <p
                className="text-xs mt-1"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("new_key_copy_hint")}
              </p>
            </div>
            <button
              onClick={() => setNewKeyPlaintext(null)}
              aria-label={t("aria_close")}
              className="flex-shrink-0 transition-opacity hover:opacity-60"
              style={{ color: "var(--text-muted)" }}
            >
              <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs px-3 py-2 rounded-lg break-all"
              style={{
                fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
            >
              {newKeyPlaintext}
            </code>
            <button
              onClick={handleCopy}
              aria-label={t("aria_copy")}
              className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: copied ? "var(--accent-green)" : "var(--accent-amber)",
                color: "#1a1a0a",
              }}
            >
              <FontAwesomeIcon
                icon={copied ? faCheck : faCopy}
                className="w-4 h-4"
              />
            </button>
          </div>
        </div>
      )}

      {/* Create new key form */}
      {showForm ? (
        <div
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{
              fontFamily: "var(--font-display, 'Lora', serif)",
              color: "var(--text-primary)",
            }}
          >
            {t("create_form_title")}
          </h2>

          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="key-name"
                className="text-xs font-medium uppercase tracking-wide"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("label_name")}
              </label>
              <input
                id="key-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("placeholder_name")}
                required
                maxLength={64}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              />
            </div>

            {/* Expiry */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="key-expiry"
                className="text-xs font-medium uppercase tracking-wide"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-muted)",
                }}
              >
                {t("label_expiry")}
              </label>
              <select
                id="key-expiry"
                value={formExpiry}
                onChange={(e) => setFormExpiry(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {expiryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Read-only checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formReadonly}
                onChange={(e) => setFormReadonly(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: "var(--accent-amber)" }}
              />
              <span
                className="text-sm"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--text-primary)",
                }}
              >
                {t("label_readonly")}{" "}
                <span style={{ color: "var(--text-muted)" }}>
                  {t("readonly_hint")}
                </span>
              </span>
            </label>

            {formError && (
              <p
                className="text-xs"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  color: "var(--accent-red, #e05555)",
                }}
              >
                {formError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting || !formName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--accent-amber)",
                  color: "#1a1a0a",
                }}
              >
                {submitting ? t("btn_creating") : t("btn_create")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                {t("btn_cancel")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            backgroundColor: "var(--accent-amber)",
            color: "#1a1a0a",
          }}
        >
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5" />
          {t("btn_new_key")}
        </button>
      )}

      {/* Keys list */}
      <div className="flex flex-col gap-3">
        {keys.length === 0 ? (
          <div
            className="relative rounded-2xl p-12 sm:p-16 text-center overflow-hidden"
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "1px dashed var(--border)",
            }}
          >
            {/* Soft amber halo behind the icon — same atmospheric pattern as other empty states */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "20%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "240px",
                height: "240px",
                borderRadius: "50%",
                background: "radial-gradient(circle, color-mix(in srgb, var(--accent-amber) 12%, transparent) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <FontAwesomeIcon
              icon={faKey}
              className="relative mb-4"
              style={{ color: "var(--accent-amber)", opacity: 0.7, fontSize: "2.75rem" }}
            />
            <p
              className="relative text-sm max-w-sm mx-auto"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              {t("empty_hint")}
            </p>
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="rounded-xl p-4 flex items-start justify-between gap-4"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex flex-col gap-1 min-w-0">
                {/* Name + badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {key.name}
                  </span>
                  {key.readonly ? (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: "rgba(212,160,23,0.12)",
                        color: "var(--accent-amber)",
                        border: "1px solid rgba(212,160,23,0.3)",
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      }}
                    >
                      <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />
                      {t("label_readonly")}
                    </span>
                  ) : (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                      style={{
                        backgroundColor: "var(--bg-elevated)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                      }}
                    >
                      <FontAwesomeIcon icon={faLockOpen} className="w-2.5 h-2.5" />
                      Read-Write
                    </span>
                  )}
                </div>

                {/* Key prefix */}
                <code
                  className="text-xs"
                  style={{
                    fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
                    color: "var(--text-muted)",
                  }}
                >
                  {key.keyPrefix}
                </code>

                {/* Metadata */}
                <div
                  className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs mt-1"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>{t("meta_created")} {formatDate(key.createdAt)}</span>
                  <span>
                    {t("meta_expires")}{" "}
                    {key.expiresAt ? formatDate(key.expiresAt) : t("meta_never")}
                  </span>
                  <span>
                    {t("meta_last_used")}{" "}
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : t("meta_never_used")}
                  </span>
                </div>
              </div>

              {/* Revoke button */}
              <button
                onClick={() => handleRevoke(key.id)}
                aria-label={t("aria_revoke", { name: key.name })}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3 mr-1.5" />
                {t("btn_revoke")}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Documentation hint */}
      <p
        className="text-xs"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        {t("docs_hint")}{" "}
        <code
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
          }}
        >
          Authorization: Bearer &lt;key&gt;
        </code>{" "}
        Header.{" "}
        <a href="/api-docs" style={{ color: "var(--accent-amber)" }}>
          {t("docs_link")}
        </a>
      </p>
    </div>
  );
}
