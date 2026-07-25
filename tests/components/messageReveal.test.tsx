import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MessageBody } from "@/components/MessageBody";
import { ChatMessage } from "@/components/ChatMessage";

const words = (root: HTMLElement) => Array.from(root.querySelectorAll(".sevi-word"));
const indexOf = (el: Element) => (el as HTMLElement).style.getPropertyValue("--i");

describe("without the reveal", () => {
  it("emits no word spans", () => {
    const { container } = render(<MessageBody text="one two three" isBot />);
    expect(words(container)).toHaveLength(0);
  });
});

describe("with the reveal", () => {
  it("wraps each word and numbers them in reading order", () => {
    const { container } = render(<MessageBody text="one two three" isBot={false} reveal />);
    const spans = words(container);

    expect(spans.map((s) => s.textContent)).toEqual(["one", "two", "three"]);
    expect(spans.map(indexOf)).toEqual(["0", "1", "2"]);
  });

  // The index has to be message-wide, not per block, or the second paragraph
  // restarts at 0 and reveals at the same time as the first.
  it("keeps numbering continuous across blocks and list items", () => {
    const { container } = render(
      <MessageBody text={"alpha beta\n\n1. gamma\n2. delta"} isBot={false} reveal />,
    );
    const spans = words(container);

    expect(spans.map((s) => s.textContent)).toEqual(["alpha", "beta", "gamma", "delta"]);
    expect(spans.map(indexOf)).toEqual(["0", "1", "2", "3"]);
  });

  // Revealing a URL in pieces would read as a glitch, so inline spans are
  // single animation units.
  it("treats a link, bold run and code span as one unit each", () => {
    const { container } = render(
      <MessageBody
        text="see [the guide](https://cvsu.edu.ph/guide) and **two words** and `some code`"
        isBot={false}
        reveal
      />,
    );
    const spans = words(container);
    const texts = spans.map((s) => s.textContent);

    expect(texts).toContain("the guide");
    expect(texts).toContain("two words");
    expect(texts).toContain("some code");
    // Numbering stays dense — atoms take one index, not one per contained word.
    expect(spans.map(indexOf)).toEqual(spans.map((_, i) => String(i)));
  });

  // The reveal is presentation. If it changes a single character of the
  // rendered answer it is a bug, not an animation.
  it("renders exactly the same text as without it", () => {
    const text = "PREPARE THESE DOCUMENTS\n\n1. Form 138\n   - original copy\n2. Two ID photos";
    const plain = render(<MessageBody text={text} isBot />).container.textContent;
    const revealed = render(<MessageBody text={text} isBot reveal />).container.textContent;

    expect(revealed).toBe(plain);
  });

  it("preserves the spaces between words", () => {
    const { container } = render(<MessageBody text="one two three" isBot={false} reveal />);
    expect(container.textContent).toBe("one two three");
  });
});

describe("ChatMessage integration", () => {
  it("scopes the animation and publishes the stagger on the bubble", () => {
    const { container } = render(
      <ChatMessage message="one two three" isBot timestamp="12:00" typing />,
    );

    const scope = container.querySelector(".sevi-reveal") as HTMLElement | null;
    expect(scope).not.toBeNull();
    expect(scope!.style.getPropertyValue("--sevi-stagger")).toBe("45ms");
    expect(words(container).length).toBeGreaterThan(0);
  });

  it("renders a settled message with no reveal markup at all", () => {
    const { container } = render(<ChatMessage message="one two three" isBot timestamp="12:00" />);

    expect(container.querySelector(".sevi-reveal")).toBeNull();
    expect(words(container)).toHaveLength(0);
  });

  // Structural guard, not a performance measurement: the memo is what keeps a
  // composer keystroke from re-parsing every reply on screen, and unwrapping
  // it would be silent.
  it("is memoized", () => {
    expect((ChatMessage as unknown as { $$typeof: symbol }).$$typeof).toBe(
      Symbol.for("react.memo"),
    );
  });
});
