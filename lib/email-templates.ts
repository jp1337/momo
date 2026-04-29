/**
 * HTML email templates for Momo notifications.
 *
 * The template uses inline CSS and a table-based layout for maximum
 * compatibility with legacy email clients (Outlook, Gmail, Apple Mail).
 * No external CSS, no flexbox/grid — every visual rule is repeated inline.
 *
 * Visual style: Momo waldgrün accent (#2d5016) on a soft cream background,
 * Lora serif heading, system sans body. Header shows the Momo wordmark,
 * footer carries an unsubscribe-style hint pointing back to /settings.
 *
 * Locale is provided by the caller. For cron-dispatched notifications it comes
 * from users.locale (persisted when the language switcher is used). Falls back
 * to "de" (the app default).
 */

import type { NotificationPayload } from "@/lib/notifications";

/** Static strings localised per supported locale. */
const EMAIL_STRINGS: Record<string, { openMomo: string; footer: string; manageSettings: string }> = {
  de: {
    openMomo: "Momo öffnen",
    footer: "Du erhältst diese E-Mail, weil E-Mail-Benachrichtigungen in Momo aktiviert sind.",
    manageSettings: "Benachrichtigungseinstellungen verwalten",
  },
  en: {
    openMomo: "Open Momo",
    footer: "You're receiving this because email notifications are enabled in Momo.",
    manageSettings: "Manage notification settings",
  },
  fr: {
    openMomo: "Ouvrir Momo",
    footer: "Vous recevez ceci car les notifications par e-mail sont activées dans Momo.",
    manageSettings: "Gérer les paramètres de notification",
  },
  es: {
    openMomo: "Abrir Momo",
    footer: "Recibes esto porque las notificaciones por correo están activadas en Momo.",
    manageSettings: "Gestionar ajustes de notificación",
  },
  nl: {
    openMomo: "Momo openen",
    footer: "Je ontvangt dit omdat e-mailmeldingen zijn ingeschakeld in Momo.",
    manageSettings: "Meldingsinstellingen beheren",
  },
};

/** HTML-escape a value for safe interpolation into the template literal. */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders the full HTML body for a notification email.
 *
 * @param payload - The notification payload (title, body, optional URL).
 * @param appUrl  - Public app URL used to build absolute links to /settings
 *                  and the optional click-through URL when payload.url is
 *                  a relative path.
 * @param locale  - BCP 47 language tag (e.g. "de", "en"). Falls back to "de".
 * @returns Complete `<!doctype html>` document as a string.
 */
export function renderEmailTemplate(
  payload: NotificationPayload,
  appUrl: string,
  locale = "de"
): string {
  const strings = EMAIL_STRINGS[locale] ?? EMAIL_STRINGS.de;
  const title = escapeHtml(payload.title);
  const body = escapeHtml(payload.body).replace(/\n/g, "<br />");

  // Build the absolute click-through URL (handles both relative and absolute payload.url)
  const cleanAppUrl = appUrl.replace(/\/+$/, "");
  let absoluteUrl: string | null = null;
  if (payload.url) {
    absoluteUrl = payload.url.startsWith("http")
      ? payload.url
      : `${cleanAppUrl}${payload.url.startsWith("/") ? "" : "/"}${payload.url}`;
  }
  const settingsUrl = `${cleanAppUrl}/settings`;

  // Brand colours — keep in sync with globals.css if they ever change.
  // Hard-coded here because email clients ignore CSS variables.
  const accent = "#2d5016"; // Momo Waldgrün
  const accentDark = "#1f3a0e";
  const cream = "#f7f3ec";
  const cardBg = "#ffffff";
  const textPrimary = "#1a1a1a";
  const textMuted = "#6b6b6b";
  const border = "#e5e0d6";

  const ctaBlock = absoluteUrl
    ? `
        <tr>
          <td align="center" style="padding: 8px 0 4px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${accent}" style="border-radius: 6px;">
                  <a href="${escapeHtml(absoluteUrl)}"
                     style="display: inline-block; padding: 12px 28px;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            font-size: 15px; font-weight: 600;
                            color: #ffffff; text-decoration: none;
                            border-radius: 6px;
                            border: 1px solid ${accentDark};">
                    ${strings.openMomo}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    : "";

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>${title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${cream};
               font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
               color: ${textPrimary}; -webkit-text-size-adjust: 100%;">
    <!-- Preheader (hidden in body, visible in inbox preview) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
      ${escapeHtml(payload.body).slice(0, 110)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           bgcolor="${cream}" style="background-color: ${cream};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <!-- Outer card -->
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                 style="max-width: 560px; width: 100%;">
            <!-- Header -->
            <tr>
              <td bgcolor="${accent}"
                  style="padding: 24px 32px; border-radius: 12px 12px 0 0; text-align: center;">
                <span style="font-family: 'Lora', Georgia, 'Times New Roman', serif;
                             font-size: 28px; font-weight: 600; color: #ffffff;
                             letter-spacing: 0.5px;">
                  Momo
                </span>
              </td>
            </tr>

            <!-- Body card -->
            <tr>
              <td bgcolor="${cardBg}"
                  style="background-color: ${cardBg};
                         padding: 36px 36px 28px 36px;
                         border-left: 1px solid ${border};
                         border-right: 1px solid ${border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="font-family: 'Lora', Georgia, 'Times New Roman', serif;
                               font-size: 22px; font-weight: 600; line-height: 1.3;
                               color: ${textPrimary}; padding-bottom: 16px;">
                      ${title}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                               font-size: 15px; line-height: 1.6; color: ${textPrimary};
                               padding-bottom: 24px;">
                      ${body}
                    </td>
                  </tr>
                  ${ctaBlock}
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td bgcolor="${cardBg}"
                  style="background-color: ${cardBg};
                         padding: 16px 36px 28px 36px;
                         border-left: 1px solid ${border};
                         border-right: 1px solid ${border};
                         border-bottom: 1px solid ${border};
                         border-radius: 0 0 12px 12px;
                         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                         font-size: 12px; line-height: 1.5; color: ${textMuted};
                         text-align: center;">
                ${strings.footer}<br />
                <a href="${escapeHtml(settingsUrl)}"
                   style="color: ${accent}; text-decoration: underline;">
                  ${strings.manageSettings}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
