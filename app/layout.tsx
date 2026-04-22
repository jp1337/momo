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
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";
import { clientEnv } from "@/lib/env";

// Prevent Font Awesome from adding its own <style> tag at runtime —
// we already import the CSS above, so this avoids a duplicated stylesheet.
config.autoAddCss = false;

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
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Momo – Aufgabenverwaltung für Menschen mit Prokrastination",
    template: "%s | Momo",
  },
  description:
    "Momo ist eine kostenlose, selbst-hostbare Aufgaben-App für Menschen mit Prokrastination, ADHS und Vermeidungstendenzen. Eine Quest pro Tag, Gamification, Habit Tracker, Streaks und Erinnerungen – open source.",
  keywords: [
    // German primary
    "Aufgabenverwaltung",
    "Prokrastination App",
    "ADHS Aufgaben",
    "To-Do App kostenlos",
    "Habit Tracker",
    "Streak Tracker",
    "Selbst hosten",
    "Open Source Aufgaben",
    "Gamification Produktivität",
    "Daily Quest",
    "Tägliche Quest",
    "Fokus Modus",
    "Wiederkehrende Aufgaben",
    // English secondary
    "task management",
    "procrastination app",
    "ADHD task manager",
    "self-hosted todo",
    "open source productivity",
    "habit tracker",
    "gamification",
    "daily quest",
    "focus mode",
    "self-hostable",
    "docker task manager",
    "next.js productivity app",
  ],
  authors: [{ name: "jp1337", url: "https://github.com/jp1337" }],
  creator: "jp1337",
  publisher: "jp1337",
  applicationName: "Momo",
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "Momo – Aufgabenverwaltung für Menschen mit Prokrastination",
    description:
      "Kostenlose, selbst-hostbare To-Do-App mit Daily Quest, Gamification, Habit Tracker und Streaks – für Menschen mit ADHS und Prokrastination. Open Source.",
    type: "website",
    siteName: "Momo",
    locale: "de_DE",
    alternateLocale: ["en_US", "fr_FR"],
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Momo – Aufgabenverwaltung für Menschen mit Prokrastination",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Momo – Aufgabenverwaltung für Prokrastinierenden",
    description:
      "Kostenlose To-Do-App mit Daily Quest, Gamification & Habit Tracker. Open Source, selbst-hostbar.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f1410" },
    { media: "(prefers-color-scheme: light)", color: "#f7f2e8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
        {/* PWA installable on Android/Chrome (standard) and iOS (Apple-specific) */}
        <meta name="mobile-web-app-capable" content="yes" />
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
