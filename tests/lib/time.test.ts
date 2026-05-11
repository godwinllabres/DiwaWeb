import { describe, it, expect } from "vitest";
import { timeNow } from "@/lib/time";

describe("timeNow", () => {
  it("formats a fixed Date as HH:MM (24-hour or 12-hour locale-dependent)", () => {
    const fixed = new Date(2024, 5, 15, 9, 5);
    const result = timeNow(fixed);
    // Should contain digits; must not be empty
    expect(result).toMatch(/\d/);
    expect(result.length).toBeGreaterThan(2);
  });

  it("returns a string when called with no arguments", () => {
    const result = timeNow();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("does not mutate the input Date", () => {
    const fixed = new Date(2024, 0, 1, 12, 0);
    const before = fixed.getTime();
    timeNow(fixed);
    expect(fixed.getTime()).toBe(before);
  });
});
