/**
 * The AI disclosure: what AGENTS.md and the templates ask for is what the
 * workflow labels `ai-generated`.
 *
 * openwhistle issue #120 and PR #121 (2026-10-04) were written by bots and
 * said nothing about it; momo gets the same rule.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = join(__dirname, "..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const WORKFLOW = read(".github/workflows/ai-disclosure.yml");
const TEMPLATES = [
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.md",
  ".github/ISSUE_TEMPLATE/feature_request.md",
];
const ASKING = ["AGENTS.md", "CONTRIBUTING.md", ...TEMPLATES];

/** The pattern the workflow hands to `grep -Pzq`, as a JS RegExp. */
function pattern(): RegExp {
  const found = WORKFLOW.match(/grep -Pzq '([^']+)'/);
  if (!found) throw new Error("the workflow no longer matches with grep -Pzq '<pattern>'");
  return new RegExp(found[1]);
}

/** The two-line disclosure as a file shows it, indentation stripped. */
function marker(text: string): string {
  const lines = text.split("\n").map((line) => line.trim());
  const start = lines.indexOf("> [!WARNING]");
  return lines.slice(start, start + 2).join("\n");
}

describe("AI disclosure", () => {
  it.each(ASKING)("%s asks for what the workflow detects", (path) => {
    expect(marker(read(path))).toMatch(pattern());
  });

  it.each(TEMPLATES)("%s hides the request in a comment", (path) => {
    const text = read(path);
    const comment = text.match(/<!--([\s\S]*?)-->/);
    expect(comment?.[1]).toContain("AI-generated");
    expect(text.replace(comment![0], "")).not.toContain("AI-generated");
  });

  it.each(["Fixes #1.", "> [!WARNING]\n> Breaking change", "This is not AI-generated."])(
    "does not label ordinary text: %j",
    (text) => {
      expect(text).not.toMatch(pattern());
    },
  );

  it("never checks out or interpolates the event text", () => {
    expect(WORKFLOW).not.toContain("actions/checkout");
    // pull_request_target has a write token: event text reaches the shell only through env
    expect(WORKFLOW.split("run: |")[1]).not.toContain("${{");
  });
});
