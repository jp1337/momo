"use client";

/**
 * TotpVerifyForm — second-factor entry on /login/2fa.
 *
 * Default mode: 6-digit numeric input with auto-submit on the 6th digit.
 * Toggle: switches to 10-character alphanumeric backup-code mode.
 *
 * On success, hard-navigates to /dashboard so the (app) layout gate
 * re-runs server-side and lets the user in.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Mode = "totp" | "backup";

export function TotpVerifyForm() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>("totp");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  async function submit(rawValue?: string) {
    const v = rawValue ?? value;
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body =
        mode === "totp" ? { code: v } : { backupCode: v.toUpperCase() };
      const r = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.code === "INVALID_CODE") setError(t("twofa_err_invalid_code"));
        else if (data.code === "TOTP_NOT_ENABLED") {
          router.push("/dashboard");
          return;
        } else if (r.status === 429) setError(t("twofa_err_rate_limited"));
        else setError(t("twofa_err_generic"));
        setSubmitting(false);
        setValue("");
        inputRef.current?.focus();
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("twofa_err_network"));
      setSubmitting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (mode === "totp") {
      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
      setValue(v);
      if (v.length === 6) submit(v);
    } else {
      const v = e.target.value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10);
      setValue(v);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-4"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode={mode === "totp" ? "numeric" : "text"}
        autoComplete="one-time-code"
        pattern={mode === "totp" ? "\\d{6}" : "[A-Z0-9]{10}"}
        maxLength={mode === "totp" ? 6 : 10}
        value={value}
        onChange={handleChange}
        placeholder={mode === "totp" ? "123456" : "ABCDEFGHJK"}
        className="px-3 py-3 rounded-lg text-2xl tracking-[0.4em] text-center"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          fontFamily: "var(--font-body)",
        }}
      />

      <button
        type="submit"
        disabled={
          submitting ||
          (mode === "totp" ? value.length !== 6 : value.length !== 10)
        }
        className="px-4 py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        style={{
          backgroundColor: "var(--accent)",
          color: "white",
          fontFamily: "var(--font-ui)",
        }}
      >
        {submitting ? t("twofa_verifying") : t("twofa_verify_btn")}
      </button>

      {error && (
        <p
          className="text-sm text-center"
          style={{ color: "#c95151", fontFamily: "var(--font-ui)" }}
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setMode(mode === "totp" ? "backup" : "totp");
          setValue("");
          setError(null);
        }}
        className="text-xs underline underline-offset-2 text-center"
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-ui)",
        }}
      >
        {mode === "totp"
          ? t("twofa_use_backup_code")
          : t("twofa_use_totp_code")}
      </button>
    </form>
  );
}
