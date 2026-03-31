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
 *  - Generic OIDC (if configured)
 */

import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
};

/** Provider button configuration */
interface ProviderConfig {
  id: string;
  name: string;
  icon: string;
  envKey: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    envKey: "GITHUB_CLIENT_ID",
  },
  {
    id: "discord",
    name: "Discord",
    icon: "💬",
    envKey: "DISCORD_CLIENT_ID",
  },
  {
    id: "google",
    name: "Google",
    icon: "🔍",
    envKey: "GOOGLE_CLIENT_ID",
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
      <div className="text-center">
        <h1
          className="text-5xl font-semibold mb-3"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          🪶 Momo
        </h1>
        <p
          className="text-lg italic"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-muted)",
          }}
        >
          &ldquo;Steal your time back.&rdquo;
        </p>
        <p
          className="mt-4 text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Sign in to start your daily quest.
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
          Sign in with
        </p>

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
                <span className="text-xl" aria-hidden="true">
                  {provider.icon}
                </span>
                Continue with {provider.name}
              </button>
            </form>
          ))
        ) : (
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--text-muted)" }}
          >
            No OAuth providers configured. Please set up at least one provider
            in your environment variables.
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
              <span className="text-xl" aria-hidden="true">
                🔐
              </span>
              Continue with SSO
            </button>
          </form>
        )}
      </div>

      {/* Footer note */}
      <p
        className="text-center text-xs"
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          color: "var(--text-muted)",
        }}
      >
        By signing in, you agree that your data is stored on this server.
        <br />
        Momo is{" "}
        <a
          href="https://github.com/jp1337/momo"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent-amber)" }}
        >
          open source
        </a>
        .
      </p>
    </div>
  );
}
