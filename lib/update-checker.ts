/**
 * Update-Checker for Momo.
 *
 * Compares the running version (from package.json) against the latest
 * GitHub release. Results are cached in-memory for 24 hours so that the
 * GitHub API is hit at most once per process lifetime per day — well within
 * the 60 req/h unauthenticated rate limit.
 *
 * Disable entirely by setting DISABLE_UPDATE_CHECK=true in the environment
 * (useful for air-gap / offline installations).
 */

import pkg from "../package.json";
import { serverEnv } from "./env";

/** The version of the currently running Momo instance. */
export const CURRENT_VERSION: string = pkg.version;

/** GitHub repo slug used for the releases API call. */
const GITHUB_REPO = "jp1337/momo";

/** How long (ms) a cached result is considered fresh. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface UpdateCheckResult {
  /** The version string of the currently running instance (from package.json). */
  currentVersion: string;
  /** The latest published GitHub release version, or null if the check failed / is disabled. */
  latestVersion: string | null;
  /** True when latestVersion is a strictly higher semver than currentVersion. */
  updateAvailable: boolean;
  /** Direct URL to the latest GitHub release page. */
  releaseUrl: string | null;
  /** When the last successful check was performed, or null if never. */
  checkedAt: Date | null;
  /** Human-readable error message when the check failed. */
  error?: string;
  /** True when the update check is disabled via DISABLE_UPDATE_CHECK env var. */
  disabled: boolean;
}

/** Module-level in-memory cache — resets on process restart (intended). */
const cache: { result: UpdateCheckResult | null; cachedAt: Date | null } = {
  result: null,
  cachedAt: null,
};

/**
 * Compares two semver strings (major.minor.patch).
 * Returns true when `latest` is strictly greater than `current`.
 *
 * @param current - Currently running version, e.g. "0.1.0"
 * @param latest  - Latest available version, e.g. "0.2.0"
 */
export function isUpdateAvailable(current: string, latest: string): boolean {
  const parse = (v: string): [number, number, number] => {
    // Strip any leading "v" prefix (e.g. "v1.2.3" → "1.2.3")
    const clean = v.replace(/^v/, "");
    const parts = clean.split(".").map((n) => parseInt(n, 10));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);

  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

/**
 * Fetches the latest Momo release from the GitHub Releases API and compares
 * it to the running version. The result is cached for 24 hours.
 *
 * When DISABLE_UPDATE_CHECK=true the function returns immediately without
 * making any network request.
 *
 * @returns A resolved UpdateCheckResult — never throws.
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  if (serverEnv.DISABLE_UPDATE_CHECK) {
    return {
      currentVersion: CURRENT_VERSION,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      checkedAt: null,
      disabled: true,
    };
  }

  // Return cached result if still fresh
  if (
    cache.result !== null &&
    cache.cachedAt !== null &&
    Date.now() - cache.cachedAt.getTime() < CACHE_TTL_MS
  ) {
    return cache.result;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: {
          "User-Agent": `momo-update-checker/${CURRENT_VERSION}`,
          Accept: "application/vnd.github+json",
        },
        // Next.js fetch cache: revalidate every 24h
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      tag_name?: string;
      html_url?: string;
    };

    const rawTag = data.tag_name ?? "";
    const latestVersion = rawTag.replace(/^v/, "");
    const releaseUrl = data.html_url ?? null;

    if (!latestVersion) {
      throw new Error("GitHub response missing tag_name");
    }

    const result: UpdateCheckResult = {
      currentVersion: CURRENT_VERSION,
      latestVersion,
      updateAvailable: isUpdateAvailable(CURRENT_VERSION, latestVersion),
      releaseUrl,
      checkedAt: new Date(),
      disabled: false,
    };

    cache.result = result;
    cache.cachedAt = new Date();

    return result;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    const result: UpdateCheckResult = {
      currentVersion: CURRENT_VERSION,
      latestVersion: null,
      updateAvailable: false,
      releaseUrl: null,
      checkedAt: null,
      error: errorMessage,
      disabled: false,
    };

    // Cache the error briefly (5 min) to avoid hammering GitHub on every request
    cache.result = result;
    cache.cachedAt = new Date(Date.now() - CACHE_TTL_MS + 5 * 60 * 1000);

    return result;
  }
}
