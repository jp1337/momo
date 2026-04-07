"use client";

/**
 * PasskeySecondFactorButton — rendered on `/login/2fa` as an alternative to
 * (or alongside) the TOTP code input. Triggers an assertion against the
 * user's registered passkeys and, on success, marks the current session
 * as second-factor-verified before hard-navigating to /dashboard.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { startAuthentication } from "@simplewebauthn/browser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFingerprint } from "@fortawesome/free-solid-svg-icons";

export function PasskeySecondFactorButton() {
  const t = useTranslations("auth");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const optsRes = await fetch("/api/auth/passkey/second-factor/options", {
        method: "POST",
      });
      if (!optsRes.ok) {
        setError(t("passkey_err_generic"));
        return;
      }
      const options = await optsRes.json();

      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        console.error(err);
        setError(t("passkey_err_cancelled"));
        return;
      }

      const verifyRes = await fetch("/api/auth/passkey/second-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      if (!verifyRes.ok) {
        setError(t("passkey_err_generic"));
        return;
      }
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      setError(t("passkey_err_network"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <FontAwesomeIcon
          icon={faFingerprint}
          className="w-5 h-5"
          aria-hidden="true"
        />
        {submitting
          ? t("passkey_verifying")
          : t("passkey_use_for_2fa_btn")}
      </button>
      {error && (
        <p
          className="text-xs text-center"
          style={{ color: "#c95151", fontFamily: "var(--font-ui)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
