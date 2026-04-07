/**
 * Typed and Zod-validated environment variable wrapper.
 * All environment variables in the application must be accessed through this module.
 * Validated at module load time — the app will fail fast if required vars are missing.
 */

import { z } from "zod";

/** Converts empty strings to undefined so optional validators don't fail on blank .env entries */
const emptyToUndefined = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().optional()
);

/** Like emptyToUndefined but also validates as a URL when present */
const optionalUrl = z.preprocess(
  (val) => (val === "" ? undefined : val),
  z.string().url().optional()
);

const serverEnvSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .url()
    .describe("PostgreSQL connection string for Drizzle ORM"),

  // Auth.js
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters")
    .describe("Secret used to sign Auth.js JWTs and cookies"),

  // GitHub OAuth
  GITHUB_CLIENT_ID: emptyToUndefined.describe("GitHub OAuth App Client ID"),
  GITHUB_CLIENT_SECRET: emptyToUndefined.describe("GitHub OAuth App Client Secret"),

  // Discord OAuth
  DISCORD_CLIENT_ID: emptyToUndefined.describe("Discord OAuth App Client ID"),
  DISCORD_CLIENT_SECRET: emptyToUndefined.describe("Discord OAuth App Client Secret"),

  // Google OAuth
  GOOGLE_CLIENT_ID: emptyToUndefined.describe("Google OAuth Client ID"),
  GOOGLE_CLIENT_SECRET: emptyToUndefined.describe("Google OAuth Client Secret"),

  // Microsoft (private accounts only — tenant pinned to "consumers" in lib/auth.ts;
  // work / school / Microsoft 365 accounts are intentionally NOT supported)
  MICROSOFT_CLIENT_ID: emptyToUndefined.describe(
    "Microsoft (Entra ID) Application (Client) ID — personal accounts only"
  ),
  MICROSOFT_CLIENT_SECRET: emptyToUndefined.describe(
    "Microsoft (Entra ID) Client Secret value (NOT the Secret ID)"
  ),

  // OIDC (optional — only enabled when OIDC_ISSUER is set)
  OIDC_CLIENT_ID: emptyToUndefined.describe("Generic OIDC Client ID"),
  OIDC_CLIENT_SECRET: emptyToUndefined.describe("Generic OIDC Client Secret"),
  OIDC_ISSUER: optionalUrl.describe("OIDC Issuer URL (e.g. https://auth.example.com/application/o/momo/)"),

  // Web Push / VAPID
  VAPID_PRIVATE_KEY: emptyToUndefined.describe("VAPID private key for web push"),
  VAPID_CONTACT: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().optional())
    .default("mailto:admin@example.com")
    .describe("VAPID contact email/URL"),

  // Cron job protection
  CRON_SECRET: emptyToUndefined.describe(
    "Bearer token required by cron API routes to prevent unauthorised triggering"
  ),

  // Email Notifications (SMTP, optional — email channel is hidden when SMTP_HOST is unset)
  SMTP_HOST: emptyToUndefined.describe("SMTP server hostname (e.g. smtp.gmail.com)"),
  SMTP_PORT: z
    .preprocess(
      (val) => (val === "" || val === undefined ? undefined : Number(val)),
      z.number().int().positive().max(65535).optional()
    )
    .describe("SMTP server port (587 for STARTTLS, 465 for implicit TLS)"),
  SMTP_USER: emptyToUndefined.describe("SMTP authentication username"),
  SMTP_PASS: emptyToUndefined.describe("SMTP authentication password / app password"),
  SMTP_FROM: emptyToUndefined.describe(
    'Sender address for outgoing emails, e.g. "Momo <noreply@momotask.app>"'
  ),
  SMTP_SECURE: z
    .preprocess(
      (val) => (val === "true" ? true : val === "false" ? false : undefined),
      z.boolean().optional().default(false)
    )
    .describe("Use implicit TLS (true for port 465, false for 587/STARTTLS)"),

  // Two-factor authentication (TOTP)
  TOTP_ENCRYPTION_KEY: z
    .preprocess(
      (val) => (val === "" ? undefined : val),
      z
        .string()
        .regex(
          /^[0-9a-fA-F]{64}$/,
          "TOTP_ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: openssl rand -hex 32"
        )
        .optional()
    )
    .describe(
      "AES-256-GCM key (64 hex chars / 32 bytes) for encrypting TOTP secrets at rest. Required only when users enable 2FA. Generate with: openssl rand -hex 32"
    ),
  REQUIRE_2FA: z
    .preprocess(
      (val) => (val === "true" ? true : val === "false" ? false : undefined),
      z.boolean().optional().default(false)
    )
    .describe(
      "When true, every user must register a second factor (TOTP or Passkey) before they can access any protected route. Existing users without a second factor are hard-locked to /setup/2fa on next login."
    ),

  // WebAuthn / Passkeys (optional — auto-derived from NEXT_PUBLIC_APP_URL when unset)
  WEBAUTHN_RP_ID: emptyToUndefined.describe(
    "WebAuthn Relying Party ID — must match the eTLD+1 of the site (e.g. 'momotask.app' or 'localhost'). Defaults to the hostname of NEXT_PUBLIC_APP_URL."
  ),
  WEBAUTHN_RP_NAME: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().optional())
    .default("Momo")
    .describe(
      "Display name shown in the OS / browser passkey prompt. Defaults to 'Momo'."
    ),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
})
  .refine(
    (data) => !data.REQUIRE_2FA || !!data.TOTP_ENCRYPTION_KEY,
    {
      message:
        "REQUIRE_2FA=true requires TOTP_ENCRYPTION_KEY to be set. Generate one with: openssl rand -hex 32",
      path: ["TOTP_ENCRYPTION_KEY"],
    }
  );

const clientEnvSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: emptyToUndefined.describe(
    "VAPID public key (exposed to client for push subscriptions)"
  ),
  NEXT_PUBLIC_APP_URL: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().url().optional())
    .default("http://localhost:3000")
    .describe("Public URL of the application"),
});

/**
 * Validates server-side environment variables.
 * Throws at startup if required variables are missing or invalid.
 */
function validateServerEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid server environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment configuration");
  }
  return parsed.data;
}

/**
 * Validates client-side (NEXT_PUBLIC_*) environment variables.
 * Safe to call in both server and client contexts.
 */
function validateClientEnv() {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
  if (!parsed.success) {
    console.error("❌ Invalid client environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment configuration");
  }
  return parsed.data;
}

// Server env is only validated on the server side, and skipped during `next build`
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
export const serverEnv =
  !isBuildPhase && typeof window === "undefined"
    ? validateServerEnv()
    : ({} as ReturnType<typeof validateServerEnv>);

// Client env is always available
export const clientEnv = validateClientEnv();
