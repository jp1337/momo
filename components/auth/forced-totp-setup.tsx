"use client";

/**
 * ForcedTotpSetup — wraps the regular TotpSetupWizard for the /setup/2fa
 * hard-lock page. Reuses the wizard verbatim but routes the success step
 * straight to the dashboard, without the intermediate "view backup codes"
 * panel that the settings flow uses.
 *
 * The user MUST see their backup codes once before being released into the
 * app, otherwise they have no recovery path. So we render the codes inline
 * with a "Continue" button that navigates to /dashboard only after the
 * user has explicitly acknowledged them.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TotpSetupWizard } from "@/components/settings/totp-setup-wizard";
import { BackupCodesDisplay } from "@/components/settings/backup-codes-display";

export function ForcedTotpSetup() {
  const router = useRouter();
  const t = useTranslations("auth");
  const tSettings = useTranslations("settings");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  if (codes) {
    return (
      <div className="flex flex-col gap-4">
        <p
          className="text-sm"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {tSettings("twofa_new_codes_intro")}
        </p>
        <BackupCodesDisplay codes={codes} />
        <label
          className="flex items-start gap-2 text-sm cursor-pointer"
          style={{
            color: "var(--text-primary)",
            fontFamily: "var(--font-ui)",
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1"
          />
          <span>{t("twofa_forced_codes_ack")}</span>
        </label>
        <button
          type="button"
          disabled={!acknowledged}
          onClick={() => {
            // Hard reload so the layout-level gate re-runs server-side and
            // releases the user into the app.
            router.push("/dashboard");
            router.refresh();
          }}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent)",
            color: "white",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_forced_continue")}
        </button>
      </div>
    );
  }

  return (
    <TotpSetupWizard
      onCancel={() => {
        // No cancel path on the forced page — the only escape is signing
        // out (rendered by the parent server component).
      }}
      onComplete={(payload) => setCodes(payload.backupCodes)}
    />
  );
}
