/**
 * Tests for lib/email-templates.ts — renderEmailTemplate (pure function).
 *
 * Verifies HTML structure, title/body presence, XSS escaping, CTA link
 * generation, and settings URL construction.
 */

import { describe, it, expect } from "vitest";
import { renderEmailTemplate } from "@/lib/email-templates";

const APP_URL = "https://momotask.app";

// ─── renderEmailTemplate ──────────────────────────────────────────────────────

describe("renderEmailTemplate", () => {
  it("returns a valid HTML document starting with <!doctype html>", () => {
    const html = renderEmailTemplate({ title: "Hello", body: "World" }, APP_URL);
    expect(html.trimStart()).toMatch(/^<!doctype html>/i);
  });

  it("contains the notification title in the output", () => {
    const html = renderEmailTemplate({ title: "Task Complete", body: "You did it." }, APP_URL);
    expect(html).toContain("Task Complete");
  });

  it("contains the notification body text in the output", () => {
    const html = renderEmailTemplate({ title: "Hey", body: "You have 3 tasks due." }, APP_URL);
    expect(html).toContain("You have 3 tasks due.");
  });

  it("escapes HTML special characters in the title to prevent XSS", () => {
    const html = renderEmailTemplate(
      { title: "<script>alert('xss')</script>", body: "safe" },
      APP_URL
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML special characters in the body to prevent XSS", () => {
    const html = renderEmailTemplate(
      { title: "Safe", body: '<img src=x onerror="evil()">' },
      APP_URL
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes ampersands in title and body", () => {
    const html = renderEmailTemplate(
      { title: "A & B", body: "C & D" },
      APP_URL
    );
    expect(html).toContain("A &amp; B");
    expect(html).toContain("C &amp; D");
  });

  it("includes a CTA button when payload.url is provided (relative path)", () => {
    const html = renderEmailTemplate(
      { title: "Hey", body: "Go check.", url: "/dashboard" },
      APP_URL
    );
    expect(html).toContain("Open Momo");
    expect(html).toContain(`${APP_URL}/dashboard`);
  });

  it("includes a CTA button when payload.url is an absolute URL", () => {
    const html = renderEmailTemplate(
      { title: "Hey", body: "Go check.", url: "https://external.example.com/link" },
      APP_URL
    );
    expect(html).toContain("https://external.example.com/link");
    expect(html).toContain("Open Momo");
  });

  it("does NOT include a CTA button when no url is provided", () => {
    const html = renderEmailTemplate({ title: "Hey", body: "Just info." }, APP_URL);
    expect(html).not.toContain("Open Momo");
  });

  it("includes a settings link in the footer", () => {
    const html = renderEmailTemplate({ title: "Hi", body: "Hello." }, APP_URL);
    expect(html).toContain(`${APP_URL}/settings`);
    expect(html).toContain("Manage notification settings");
  });

  it("strips trailing slashes from appUrl before building links", () => {
    const html = renderEmailTemplate(
      { title: "Hi", body: "Hello.", url: "/dashboard" },
      "https://momotask.app///"
    );
    // Should not produce double slashes in the href
    expect(html).toContain("https://momotask.app/dashboard");
    expect(html).not.toContain("///");
  });

  it("includes the Momo brand header", () => {
    const html = renderEmailTemplate({ title: "Hi", body: "Hello." }, APP_URL);
    // The header renders the wordmark "Momo" inside a span (with surrounding whitespace)
    expect(html).toContain("Momo");
    expect(html).toContain("font-family: 'Lora'");
  });

  it("converts newlines in body to <br /> tags", () => {
    const html = renderEmailTemplate(
      { title: "Multi", body: "Line one\nLine two" },
      APP_URL
    );
    expect(html).toContain("Line one<br />");
    expect(html).toContain("Line two");
  });

  it("uses the title as the HTML <title> element", () => {
    const html = renderEmailTemplate({ title: "My Email Title", body: "body" }, APP_URL);
    expect(html).toContain("<title>My Email Title</title>");
  });
});
