/**
 * Auth.js v5 configuration for Momo.
 *
 * Enabled providers:
 *  - GitHub  (always enabled if GITHUB_CLIENT_ID is set)
 *  - Discord (always enabled if DISCORD_CLIENT_ID is set)
 *  - Google  (always enabled if GOOGLE_CLIENT_ID is set)
 *  - Microsoft (private accounts only — outlook.com / hotmail / live / xbox;
 *    enabled if MICROSOFT_CLIENT_ID is set; tenant pinned to "consumers" so
 *    work / school / Microsoft 365 accounts are intentionally NOT supported)
 *  - Generic OIDC (enabled only if OIDC_ISSUER is set — for Authentik, Keycloak, etc.)
 *
 * Uses the Drizzle adapter to persist users, sessions, and accounts in PostgreSQL.
 * On first login, the user record is created by the adapter.
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Keycloak from "next-auth/providers/keycloak";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { accounts, sessions, users, verificationTokens } from "@/lib/db/schema";
import { serverEnv } from "@/lib/env";

/** Build the list of enabled OAuth providers based on available env vars */
function buildProviders() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providers: any[] = [];

  if (serverEnv.GITHUB_CLIENT_ID && serverEnv.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: serverEnv.GITHUB_CLIENT_ID,
        clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
      })
    );
  }

  if (serverEnv.DISCORD_CLIENT_ID && serverEnv.DISCORD_CLIENT_SECRET) {
    providers.push(
      Discord({
        clientId: serverEnv.DISCORD_CLIENT_ID,
        clientSecret: serverEnv.DISCORD_CLIENT_SECRET,
      })
    );
  }

  if (serverEnv.GOOGLE_CLIENT_ID && serverEnv.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: serverEnv.GOOGLE_CLIENT_ID,
        clientSecret: serverEnv.GOOGLE_CLIENT_SECRET,
      })
    );
  }

  // Microsoft (private accounts only) — pinned to the "consumers" tenant so
  // only personal Microsoft accounts (outlook.com, hotmail, live, xbox, skype)
  // can sign in. Work / school / Microsoft 365 accounts are intentionally
  // rejected at the Auth.js layer regardless of how the Azure app is configured.
  if (serverEnv.MICROSOFT_CLIENT_ID && serverEnv.MICROSOFT_CLIENT_SECRET) {
    providers.push(
      MicrosoftEntraID({
        clientId: serverEnv.MICROSOFT_CLIENT_ID,
        clientSecret: serverEnv.MICROSOFT_CLIENT_SECRET,
        // "consumers" tenant => only personal Microsoft accounts.
        // (Default would be "/common/v2.0/", which also accepts work/school accounts.)
        issuer: "https://login.microsoftonline.com/consumers/v2.0/",
      })
    );
  }

  // Generic OIDC provider — only enabled when issuer is configured
  if (
    serverEnv.OIDC_ISSUER &&
    serverEnv.OIDC_CLIENT_ID &&
    serverEnv.OIDC_CLIENT_SECRET
  ) {
    providers.push(
      Keycloak({
        clientId: serverEnv.OIDC_CLIENT_ID,
        clientSecret: serverEnv.OIDC_CLIENT_SECRET,
        issuer: serverEnv.OIDC_ISSUER,
      })
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),

  providers: buildProviders(),

  session: {
    // Use database sessions for better security and revocability
    strategy: "database",
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    /**
     * Augments the session object with the user's database ID.
     * This makes the user ID available on the client via useSession().
     */
    session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
