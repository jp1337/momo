import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DeleteAccount } from "@/components/settings/delete-account";
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
      {/* Data Export */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_data")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("data_hint")}
          </p>
        </div>
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
      </section>

      {/* Danger Zone */}
      <DeleteAccount />
    </div>
  );
}
