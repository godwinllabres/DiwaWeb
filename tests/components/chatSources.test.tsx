import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";
import type { SourceCitation } from "@/lib/api";

/**
 * The API has emitted `sources` since the charter-citation work, but the UI
 * had no such prop and never read it — so "CvSU Citizens' Charter, p. 948"
 * reached the reader as a number they could not check, and the deep link the
 * backend went to the trouble of building was dropped on the floor.
 *
 * These cover the part that makes a citation *checkable*: the link, and the
 * deliberate absence of one when no PDF is published.
 *
 * Since the SourcesCard extraction the citations sit behind a collapsed
 * "Sources · N" chip, so cases that read a citation expand it first. The
 * chip's own behaviour (count, aria-expanded, the Official tag) is covered in
 * tests/components/SourcesCard.test.tsx; here we pin that ChatMessage still
 * wires `sources` through and that what made a citation checkable survived.
 */

const charter: SourceCitation = {
  kind: "charter",
  locator: "997",
  citation: "CvSU Citizens' Charter, FY 2026 edition, p. 948",
  url: "https://example.test/charter.pdf#page=997",
  section: "Enrolment of Students",
  office: "Office of the University Registrar",
};

const site: SourceCitation = {
  kind: "site",
  locator: "https://cvsu.edu.ph/admissions",
  label: "Admissions",
  citation: "CvSU official website — Admissions",
  url: "https://cvsu.edu.ph/admissions",
};

function renderBot(sources?: SourceCitation[]) {
  return render(
    <ChatMessage message="Here is how to enrol." isBot timestamp="12:00" sources={sources} />,
  );
}

/** Open the collapsed "Sources · N" disclosure so the rows exist to assert on. */
function expandSources() {
  fireEvent.click(screen.getByRole("button", { name: /sources · \d/i }));
}

describe("ChatMessage — source citations", () => {
  it("keeps citations behind a collapsed chip until the reader asks for them", () => {
    renderBot([charter]);
    expect(screen.queryByText(charter.citation)).not.toBeInTheDocument();
    expandSources();
    expect(screen.getByText(charter.citation)).toBeInTheDocument();
  });

  it("renders the citation text", () => {
    renderBot([charter]);
    expandSources();
    expect(screen.getByText(charter.citation)).toBeInTheDocument();
  });

  it("links the citation to the page-anchored URL so the reader can check it", () => {
    renderBot([charter]);
    expandSources();
    const link = screen.getByRole("link", { name: /Citizens' Charter/i });
    expect(link).toHaveAttribute("href", "https://example.test/charter.pdf#page=997");
  });

  it("opens the source safely in a new tab", () => {
    renderBot([charter]);
    expandSources();
    const link = screen.getByRole("link", { name: /Citizens' Charter/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows section and office as context without parsing the citation string", () => {
    renderBot([charter]);
    expandSources();
    expect(
      screen.getByText(/Enrolment of Students · Office of the University Registrar/),
    ).toBeInTheDocument();
  });

  it("falls back to plain text when no URL is published — a dead link is worse", () => {
    renderBot([{ ...charter, url: null }]);
    expandSources();
    expect(screen.getByText(charter.citation)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Citizens' Charter/i })).not.toBeInTheDocument();
  });

  it("renders site citations too, not just charter ones", () => {
    renderBot([site]);
    expandSources();
    const link = screen.getByRole("link", { name: /official website/i });
    expect(link).toHaveAttribute("href", "https://cvsu.edu.ph/admissions");
  });

  it("renders every citation when an answer cites more than one", () => {
    renderBot([charter, site]);
    expandSources();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders nothing when the backend sends no sources (older backends omit it)", () => {
    const { container } = renderBot(undefined);
    expect(screen.queryByRole("button", { name: /sources/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("renders nothing for an empty list", () => {
    const { container } = renderBot([]);
    expect(screen.queryByRole("button", { name: /sources/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll("a")).toHaveLength(0);
  });

  it("does not attach citations to user messages", () => {
    render(
      <ChatMessage message="how do I enrol?" isBot={false} timestamp="12:00" sources={[charter]} />,
    );
    expect(screen.queryByRole("button", { name: /sources/i })).not.toBeInTheDocument();
    expect(screen.queryByText(charter.citation)).not.toBeInTheDocument();
  });
});
