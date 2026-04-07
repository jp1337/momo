"use client";

/**
 * SecuritySection — settings panel for two-factor authentication.
 *
 * States:
 *  - disabled: shows an "Enable 2FA" button which opens the setup wizard.
 *  - enabled: shows status, unused backup-code count, plus actions to
 *    regenerate backup codes or disable 2FA. Both destructive actions
 *    require re-entering a current TOTP code.
 *
 * The user-visible enforcement state (REQUIRE_2FA) is passed in as a prop
 * by the Server Component so the disable button is hidden when the admin
 * has locked 2FA on.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { TotpSetupWizard } from "./totp-setup-wizard";
import { BackupCodesDisplay } from "./backup-codes-display";

interface SecuritySectionProps {
  /** Whether 2FA is currently active for the user. */
  initialEnabled: boolean;
  /** When 2FA was first activated (ISO string). */
  initialEnabledAt: string | null;
  /** How many unused backup codes the user still has. */
  initialUnusedBackupCodes: number;
  /** Whether the admin has set REQUIRE_2FA=true on this instance. */
  required: boolean;
}

type Action = "idle" | "wizard" | "disabling" | "regenerating";

export function SecuritySection({
  initialEnabled,
  initialEnabledAt,
  initialUnusedBackupCodes,
  required,
}: SecuritySectionProps) {
  const t = useTranslations("settings");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [enabledAt, setEnabledAt] = useState(initialEnabledAt);
  const [unusedCodes, setUnusedCodes] = useState(initialUnusedBackupCodes);
  const [action, setAction] = useState<Action>("idle");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [freshCodes, setFreshCodes] = useState<string[] | null>(null);

  function reset() {
    setAction("idle");
    setCode("");
    setError(null);
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.code === "INVALID_CODE") setError(t("twofa_err_invalid_code"));
        else if (data.code === "TOTP_REQUIRED_BY_ADMIN")
          setError(t("twofa_err_required_by_admin"));
        else setError(t("twofa_err_generic"));
        return;
      }
      setEnabled(false);
      setEnabledAt(null);
      setUnusedCodes(0);
      reset();
    } catch {
      setError(t("twofa_err_network"));
    }
  }

  async function handleRegenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch("/api/auth/2fa/regenerate-backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.code === "INVALID_CODE") setError(t("twofa_err_invalid_code"));
        else setError(t("twofa_err_generic"));
        return;
      }
      setFreshCodes(data.backupCodes);
      setUnusedCodes(data.backupCodes.length);
      reset();
    } catch {
      setError(t("twofa_err_network"));
    }
  }

  // Display freshly regenerated codes (modal-like)
  if (freshCodes) {
    return (
      <div className="flex flex-col gap-4">
        <p
          className="text-sm"
          style={{ color: "var(--text-primary)", fontFamily: "var(--font-ui)" }}
        >
          {t("twofa_new_codes_intro")}
        </p>
        <BackupCodesDisplay codes={freshCodes} />
        <button
          type="button"
          onClick={() => setFreshCodes(null)}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_done_btn")}
        </button>
      </div>
    );
  }

  // Setup wizard for the disabled-state activation flow
  if (action === "wizard" && !enabled) {
    return (
      <TotpSetupWizard
        onCancel={reset}
        onComplete={(payload) => {
          setEnabled(true);
          setEnabledAt(new Date().toISOString());
          setUnusedCodes(payload.backupCodes.length);
          setFreshCodes(payload.backupCodes);
          setAction("idle");
        }}
      />
    );
  }

  // ── Enabled state ────────────────────────────────────────────────────────
  if (enabled) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="text-lg leading-none mt-0.5"
            style={{ color: "#6b9b6a" }}
          >
            ●
          </span>
          <div className="flex flex-col gap-1">
            <p
              className="text-sm font-medium"
              style={{
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("twofa_status_active")}
              {enabledAt && (
                <>
                  {" "}
                  <span style={{ color: "var(--text-muted)" }}>
                    ({t("twofa_active_since", {
                      date: new Date(enabledAt).toLocaleDateString(),
                    })})
                  </span>
                </>
              )}
            </p>
            <p
              className="text-xs"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("twofa_backup_codes_remaining", { count: unusedCodes })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setAction("regenerating");
              setError(null);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("twofa_regenerate_codes_btn")}
          </button>
          {!required && (
            <button
              type="button"
              onClick={() => {
                setAction("disabling");
                setError(null);
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "#c95151",
                border: "1px solid #c9515166",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("twofa_disable_btn")}
            </button>
          )}
        </div>

        {required && (
          <p
            className="text-xs italic"
            style={{
              color: "var(--text-muted)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {t("twofa_required_by_admin_hint")}
          </p>
        )}

        {(action === "disabling" || action === "regenerating") && (
          <form
            onSubmit={action === "disabling" ? handleDisable : handleRegenerate}
            className="flex flex-col gap-2 pt-2"
          >
            <label
              className="text-xs font-medium"
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {action === "disabling"
                ? t("twofa_disable_confirm_label")
                : t("twofa_regenerate_confirm_label")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                className="px-3 py-2 rounded-lg text-base tracking-[0.3em] text-center w-32"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  fontFamily: "var(--font-body)",
                }}
                autoFocus
              />
              <button
                type="submit"
                disabled={code.length !== 6}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: action === "disabling" ? "#c95151" : "var(--accent)",
                  color: "white",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {action === "disabling"
                  ? t("twofa_disable_confirm_btn")
                  : t("twofa_regenerate_confirm_btn")}
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {t("twofa_cancel_btn")}
              </button>
            </div>
            {error && (
              <p
                className="text-xs"
                style={{ color: "#c95151", fontFamily: "var(--font-ui)" }}
              >
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    );
  }

  // ── Disabled state ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-sm"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        {t("twofa_disabled_hint")}
      </p>
      <button
        type="button"
        onClick={() => setAction("wizard")}
        className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          backgroundColor: "var(--accent)",
          color: "white",
          fontFamily: "var(--font-ui)",
        }}
      >
        {t("twofa_enable_btn")}
      </button>
    </div>
  );
}
