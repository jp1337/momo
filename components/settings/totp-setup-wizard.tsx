"use client";

/**
 * TotpSetupWizard — three-step modal for activating TOTP 2FA.
 *
 *   1. Scan: shows the QR code + manual key.
 *   2. Verify: user types the first 6-digit code from their app.
 *   3. Backup codes: rendered by the parent (`SecuritySection`) once the
 *      verify-setup endpoint returns the codes — keeps the codes outside
 *      this component so the parent can display them post-wizard.
 *
 * The wizard owns the network calls to /api/auth/2fa/setup and
 * /api/auth/2fa/verify-setup; the parent receives the freshly issued
 * backup codes via `onComplete`.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface TotpSetupWizardProps {
  onCancel: () => void;
  onComplete: (payload: { backupCodes: string[] }) => void;
}

interface SetupResponse {
  qrCodeDataUrl: string;
  manualEntryKey: string;
}

type Step = "loading" | "scan" | "verify" | "submitting" | "error";

export function TotpSetupWizard({ onCancel, onComplete }: TotpSetupWizardProps) {
  const t = useTranslations("settings");
  const [step, setStep] = useState<Step>("loading");
  const [setup, setSetup] = useState<SetupResponse | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Kick off the setup call as soon as the wizard mounts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/2fa/setup", { method: "POST" });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          if (cancelled) return;
          if (data.code === "TOTP_ALREADY_ENABLED")
            setError(t("twofa_err_already_enabled"));
          else setError(t("twofa_err_generic"));
          setStep("error");
          return;
        }
        const data: SetupResponse = await r.json();
        if (cancelled) return;
        setSetup(data);
        setStep("scan");
      } catch {
        if (!cancelled) {
          setError(t("twofa_err_network"));
          setStep("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep("submitting");
    try {
      const r = await fetch("/api/auth/2fa/verify-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.code === "INVALID_CODE") setError(t("twofa_err_invalid_code"));
        else if (data.code === "SETUP_EXPIRED")
          setError(t("twofa_err_setup_expired"));
        else setError(t("twofa_err_generic"));
        setStep("verify");
        return;
      }
      onComplete({ backupCodes: data.backupCodes });
    } catch {
      setError(t("twofa_err_network"));
      setStep("verify");
    }
  }

  if (step === "loading") {
    return (
      <p
        className="text-sm"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        {t("twofa_loading")}
      </p>
    );
  }

  if (step === "error") {
    return (
      <div className="flex flex-col gap-3">
        <p
          className="text-sm"
          style={{ color: "#c95151", fontFamily: "var(--font-ui)" }}
        >
          {error}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_cancel_btn")}
        </button>
      </div>
    );
  }

  if (!setup) return null;

  return (
    <div className="flex flex-col gap-5">
      {/* Step 1 — scan */}
      <div className="flex flex-col gap-3">
        <h3
          className="text-sm font-semibold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_setup_step1_title")}
        </h3>
        <p
          className="text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_setup_step1_hint")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: "white",
              border: "1px solid var(--border)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qrCodeDataUrl}
              alt="TOTP QR code"
              width={200}
              height={200}
            />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <span
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("twofa_manual_entry_label")}
            </span>
            <code
              className="text-sm tracking-wider break-all p-2 rounded"
              style={{
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
              }}
            >
              {setup.manualEntryKey}
            </code>
          </div>
        </div>
      </div>

      {/* Step 2 — verify */}
      <form onSubmit={handleVerify} className="flex flex-col gap-3">
        <h3
          className="text-sm font-semibold"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_setup_step2_title")}
        </h3>
        <p
          className="text-sm"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_setup_step2_hint")}
        </p>
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
          autoFocus
          className="px-3 py-3 rounded-lg text-2xl tracking-[0.4em] text-center w-48"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-body)",
          }}
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={code.length !== 6 || step === "submitting"}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "white",
              fontFamily: "var(--font-ui)",
            }}
          >
            {step === "submitting"
              ? t("twofa_verifying")
              : t("twofa_setup_verify_btn")}
          </button>
          <button
            type="button"
            onClick={onCancel}
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
    </div>
  );
}
