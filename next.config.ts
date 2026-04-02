/**
 * Next.js configuration for Momo.
 *
 * Key settings:
 *  - output: 'standalone' — generates a self-contained server bundle for Docker
 *  - images.remotePatterns — allows loading avatars from OAuth providers
 *  - headers — security headers applied to all responses (CSP, HSTS, X-Frame-Options, etc.)
 *  - @ducanh2912/next-pwa — Progressive Web App support with offline caching and push notifications
 *    PWA is disabled in development (service worker doesn't run locally).
 */

import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/**
 * HTTP security headers applied to every route.
 *
 * - X-DNS-Prefetch-Control: enables DNS prefetching for performance
 * - X-Frame-Options: prevents clickjacking by disallowing embedding in iframes (except same origin)
 * - X-Content-Type-Options: prevents MIME-type sniffing
 * - Referrer-Policy: only sends origin on cross-origin requests
 * - Permissions-Policy: disables camera, microphone, and geolocation access
 * - Strict-Transport-Security: enforces HTTPS for 2 years with preload (HSTS)
 * - Content-Security-Policy: restricts resource loading to trusted origins
 *
 * NOTE: `script-src` includes 'unsafe-eval' and 'unsafe-inline' only in development.
 * In production these are omitted for a stricter CSP. If Next.js inline scripts break
 * in production, consider using nonces — see Next.js docs on CSP with nonces.
 */
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
      // unsafe-inline is needed for Next.js injected styles even in production
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://avatars.githubusercontent.com https://cdn.discordapp.com https://lh3.googleusercontent.com",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  /**
   * Standalone output for Docker deployment.
   * Generates a minimal server bundle that can run with `node server.js`
   * without needing node_modules in the container.
   */
  output: "standalone",

  /**
   * Allow loading images from OAuth provider CDNs.
   * GitHub, Discord, and Google all host user avatars on their own domains.
   */
  images: {
    remotePatterns: [
      // GitHub avatars
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      // Discord avatars
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      // Google profile photos
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  /**
   * HTTP security headers applied to all routes.
   * Includes CSP, HSTS, X-Frame-Options, and more.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Wraps the Next.js config with @ducanh2912/next-pwa.
 * Generates a service worker at public/sw.js that:
 *  - Caches static assets and pages for offline use
 *  - Merges the custom push/notification handler from worker/index.js
 *
 * Service worker registration is disabled in development to avoid
 * interfering with hot module replacement.
 */
const pwaConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  customWorkerDir: "worker",
});

export default withNextIntl(pwaConfig(nextConfig));
