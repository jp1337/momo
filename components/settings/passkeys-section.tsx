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

import { useState } from "react";
import { useTranslations } from "next-intl";
import { startRegistration } from "@simplewebauthn/browser";
import type { PasskeySummary } from "@/lib/webauthn";

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

      const defaultName = guessDefaultName();
      const name =
        typeof window === "undefined"
          ? defaultName
          : window.prompt(t("passkey_name_prompt"), defaultName) ?? defaultName;

      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: options });
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
    } catch (err) {
      console.error(err);
      setError(t("passkey_err_network"));
    } finally {
      setRegistering(false);
    }
  }

  async function handleDelete(credentialID: string) {
    setError(null);
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(t("passkey_delete_confirm"));
    if (!confirmed) return;

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
                        backgroundColor: "var(--accent)",
                        color: "white",
                        fontFamily: "var(--font-ui)",
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
                  <button
                    type="button"
                    onClick={() => handleDelete(p.credentialID)}
                    className="text-xs px-2 py-1 rounded"
                    style={{
                      backgroundColor: "transparent",
                      color: "#c95151",
                      border: "1px solid #c9515166",
                      fontFamily: "var(--font-ui)",
                    }}
                    title={t("passkey_delete_btn")}
                  >
                    {t("passkey_delete_btn")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <button
          type="button"
          onClick={handleRegister}
          disabled={registering}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "white",
            fontFamily: "var(--font-ui)",
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

/** Rough default name based on the UA string — user can override in the prompt. */
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
