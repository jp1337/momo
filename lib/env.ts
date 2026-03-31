/**
 * Typed and Zod-validated environment variable wrapper.
 * All environment variables in the application must be accessed through this module.
 * Validated at module load time — the app will fail fast if required vars are missing.
 */

import { z } from "zod";

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
  GITHUB_CLIENT_ID: z
    .string()
    .optional()
    .describe("GitHub OAuth App Client ID"),
  GITHUB_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("GitHub OAuth App Client Secret"),

  // Discord OAuth
  DISCORD_CLIENT_ID: z
    .string()
    .optional()
    .describe("Discord OAuth App Client ID"),
  DISCORD_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Discord OAuth App Client Secret"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z
    .string()
    .optional()
    .describe("Google OAuth Client ID"),
  GOOGLE_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Google OAuth Client Secret"),

  // OIDC (optional — only enabled when OIDC_ISSUER is set)
  OIDC_CLIENT_ID: z.string().optional().describe("Generic OIDC Client ID"),
  OIDC_CLIENT_SECRET: z
    .string()
    .optional()
    .describe("Generic OIDC Client Secret"),
  OIDC_ISSUER: z
    .string()
    .url()
    .optional()
    .describe("OIDC Issuer URL (e.g. https://auth.example.com/application/o/momo/)"),

  // Web Push / VAPID
  VAPID_PRIVATE_KEY: z
    .string()
    .optional()
    .describe("VAPID private key for web push"),
  VAPID_CONTACT: z
    .string()
    .optional()
    .default("mailto:admin@example.com")
    .describe("VAPID contact email/URL"),

  // Runtime
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z
    .string()
    .optional()
    .describe("VAPID public key (exposed to client for push subscriptions)"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
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
