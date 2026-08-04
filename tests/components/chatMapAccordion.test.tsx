import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";
import type { MapCard } from "@/lib/types";

// Characterization tests for the MapAccordion inside app/components/ChatMessage.tsx.
// These pin CURRENT behaviour ahead of a component split — including quirks.

// The dialog interior mounts CampusMap, whose pan/zoom wrapper
// (react-zoom-pan-pinch) needs a ResizeObserver that jsdom does not ship.
// Test-environment polyfill only — no production behaviour is stubbed.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const COACHMARK_KEY = "diwa_map_coachmark_seen";

const mapCard: MapCard = {
  kind: "map",
  place_id: "library",
  label: "University Library",
};

function renderWithMap(card: MapCard = mapCard) {
  return render(
    <ChatMessage
      message="Here is where the library is."
      isBot={true}
      timestamp="12:00"
      cards={[card]}
    />,
  );
}

describe("ChatMessage map accordion — trigger", () => {
  it("renders the map trigger with an aria-label naming the place", () => {
    renderWithMap();
    expect(
      screen.getByLabelText("Open campus map for University Library"),
    ).toBeInTheDocument();
  });

  it("renders the visible trigger text with the label", () => {
    renderWithMap();
    expect(screen.getByText(/View campus map/)).toBeInTheDocument();
    expect(screen.getByText(/University Library/)).toBeInTheDocument();
  });

  // The map card is gated on `isBot` — a user-authored message carrying a map
  // card renders no trigger at all.
  it("does not render the map trigger on a user message", () => {
    render(
      <ChatMessage
        message="where is the library"
        isBot={false}
        timestamp="12:00"
        cards={[mapCard]}
      />,
    );
    expect(
      screen.queryByLabelText(/Open campus map for/),
    ).not.toBeInTheDocument();
  });
});

describe("ChatMessage map accordion — never auto-opens", () => {
  // The single most important pinned behaviour: rendering a map card must not
  // spring the modal open. Nothing in the component may change this.
  it("does not render the dialog on first render", () => {
    renderWithMap();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /back to chat/i }),
    ).not.toBeInTheDocument();
  });

  // MapCard carries an optional `default_open` flag on the wire, but the
  // component ignores it entirely — the map still stays shut.
  it("stays closed even when the card sets default_open: true", () => {
    renderWithMap({ ...mapCard, default_open: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render the dialog when the coachmark has already been seen", () => {
    localStorage.setItem(COACHMARK_KEY, "1");
    renderWithMap();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("ChatMessage map accordion — first-run coachmark", () => {
  it("shows the coachmark when the seen key is absent", () => {
    renderWithMap();
    expect(
      screen.getByText("This spot is on the campus map."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View map" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("hides the coachmark when the seen key is already \"1\"", () => {
    localStorage.setItem(COACHMARK_KEY, "1");
    renderWithMap();
    expect(
      screen.queryByText("This spot is on the campus map."),
    ).not.toBeInTheDocument();
    // The trigger itself is unaffected.
    expect(
      screen.getByLabelText("Open campus map for University Library"),
    ).toBeInTheDocument();
  });

  // Only the exact string "1" counts as seen; any other stored value falls
  // through to the storage-availability probe and the coachmark returns.
  it("shows the coachmark when the seen key holds a value other than \"1\"", () => {
    localStorage.setItem(COACHMARK_KEY, "true");
    renderWithMap();
    expect(
      screen.getByText("This spot is on the campus map."),
    ).toBeInTheDocument();
  });

  it("\"Not now\" hides the coachmark and persists the key", () => {
    renderWithMap();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(
      screen.queryByText("This spot is on the campus map."),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(COACHMARK_KEY)).toBe("1");
  });

  // The corner X was removed deliberately: it measured 18x18 — under the 24x24
  // floor of WCAG 2.5.8, passing only because nothing sat within 24px of it —
  // and it duplicated "Not now", which is larger and adjacent. If it comes
  // back, it needs to come back at a hittable size.
  it("offers no undersized corner X — \"Not now\" is the dismiss affordance", () => {
    renderWithMap();
    expect(screen.queryByLabelText("Dismiss map tip")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("dismissing does not open the dialog", () => {
    renderWithMap();
    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Storage-blocked path: storageAvailable() probes with a real setItem
  // round-trip, so a throwing setItem makes mapCoachmarkSeen() report "seen"
  // and the user is never nagged.
  it("treats unreachable storage as already-seen and hides the coachmark", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
    try {
      renderWithMap();
      expect(
        screen.queryByText("This spot is on the campus map."),
      ).not.toBeInTheDocument();
      expect(
        screen.getByLabelText("Open campus map for University Library"),
      ).toBeInTheDocument();
    } finally {
      setItem.mockRestore();
    }
  });
});

describe("ChatMessage map accordion — opening the dialog", () => {
  it("\"View map\" dismisses the coachmark, persists the key, and opens the dialog", () => {
    renderWithMap();
    fireEvent.click(screen.getByRole("button", { name: "View map" }));

    expect(
      screen.queryByText("This spot is on the campus map."),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(COACHMARK_KEY)).toBe("1");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clicking the trigger opens the dialog", () => {
    localStorage.setItem(COACHMARK_KEY, "1");
    renderWithMap();
    fireEvent.click(
      screen.getByLabelText("Open campus map for University Library"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // Quirk worth pinning: opening via the trigger (rather than "View map")
  // leaves the coachmark on screen and never writes the seen key.
  it("opening via the trigger leaves the coachmark up and does not persist the key", () => {
    renderWithMap();
    fireEvent.click(
      screen.getByLabelText("Open campus map for University Library"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("This spot is on the campus map."),
    ).toBeInTheDocument();
    expect(localStorage.getItem(COACHMARK_KEY)).toBeNull();
  });

  it("the open dialog exposes the campus map header and a Back-to-chat control", () => {
    localStorage.setItem(COACHMARK_KEY, "1");
    renderWithMap();
    fireEvent.click(
      screen.getByLabelText("Open campus map for University Library"),
    );
    expect(screen.getByText("Campus map")).toBeInTheDocument();
    expect(
      screen.getByText("Pick a From and To — the route updates instantly."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Back to chat")).toBeInTheDocument();
  });

  it("\"Back to chat\" closes the dialog", () => {
    localStorage.setItem(COACHMARK_KEY, "1");
    renderWithMap();
    fireEvent.click(
      screen.getByLabelText("Open campus map for University Library"),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Back to chat"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
