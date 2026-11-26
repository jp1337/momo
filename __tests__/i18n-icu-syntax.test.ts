/**
 * Every message in every locale must be valid ICU, the syntax next-intl parses.
 *
 * check:i18n proves a key exists in all locales; it never parses the text.
 * Two settings strings carried literal { } and < > (a JSON payload sketch and
 * "sha256=<hex>"), which ICU reads as an argument and a rich-text tag:
 * next-intl threw INVALID_MESSAGE on /settings/integrations in all seven
 * languages. Literal braces and angle brackets need apostrophe quoting: '{'.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { IntlMessageFormat } from "intl-messageformat";

const DIR = join(process.cwd(), "messages");

function* messages(node: unknown, path = ""): Generator<[string, string]> {
  if (typeof node === "string") {
    yield [path, node];
    return;
  }
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    yield* messages(v, path ? `${path}.${k}` : k);
  }
}

describe("ICU syntax of all messages", () => {
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json"))) {
    const locale = file.replace(/\.json$/, "");
    it(`parses every message in ${locale}`, () => {
      const broken: string[] = [];
      for (const [key, text] of messages(JSON.parse(readFileSync(join(DIR, file), "utf8")))) {
        try {
          new IntlMessageFormat(text, locale);
        } catch (err) {
          broken.push(`${key}: ${(err as Error).message}`);
        }
      }
      expect(broken).toEqual([]);
    });
  }
});
