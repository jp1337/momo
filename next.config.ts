/**
 * Next.js configuration for Momo.
 *
 * Key settings:
 *  - output: 'standalone' — generates a self-contained server bundle for Docker
 *  - images.remotePatterns — allows loading avatars from OAuth providers
 */

import type { NextConfig } from "next";

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

export default nextConfig;
