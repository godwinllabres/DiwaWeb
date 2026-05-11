import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BookOpen } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";

describe("CategoryCard", () => {
  it("renders title and description", () => {
    render(
      <CategoryCard
        icon={BookOpen}
        title="Admissions"
        description="How to apply"
        onClick={() => {}}
      />
    );

    expect(screen.getByText("Admissions")).toBeInTheDocument();
    expect(screen.getByText("How to apply")).toBeInTheDocument();
  });

  it("invokes onClick when activated", () => {
    const onClick = vi.fn();
    render(
      <CategoryCard
        icon={BookOpen}
        title="Title"
        description="Desc"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
