import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";
import type { DirectoryCard } from "@/lib/types";

// Characterization tests for the DirectoryCard sub-component inside
// app/components/ChatMessage.tsx. It has no public export, so every case below
// drives it through <ChatMessage cards={...} />.
//
// Note the DirectoryCard wire shape has no `name` field — the office IS the
// entry's name (`office` is the only required string; everything else is
// optional/nullable). See app/lib/api.ts.

const dir = (over: Partial<DirectoryCard> = {}): DirectoryCard => ({
  kind: "directory",
  office: "Office of Student Affairs",
  ...over,
});

/** Directory cards only render on a finished bot bubble, so every render here
 *  uses isBot + the default typing=false (which makes the word reveal report
 *  `done` on the first paint). */
function renderWithCards(cards: DirectoryCard[]) {
  return render(
    <ChatMessage
      message="Here are the offices."
      isBot={true}
      timestamp="12:00"
      cards={cards}
    />,
  );
}

describe("ChatMessage directory cards", () => {
  it("renders the office name for a directory entry", () => {
    renderWithCards([dir({ office: "Registrar's Office" })]);
    expect(screen.getByText("Registrar's Office")).toBeInTheDocument();
  });

  it("renders every contact detail when all are present", () => {
    renderWithCards([
      dir({
        office: "Registrar's Office",
        location: "Admin Building, 2nd Floor",
        email: "registrar@cvsu.edu.ph",
        phone: "(046) 862-0853",
        hours: "Mon-Fri 8:00 AM - 5:00 PM",
      }),
    ]);

    expect(screen.getByText("Registrar's Office")).toBeInTheDocument();
    expect(screen.getByText("Admin Building, 2nd Floor")).toBeInTheDocument();
    expect(screen.getByText("registrar@cvsu.edu.ph")).toBeInTheDocument();
    expect(screen.getByText("(046) 862-0853")).toBeInTheDocument();
    expect(screen.getByText("Mon-Fri 8:00 AM - 5:00 PM")).toBeInTheDocument();
  });

  it("makes the email a mailto: link and the phone a tel: link", () => {
    renderWithCards([
      dir({ email: "registrar@cvsu.edu.ph", phone: "09171234567" }),
    ]);

    expect(
      screen.getByRole("link", { name: "registrar@cvsu.edu.ph" }),
    ).toHaveAttribute("href", "mailto:registrar@cvsu.edu.ph");
    expect(screen.getByRole("link", { name: "09171234567" })).toHaveAttribute(
      "href",
      "tel:09171234567",
    );
  });

  // Quirk being pinned: the tel: href strips every character that is not a
  // digit or "+", so a formatted number with a local extension collapses into
  // one dialable string (extension digits included) while the visible text
  // keeps its original formatting.
  it("strips punctuation and spacing from the tel: href but not from the label", () => {
    renderWithCards([dir({ phone: "(046) 862-0853 loc. 101" })]);

    const link = screen.getByRole("link", { name: "(046) 862-0853 loc. 101" });
    expect(link).toHaveAttribute("href", "tel:0468620853101");
  });

  it("keeps a leading + in the tel: href", () => {
    renderWithCards([dir({ phone: "+63 46 862 0853" })]);
    expect(screen.getByRole("link", { name: "+63 46 862 0853" })).toHaveAttribute(
      "href",
      "tel:+63468620853",
    );
  });

  // Location and hours are plain text, NOT links, even though they sit
  // alongside the mailto/tel anchors.
  it("renders location and hours as text rather than links", () => {
    renderWithCards([
      dir({ location: "Admin Building", hours: "8:00 AM - 5:00 PM" }),
    ]);

    expect(screen.getByText("Admin Building")).toBeInTheDocument();
    expect(screen.getByText("8:00 AM - 5:00 PM")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("omits contact rows entirely when the fields are absent", () => {
    renderWithCards([dir({ office: "Guidance Office" })]);

    expect(screen.getByText("Guidance Office")).toBeInTheDocument();
    // No empty labels, no placeholder dashes — the rows simply do not exist.
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/phone/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hours/i)).not.toBeInTheDocument();
  });

  it("omits contact rows when the fields are explicitly null", () => {
    renderWithCards([
      dir({
        office: "Guidance Office",
        location: null,
        email: null,
        phone: null,
        hours: null,
      }),
    ]);

    expect(screen.getByText("Guidance Office")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // Empty strings are falsy, so they are treated exactly like a missing field.
  it("omits contact rows when the fields are empty strings", () => {
    renderWithCards([
      dir({ office: "Guidance Office", email: "", phone: "", hours: "", location: "" }),
    ]);

    expect(screen.getByText("Guidance Office")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders an office-only entry without crashing", () => {
    expect(() =>
      renderWithCards([{ kind: "directory", office: "Cashier" }]),
    ).not.toThrow();
    expect(screen.getByText("Cashier")).toBeInTheDocument();
  });

  it("renders a partial entry with only an email", () => {
    renderWithCards([dir({ office: "IT Office", email: "it@cvsu.edu.ph" })]);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "mailto:it@cvsu.edu.ph");
  });

  it("renders one card per directory entry", () => {
    renderWithCards([
      dir({ office: "Registrar's Office", email: "registrar@cvsu.edu.ph" }),
      dir({ office: "Cashier's Office", email: "cashier@cvsu.edu.ph" }),
      dir({ office: "Guidance Office", email: "guidance@cvsu.edu.ph" }),
    ]);

    expect(screen.getByText("Registrar's Office")).toBeInTheDocument();
    expect(screen.getByText("Cashier's Office")).toBeInTheDocument();
    expect(screen.getByText("Guidance Office")).toBeInTheDocument();
    // One mailto anchor per entry — three entries in, three links out.
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  // Duplicate office names are keyed by `${office}-${index}`, so repeats render
  // rather than collapsing into one card.
  it("renders duplicate office names as separate cards", () => {
    renderWithCards([
      dir({ office: "Extension Office", location: "Main Campus" }),
      dir({ office: "Extension Office", location: "CCAT Campus" }),
    ]);

    expect(screen.getAllByText("Extension Office")).toHaveLength(2);
    expect(screen.getByText("Main Campus")).toBeInTheDocument();
    expect(screen.getByText("CCAT Campus")).toBeInTheDocument();
  });

  it("renders nothing extra when the card list is empty", () => {
    renderWithCards([]);

    expect(screen.getByText("Here are the offices.")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders nothing extra when cards is omitted altogether", () => {
    render(<ChatMessage message="Here are the offices." isBot={true} timestamp="12:00" />);

    expect(screen.getByText("Here are the offices.")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // The message text still renders on a user bubble; only the attached cards
  // are gated behind isBot.
  it("does not render directory cards on a user message", () => {
    render(
      <ChatMessage
        message="Where is the registrar?"
        isBot={false}
        timestamp="12:00"
        cards={[dir({ office: "Registrar's Office", email: "registrar@cvsu.edu.ph" })]}
      />,
    );

    expect(screen.getByText("Where is the registrar?")).toBeInTheDocument();
    expect(screen.queryByText("Registrar's Office")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  // Quirk being pinned: DirectoryCard accepts a `place_id` but renders no map
  // affordance for it — the value is invisible in the card.
  it("does not surface place_id anywhere in the card", () => {
    renderWithCards([
      dir({ office: "Registrar's Office", place_id: "admin-building" }),
    ]);

    expect(screen.getByText("Registrar's Office")).toBeInTheDocument();
    expect(screen.queryByText(/admin-building/)).not.toBeInTheDocument();
  });

  it("picks only directory cards out of a mixed card list", () => {
    render(
      <ChatMessage
        message="Here you go."
        isBot={true}
        timestamp="12:00"
        cards={[
          { kind: "map", place_id: "admin", label: "Administration Building" },
          dir({ office: "Registrar's Office", email: "registrar@cvsu.edu.ph" }),
        ]}
      />,
    );

    expect(screen.getByText("Registrar's Office")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "registrar@cvsu.edu.ph" }),
    ).toHaveAttribute("href", "mailto:registrar@cvsu.edu.ph");
  });
});
