// Link and long-list rendering inside a reply bubble.
//
// Every case here was measured on the live stack before it was fixed: a
// Playwright pass over 8 answers x 4 viewports found hrefs ending in "/.",
// bare www. domains rendering as dead prose, and an 8-step answer running to
// 61 lines — over two and a half screenfuls — on a 360px phone.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBody } from "@/components/MessageBody";

const link = (name: RegExp | string) => screen.getByRole("link", { name });

describe("MessageBody links", () => {
  it("does not swallow a sentence's full stop into the href", () => {
    render(
      <MessageBody
        isBot
        text="See https://cvsu.edu.ph/office-of-student-affairs-and-services/."
      />,
    );
    const a = link(/office-of-student-affairs/);
    expect(a).toHaveAttribute(
      "href",
      "https://cvsu.edu.ph/office-of-student-affairs-and-services/",
    );
    // The stop stays in the sentence, outside the link.
    expect(a.textContent?.endsWith(".")).toBe(false);
    expect(document.body.textContent).toContain(
      "cvsu.edu.ph/office-of-student-affairs-and-services.",
    );
  });

  it("does not swallow an unbalanced closing paren", () => {
    render(<MessageBody isBot text="(see https://cvsu.edu.ph.)" />);
    expect(link(/cvsu\.edu\.ph/)).toHaveAttribute("href", "https://cvsu.edu.ph");
  });

  it("keeps a balanced paren that belongs to the URL", () => {
    render(<MessageBody isBot text="https://example.org/a_(b)" />);
    expect(link(/example\.org/)).toHaveAttribute("href", "https://example.org/a_(b)");
  });

  it("linkifies a bare www. domain", () => {
    render(<MessageBody isBot text="Visit www.cvsu.edu.ph for details." />);
    expect(link(/cvsu\.edu\.ph/)).toHaveAttribute("href", "https://www.cvsu.edu.ph");
  });

  it("labels a link without its scheme but keeps the full URL reachable", () => {
    render(<MessageBody isBot text="https://admission.cvsu.edu.ph/" />);
    const a = link(/admission/);
    expect(a).toHaveTextContent("admission.cvsu.edu.ph");
    expect(a).toHaveAttribute("href", "https://admission.cvsu.edu.ph/");
    expect(a).toHaveAttribute("title", "https://admission.cvsu.edu.ph/");
  });

  it("never uses break-all, which split the protocol across lines", () => {
    render(<MessageBody isBot text="https://cvsu.edu.ph" />);
    expect(link(/cvsu/).className).not.toContain("break-all");
  });

  it("leaves a markdown link's label alone", () => {
    render(<MessageBody isBot text="[open this page](https://cvsu.edu.ph/x#page=2)" />);
    expect(link("open this page")).toHaveAttribute(
      "href",
      "https://cvsu.edu.ph/x#page=2",
    );
  });
});

describe("MessageBody long procedures", () => {
  const eightSteps = Array.from({ length: 8 }, (_, i) => `${i + 1}. Step number ${i + 1}`).join("\n");

  it("folds the tail of a long numbered list behind a disclosure", () => {
    render(<MessageBody isBot text={eightSteps} />);
    expect(screen.getByText("Step number 4")).toBeInTheDocument();
    expect(screen.getByText(/Show the remaining 4 steps/)).toBeInTheDocument();
    // Folded, not dropped — still in the DOM, and numbering continues.
    expect(screen.getByText("Step number 8")).toBeInTheDocument();
  });

  it("leaves a short list fully inline", () => {
    render(<MessageBody isBot text={"1. A\n2. B\n3. C\n4. D\n5. E"} />);
    expect(screen.queryByText(/Show the remaining/)).not.toBeInTheDocument();
  });

  it("does not fold when the tail would be a single step", () => {
    const five = Array.from({ length: 5 }, (_, i) => `${i + 1}. S${i + 1}`).join("\n");
    render(<MessageBody isBot text={five} />);
    expect(screen.queryByText(/Show the remaining/)).not.toBeInTheDocument();
  });
});
