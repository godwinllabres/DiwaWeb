import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "@/components/TypingIndicator";

describe("TypingIndicator", () => {
  it("renders three animated dots inside the bubble", () => {
    const { container } = render(<TypingIndicator />);
    expect(container.querySelectorAll("span").length).toBeGreaterThanOrEqual(3);
  });

  it("shows the Sevi thinking sticker as the avatar", () => {
    render(<TypingIndicator />);
    const img = screen.getByAltText("Sevi is thinking") as HTMLImageElement;
    expect(img.src).toContain("sevi-stickers/sevi-thinking.gif");
  });
});
