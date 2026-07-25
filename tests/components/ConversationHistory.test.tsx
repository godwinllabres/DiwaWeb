import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConversationHistory } from "@/components/ConversationHistory";
import type { ConversationMeta } from "@/lib/historyStore";

const conversations: ConversationMeta[] = [
  {
    id: "c1",
    title: "how do I enroll",
    startedAt: Date.now() - 86_400_000,
    updatedAt: Date.now() - 86_400_000,
    turns: 4,
  },
];

function setup(over: Partial<React.ComponentProps<typeof ConversationHistory>> = {}) {
  const props = {
    conversations,
    enabled: true,
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onDelete: vi.fn(),
    onClearAll: vi.fn(),
    ...over,
  };
  render(<ConversationHistory {...props} />);
  return props;
}

describe("when saving is off", () => {
  it("shows the switch unchecked and no conversations", () => {
    setup({ enabled: false });

    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText("how do I enroll")).not.toBeInTheDocument();
  });

  // The warning is the whole reason this defaults to off — a transcript on a
  // library PC is readable by the next student.
  it("warns about shared computers", () => {
    setup({ enabled: false });
    expect(screen.getByText(/shared or library computers/i)).toBeInTheDocument();
  });

  it("toggling asks to turn it on", () => {
    const { onToggle } = setup({ enabled: false });
    fireEvent.click(screen.getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });
});

describe("when saving is on", () => {
  it("lists saved conversations with a coarse timestamp", () => {
    setup();
    expect(screen.getByText("how do I enroll")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("opens a conversation when its row is clicked", () => {
    const { onOpen } = setup();
    fireEvent.click(screen.getByText("how do I enroll"));
    expect(onOpen).toHaveBeenCalledWith("c1");
  });

  it("offers per-conversation deletion with an accessible name", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: /delete chat: how do I enroll/i }));
    expect(onDelete).toHaveBeenCalledWith("c1");
  });

  // Erasure has to be reachable from the same place, not a settings screen.
  it("offers a delete-everything action", () => {
    const { onClearAll } = setup();
    fireEvent.click(screen.getByText(/delete all chats on this device/i));
    expect(onClearAll).toHaveBeenCalled();
  });

  it("explains the retention window when there is nothing saved yet", () => {
    setup({ conversations: [] });
    expect(screen.getByText(/removed after 30 days/i)).toBeInTheDocument();
  });
});
