import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";
import type { TableCard } from "@/lib/api";

// Characterization tests for the TableCard rendered inside <ChatMessage>.
// The card is reached only through the `cards` prop (kind: "table") on a bot
// message, so every test goes through the public component.

function renderTable(table: TableCard, message = "Here are the results.") {
  return render(
    <ChatMessage message={message} isBot={true} timestamp="12:00" cards={[table]} />
  );
}

/** Text of every body row, column by column (header row excluded). */
function bodyRows(): string[][] {
  const rows = screen.getAllByRole("row").slice(1);
  return rows.map((r) =>
    within(r)
      .queryAllByRole("cell")
      .map((c) => c.textContent ?? "")
  );
}

/** Text of one column across the body rows, in render order. */
function column(index: number): string[] {
  return bodyRows().map((cells) => cells[index]);
}

const dvTable: TableCard = {
  kind: "table",
  title: "Pending disbursement vouchers",
  columns: [
    { key: "name", label: "DV", align: "left" },
    { key: "payee", label: "Payee", align: "left" },
    { key: "amount", label: "Amount", align: "right" },
  ],
  rows: [
    {
      name: { text: "DV-2026-0001", href: "https://ais.example/dv/1" },
      payee: "Alpha Trading",
      amount: "₱1,000.00",
    },
    {
      name: { text: "DV-2026-0002", href: "https://ais.example/dv/2" },
      payee: "Zeta Supplies",
      amount: "₱13,300,200.00",
    },
    {
      name: { text: "DV-2026-0003", href: "https://ais.example/dv/3" },
      payee: "Mid Corp",
      amount: "₱9.00",
    },
  ],
  footer: "Showing 3 of 3 vouchers.",
};

describe("ChatMessage table card — rendering", () => {
  it("renders the title, one header per column and one row per data row", () => {
    renderTable(dvTable);

    expect(screen.getByText("Pending disbursement vouchers")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /DV/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Payee/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Amount/ })).toBeInTheDocument();
    // header row + 3 body rows
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });

  it("renders scalar cell values as text", () => {
    renderTable(dvTable);

    expect(screen.getByText("Alpha Trading")).toBeInTheDocument();
    expect(screen.getByText("Zeta Supplies")).toBeInTheDocument();
    expect(screen.getByText("₱13,300,200.00")).toBeInTheDocument();
  });

  it("renders the footer when no filter is active", () => {
    renderTable(dvTable);
    expect(screen.getByText("Showing 3 of 3 vouchers.")).toBeInTheDocument();
  });

  it("renders numeric cells via String() so 0 is not swallowed", () => {
    renderTable({
      kind: "table",
      title: "Counts",
      columns: [
        { key: "label", label: "Label" },
        { key: "n", label: "N", align: "right" },
      ],
      rows: [{ label: "zero", n: 0 }, { label: "many", n: 42 }],
    });

    expect(column(1)).toEqual(["0", "42"]);
  });

  // Quirk being pinned: a missing key stringifies to the empty string rather
  // than rendering a dash or omitting the cell.
  it("renders an empty cell when a row is missing a column key", () => {
    renderTable({
      kind: "table",
      title: "Sparse",
      columns: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
      rows: [{ a: "only-a" }],
    });

    expect(bodyRows()).toEqual([["only-a", ""]]);
  });

  // Quirk being pinned: when a table card is attached, the prose bubble is
  // dropped entirely — the message text does not render alongside the table.
  it("replaces the text bubble with the table when a table card is attached", () => {
    renderTable(dvTable, "Here is the list you asked for.");
    expect(screen.queryByText("Here is the list you asked for.")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders only the first table card when several are attached", () => {
    const second: TableCard = { ...dvTable, title: "Second table", rows: [] };
    render(
      <ChatMessage
        message="two tables"
        isBot={true}
        timestamp="12:00"
        cards={[dvTable, second]}
      />
    );

    expect(screen.getByText("Pending disbursement vouchers")).toBeInTheDocument();
    expect(screen.queryByText("Second table")).not.toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(1);
  });
});

describe("ChatMessage table card — link cells", () => {
  it("renders a link cell with an href as an anchor opening in a new tab", () => {
    renderTable(dvTable);

    const link = screen.getByRole("link", { name: "DV-2026-0001" });
    expect(link).toHaveAttribute("href", "https://ais.example/dv/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders a link cell without an href as plain text, not a dead anchor", () => {
    renderTable({
      kind: "table",
      title: "Mixed links",
      columns: [{ key: "name", label: "Name" }],
      rows: [
        { name: { text: "linked", href: "https://example.test/x" } },
        { name: { text: "unlinked" } },
        { name: { text: "null-href", href: null } },
      ],
    });

    expect(screen.getByText("unlinked")).toBeInTheDocument();
    expect(screen.getByText("null-href")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "unlinked" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "null-href" })).not.toBeInTheDocument();
    // The one with an href is still an anchor.
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});

describe("ChatMessage table card — sorting", () => {
  it("sorts ascending on the first header click and reverses on the second", () => {
    renderTable(dvTable);

    // Unsorted: source order.
    expect(column(1)).toEqual(["Alpha Trading", "Zeta Supplies", "Mid Corp"]);

    fireEvent.click(screen.getByRole("button", { name: "Payee" }));
    expect(column(1)).toEqual(["Alpha Trading", "Mid Corp", "Zeta Supplies"]);

    fireEvent.click(screen.getByRole("button", { name: "Payee" }));
    expect(column(1)).toEqual(["Zeta Supplies", "Mid Corp", "Alpha Trading"]);
  });

  // The point of cellToSortKey: "₱9.00" must land before "₱1,000.00", which a
  // lexical sort would get backwards.
  it("sorts a peso column by numeric magnitude, not lexically", () => {
    renderTable(dvTable);

    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(column(2)).toEqual(["₱9.00", "₱1,000.00", "₱13,300,200.00"]);

    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(column(2)).toEqual(["₱13,300,200.00", "₱1,000.00", "₱9.00"]);
  });

  it("sorts a link column by its text", () => {
    renderTable({
      kind: "table",
      title: "Links",
      columns: [{ key: "name", label: "Name" }],
      rows: [
        { name: { text: "charlie", href: "https://example.test/c" } },
        { name: { text: "alpha", href: "https://example.test/a" } },
        { name: { text: "bravo" } },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    expect(column(0)).toEqual(["alpha", "bravo", "charlie"]);
  });

  it("sorts strings case-insensitively", () => {
    renderTable({
      kind: "table",
      title: "Case",
      columns: [{ key: "v", label: "V" }],
      rows: [{ v: "banana" }, { v: "Apple" }, { v: "cherry" }],
    });

    fireEvent.click(screen.getByRole("button", { name: "V" }));
    expect(column(0)).toEqual(["Apple", "banana", "cherry"]);
  });

  // Switching to a different column restarts at ascending rather than keeping
  // the previous direction.
  it("resets to ascending when the sort moves to another column", () => {
    renderTable(dvTable);

    fireEvent.click(screen.getByRole("button", { name: "Payee" }));
    fireEvent.click(screen.getByRole("button", { name: "Payee" })); // now descending
    expect(column(1)).toEqual(["Zeta Supplies", "Mid Corp", "Alpha Trading"]);

    fireEvent.click(screen.getByRole("button", { name: "Amount" }));
    expect(column(2)).toEqual(["₱9.00", "₱1,000.00", "₱13,300,200.00"]);
  });

  it("gives every column a clickable sort header", () => {
    renderTable(dvTable);

    for (const label of ["DV", "Payee", "Amount"]) {
      expect(screen.getByRole("button", { name: label })).toBeEnabled();
    }
  });
});

describe("ChatMessage table card — filtering", () => {
  const wideTable: TableCard = {
    kind: "table",
    title: "Four rows",
    columns: [
      { key: "name", label: "Name" },
      { key: "office", label: "Office" },
    ],
    rows: [
      { name: "Ana", office: "Registrar" },
      { name: "Ben", office: "Cashier" },
      { name: "Cara", office: "Registrar" },
      { name: "Dan", office: "Library" },
    ],
    footer: "4 people.",
  };

  // The filter box only exists past three rows — a three-row table shows none.
  it("hides the filter input when the table has three rows or fewer", () => {
    renderTable(dvTable); // 3 rows
    expect(screen.queryByPlaceholderText(/filter/i)).not.toBeInTheDocument();
  });

  it("shows the filter input when the table has more than three rows", () => {
    renderTable(wideTable);
    expect(screen.getByPlaceholderText(/filter/i)).toBeInTheDocument();
  });

  it("filters rows on a case-insensitive match across every column", () => {
    renderTable(wideTable);

    fireEvent.change(screen.getByPlaceholderText(/filter/i), {
      target: { value: "registrar" },
    });

    expect(column(0)).toEqual(["Ana", "Cara"]);
    expect(screen.queryByText("Ben")).not.toBeInTheDocument();
  });

  it("swaps the footer for a match count while a filter is active", () => {
    renderTable(wideTable);

    fireEvent.change(screen.getByPlaceholderText(/filter/i), {
      target: { value: "Registrar" },
    });

    expect(screen.getByText("Showing 2 of 4 on this list.")).toBeInTheDocument();
    expect(screen.queryByText("4 people.")).not.toBeInTheDocument();
  });

  it("shows an empty-state row naming the filter when nothing matches", () => {
    renderTable(wideTable);

    fireEvent.change(screen.getByPlaceholderText(/filter/i), {
      target: { value: "zzz" },
    });

    expect(screen.getByText(/No rows match "zzz"\./)).toBeInTheDocument();
    expect(screen.getByText("Showing 0 of 4 on this list.")).toBeInTheDocument();
  });

  it("matches link cells by their text", () => {
    renderTable({
      kind: "table",
      title: "Linked rows",
      columns: [{ key: "name", label: "Name" }],
      rows: [
        { name: { text: "DV-0001", href: "https://example.test/1" } },
        { name: { text: "DV-0002", href: "https://example.test/2" } },
        { name: { text: "OTHER-1", href: "https://example.test/3" } },
        { name: { text: "OTHER-2" } },
      ],
    });

    fireEvent.change(screen.getByPlaceholderText(/filter/i), {
      target: { value: "dv-" },
    });

    expect(column(0)).toEqual(["DV-0001", "DV-0002"]);
  });

  it("restores every row when the filter is cleared", () => {
    renderTable(wideTable);
    const input = screen.getByPlaceholderText(/filter/i);

    fireEvent.change(input, { target: { value: "registrar" } });
    expect(bodyRows()).toHaveLength(2);

    fireEvent.change(input, { target: { value: "" } });
    expect(bodyRows()).toHaveLength(4);
    expect(screen.getByText("4 people.")).toBeInTheDocument();
  });

  // Sort survives filtering: the filter narrows, the active sort still orders.
  it("keeps the active sort applied to the filtered rows", () => {
    renderTable(wideTable);

    fireEvent.click(screen.getByRole("button", { name: "Name" }));
    fireEvent.click(screen.getByRole("button", { name: "Name" })); // descending
    fireEvent.change(screen.getByPlaceholderText(/filter/i), {
      target: { value: "registrar" },
    });

    expect(column(0)).toEqual(["Cara", "Ana"]);
  });
});

describe("ChatMessage table card — degenerate tables", () => {
  it("renders a single-row table without crashing", () => {
    renderTable({
      kind: "table",
      title: "One row",
      columns: [{ key: "a", label: "A" }],
      rows: [{ a: "solo" }],
    });

    expect(screen.getByText("solo")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
  });

  // Quirk being pinned: an empty table reuses the "no match" row even though
  // no filter has been typed, so it reads: No rows match "".
  it("renders the empty-filter no-rows message for a table with no rows", () => {
    renderTable({
      kind: "table",
      title: "Nothing here",
      columns: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
      rows: [],
    });

    expect(screen.getByText('No rows match "".')).toBeInTheDocument();
    // Headers still render.
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });

  it("renders a table with no columns without crashing", () => {
    renderTable({
      kind: "table",
      title: "No columns",
      columns: [],
      rows: [{ a: "ignored" }],
    });

    expect(screen.getByText("No columns")).toBeInTheDocument();
    expect(screen.queryAllByRole("columnheader")).toHaveLength(0);
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  // Rows are keyed off the first column's value, so duplicate first cells give
  // React duplicate keys — the render still shows both rows.
  it("renders duplicate rows even though they share a derived React key", () => {
    renderTable({
      kind: "table",
      title: "Duplicates",
      columns: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ],
      rows: [
        { a: "same", b: "one" },
        { a: "same", b: "two" },
      ],
    });

    expect(bodyRows()).toEqual([
      ["same", "one"],
      ["same", "two"],
    ]);
  });
});
