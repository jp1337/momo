"use client";

/**
 * LinkedAccounts — shows connected OAuth providers in Settings.
 *
 * Displays all configured providers with their connection status.
 * Users can connect additional providers to log in with multiple methods.
 * Already-connected providers show a "Connected" badge (no disconnect — at
 * least one provider must remain active at all times).
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGithub,
  faDiscord,
  faGoogle,
  faMicrosoft,
} from "@fortawesome/free-brands-svg-icons";
import { faKey, faCheck } from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface ProviderInfo {
  id: string;
  label: string;
  icon: IconDefinition;
}

const PROVIDERS: ProviderInfo[] = [
  { id: "github", label: "GitHub", icon: faGithub },
  { id: "discord", label: "Discord", icon: faDiscord },
  { id: "google", label: "Google", icon: faGoogle },
  { id: "microsoft-entra-id", label: "Microsoft", icon: faMicrosoft },
  { id: "keycloak", label: "SSO (OIDC)", icon: faKey },
];

interface LinkedAccountsProps {
  /** Provider IDs that are currently linked to the user (e.g. ["github"]) */
  linkedProviders: string[];
  /** Provider IDs that are configured on this server */
  configuredProviders: string[];
}

/**
 * Renders the linked accounts section in the settings page.
 * Filters to only show configured providers.
 *
 * @param linkedProviders      - Providers the user has already connected
 * @param configuredProviders  - Providers enabled in the server env
 */
export function LinkedAccounts({
  linkedProviders,
  configuredProviders,
}: LinkedAccountsProps) {
  const searchParams = useSearchParams();
  const [successProvider, setSuccessProvider] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  // Handle ?linked=<provider> and ?link-error=<reason> query params
  useEffect(() => {
    const linked = searchParams.get("linked");
    const err = searchParams.get("link-error");
    if (linked) setSuccessProvider(linked);
    if (err) setErrorCode(err);
  }, [searchParams]);

  const visibleProviders = PROVIDERS.filter((p) =>
    configuredProviders.includes(p.id)
  );

  async function handleConnect(providerId: string) {
    setConnecting(providerId);
    setErrorCode(null);
    try {
      const res = await fetch("/api/auth/link-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorCode(data.error ?? "unknown");
        return;
      }
      // Use signIn() so Auth.js receives a CSRF-protected POST — a plain
      // GET redirect to /api/auth/signin/[provider] is not supported in v5.
      await signIn(providerId, {
        callbackUrl: `/api/auth/link-callback?token=${data.token}`,
      });
    } catch {
      setErrorCode("network");
    } finally {
      setConnecting(null);
    }
  }

  function errorMessage(code: string): string {
    switch (code) {
      case "already_used":
        return "Dieser Account ist bereits mit einem anderen Momo-Konto verbunden.";
      case "expired":
        return "Linking-Token abgelaufen — bitte erneut versuchen.";
      case "Provider already linked to your account":
        return "Dieser Anbieter ist bereits mit deinem Konto verbunden.";
      case "network":
        return "Netzwerkfehler — bitte erneut versuchen.";
      default:
        return "Verbinden fehlgeschlagen — bitte erneut versuchen.";
    }
  }

  if (visibleProviders.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Success banner */}
      {successProvider && (
        <div
          className="rounded-lg px-4 py-2.5 text-sm flex items-center gap-2"
          style={{
            backgroundColor: "rgba(74,160,74,0.12)",
            border: "1px solid rgba(74,160,74,0.3)",
            color: "var(--accent-green)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
        >
          <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
          {PROVIDERS.find((p) => p.id === successProvider)?.label ?? successProvider} erfolgreich verbunden.
        </div>
      )}

      {/* Error banner */}
      {errorCode && (
        <div
          className="rounded-lg px-4 py-2.5 text-sm"
          style={{
            backgroundColor: "rgba(224,85,85,0.1)",
            border: "1px solid rgba(224,85,85,0.3)",
            color: "var(--accent-red, #e05555)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
        >
          {errorMessage(errorCode)}
        </div>
      )}

      {/* Provider rows */}
      <div className="flex flex-col gap-2">
        {visibleProviders.map((provider) => {
          const isLinked = linkedProviders.includes(provider.id);
          const isConnecting = connecting === provider.id;

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon
                  icon={provider.icon}
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "var(--text-muted)" }}
                  aria-hidden="true"
                />
                <span
                  className="text-sm font-medium"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    color: "var(--text-primary)",
                  }}
                >
                  {provider.label}
                </span>
              </div>

              {isLinked ? (
                <span
                  className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  style={{
                    backgroundColor: "rgba(74,160,74,0.12)",
                    color: "var(--accent-green)",
                    border: "1px solid rgba(74,160,74,0.25)",
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  }}
                >
                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                  Verbunden
                </span>
              ) : (
                <button
                  onClick={() => handleConnect(provider.id)}
                  disabled={isConnecting}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{
                    fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {isConnecting ? "Verbinde…" : "+ Verbinden"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
