// Pure cell helpers for the chat table card.
//
// Extracted from app/components/ChatMessage.tsx, where they sat among ~1150
// lines of rendering. They carry real logic — cellToSortKey parses PHP currency
// so a peso column sorts numerically rather than lexically — and being free of
// JSX they are unit-testable without jsdom.
//
// renderCell deliberately stays in the component: it returns JSX, so it is a
// rendering concern rather than a data one.
import type { TableCell } from "@/lib/api";

/** A cell carrying display text and an optional link, vs a bare scalar. */
export function isLinkCell(
  cell: TableCell,
): cell is { text: string; href?: string | null } {
  return typeof cell === "object" && cell !== null && "text" in cell;
}

/** Pull a string out of a cell for sorting/filtering. Link cells expose
 *  `.text`; everything else stringifies. */
export function cellToString(cell: TableCell): string {
  if (cell === null || cell === undefined) return "";
  if (typeof cell === "object" && "text" in cell) return cell.text;
  return String(cell);
}

/**
 * Sort key for a cell: a number when the text is a peso amount, otherwise the
 * lowercased string.
 *
 * "₱13,300,200.00" → 13300200 so a currency column orders by magnitude. Without
 * this, string ordering puts "₱9" after "₱13,300,200.00".
 */
export function cellToSortKey(cell: TableCell): string | number {
  const s = cellToString(cell);
  // Allow a leading minus, an optional peso sign, thousands separators and
  // decimals. Anything else falls through to a case-insensitive string sort.
  const m = /^-?₱?\s*([\d,]+(?:\.\d+)?)$/.exec(s.trim());
  if (m) return Number.parseFloat(m[1].replace(/,/g, ""));
  return s.toLowerCase();
}
