import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "@/components/TypingIndicator";

describe("TypingIndicator", () => {
  it("renders three animated dots inside the bubble", () => {
    const { container } = render(<TypingIndicator />);
    expect(container.querySelectorAll("span").length).toBeGreaterThanOrEqual(3);
  });

  it("includes a Bot icon avatar", () => {
    const { container } = render(<TypingIndicator />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
