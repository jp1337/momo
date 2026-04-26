"use client";

/**
 * PasskeysSection — settings panel listing and managing WebAuthn/Passkey
 * credentials. Works alongside `SecuritySection` (TOTP) on the settings
 * page; both feed into the same `userHasSecondFactor` gate.
 *
 * States:
 *  - empty: hint + "Register a passkey" button
 *  - listed: table of name / device type / last used / rename / delete
 *
 * Registration uses `startRegistration()` from `@simplewebauthn/browser`,
 * which shows the OS prompt and returns the response we POST back to
 * `/api/auth/passkey/register/verify`.
 */

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { startRegistration } from "@simplewebauthn/browser";
import type { PasskeySummary } from "@/lib/webauthn";
import { ConfirmButton } from "@/components/ui/confirm-button";

interface PasskeysSectionProps {
  initialPasskeys: PasskeySummary[];
  /** Whether the admin has locked 2FA on. Used to hide the delete button
   *  on the user's *last* remaining second factor. */
  required: boolean;
  /** Whether the user also has TOTP enabled. With REQUIRE_2FA=true + no
   *  TOTP, deleting the last passkey is forbidden by the server. */
  hasTotp: boolean;
}

type UiPasskey = PasskeySummary & { renaming: boolean; pendingName: string };

export function PasskeysSection({
  initialPasskeys,
  required,
  hasTotp,
}: PasskeysSectionProps) {
  const t = useTranslations("settings");
  const [passkeys, setPasskeys] = useState<UiPasskey[]>(
    initialPasskeys.map((p) => ({ ...p, renaming: false, pendingName: p.name ?? "" }))
  );
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inline name-collection state — replaces window.prompt
  const [namingOptions, setNamingOptions] = useState<Record<string, unknown> | null>(null);
  const [pendingName, setPendingName] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  async function handleRegister() {
    setError(null);
    setRegistering(true);
    try {
      const optsRes = await fetch("/api/auth/passkey/register/options", {
        method: "POST",
      });
      if (!optsRes.ok) {
        setError(t("passkey_err_generic"));
        setRegistering(false);
        return;
      }
      const options = await optsRes.json();
      // Show inline name form instead of window.prompt
      setPendingName(guessDefaultName());
      setNamingOptions(options);
      setRegistering(false);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } catch {
      setError(t("passkey_err_network"));
      setRegistering(false);
    }
  }

  async function handleNameConfirm() {
    if (!namingOptions) return;
    const name = pendingName.trim() || guessDefaultName();
    setNamingOptions(null);
    setRegistering(true);
    setError(null);
    try {
      let attestation;
      try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attestation = await startRegistration({ optionsJSON: namingOptions as any });
      } catch (err) {
        console.error(err);
        setError(t("passkey_err_cancelled"));
        setRegistering(false);
        return;
      }

      const verifyRes = await fetch("/api/auth/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, response: attestation }),
      });
      if (!verifyRes.ok) {
        setError(t("passkey_err_generic"));
        setRegistering(false);
        return;
      }
      const data = await verifyRes.json();
      setPasskeys((prev) => [
        ...prev,
        {
          credentialID: data.credentialID,
          name: data.name ?? null,
          deviceType: data.deviceType,
          backedUp: data.backedUp,
          createdAt: new Date(),
          lastUsedAt: null,
          renaming: false,
          pendingName: data.name ?? "",
        },
      ]);
    } catch {
      setError(t("passkey_err_network"));
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(credentialID: string) {
    setError(null);
    try {
      const r = await fetch(
        `/api/auth/passkey/${encodeURIComponent(credentialID)}`,
        { method: "DELETE" }
      );
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        if (data.code === "SECOND_FACTOR_REQUIRED_BY_ADMIN") {
          setError(t("passkey_err_required_by_admin"));
        } else {
          setError(t("passkey_err_generic"));
        }
        return;
      }
      setPasskeys((prev) =>
        prev.filter((p) => p.credentialID !== credentialID)
      );
    } catch {
      setError(t("passkey_err_network"));
    }
  }

  async function handleRename(credentialID: string, newName: string) {
    setError(null);
    try {
      const r = await fetch(
        `/api/auth/passkey/${encodeURIComponent(credentialID)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName }),
        }
      );
      if (!r.ok) {
        setError(t("passkey_err_generic"));
        return;
      }
      setPasskeys((prev) =>
        prev.map((p) =>
          p.credentialID === credentialID
            ? { ...p, name: newName, renaming: false, pendingName: newName }
            : p
        )
      );
    } catch {
      setError(t("passkey_err_network"));
    }
  }

  function canDelete(credentialID: string): boolean {
    if (!required) return true;
    if (hasTotp) return true;
    // Admin-enforced second factor + no TOTP → cannot remove the last passkey.
    return passkeys.length > 1 || passkeys[0]?.credentialID !== credentialID;
  }

  return (
    <div className="flex flex-col gap-4">
      {passkeys.length === 0 ? (
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
        >
          {t("passkey_empty_hint")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((p) => (
            <li
              key={p.credentialID}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                {p.renaming ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRename(p.credentialID, p.pendingName.trim() || "Passkey");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={p.pendingName}
                      onChange={(e) =>
                        setPasskeys((prev) =>
                          prev.map((x) =>
                            x.credentialID === p.credentialID
                              ? { ...x, pendingName: e.target.value }
                              : x
                          )
                        )
                      }
                      className="flex-1 px-2 py-1 text-sm rounded"
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        color: "var(--text-primary)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-ui)",
                      }}
                      autoFocus
                      maxLength={80}
                    />
                    <button
                      type="submit"
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: "var(--accent-amber)",
                        color: "#1a1a0a",
                        fontFamily: "var(--font-ui)",
                        fontWeight: 600,
                      }}
                    >
                      {t("passkey_save_btn")}
                    </button>
                  </form>
                ) : (
                  <span
                    className="text-sm font-medium truncate"
                    style={{
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {p.name ?? t("passkey_unnamed")}
                  </span>
                )}
                <span
                  className="text-xs"
                  style={{
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {p.deviceType === "multiDevice"
                    ? t("passkey_device_synced")
                    : t("passkey_device_bound")}
                  {" · "}
                  {p.lastUsedAt
                    ? t("passkey_last_used", {
                        date: new Date(p.lastUsedAt).toLocaleDateString(),
                      })
                    : t("passkey_never_used")}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setPasskeys((prev) =>
                      prev.map((x) =>
                        x.credentialID === p.credentialID
                          ? { ...x, renaming: !x.renaming }
                          : x
                      )
                    )
                  }
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-ui)",
                  }}
                  title={t("passkey_rename_btn")}
                >
                  {t("passkey_rename_btn")}
                </button>
                {canDelete(p.credentialID) && (
                  <ConfirmButton
                    onConfirm={() => handleDelete(p.credentialID)}
                    confirmPrompt={t("passkey_delete_confirm")}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: "transparent",
                      color: "#c95151",
                      border: "1px solid #c9515166",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {t("passkey_delete_btn")}
                  </ConfirmButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Inline name input — replaces window.prompt */}
      {namingOptions && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleNameConfirm(); }}
          className="flex flex-col gap-2 rounded-lg p-3"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--accent-amber)",
          }}
        >
          <label
            className="text-xs font-semibold"
            style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)", textTransform: "uppercase", letterSpacing: "0.05em" }}
          >
            {t("passkey_name_prompt")}
          </label>
          <div className="flex gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setNamingOptions(null); }}
              maxLength={80}
              className="flex-1 px-3 py-1.5 text-sm rounded"
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)",
              }}
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded font-semibold"
              style={{
                backgroundColor: "var(--accent-amber)",
                color: "#1a1a0a",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("passkey_continue_btn")}
            </button>
            <button
              type="button"
              onClick={() => setNamingOptions(null)}
              className="px-3 py-1.5 text-sm rounded"
              style={{
                backgroundColor: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                fontFamily: "var(--font-ui)",
              }}
            >
              {t("passkey_cancel_btn")}
            </button>
          </div>
        </form>
      )}

      <div>
        <button
          type="button"
          onClick={handleRegister}
          disabled={registering || !!namingOptions}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent-amber)",
            color: "#1a1a0a",
            fontFamily: "var(--font-ui)",
            fontWeight: 600,
          }}
        >
          {registering
            ? t("passkey_registering")
            : passkeys.length === 0
              ? t("passkey_add_first_btn")
              : t("passkey_add_another_btn")}
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
    </div>
  );
}

/** Rough default name based on the UA string — user can change it in the inline form. */
function guessDefaultName(): string {
  if (typeof navigator === "undefined") return "Passkey";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Passkey";
}
