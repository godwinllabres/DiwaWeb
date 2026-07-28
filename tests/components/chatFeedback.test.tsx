import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatMessage, type FeedbackSubmission } from "@/components/ChatMessage";

/**
 * Characterization tests for the feedback controls in ChatMessage
 * (FeedbackButtons + FeedbackReasonPanel), exercised through <ChatMessage>.
 *
 * These pin CURRENT behaviour ahead of a file split. They deliberately record
 * quirks as-is (e.g. Skip discarding an already-typed comment) rather than
 * asserting what the controls arguably *should* do.
 *
 * The basic "thumbs need messageId + onFeedback" gate already lives in
 * tests/components/ChatMessage.test.tsx and is not repeated here.
 */

type FeedbackHandler = (
  submission: FeedbackSubmission,
  intent: string | undefined,
  messageId: number | undefined,
) => void;

function renderBubble(props: Partial<React.ComponentProps<typeof ChatMessage>> = {}) {
  const onFeedback = vi.fn<FeedbackHandler>();
  render(
    <ChatMessage
      message="hi"
      isBot={true}
      timestamp="12:00"
      messageId={1}
      onFeedback={onFeedback}
      {...props}
    />,
  );
  return { onFeedback };
}

const thumbUp = () => screen.getByLabelText(/^helpful$/i);
const thumbDown = () => screen.getByLabelText(/not helpful/i);
const sendBtn = () => screen.getByRole("button", { name: /send feedback/i });

describe("ChatMessage feedback — reason taxonomy", () => {
  it("offers exactly the four positive reasons on a thumbs-up", () => {
    renderBubble();
    fireEvent.click(thumbUp());

    for (const label of [
      "Got my answer",
      "Easy to understand",
      "Pointed me the right way",
      "Something else",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // Negative-only reasons must not leak into the positive panel.
    expect(screen.queryByRole("button", { name: /missing key details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /looks out of date/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hard to understand/i })).not.toBeInTheDocument();
  });

  it("offers exactly the six negative reasons on a thumbs-down", () => {
    renderBubble();
    fireEvent.click(thumbDown());

    for (const label of [
      "Contains incorrect info",
      "Answered something else",
      "Missing key details",
      "Looks out of date",
      "Hard to understand",
      "Something else",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // Positive-only reasons must not leak into the negative panel.
    expect(screen.queryByRole("button", { name: /got my answer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /pointed me the right way/i })).not.toBeInTheDocument();
  });

  // "Something else" is the one label shared by both lists, and it maps to the
  // same `other` code on either side.
  it("maps 'Something else' to the shared 'other' code on both sides", () => {
    const { onFeedback } = renderBubble();
    fireEvent.click(thumbDown());
    fireEvent.click(screen.getByRole("button", { name: "Something else" }));
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: false, reason: "other", comment: undefined },
      undefined,
      1,
    );
  });

  it("uses a different textarea placeholder for positive vs negative", () => {
    const { onFeedback } = renderBubble();
    fireEvent.click(thumbUp());
    expect(screen.getByPlaceholderText(/anything else you'd like us to know/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel feedback/i }));

    fireEvent.click(thumbDown());
    expect(screen.getByPlaceholderText(/tell us more so we can fix it/i)).toBeInTheDocument();
    expect(onFeedback).not.toHaveBeenCalled();
  });

  it("caps the free-text comment at 500 characters", () => {
    renderBubble();
    fireEvent.click(thumbUp());
    expect(screen.getByPlaceholderText(/anything else/i)).toHaveAttribute("maxlength", "500");
  });
});

describe("ChatMessage feedback — submission contract", () => {
  // The bubble hands its own intent and messageId back as the 2nd and 3rd
  // arguments so App can pass ONE memoized callback for every message instead
  // of a per-message closure. Pin the full call, negative side, with a comment.
  it("passes submission, intent and messageId as three separate arguments", () => {
    const { onFeedback } = renderBubble({ intent: "enrollment_schedule", messageId: 77 });

    fireEvent.click(thumbDown());
    fireEvent.click(screen.getByRole("button", { name: /missing key details/i }));
    fireEvent.change(screen.getByPlaceholderText(/tell us more/i), {
      target: { value: "no deadline given" },
    });
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledTimes(1);
    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: false, reason: "incomplete", comment: "no deadline given" },
      "enrollment_schedule",
      77,
    );
  });

  it("submits a comment with no reason selected", () => {
    const { onFeedback } = renderBubble({ intent: "greeting" });

    fireEvent.click(thumbUp());
    fireEvent.change(screen.getByPlaceholderText(/anything else/i), {
      target: { value: "nice" },
    });
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: true, reason: undefined, comment: "nice" },
      "greeting",
      1,
    );
  });

  it("trims the comment and drops a whitespace-only one", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.change(screen.getByPlaceholderText(/anything else/i), {
      target: { value: "   \n  " },
    });
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: true, reason: undefined, comment: undefined },
      undefined,
      1,
    );
  });

  it("trims surrounding whitespace off a real comment", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.change(screen.getByPlaceholderText(/anything else/i), {
      target: { value: "  thanks!  " },
    });
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ comment: "thanks!" }),
      undefined,
      1,
    );
  });

  it("keeps only the last reason clicked (single select)", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbDown());
    fireEvent.click(screen.getByRole("button", { name: /contains incorrect info/i }));
    fireEvent.click(screen.getByRole("button", { name: /hard to understand/i }));
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: false, reason: "confusing", comment: undefined },
      undefined,
      1,
    );
  });

  // Chips toggle: clicking the already-selected reason clears it, so the
  // submission goes out with no reason at all.
  it("clicking the selected reason again deselects it", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.click(screen.getByRole("button", { name: /got my answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /got my answer/i }));
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: true, reason: undefined, comment: undefined },
      undefined,
      1,
    );
  });

  // Quirk: Skip is a hard bail-out — it sends the bare thumb even if the user
  // already picked a reason and typed a comment, and it omits the keys entirely
  // rather than sending them as undefined.
  it("Skip discards an already-picked reason and typed comment", () => {
    const { onFeedback } = renderBubble({ intent: "fees" });

    fireEvent.click(thumbDown());
    fireEvent.click(screen.getByRole("button", { name: /looks out of date/i }));
    fireEvent.change(screen.getByPlaceholderText(/tell us more/i), {
      target: { value: "2019 tuition table" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(onFeedback).toHaveBeenCalledWith({ helpful: false }, "fees", 1);
  });

  // messageId 0 is a legitimate id — the gate is `messageId !== undefined`,
  // not truthiness — so the thumbs render and 0 is passed through.
  it("treats messageId 0 as a real id", () => {
    const { onFeedback } = renderBubble({ messageId: 0 });

    expect(thumbUp()).toBeInTheDocument();
    fireEvent.click(thumbUp());
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    expect(onFeedback).toHaveBeenCalledWith({ helpful: true }, undefined, 0);
  });
});

describe("ChatMessage feedback — panel lifecycle", () => {
  it("Cancel closes the panel, sends nothing, and re-enables both thumbs", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.click(screen.getByRole("button", { name: /cancel feedback/i }));

    expect(onFeedback).not.toHaveBeenCalled();
    expect(screen.queryByText(/what worked well/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send feedback/i })).not.toBeInTheDocument();
    expect(thumbUp()).not.toBeDisabled();
    expect(thumbDown()).not.toBeDisabled();
  });

  it("Cancel clears the picked reason and comment, so reopening starts blank", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.click(screen.getByRole("button", { name: /got my answer/i }));
    fireEvent.change(screen.getByPlaceholderText(/anything else/i), {
      target: { value: "first draft" },
    });
    fireEvent.click(screen.getByRole("button", { name: /cancel feedback/i }));

    // Reopen on the OTHER thumb: the textarea is empty again and submitting
    // straight away carries neither the old reason nor the old comment.
    fireEvent.click(thumbDown());
    expect(screen.getByPlaceholderText(/tell us more/i)).toHaveValue("");
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledWith(
      { helpful: false, reason: undefined, comment: undefined },
      undefined,
      1,
    );
  });

  it("shows a labelled cancel control while the panel is open", () => {
    renderBubble();
    fireEvent.click(thumbDown());
    expect(screen.getByRole("button", { name: /cancel feedback/i })).toBeInTheDocument();
  });
});

describe("ChatMessage feedback — submitted state", () => {
  it("closes the panel and locks the thumbs after Send", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.click(sendBtn());

    expect(onFeedback).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /send feedback/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/what worked well/i)).not.toBeInTheDocument();
    expect(thumbUp()).toBeDisabled();
    expect(thumbDown()).toBeDisabled();
  });

  // The submitted thumbs-up swaps its icon for a tick. Asserted on the lucide
  // icon class (not a Tailwind utility) because that is the only observable
  // difference between "picked" and "sent".
  it("swaps the thumbs-up glyph for a check once submitted", () => {
    renderBubble();
    const before = thumbUp().querySelector("svg")?.getAttribute("class") ?? "";
    expect(before).toContain("thumbs-up");

    fireEvent.click(thumbUp());
    fireEvent.click(sendBtn());

    const after = thumbUp().querySelector("svg")?.getAttribute("class") ?? "";
    expect(after).toContain("check");
    expect(after).not.toContain("thumbs-up");
  });

  // A submitted negative keeps the thumbs-down glyph — the tick is positive-only.
  it("keeps the thumbs-down glyph after a negative submission", () => {
    renderBubble();
    fireEvent.click(thumbDown());
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));

    const icon = thumbDown().querySelector("svg")?.getAttribute("class") ?? "";
    expect(icon).toContain("thumbs-down");
  });

  it("does not re-submit when either thumb is clicked again", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbUp());
    fireEvent.click(sendBtn());
    fireEvent.click(thumbUp());
    fireEvent.click(thumbDown());

    expect(onFeedback).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /send feedback/i })).not.toBeInTheDocument();
  });

  it("does not re-submit after Skip either", () => {
    const { onFeedback } = renderBubble();

    fireEvent.click(thumbDown());
    fireEvent.click(screen.getByRole("button", { name: /^skip$/i }));
    fireEvent.click(thumbDown());

    expect(onFeedback).toHaveBeenCalledTimes(1);
  });
});

describe("ChatMessage feedback — gating", () => {
  it("renders no thumbs on a follow-up bubble even with messageId + onFeedback", () => {
    const { onFeedback } = renderBubble({ followUp: true });

    expect(screen.queryByLabelText(/^helpful$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/not helpful/i)).not.toBeInTheDocument();
    expect(onFeedback).not.toHaveBeenCalled();
  });

  it("renders no thumbs on a user message even with messageId + onFeedback", () => {
    renderBubble({ isBot: false });
    expect(screen.queryByLabelText(/^helpful$/i)).not.toBeInTheDocument();
  });

  // The thumbs are gated on the word-reveal finishing, so a bubble that is
  // still revealing (typing) offers no feedback yet.
  it("withholds the thumbs while the reply is still revealing", () => {
    renderBubble({ typing: true });
    expect(screen.queryByLabelText(/^helpful$/i)).not.toBeInTheDocument();
  });
});
