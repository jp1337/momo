/**
 * Tests for lib/topic-icons.ts
 *
 * Covers:
 *  - TOPIC_ICONS: map completeness, key stability, value types
 *  - DEFAULT_TOPIC_ICON_KEY: is a valid key in the map
 *  - resolveTopicIcon(): valid keys, invalid keys (fallback), null/undefined input
 *
 * Pure module — no DB required.
 */

import { describe, it, expect } from "vitest";
import {
  TOPIC_ICONS,
  DEFAULT_TOPIC_ICON_KEY,
  resolveTopicIcon,
} from "@/lib/topic-icons";
import { faFolder } from "@fortawesome/free-solid-svg-icons";

// ─── TOPIC_ICONS map ─────────────────────────────────────────────────────────

describe("TOPIC_ICONS", () => {
  it("has 46 entries", () => {
    expect(Object.keys(TOPIC_ICONS)).toHaveLength(46);
  });

  it("contains all expected work icons", () => {
    const workIcons = ["briefcase", "laptop", "chart-bar", "envelope", "phone", "calendar-days", "building"];
    for (const key of workIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains all expected health icons", () => {
    const healthIcons = ["heart", "dumbbell", "person-running", "pills", "bed"];
    for (const key of healthIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains all expected home icons", () => {
    const homeIcons = ["house", "screwdriver-wrench", "broom", "utensils"];
    for (const key of homeIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains all expected learning icons", () => {
    const learningIcons = ["book", "graduation-cap", "pencil", "lightbulb", "magnifying-glass"];
    for (const key of learningIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains all expected finance icons", () => {
    const financeIcons = ["coins", "piggy-bank", "wallet"];
    for (const key of financeIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains all expected social icons", () => {
    const socialIcons = ["users", "comments"];
    for (const key of socialIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains all expected creative icons", () => {
    const creativeIcons = ["palette", "music", "camera", "pen"];
    for (const key of creativeIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("contains the expected misc icons", () => {
    const miscIcons = [
      "star", "flag", "clock", "bell", "bookmark", "fire",
      "rocket", "globe", "leaf", "layer-group", "folder",
      "shopping-cart", "plane", "car", "baby", "paw",
    ];
    for (const key of miscIcons) {
      expect(TOPIC_ICONS).toHaveProperty(key);
    }
  });

  it("all values are valid FontAwesome icon definitions (have an iconName)", () => {
    for (const [key, icon] of Object.entries(TOPIC_ICONS)) {
      expect(icon, `Icon for key "${key}" should have iconName`).toHaveProperty("iconName");
      expect(typeof icon.iconName).toBe("string");
    }
  });

  it("all values are FontAwesome icon definitions with prefix field", () => {
    for (const [key, icon] of Object.entries(TOPIC_ICONS)) {
      expect(icon, `Icon for key "${key}" should have prefix`).toHaveProperty("prefix");
      expect(icon.prefix).toBe("fas"); // free-solid-svg-icons
    }
  });

  it("does not include any emoji keys", () => {
    const keys = Object.keys(TOPIC_ICONS);
    for (const key of keys) {
      // All keys should be ASCII slugs (letters, numbers, hyphens)
      expect(key).toMatch(/^[a-zA-Z0-9\-]+$/);
    }
  });

  it("contains 'folder' as a key (used as default fallback)", () => {
    expect(TOPIC_ICONS).toHaveProperty("folder");
  });

  it("map has entries for all defined category groups", () => {
    // Verify at least one icon per category is present
    expect(TOPIC_ICONS).toHaveProperty("briefcase"); // work
    expect(TOPIC_ICONS).toHaveProperty("heart");     // health
    expect(TOPIC_ICONS).toHaveProperty("house");     // home
    expect(TOPIC_ICONS).toHaveProperty("book");      // learning
    expect(TOPIC_ICONS).toHaveProperty("coins");     // finance
    expect(TOPIC_ICONS).toHaveProperty("users");     // social
    expect(TOPIC_ICONS).toHaveProperty("palette");   // creative
    expect(TOPIC_ICONS).toHaveProperty("star");      // misc
  });
});

// ─── DEFAULT_TOPIC_ICON_KEY ───────────────────────────────────────────────────

describe("DEFAULT_TOPIC_ICON_KEY", () => {
  it('equals "folder"', () => {
    expect(DEFAULT_TOPIC_ICON_KEY).toBe("folder");
  });

  it("is a valid key in TOPIC_ICONS", () => {
    expect(TOPIC_ICONS).toHaveProperty(DEFAULT_TOPIC_ICON_KEY);
  });
});

// ─── resolveTopicIcon ────────────────────────────────────────────────────────

describe("resolveTopicIcon", () => {
  it("resolves a known key to its icon definition", () => {
    const icon = resolveTopicIcon("briefcase");
    expect(icon).toHaveProperty("iconName");
    expect(icon.iconName).toBe("briefcase");
  });

  it("resolves 'folder' key to the folder icon", () => {
    const icon = resolveTopicIcon("folder");
    expect(icon).toHaveProperty("iconName");
    expect(icon.iconName).toBe("folder");
  });

  it("resolves 'heart' key correctly", () => {
    const icon = resolveTopicIcon("heart");
    expect(icon.iconName).toBe("heart");
  });

  it("resolves 'star' key correctly", () => {
    const icon = resolveTopicIcon("star");
    expect(icon.iconName).toBe("star");
  });

  it("resolves 'rocket' key correctly", () => {
    const icon = resolveTopicIcon("rocket");
    expect(icon.iconName).toBe("rocket");
  });

  it("returns folder icon for an unknown string key (legacy emoji fallback)", () => {
    const icon = resolveTopicIcon("📁");
    expect(icon).toBe(faFolder);
  });

  it("returns folder icon for a random unknown key", () => {
    const icon = resolveTopicIcon("nonexistent-icon-key");
    expect(icon).toBe(faFolder);
  });

  it("returns folder icon for null input", () => {
    const icon = resolveTopicIcon(null);
    expect(icon).toBe(faFolder);
  });

  it("returns folder icon for undefined input", () => {
    const icon = resolveTopicIcon(undefined);
    expect(icon).toBe(faFolder);
  });

  it("returns folder icon for empty string", () => {
    const icon = resolveTopicIcon("");
    expect(icon).toBe(faFolder);
  });

  it("resolves every key in TOPIC_ICONS to a valid icon definition", () => {
    for (const key of Object.keys(TOPIC_ICONS)) {
      const icon = resolveTopicIcon(key);
      expect(icon, `resolveTopicIcon("${key}") should return a valid icon`).toHaveProperty("iconName");
      expect(icon, `resolveTopicIcon("${key}") should return a valid icon`).toHaveProperty("prefix");
    }
  });

  it("resolves hyphenated keys correctly", () => {
    const icon = resolveTopicIcon("chart-bar");
    expect(icon.iconName).toBe("chart-bar");
  });

  it("resolves 'screwdriver-wrench' key", () => {
    const icon = resolveTopicIcon("screwdriver-wrench");
    expect(icon.iconName).toBe("screwdriver-wrench");
  });

  it("resolves 'layer-group' key", () => {
    const icon = resolveTopicIcon("layer-group");
    expect(icon.iconName).toBe("layer-group");
  });

  it("resolves 'shopping-cart' key to a valid FA icon", () => {
    // FontAwesome renamed this icon — the key "shopping-cart" maps to
    // faShoppingCart whose internal iconName may differ from the key
    const icon = resolveTopicIcon("shopping-cart");
    expect(icon).toHaveProperty("iconName");
    expect(icon.prefix).toBe("fas");
  });

  it("is case-sensitive (uppercase version falls back to folder)", () => {
    const icon = resolveTopicIcon("Briefcase");
    expect(icon).toBe(faFolder);
  });

  it("resolves 'person-running' key correctly", () => {
    const icon = resolveTopicIcon("person-running");
    expect(icon).toHaveProperty("iconName");
    expect(icon.prefix).toBe("fas");
  });

  it("resolves 'magnifying-glass' key correctly", () => {
    const icon = resolveTopicIcon("magnifying-glass");
    expect(icon).toHaveProperty("iconName");
    expect(icon.prefix).toBe("fas");
  });

  it("resolves 'graduation-cap' key correctly", () => {
    const icon = resolveTopicIcon("graduation-cap");
    expect(icon.iconName).toBe("graduation-cap");
  });
});
