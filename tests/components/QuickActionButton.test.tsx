import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Home } from "lucide-react";
import { QuickActionButton } from "@/components/QuickActionButton";

describe("QuickActionButton", () => {
  it("renders the label", () => {
    render(<QuickActionButton icon={Home} label="Start Over" onClick={() => {}} />);
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<QuickActionButton icon={Home} label="Click Me" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
