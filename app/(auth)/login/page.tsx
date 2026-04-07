/**
 * Login page — the entry point for unauthenticated users.
 *
 * Displays sign-in buttons for all enabled OAuth providers.
 * If a user is already authenticated, they are redirected to the dashboard.
 *
 * Providers shown:
 *  - GitHub (if configured)
 *  - Discord (if configured)
 *  - Google (if configured)
 *  - Microsoft — private accounts only (if configured)
 *  - Generic OIDC (if configured)
 */

import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasskeyLoginButton } from "@/components/auth/passkey-login-button";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey } from "@fortawesome/free-solid-svg-icons";
import {
  faGithub,
  faDiscord,
  faGoogle,
  faMicrosoft,
} from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

/** Provider button configuration */
interface ProviderConfig {
  id: string;
  name: string;
  icon: IconDefinition;
  envKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "github",
    name: "GitHub",
    icon: faGithub,
    envKey: "GITHUB_CLIENT_ID",
  },
  {
    id: "discord",
    name: "Discord",
    icon: faDiscord,
    envKey: "DISCORD_CLIENT_ID",
  },
  {
    id: "google",
    name: "Google",
    icon: faGoogle,
    envKey: "GOOGLE_CLIENT_ID",
  },
  {
    id: "microsoft-entra-id",
    name: "Microsoft",
    icon: faMicrosoft,
    envKey: "MICROSOFT_CLIENT_ID",
  },
];

/**
 * Login page server component.
 * Checks for an existing session and redirects authenticated users to /dashboard.
 * Renders sign-in buttons for all configured OAuth providers.
 */
export default async function LoginPage() {
  // If already authenticated, redirect to dashboard
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("auth");

  // Determine which providers are configured
  const enabledProviders = PROVIDERS.filter(
    (p) => !!process.env[p.envKey]
  );

  // Add OIDC if configured
  const hasOidc =
    !!process.env.OIDC_ISSUER &&
    !!process.env.OIDC_CLIENT_ID &&
    !!process.env.OIDC_CLIENT_SECRET;

  return (
    <div className="w-full max-w-md flex flex-col gap-8">
      {/* Theme toggle in top-right */}
      <div className="flex justify-end">
        <ThemeToggle />
      </div>

      {/* Header */}
      <div className="text-center flex flex-col items-center">
        <Image
          src="/logo.svg"
          alt="Momo"
          width={200}
          height={50}
          priority
          className="mb-1"
        />
        <p
          className="text-lg italic"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("tagline")}
        </p>
        <p
          className="mt-4 text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("subtitle")}
        </p>
      </div>

      {/* Sign-in card */}
      <div
        className="rounded-2xl p-8 flex flex-col gap-4"
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <p
          className="text-sm font-medium text-center mb-2"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("sign_in_with")}
        </p>

        {/* Passwordless passkey button — prominent above OAuth providers */}
        <PasskeyLoginButton />

        {/* Divider */}
        <div
          className="flex items-center gap-3 text-xs uppercase tracking-wider my-1"
          style={{
            color: "var(--text-muted)",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          }}
        >
          <span className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
          <span>{t("passkey_or")}</span>
          <span className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
        </div>

        {/* Provider buttons */}
        {enabledProviders.length > 0 ? (
          enabledProviders.map((provider) => (
            <form
              key={provider.id}
              action={async () => {
                "use server";
                await signIn(provider.id, { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <FontAwesomeIcon
                  icon={provider.icon}
                  className="w-5 h-5"
                  aria-hidden="true"
                />
                {t("continue_with", { name: provider.name })}
              </button>
            </form>
          ))
        ) : (
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--text-muted)" }}
          >
            {t("no_providers")}
          </p>
        )}

        {/* OIDC provider */}
        {hasOidc && (
          <form
            action={async () => {
              "use server";
              await signIn("keycloak", { redirectTo: "/dashboard" });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <FontAwesomeIcon
                icon={faKey}
                className="w-5 h-5"
                aria-hidden="true"
              />
              {t("sso")}
            </button>
          </form>
        )}
      </div>

      {/* Footer note */}
      <div className="flex flex-col items-center gap-2">
        <p
          className="text-center text-xs"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          {t("disclaimer")}
          <br />
          Momo is{" "}
          <a
            href="https://github.com/jp1337/momo"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent-amber)" }}
          >
            {t("open_source")}
          </a>
          .
        </p>

        {/* Legal links */}
        <p
          className="text-center text-xs"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          <a
            href="/impressum"
            style={{ color: "var(--text-muted)" }}
          >
            Impressum
          </a>
          {" · "}
          <a
            href="/datenschutz"
            style={{ color: "var(--text-muted)" }}
          >
            Datenschutz
          </a>
        </p>
      </div>
    </div>
  );
}
