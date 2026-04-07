"use client";

/**
 * BackupCodesDisplay — read-only grid of backup codes with copy + download.
 *
 * Used twice during the 2FA flow:
 *  - At the end of the setup wizard (one-time reveal).
 *  - When the user regenerates their backup codes from the settings page.
 *
 * Codes are *never* fetched from the server after this point — the parent
 * is responsible for discarding them once the user dismisses the panel.
 */

import { useState } from "react";
import { useTranslations } from "next-intl";

interface BackupCodesDisplayProps {
  codes: string[];
}

export function BackupCodesDisplay({ codes }: BackupCodesDisplayProps) {
  const t = useTranslations("settings");
  const [copied, setCopied] = useState(false);

  function downloadAsTxt() {
    const content =
      `${t("twofa_backup_codes_file_header")}\n\n` +
      codes.join("\n") +
      `\n\n${t("twofa_backup_codes_file_footer")}\n`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "momo-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — user can use the download button
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-lg p-4 grid grid-cols-2 gap-2"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        {codes.map((c, i) => (
          <code
            key={i}
            className="text-sm tracking-wider text-center py-1.5"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--text-primary)",
            }}
          >
            {c}
          </code>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={downloadAsTxt}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {t("twofa_backup_codes_download_btn")}
        </button>
        <button
          type="button"
          onClick={copyAll}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {copied ? t("twofa_backup_codes_copied") : t("twofa_backup_codes_copy_btn")}
        </button>
      </div>

      <p
        className="text-xs italic"
        style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}
      >
        {t("twofa_backup_codes_warning")}
      </p>
    </div>
  );
}
