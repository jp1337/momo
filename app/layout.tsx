/**
 * Root layout for the Momo application.
 *
 * Responsibilities:
 *  - Applies global CSS (design system variables, fonts, resets)
 *  - Wraps the entire app in ThemeProvider (next-themes) for dark/light mode
 *  - Sets default HTML lang attribute
 *  - Provides base metadata for SEO
 */

import type { Metadata, Viewport } from "next";
import { Lora, JetBrains_Mono, DM_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

/**
 * Self-hosted fonts via next/font/google.
 * Downloaded at build time, served from the app's own domain — no requests to
 * fonts.googleapis.com or fonts.gstatic.com at runtime (DSGVO/performance).
 */
const lora = Lora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-ui",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Momo",
    template: "%s | Momo",
  },
  description:
    "Steal your time back. A task management app for people with avoidance tendencies and procrastination.",
  keywords: ["task management", "productivity", "procrastination", "daily quest"],
  authors: [{ name: "jp1337" }],
  openGraph: {
    title: "Momo",
    description: "Steal your time back. One small task, today.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1410" },
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
  ],
  width: "device-width",
  initialScale: 1,
};

/**
 * RootLayout wraps every page in the application.
 *
 * @param children - The active page/layout subtree
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${lora.variable} ${jetbrainsMono.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* PWA theme colour for the browser chrome */}
        <meta name="theme-color" content="#f0a500" />
        {/* iOS PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
