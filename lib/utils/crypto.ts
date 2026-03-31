import { timingSafeEqual as nodeTimingSafeEqual } from "crypto";

/**
 * Compares two strings in constant time to prevent timing attacks.
 * Use this instead of `===` when comparing secrets (e.g. CRON_SECRET).
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return nodeTimingSafeEqual(bufA, bufB);
}
