import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage } from "@/components/ChatMessage";

describe("ChatMessage", () => {
  it("renders a user message without bot avatar", () => {
    render(<ChatMessage message="hello" isBot={false} timestamp="12:00" />);
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.queryByLabelText(/helpful/i)).not.toBeInTheDocument();
  });

  it("renders a bot message and shows feedback buttons when messageId + onFeedback are present", () => {
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={() => {}}
      />
    );
    expect(screen.getByText("hi")).toBeInTheDocument();
    expect(screen.getByLabelText(/^helpful$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/not helpful/i)).toBeInTheDocument();
  });

  it("hides feedback buttons when no onFeedback is provided", () => {
    render(<ChatMessage message="hi" isBot={true} timestamp="12:00" messageId={1} />);
    expect(screen.queryByLabelText(/^helpful$/i)).not.toBeInTheDocument();
  });

  it("does not submit immediately on thumb click — opens reason panel instead", () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByLabelText(/^helpful$/i));

    // Reason panel opens; submission is deferred until the user picks
    // (or explicitly skips).
    expect(onFeedback).not.toHaveBeenCalled();
    expect(screen.getByText(/what worked well/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send feedback/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^skip$/i })).toBeInTheDocument();
  });

  it("shows the negative-prompt panel on the not-helpful button", () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByLabelText(/not helpful/i));
    expect(onFeedback).not.toHaveBeenCalled();
    expect(screen.getByText(/what went wrong/i)).toBeInTheDocument();
    // Negative reason chips
    expect(screen.getByRole("button", { name: /contains incorrect info/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /answered something else/i })).toBeInTheDocument();
  });

  it("submits with helpful=true and the picked reason + comment when Send is clicked", () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByLabelText(/^helpful$/i));
    fireEvent.click(screen.getByRole("button", { name: /got my answer/i }));
    fireEvent.change(screen.getByPlaceholderText(/anything else/i), {
      target: { value: "thanks!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    expect(onFeedback).toHaveBeenCalledWith({
      helpful: true,
      reason: "accurate",
      comment: "thanks!",
    });
  });

  it("submits with helpful=false and reason when Send is clicked on a negative thumb", () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByLabelText(/not helpful/i));
    fireEvent.click(screen.getByRole("button", { name: /contains incorrect info/i }));
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));

    expect(onFeedback).toHaveBeenCalledWith({
      helpful: false,
      reason: "wrong_info",
      comment: undefined,
    });
  });

  it("Skip sends only the bare thumb signal without reason/comment", () => {
    const onFeedback = vi.fn();
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByLabelText(/^helpful$/i));
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(onFeedback).toHaveBeenCalledWith({ helpful: true });
  });

  it("disables both feedback buttons after one is clicked", () => {
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        messageId={1}
        onFeedback={() => {}}
      />
    );

    fireEvent.click(screen.getByLabelText(/^helpful$/i));
    expect(screen.getByLabelText(/^helpful$/i)).toBeDisabled();
    expect(screen.getByLabelText(/not helpful/i)).toBeDisabled();
  });

  it("shows low-confidence hint when confidence < 0.5", () => {
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        confidence={0.3}
      />
    );
    expect(screen.getByText(/may not fully match/i)).toBeInTheDocument();
  });

  it("does not show low-confidence hint when confidence >= 0.5", () => {
    render(
      <ChatMessage
        message="hi"
        isBot={true}
        timestamp="12:00"
        confidence={0.8}
      />
    );
    expect(screen.queryByText(/may not fully match/i)).not.toBeInTheDocument();
  });

  it("renders timestamp text", () => {
    render(<ChatMessage message="hi" isBot={true} timestamp="08:30" />);
    expect(screen.getByText("08:30")).toBeInTheDocument();
  });
});
