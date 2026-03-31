/**
 * Next.js configuration for Momo.
 *
 * Key settings:
 *  - output: 'standalone' — generates a self-contained server bundle for Docker
 *  - images.remotePatterns — allows loading avatars from OAuth providers
 *  - next-pwa — Progressive Web App support with offline caching and push notifications
 *    PWA is disabled in development (service worker doesn't run locally).
 */

import type { NextConfig } from "next";
import withPWA from "next-pwa";

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
};

/**
 * Wraps the Next.js config with next-pwa.
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

export default pwaConfig(nextConfig);
