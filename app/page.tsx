/**
 * Root page — Landing page for unauthenticated visitors.
 * Authenticated users are redirected to /dashboard immediately.
 *
 * Design: Momo-aesthetic — warm earthy tones, Lora italic headings,
 * atmospheric deep-forest-green backgrounds, amber CTAs.
 * Inspired by Michael Ende's Momo — the idea of stolen time.
 */

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { clientEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "Momo — Steal your time back",
  description:
    "A task manager for people with procrastination tendencies. One quest a day — no pressure, no overwhelm.",
  alternates: {
    canonical: "/",
  },
};

/**
 * Schema.org `SoftwareApplication` JSON-LD payload for the landing page.
 *
 * Embedded inline in the page so that crawlers (Google Rich Results, Bing,
 * DuckDuckGo) can pick up structured metadata about Momo. The schema is
 * intentionally minimal — `name`, `description`, `url`, application
 * category, OS, and a free `Offer` — and avoids fields that would require
 * runtime aggregation (e.g. `aggregateRating`).
 */
function buildSoftwareAppJsonLd(): Record<string, unknown> {
  const url = clientEnv.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Momo",
    description:
      "A task manager for people with procrastination tendencies. One quest a day — no pressure, no overwhelm.",
    url,
    // Absolute URLs are required by schema.org — relative paths work in the
    // Open Graph / Twitter meta tags (via metadataBase) but crawlers that
    // consume JSON-LD expect fully-qualified URIs.
    logo: `${url}/icon.svg`,
    image: `${url}/og-image.png`,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web",
    inLanguage: ["de", "en", "fr"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
    author: {
      "@type": "Person",
      name: "jp1337",
      url: "https://github.com/jp1337",
    },
  };
}

/**
 * Feather SVG — subtle decorative element in the hero section.
 * Softly animated with CSS.
 */
function FeatherIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="feather-float"
      style={{ color: "var(--accent-amber)", opacity: 0.6 }}
    >
      <path
        d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="16"
        y1="8"
        x2="2"
        y2="22"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="17.5"
        y1="15"
        x2="9"
        y2="15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Landing page — shown to unauthenticated visitors.
 */
export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const t = await getTranslations("landing");

  const jsonLd = buildSoftwareAppJsonLd();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f1410",
        color: "var(--text-primary)",
        fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
      }}
    >
      {/* SEO: SoftwareApplication structured data for rich snippets.
          dangerouslySetInnerHTML is safe here — the payload comes from
          JSON.stringify on a static object built in this file, no user input. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Floating feather animation CSS */}
      <style>{`
        @keyframes featherFloat {
          0%, 100% { transform: translateY(0) rotate(-8deg); opacity: 0.6; }
          50% { transform: translateY(-14px) rotate(4deg); opacity: 0.9; }
        }
        .feather-float {
          animation: featherFloat 6s ease-in-out infinite;
        }
        .landing-cta:hover {
          opacity: 0.88;
          transform: translateY(-1px);
        }
        @media (prefers-reduced-motion: reduce) {
          .feather-float { animation: none; }
          .landing-cta:hover { transform: none; }
        }
      `}</style>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1.5rem",
          textAlign: "center",
          position: "relative",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, #1a2e1c 0%, #0f1410 70%)",
        }}
      >
        {/* Feather icon */}
        <div style={{ marginBottom: "2rem" }}>
          <FeatherIcon />
        </div>

        {/* Main heading */}
        <h1
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            fontStyle: "italic",
            fontSize: "clamp(2.5rem, 8vw, 5rem)",
            fontWeight: 600,
            lineHeight: 1.1,
            color: "#f7f2e8",
            marginBottom: "1.25rem",
            maxWidth: "700px",
          }}
        >
          {t("hero_heading")}
        </h1>

        {/* Subline in monospace */}
        <p
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            fontSize: "clamp(0.85rem, 2.5vw, 1.1rem)",
            color: "#f0a500",
            marginBottom: "3rem",
            letterSpacing: "0.02em",
            opacity: 0.9,
          }}
        >
          {t("hero_sub")}
        </p>

        {/* CTA button */}
        <Link
          href="/login"
          className="landing-cta"
          style={{
            display: "inline-block",
            padding: "0.9rem 2.5rem",
            borderRadius: "12px",
            backgroundColor: "#f0a500",
            color: "#0f1410",
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            fontWeight: 600,
            fontSize: "1rem",
            textDecoration: "none",
            transition: "opacity 0.2s, transform 0.2s",
          }}
        >
          {t("hero_cta")}
        </Link>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.5rem",
            opacity: 0.35,
          }}
        >
          <div
            style={{
              width: "1px",
              height: "40px",
              background: "linear-gradient(to bottom, transparent, #f7f2e8)",
            }}
          />
        </div>
      </section>

      {/* ── Story Section ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "5rem 1.5rem",
          maxWidth: "720px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Book quote */}
        <blockquote
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            fontStyle: "italic",
            fontSize: "clamp(1.05rem, 2.5vw, 1.35rem)",
            color: "#c8b89a",
            lineHeight: 1.75,
            marginBottom: "0.75rem",
            borderLeft: "none",
            padding: 0,
          }}
        >
          {t("story_quote")}
        </blockquote>
        <cite
          style={{
            fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
            fontSize: "0.85rem",
            color: "#6b7c6d",
            display: "block",
            marginBottom: "2.5rem",
            fontStyle: "normal",
          }}
        >
          {t("story_caption")}
        </cite>

        {/* Story card */}
        <div
          style={{
            padding: "2rem",
            borderRadius: "16px",
            backgroundColor: "#141e15",
            border: "1px solid #2a3d2c",
            backgroundImage:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(240,165,0,0.04) 0%, transparent 70%)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              fontSize: "clamp(0.95rem, 2vw, 1.05rem)",
              color: "#a8b8a9",
              lineHeight: 1.8,
              margin: 0,
            }}
          >
            {t("story_text")}
          </p>
        </div>
      </section>

      {/* ── Features Section ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: "4rem 1.5rem 5rem",
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display, 'Lora', serif)",
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            color: "#f7f2e8",
            textAlign: "center",
            marginBottom: "2.5rem",
            fontWeight: 600,
          }}
        >
          {t("features_heading")}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Daily Quest */}
          <FeatureCard
            icon="✦"
            title={t("feature_quest_title")}
            description={t("feature_quest_desc")}
          />
          {/* Gamification */}
          <FeatureCard
            icon="◈"
            title={t("feature_gamification_title")}
            description={t("feature_gamification_desc")}
          />
          {/* Reminders */}
          <FeatureCard
            icon="◉"
            title={t("feature_reminders_title")}
            description={t("feature_reminders_desc")}
          />
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid #1e2e20",
          padding: "2rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <a
            href="https://github.com/jp1337/momo"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              fontSize: "0.85rem",
              color: "#6b7c6d",
              textDecoration: "none",
            }}
          >
            {t("footer_github")}
          </a>
          <a
            href="/imprint"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              fontSize: "0.85rem",
              color: "#6b7c6d",
              textDecoration: "none",
            }}
          >
            {t("footer_imprint")}
          </a>
          <a
            href="/privacy"
            style={{
              fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
              fontSize: "0.85rem",
              color: "#6b7c6d",
              textDecoration: "none",
            }}
          >
            {t("footer_privacy")}
          </a>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body, 'JetBrains Mono', monospace)",
            fontSize: "0.75rem",
            color: "#3d4f3e",
            margin: 0,
          }}
        >
          {t("footer_tagline")}
        </p>
      </footer>
    </div>
  );
}

/**
 * Individual feature card for the features section.
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        padding: "1.75rem",
        borderRadius: "16px",
        backgroundColor: "#141e15",
        border: "1px solid #2a3d2c",
      }}
    >
      <span
        style={{
          fontSize: "1.5rem",
          color: "#f0a500",
          display: "block",
          marginBottom: "0.75rem",
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <h3
        style={{
          fontFamily: "var(--font-display, 'Lora', serif)",
          fontSize: "1.05rem",
          color: "#f7f2e8",
          marginBottom: "0.5rem",
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontFamily: "var(--font-ui, 'DM Sans', sans-serif)",
          fontSize: "0.9rem",
          color: "#7a907f",
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
