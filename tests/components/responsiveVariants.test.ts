/**
 * Guards the `short:` / `short-wide:` split.
 *
 * `short:` means "max-height: 560px" and was written to mean "phone in
 * landscape" — but it only encodes the HEIGHT half of that. The chat widget
 * embeds the app in a 420px-wide iframe that is `100dvh - 144px` tall, so on
 * any tablet with roughly 600-704px of viewport height the iframe drops under
 * 560px and `short:` fires — in 420px of width. CampusMap then switched to its
 * landscape rail and handed 19rem (304px) of those 420 pixels to the sidebar,
 * leaving a 116px map, and ChatMessage set `overflow: hidden` on a pane that no
 * longer had a rail to scroll, so the rest of the content was unreachable.
 *
 * The rule these tests hold: anything that SPLITS a layout into columns (or
 * that depends on such a split existing) must use `short-wide:`, which also
 * requires min-width 640px. Plain `short:` is still correct for vertical
 * compaction — padding and type scale — which a narrow panel wants too.
 *
 * Asserted against the source text rather than a render because the breakpoint
 * only exists in CSS; jsdom has no layout, so a rendered tree cannot show which
 * media query won.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(resolve(__dirname, "../..", rel), "utf8");

const CAMPUS_MAP = read("app/components/CampusMap.tsx");
const CHAT_MESSAGE = read("app/components/ChatMessage.tsx");
const TAILWIND = read("app/styles/tailwind.css");

/** Utilities that only make sense once a layout has two columns side by side. */
const SPLIT_UTILITIES = [
  "grid-cols-",
  "col-start-",
  "row-start-",
  "row-span-",
  "grid-rows-",
];

/** `short:foo` occurrences, ignoring `short-wide:foo`. */
function bareShortUtilities(source: string): string[] {
  return [...source.matchAll(/(?<!-)\bshort:([a-z0-9[\]()_,.\-/]+)/gi)].map((m) => m[1]);
}

describe("short-wide variant", () => {
  it("is defined as short AND wide enough for a second column", () => {
    expect(TAILWIND).toContain("@custom-variant short-wide");
    // Both halves matter: the height is what `short:` already meant, the width
    // is the part whose absence caused the bug.
    expect(TAILWIND).toMatch(/short-wide\s*\(@media\s*\(max-height:\s*560px\)\s*and\s*\(min-width:\s*640px\)\)/);
  });

  it.each([
    ["CampusMap", CAMPUS_MAP],
    ["ChatMessage", CHAT_MESSAGE],
  ])("%s never splits a layout on bare short:", (_name, source) => {
    const offenders = bareShortUtilities(source).filter((u) =>
      SPLIT_UTILITIES.some((s) => u.startsWith(s)),
    );
    expect(offenders).toEqual([]);
  });

  it("CampusMap builds its rail on short-wide, so a 420px widget stays stacked", () => {
    // The rail is 19rem; at 420px wide that would leave the map 116px.
    expect(CAMPUS_MAP).toContain("short-wide:grid-cols-[minmax(0,1fr)_19rem]");
    expect(CAMPUS_MAP).not.toContain("short:grid-cols-[minmax(0,1fr)_19rem]");
  });

  it("ChatMessage only hides the map dialog's overflow when a rail exists", () => {
    // Hiding it without a rail clips the sheet with no way to scroll.
    expect(CHAT_MESSAGE).toContain("short-wide:overflow-hidden");
    expect(CHAT_MESSAGE).not.toMatch(/(?<!-)\bshort:overflow-hidden/);
  });

  it("still uses bare short: for vertical compaction", () => {
    // If this ever empties out, the variant split has been over-applied and
    // short viewports lost the padding/type-scale trims they still need.
    const compaction = bareShortUtilities(CHAT_MESSAGE).filter((u) =>
      /^(p|m|text|gap|h|inset|top|left|translate|rounded|max-w)/.test(u),
    );
    expect(compaction.length).toBeGreaterThan(0);
  });
});
