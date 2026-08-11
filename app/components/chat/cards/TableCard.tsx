// Tabular AIS results. Extracted from ChatMessage.tsx.
import { useState } from "react";

import { ChevronDown, ChevronUp, ArrowUpDown, Search } from "lucide-react";

import { isLinkCell, cellToString, cellToSortKey } from "@/lib/tableCell";

import type { TableCard as TableCardData, TableCell } from "@/lib/types";

function renderCell(cell: TableCell) {
  if (isLinkCell(cell)) {
    // Identifiers (DV names, codes) — never wrap mid-string. Overflow is
    // handled by the parent's overflow-x-auto, so horizontal scroll kicks
    // in only when the cell is genuinely too wide.
    return cell.href ? (
      <a
        href={cell.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-forest-700 underline decoration-forest-600/40 underline-offset-2 hover:text-forest-900 whitespace-nowrap"
      >
        {cell.text}
      </a>
    ) : (
      <span className="whitespace-nowrap">{cell.text}</span>
    );
  }
  return <span>{String(cell ?? "")}</span>;
}

export function TableCard({ table }: { readonly table: TableCardData }) {
  const alignClass: Record<string, string> = {
    left:   "text-left",
    right:  "text-right tabular-nums",
    center: "text-center",
  };
  // Right-aligned and center-aligned columns should never wrap (numbers,
  // status badges). Left-aligned text columns wrap on word boundaries so
  // long payee names stay inside the cell instead of forcing horizontal
  // scroll for the whole row.
  const wrapClass = (align?: string) =>
    align === "right" || align === "center" ? "whitespace-nowrap" : "break-words";

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Filter first, then sort. Both are pure derived state — no rebuild of
  // the source rows from the backend.
  const filterLower = filter.trim().toLowerCase();
  const visibleRows = filterLower
    ? table.rows.filter((row) =>
        table.columns.some((c) =>
          cellToString(row[c.key]).toLowerCase().includes(filterLower)
        )
      )
    : table.rows;

  const sortedRows = sortKey
    ? [...visibleRows].sort((a, b) => {
        const av = cellToSortKey(a[sortKey]);
        const bv = cellToSortKey(b[sortKey]);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      })
    : visibleRows;

  return (
    <div className="w-full rounded-2xl border border-forest-900/10 bg-forest-50 p-3 text-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
        {table.title && (
          <p className="text-xs font-semibold text-forest-900 flex-1 min-w-0 truncate">
            {table.title}
          </p>
        )}
        {table.rows.length > 3 && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="text-xs pl-6 pr-2 py-1 rounded border border-forest-900/10 bg-paper-raised/80 placeholder:text-ink-400 focus:outline-none focus:border-forest-600/30 w-28 sm:w-36"
            />
          </div>
        )}
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-forest-900/10">
              {table.columns.map((c) => {
                const isActive = sortKey === c.key;
                let SortIcon = ArrowUpDown;
                if (isActive) {
                  SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown;
                }
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={`px-2 py-1.5 font-medium text-forest-900 whitespace-nowrap ${alignClass[c.align ?? "left"]}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(c.key)}
                      className={`inline-flex items-center gap-1 hover:text-forest-700 ${
                        c.align === "right" ? "flex-row-reverse" : ""
                      } ${c.align === "center" ? "justify-center" : ""}`}
                    >
                      {c.label}
                      <SortIcon className={`h-3 w-3 ${isActive ? "text-forest-700" : "text-ink-400"}`} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-2 py-3 text-center text-ink-500 italic"
                >
                  No rows match {`"${filter}"`}.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => {
                // Derive a stable key from row content (first column's value
                // is unique for our tables: DV name, group key, or UACS code).
                const firstCell = row[table.columns[0]?.key];
                const rowKey = isLinkCell(firstCell)
                  ? firstCell.text
                  : String(firstCell ?? `r${idx}`);
                const stripe = idx % 2 === 0 ? "bg-paper-raised/50" : "bg-transparent";
                return (
                  <tr key={rowKey} className={stripe}>
                    {table.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-2 py-1 text-ink-800 align-middle ${alignClass[c.align ?? "left"]} ${wrapClass(c.align)}`}
                      >
                        {renderCell(row[c.key])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {table.footer && !filter && (
        <p className="mt-2 px-1 text-[11px] text-ink-500">{table.footer}</p>
      )}
      {filter && (
        <p className="mt-2 px-1 text-[11px] text-ink-500">
          Showing {sortedRows.length} of {table.rows.length} on this list.
        </p>
      )}
    </div>
  );
}
