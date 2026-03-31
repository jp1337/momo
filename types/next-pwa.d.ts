/**
 * Type declaration for next-pwa (v5.x).
 * next-pwa does not ship its own TypeScript types, so we declare the module
 * manually to satisfy strict TypeScript compilation.
 */

declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface PWAConfig {
    /** Output directory for the generated service worker (relative to project root) */
    dest: string;
    /** Disable the plugin — set to true in development */
    disable?: boolean;
    /** Automatically register the service worker */
    register?: boolean;
    /** Activate the new service worker immediately, skipping the waiting phase */
    skipWaiting?: boolean;
    /** Directory containing the custom worker entry (merged into the generated SW) */
    customWorkerDir?: string;
    /** Additional Workbox runtime caching rules */
    runtimeCaching?: unknown[];
    /** Additional precache manifest entries */
    additionalManifestEntries?: unknown[];
    /** Source file for a custom service worker (advanced) */
    swSrc?: string;
    /** Destination filename for the generated service worker */
    swDest?: string;
  }

  /**
   * Wraps the Next.js config with next-pwa.
   * Returns a function that accepts a NextConfig and returns a NextConfig.
   */
  function withPWA(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;

  export default withPWA;
}
