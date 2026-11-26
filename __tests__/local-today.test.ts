import { describe, it, expect } from "vitest";
import { addDays, localMidnight } from "@/lib/client/local-today";

describe("addDays", () => {
  it("adds in local time across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("is not shifted by the DST change", () => {
    // Europe: clocks go back on 2026-10-25; a UTC-based add would land on the 25th twice
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
  });
});

describe("localMidnight", () => {
  it("is 00:00 local on that day", () => {
    const d = localMidnight("2026-11-26");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 26, 0]);
  });
});
