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

  it("invokes onFeedback when the helpful button is clicked", () => {
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
    expect(onFeedback).toHaveBeenCalledWith(true);
  });

  it("invokes onFeedback(false) on the not-helpful button", () => {
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
    expect(onFeedback).toHaveBeenCalledWith(false);
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
