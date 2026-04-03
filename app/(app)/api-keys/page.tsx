/**
 * API Keys page — lets users create and revoke Personal Access Tokens.
 *
 * Provides programmatic access to the Momo API for AI assistants, automation,
 * and third-party integrations. Keys can be read-only and have expiry dates.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listApiKeys } from "@/lib/api-keys";
import { ApiKeysView } from "@/components/api-keys/api-keys-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Keys",
};

/**
 * Server component that loads the user's API keys and passes them to the
 * interactive client component for key creation, copying, and revocation.
 */
export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const keys = await listApiKeys(session.user.id);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1
          className="text-3xl font-semibold"
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            color: "var(--text-primary)",
          }}
        >
          API Keys
        </h1>
        <p
          className="mt-1 text-sm"
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            color: "var(--text-muted)",
          }}
        >
          Personal Access Tokens für programmatischen Zugriff auf die Momo API.
          Nützlich für KI-Assistenten, Automationen und eigene Integrationen.
        </p>
      </div>

      <ApiKeysView initialKeys={keys} />
    </div>
  );
}
