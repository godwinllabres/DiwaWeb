import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "@/lib/hooks/useChat";
import type { Message } from "@/lib/types";

const initial: Message[] = [
  { id: 1, text: "welcome", isBot: true, timestamp: "12:00" },
];

describe("useChat", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("starts with the provided initialMessages and not typing", () => {
    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    expect(result.current.messages).toEqual(initial);
    expect(result.current.isTyping).toBe(false);
    expect(result.current.apiError).toBeNull();
  });

  it("pushMessage assigns sequential ids and timestamps", () => {
    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    let id1 = 0;
    let id2 = 0;
    act(() => {
      id1 = result.current.pushMessage({ text: "a", isBot: false });
      id2 = result.current.pushMessage({ text: "b", isBot: false });
    });

    expect(id2).toBe(id1 + 1);
    expect(result.current.messages[result.current.messages.length - 1]?.text).toBe("b");
    expect(result.current.messages[result.current.messages.length - 1]?.timestamp).toBeTruthy();
  });

  it("sendMessage hits /chat, pushes the bot reply, and sets typingMessageId", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      // v2 envelope — the reply body is `text`. This mock still said
      // `response` from the v1 shape, so the assertions below were comparing
      // undefined and the test had been failing silently against main.
      json: async () => ({
        text: "hello back",
        intent: "greeting",
        confidence: 0.9,
        message_id: 42,
      }),
    } as Response);

    const onBotResponse = vi.fn();
    const { result } = renderHook(() =>
      useChat({
        userId: "u",
        sessionId: "s",
        initialMessages: initial,
        onBotResponse,
      })
    );

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    await waitFor(() => expect(result.current.isTyping).toBe(false));

    const last = result.current.messages[result.current.messages.length - 1];
    expect(last?.text).toBe("hello back");
    expect(last?.isBot).toBe(true);
    expect(result.current.typingMessageId).toBe(last?.id);
    expect(onBotResponse).toHaveBeenCalledWith(
      expect.objectContaining({ text: "hello back" }),
      "hi"
    );
  });

  it("sendMessage sets apiError and pushes a fallback message on failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("net fail"));

    const onError = vi.fn();
    const { result } = renderHook(() =>
      useChat({
        userId: "u",
        sessionId: "s",
        initialMessages: initial,
        onError,
      })
    );

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    // The banner shows plain language, never the raw transport error — the
    // technical detail is handed to onError instead.
    expect(result.current.apiError).toBe(
      "Sevi couldn't connect. Please check your internet and try again."
    );
    expect(result.current.apiError).not.toMatch(/net fail/);
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last?.text).toMatch(/trouble connecting/i);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "net fail" }));
  });

  it.each([
    ["API /chat timed out after 45s", /took too long/i],
    ["API /chat failed: 429", /wait a moment/i],
    ["API /chat failed: 503", /CvSU side/i],
  ])("rewrites %s into plain language", async (raw, expected) => {
    fetchMock.mockRejectedValueOnce(new Error(raw));

    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    await act(async () => {
      await result.current.sendMessage("hi");
    });

    expect(result.current.apiError).toMatch(expected);
  });

  // "Start Over" means an empty chat. It used to keep messages[0], which was
  // correct only while the welcome bubble lived in this array; App renders it
  // separately now, so keeping one left the user's own first question on screen.
  it("resetMessages clears the transcript and restarts the id counter", () => {
    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    act(() => {
      result.current.pushMessage({ text: "extra", isBot: false });
      result.current.pushMessage({ text: "more", isBot: true });
    });
    expect(result.current.messages.length).toBe(3);

    act(() => result.current.resetMessages());
    expect(result.current.messages).toEqual([]);

    let nextId = 0;
    act(() => {
      nextId = result.current.pushMessage({ text: "fresh", isBot: false });
    });
    expect(nextId).toBe(1);
  });

  it("replaceMessages swaps the transcript and continues ids after it", () => {
    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    // Shape a restored conversation takes: renumbered from 1 by historyStore.
    const restored: Message[] = [
      { id: 1, text: "how do I enroll", isBot: false, timestamp: "09:00" },
      { id: 2, text: "here is how", isBot: true, timestamp: "09:00" },
    ];

    act(() => result.current.replaceMessages(restored));
    expect(result.current.messages).toEqual(restored);

    let nextId = 0;
    act(() => {
      nextId = result.current.pushMessage({ text: "thanks", isBot: false });
    });
    // Must not collide with a restored id, or React renders duplicate keys.
    expect(nextId).toBe(3);
  });

  it("clearTypingMessageId nulls the value", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "x", intent: "i", confidence: 1, message_id: 1 }),
    } as Response);

    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    await act(async () => {
      await result.current.sendMessage("hi");
    });
    expect(result.current.typingMessageId).not.toBeNull();

    act(() => result.current.clearTypingMessageId());
    expect(result.current.typingMessageId).toBeNull();
  });
});
