import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConversationHistory } from "@/lib/hooks/useConversationHistory";
import { loadConversation, saveConversation, setHistoryEnabled } from "@/lib/historyStore";
import type { Message } from "@/lib/types";

const DEVICE = "device-1";
const CONVERSATION = "conv-1";

const messages: Message[] = [
  { id: 1, text: "how do I enroll", isBot: false, timestamp: "09:00" },
  { id: 2, text: "here is how", isBot: true, timestamp: "09:00" },
];

function render(over: Partial<Parameters<typeof useConversationHistory>[0]> = {}) {
  return renderHook((props: Partial<Parameters<typeof useConversationHistory>[0]> = over) =>
    useConversationHistory({
      deviceId: DEVICE,
      conversationId: CONVERSATION,
      messages,
      canPersist: true,
      ...over,
      ...props,
    }),
  );
}

/** The hook debounces writes; nothing lands until the timer runs. */
function flushWrite() {
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("gates on opt-in and consent", () => {
  it("writes nothing while the toggle is off", () => {
    render();
    flushWrite();
    expect(loadConversation(DEVICE, CONVERSATION)).toEqual([]);
  });

  // The toggle is a stored preference; consent is per-session. A stale
  // "on" from a previous visit must not resurrect writing before the student
  // has agreed again in this one.
  it("writes nothing before consent even when the toggle is on", () => {
    setHistoryEnabled(DEVICE, true);
    render({ canPersist: false });
    flushWrite();
    expect(loadConversation(DEVICE, CONVERSATION)).toEqual([]);
  });

  it("persists the transcript once both are satisfied", () => {
    setHistoryEnabled(DEVICE, true);
    const { result } = render();
    expect(result.current.enabled).toBe(true);

    flushWrite();
    expect(loadConversation(DEVICE, CONVERSATION).map((m) => m.text)).toEqual([
      "how do I enroll",
      "here is how",
    ]);
  });

  it("does not write until the debounce elapses", () => {
    setHistoryEnabled(DEVICE, true);
    render();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(loadConversation(DEVICE, CONVERSATION)).toEqual([]);

    flushWrite();
    expect(loadConversation(DEVICE, CONVERSATION)).toHaveLength(2);
  });
});

describe("the toggle", () => {
  it("turning it on then off leaves nothing behind", () => {
    const { result } = render();

    act(() => result.current.setEnabled(true));
    flushWrite();
    expect(loadConversation(DEVICE, CONVERSATION)).toHaveLength(2);

    act(() => result.current.setEnabled(false));
    expect(loadConversation(DEVICE, CONVERSATION)).toEqual([]);
    expect(result.current.conversations).toEqual([]);
  });
});

describe("the conversation list", () => {
  it("omits the conversation currently on screen", () => {
    setHistoryEnabled(DEVICE, true);
    saveConversation(DEVICE, "older", [{ ...messages[0]!, text: "an older chat" }]);

    const { result } = render();
    flushWrite();

    expect(result.current.conversations.map((c) => c.id)).toEqual(["older"]);
  });

  it("restore returns a saved transcript", () => {
    setHistoryEnabled(DEVICE, true);
    saveConversation(DEVICE, "older", [{ ...messages[0]!, text: "an older chat" }]);

    const { result } = render();
    expect(result.current.restore("older").map((m) => m.text)).toEqual(["an older chat"]);
  });

  it("remove drops one conversation from the list", () => {
    setHistoryEnabled(DEVICE, true);
    saveConversation(DEVICE, "older", [{ ...messages[0]!, text: "an older chat" }]);

    const { result } = render();
    act(() => result.current.remove("older"));
    expect(result.current.conversations).toEqual([]);
  });

  it("clearAll empties the list and the store", () => {
    setHistoryEnabled(DEVICE, true);
    saveConversation(DEVICE, "older", [{ ...messages[0]!, text: "an older chat" }]);

    const { result } = render();
    act(() => result.current.clearAll());

    expect(result.current.conversations).toEqual([]);
    expect(loadConversation(DEVICE, "older")).toEqual([]);
  });
});
