import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SourcesCard } from "@/components/chat/cards/SourcesCard";
import type { SourceCitation } from "@/lib/api";

/**
 * The "check this answer" disclosure that replaced the always-open citation
 * list. tests/components/chatSources.test.tsx pins the ChatMessage wiring and
 * what makes a citation checkable (href, target, the no-URL fallback); these
 * cover the card's own contract — the collapsed-by-default chip, its count and
 * ARIA state, the host line, and the Official tag.
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

const chip = () => screen.getByRole("button", { name: /sources · \d/i });
const expand = () => fireEvent.click(chip());

describe("SourcesCard", () => {
  it("renders nothing when sources is undefined", () => {
    const { container } = render(<SourcesCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty list — no 'Sources · 0' chip", () => {
    const { container } = render(<SourcesCard sources={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the citation count on the chip", () => {
    render(<SourcesCard sources={[charter, site]} />);
    expect(screen.getByRole("button", { name: "Sources · 2" })).toBeInTheDocument();
  });

  it("starts collapsed: no rows, no links, aria-expanded=false", () => {
    render(<SourcesCard sources={[charter]} />);
    expect(chip()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(charter.citation)).not.toBeInTheDocument();
  });

  it("expands to show one row per citation", () => {
    render(<SourcesCard sources={[charter, site]} />);
    expand();
    expect(screen.getByText(charter.citation)).toBeInTheDocument();
    expect(screen.getByText(site.citation)).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("toggles aria-expanded on each press, and back", () => {
    render(<SourcesCard sources={[charter]} />);
    expand();
    expect(chip()).toHaveAttribute("aria-expanded", "true");
    expand();
    expect(chip()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(charter.citation)).not.toBeInTheDocument();
  });

  it("points aria-controls at the panel that holds the rows", () => {
    render(<SourcesCard sources={[charter]} />);
    const controls = chip().getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    expand();
    const panel = document.getElementById(controls as string);
    expect(panel).not.toBeNull();
    expect(panel).toContainElement(screen.getByText(charter.citation));
  });

  it("keeps focus on the chip across a toggle — no focus stealing", () => {
    render(<SourcesCard sources={[charter]} />);
    chip().focus();
    expand();
    expect(chip()).toHaveFocus();
    expand();
    expect(chip()).toHaveFocus();
  });

  it("opens rows in a new tab with the URL passed through verbatim", () => {
    render(<SourcesCard sources={[charter]} />);
    expand();
    const link = screen.getByRole("link", { name: /Citizens' Charter/i });
    expect(link).toHaveAttribute("href", "https://example.test/charter.pdf#page=997");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("tags a cvsu.edu.ph host as Official", () => {
    render(<SourcesCard sources={[site]} />);
    expand();
    expect(screen.getByText("cvsu.edu.ph")).toBeInTheDocument();
    expect(screen.getByText("Official")).toBeInTheDocument();
  });

  it("tags cvsu.edu.ph subdomains as Official too", () => {
    render(
      <SourcesCard
        sources={[{ ...site, url: "https://admission.cvsu.edu.ph/apply" }]}
      />,
    );
    expand();
    expect(screen.getByText("admission.cvsu.edu.ph")).toBeInTheDocument();
    expect(screen.getByText("Official")).toBeInTheDocument();
  });

  it("does not tag an external host", () => {
    render(<SourcesCard sources={[charter]} />);
    expand();
    expect(screen.getByText("example.test")).toBeInTheDocument();
    expect(screen.queryByText("Official")).not.toBeInTheDocument();
  });

  it("does not tag a lookalike host that merely ends in the letters", () => {
    render(
      <SourcesCard sources={[{ ...site, url: "https://notcvsu.edu.ph/scam" }]} />,
    );
    expand();
    expect(screen.queryByText("Official")).not.toBeInTheDocument();
  });

  // The proxy fix "stop citation links losing their port" (deploy/nginx.conf)
  // exists because a charter link on a stack published off :80 carries its
  // port. The card must not reintroduce the bug: the host line keeps the port
  // and the href is untouched.
  it("keeps the port in both the host line and the href", () => {
    render(
      <SourcesCard
        sources={[
          {
            ...charter,
            url: "http://localhost:8090/sources/citizens-charter.pdf#page=997",
          },
        ]}
      />,
    );
    expand();
    expect(screen.getByText("localhost:8090")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Citizens' Charter/i })).toHaveAttribute(
      "href",
      "http://localhost:8090/sources/citizens-charter.pdf#page=997",
    );
  });

  it("renders a URL-less citation as plain text with no host line", () => {
    render(<SourcesCard sources={[{ ...charter, url: null }]} />);
    expand();
    expect(screen.getByText(charter.citation)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText("example.test")).not.toBeInTheDocument();
  });

  it("shows section and office chips only when the citation line omits them", () => {
    render(<SourcesCard sources={[charter]} />);
    expand();
    expect(
      screen.getByText(/Enrolment of Students · Office of the University Registrar/),
    ).toBeInTheDocument();
  });
});
