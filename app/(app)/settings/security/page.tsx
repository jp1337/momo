import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { SecuritySection } from "@/components/settings/security-section";
import { PasskeysSection } from "@/components/settings/passkeys-section";
import { ActiveSessions } from "@/components/settings/active-sessions";
import { LoginNotificationSettings } from "@/components/settings/login-notification-settings";
import { getUserTotpStatus, readSessionTokenFromCookieStore } from "@/lib/totp";
import { listUserPasskeys } from "@/lib/webauthn";
import { listUserSessions } from "@/lib/sessions";
import { serverEnv } from "@/lib/env";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security Settings",
};

export default async function SecuritySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getTranslations("settings");

  const cookieStore = await cookies();
  const currentSessionToken = readSessionTokenFromCookieStore(cookieStore) ?? "";

  const [userRows, totpStatus, passkeys, activeSessions] = await Promise.all([
    db
      .select({ loginNotificationNewDevice: users.loginNotificationNewDevice })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    getUserTotpStatus(session.user.id),
    listUserPasskeys(session.user.id),
    listUserSessions(session.user.id, currentSessionToken),
  ]);

  const user = userRows[0];
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Two-Factor Authentication + Passkeys */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex flex-col gap-1">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("section_security")}
          </h2>
          <p className="text-sm" style={{ color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
            {t("security_hint")}
          </p>
        </div>
        <SecuritySection
          initialEnabled={totpStatus.enabled}
          initialEnabledAt={totpStatus.enabledAt ? totpStatus.enabledAt.toISOString() : null}
          initialUnusedBackupCodes={totpStatus.unusedBackupCodes}
          required={serverEnv.REQUIRE_2FA ?? false}
        />
        <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <h3
            className="text-sm font-semibold mb-3"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("passkey_section_title")}
          </h3>
          <PasskeysSection
            initialPasskeys={passkeys.map((p) => ({
              ...p,
              createdAt: p.createdAt,
              lastUsedAt: p.lastUsedAt,
            }))}
            required={serverEnv.REQUIRE_2FA ?? false}
            hasTotp={totpStatus.enabled}
          />
        </div>
      </section>

      {/* Active Sessions + Login Notifications */}
      <section
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <ActiveSessions initialSessions={activeSessions} />
        <div className="border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <h3
            className="text-sm font-semibold mb-3"
            style={{ fontFamily: "var(--font-ui)", color: "var(--text-primary)" }}
          >
            {t("login_notification_section_title")}
          </h3>
          <LoginNotificationSettings initialEnabled={user.loginNotificationNewDevice} />
        </div>
      </section>
    </div>
  );
}
