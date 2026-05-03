import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeleteAccount } from "@/components/settings/delete-account";
import { SettingsSection } from "@/components/settings/settings-section";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data & Privacy Settings",
};

export default async function DataSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title={t("section_data")} hint={t("data_hint")}>
        <a
          href="/api/user/export"
          download
          className="self-start px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            backgroundColor: "var(--bg-elevated)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-ui)",
            textDecoration: "none",
          }}
        >
          {t("export_download_btn")}
        </a>
      </SettingsSection>

      <DeleteAccount />
    </div>
  );
}
