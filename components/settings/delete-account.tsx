"use client";

/**
 * DeleteAccount — two-step inline confirmation widget for account deletion.
 *
 * Step 1: Shows a "Delete account" button inside a danger-zone section.
 * Step 2: On click, expands an inline warning with a final confirm button.
 *         Clicking confirm calls DELETE /api/user, then signs the user out.
 *
 * No window.confirm is used — the confirmation is inline with the UI to match
 * the app's design language.
 */

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";

export function DeleteAccount() {
  const t = useTranslations("settings");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? t("delete_err_generic"));
        setLoading(false);
        return;
      }
      // Account deleted — sign out and redirect to login
      await signOut({ callbackUrl: "/login" });
    } catch {
      setError(t("delete_err_generic"));
      setLoading(false);
    }
  }

  return (
    <section
      className="rounded-xl p-6 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--accent-red)",
      }}
    >
      <div className="flex flex-col gap-1">
        <h2
          className="text-base font-semibold"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--accent-red)",
          }}
        >
          {t("section_danger")}
        </h2>
        <p
          className="text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("danger_hint")}
        </p>
      </div>

      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--accent-red)",
            border: "1px solid var(--accent-red)",
            fontFamily: "var(--font-ui)",
            cursor: "pointer",
          }}
        >
          {t("delete_account_btn")}
        </button>
      ) : (
        <div
          className="flex flex-col gap-4 rounded-lg p-4"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--accent-red)",
          }}
        >
          <p
            className="text-sm font-medium"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("delete_confirm_text")}
          </p>
          <ul
            className="text-sm list-disc list-inside flex flex-col gap-1"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
          >
            <li>{t("delete_warn_tasks")}</li>
            <li>{t("delete_warn_topics")}</li>
            <li>{t("delete_warn_wishlist")}</li>
            <li>{t("delete_warn_coins")}</li>
          </ul>

          {error && (
            <p
              className="text-sm"
              style={{ color: "var(--accent-red)", fontFamily: "var(--font-ui)" }}
            >
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: "var(--accent-red)",
                color: "#fff",
                border: "none",
                fontFamily: "var(--font-ui)",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t("delete_confirming") : t("delete_confirm_btn")}
            </button>
            <button
              onClick={() => {
                setExpanded(false);
                setError(null);
              }}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {t("delete_cancel_btn")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
