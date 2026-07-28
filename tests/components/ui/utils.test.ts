import { describe, it, expect } from "vitest";
import { cn } from "@/components/ui/utils";

// cn() was duplicated byte-for-byte in app/lib/cn.ts and app/components/ui/utils.ts.
// The lib/ copy had no production importer and was deleted; this suite follows the
// surviving one, whose consumer is app/components/ui/dialog.tsx.
describe("cn", () => {
  it("joins class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar");
  });

  it("handles conditional objects", () => {
    expect(cn("foo", { bar: true, baz: false })).toBe("foo bar");
  });

  it("merges conflicting tailwind classes (later wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("supports arrays", () => {
    expect(cn(["foo", "bar"], "baz")).toBe("foo bar baz");
  });

  it("returns empty string for no arguments", () => {
    expect(cn()).toBe("");
  });
});
