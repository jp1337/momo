"use client";

/**
 * PasskeyLoginButton — passwordless primary-login button rendered above the
 * OAuth providers on `/login`. Uses `startAuthentication()` with the
 * discoverable-credentials flow so the browser offers whichever passkeys
 * the OS has for this relying party.
 *
 * Flow:
 *  1. Click → POST /api/auth/passkey/login/options (public endpoint).
 *  2. startAuthentication() → OS/browser prompts user.
 *  3. POST /api/auth/passkey/login/verify with the assertion.
 *  4. On success the server sets the Auth.js session cookie and we hard-
 *     navigate to /dashboard so middleware/layouts see the new session.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startAuthentication } from "@simplewebauthn/browser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFingerprint } from "@fortawesome/free-solid-svg-icons";

export function PasskeyLoginButton() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const optsRes = await fetch("/api/auth/passkey/login/options", {
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

      const verifyRes = await fetch("/api/auth/passkey/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: assertion }),
      });
      if (!verifyRes.ok) {
        setError(t("passkey_err_generic"));
        return;
      }
      // Hard navigate so server components re-run with the new session cookie.
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
          backgroundColor: "var(--accent)",
          color: "white",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <FontAwesomeIcon
          icon={faFingerprint}
          className="w-5 h-5"
          aria-hidden="true"
        />
        {submitting ? t("passkey_signing_in") : t("passkey_sign_in_btn")}
      </button>
      {/* Silence the Next hook by still using router — ensures push is valid */}
      <span hidden>{router ? "" : ""}</span>
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
