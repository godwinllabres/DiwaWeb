import { describe, expect, it } from "vitest";
import { cellToSortKey, cellToString, isLinkCell } from "@/lib/tableCell";
import type { TableCell } from "@/lib/types";

// These sort the tables Sevi renders for AIS records — disbursement vouchers,
// budget balances. A peso column that sorts lexically puts ₱9 above
// ₱13,300,200.00, which is the kind of wrong a clerk acts on. The logic lived
// inside a 1150-line component and had no tests.

const link = (text: string, href?: string | null): TableCell =>
  ({ text, href }) as TableCell;

describe("isLinkCell", () => {
  it("recognises an object cell carrying text", () => {
    expect(isLinkCell(link("DV-0001", "https://example.test"))).toBe(true);
    expect(isLinkCell(link("DV-0001"))).toBe(true);
  });

  it("rejects scalars and null", () => {
    expect(isLinkCell("plain" as TableCell)).toBe(false);
    expect(isLinkCell(42 as TableCell)).toBe(false);
    expect(isLinkCell(null as unknown as TableCell)).toBe(false);
  });
});

describe("cellToString", () => {
  it("unwraps a link cell to its text", () => {
    expect(cellToString(link("DV-0001", "https://example.test"))).toBe("DV-0001");
  });

  it("stringifies scalars and empties nullish cells", () => {
    expect(cellToString(42 as TableCell)).toBe("42");
    expect(cellToString("text" as TableCell)).toBe("text");
    expect(cellToString(null as unknown as TableCell)).toBe("");
    expect(cellToString(undefined as unknown as TableCell)).toBe("");
  });
});

describe("cellToSortKey", () => {
  it("parses peso amounts to numbers so magnitude ordering works", () => {
    expect(cellToSortKey("₱13,300,200.00" as TableCell)).toBe(13300200);
    expect(cellToSortKey("₱9" as TableCell)).toBe(9);
    expect(cellToSortKey("1,234.56" as TableCell)).toBe(1234.56);
  });

  it("orders currency by value, not by string", () => {
    const rows = ["₱9", "₱13,300,200.00", "₱1,000.50"] as TableCell[];
    const sorted = [...rows].sort(
      (a, b) => (cellToSortKey(a) as number) - (cellToSortKey(b) as number),
    );
    expect(sorted.map((c) => cellToString(c))).toEqual([
      "₱9",
      "₱1,000.50",
      "₱13,300,200.00",
    ]);
  });

  it("handles negatives and surrounding whitespace", () => {
    expect(cellToSortKey("  -₱500.25  " as TableCell)).toBe(500.25);
  });

  it("falls back to a lowercased string for non-numeric cells", () => {
    expect(cellToSortKey("Approved" as TableCell)).toBe("approved");
    // Case-insensitive so a status column does not sort all capitals first.
    expect(cellToSortKey("draft" as TableCell)).toBe("draft");
  });

  it("reads through a link cell", () => {
    expect(cellToSortKey(link("₱2,000.00"))).toBe(2000);
    expect(cellToSortKey(link("Zeta"))).toBe("zeta");
  });

  it("treats a partly-numeric string as text, not a number", () => {
    // "12 units" must not sort as 12 — the regex is anchored on purpose.
    expect(cellToSortKey("12 units" as TableCell)).toBe("12 units");
  });
});
