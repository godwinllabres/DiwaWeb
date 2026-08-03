import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MessageBody } from "@/components/MessageBody";

const hrefs = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("a")).map((a) => a.getAttribute("href"));

// A bare URL is matched to the next whitespace, so without trimming it also
// claims the punctuation that closes the sentence around it.
describe("bare URL autolinking", () => {
  // The reported defect: an answer ending "…verify the latest figures at
  // https://cvsu.edu.ph.)" linked "https://cvsu.edu.ph.)" — a host with no DNS
  // record, so the tab opened on a browser error page.
  it("does not swallow the sentence's closing punctuation", () => {
    const { container } = render(
      <MessageBody
        text="(Rankings are as of 2026 — verify the latest figures at https://cvsu.edu.ph.)"
        isBot
      />,
    );
    expect(hrefs(container)).toEqual(["https://cvsu.edu.ph"]);
  });

  it("trims a trailing period, comma or colon", () => {
    for (const [text, href] of [
      ["See https://cvsu.edu.ph.", "https://cvsu.edu.ph"],
      ["See https://cvsu.edu.ph, then apply", "https://cvsu.edu.ph"],
      ["See https://cvsu.edu.ph/admissions: bring an ID", "https://cvsu.edu.ph/admissions"],
    ] as const) {
      const { container } = render(<MessageBody text={text} isBot />);
      expect(hrefs(container)).toEqual([href]);
    }
  });

  it("keeps a closing bracket the URL itself opened", () => {
    const { container } = render(
      <MessageBody text="See https://en.wikipedia.org/wiki/Cavite_(province) for context" isBot />,
    );
    expect(hrefs(container)).toEqual(["https://en.wikipedia.org/wiki/Cavite_(province)"]);
  });

  // Same rule, opposite direction: the paren belongs to the prose, not the URL.
  it("drops an unmatched closing bracket", () => {
    const { container } = render(
      <MessageBody text="(see https://cvsu.edu.ph/guide) for context" isBot />,
    );
    expect(hrefs(container)).toEqual(["https://cvsu.edu.ph/guide"]);
  });

  it("leaves a path that legitimately ends in a dotted filename", () => {
    const { container } = render(<MessageBody text="Open https://cvsu.edu.ph/form.pdf now" isBot />);
    expect(hrefs(container)).toEqual(["https://cvsu.edu.ph/form.pdf"]);
  });

  // A [md](link) is delimited by its own parens, so prose punctuation can never
  // leak in — but the trimming must not reach into it either.
  it("leaves a markdown link's href alone", () => {
    const { container } = render(
      <MessageBody text="See [the guide](https://cvsu.edu.ph/guide)." isBot />,
    );
    expect(hrefs(container)).toEqual(["https://cvsu.edu.ph/guide"]);
  });

  // Trimming re-attributes characters between segments; it must never drop one.
  it("renders every character of the original text", () => {
    const text = "(Verify at https://cvsu.edu.ph.) Or see https://cvsu.edu.ph/admissions, ok?";
    const { container } = render(<MessageBody text={text} isBot />);
    expect(container.textContent).toBe(text);
  });
});
