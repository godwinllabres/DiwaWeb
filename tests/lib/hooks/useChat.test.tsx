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
      json: async () => ({
        response: "hello back",
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
      expect.objectContaining({ response: "hello back" }),
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

    expect(result.current.apiError).toBe("net fail");
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last?.text).toMatch(/trouble reaching the server/i);
    expect(onError).toHaveBeenCalled();
  });

  it("resetMessages keeps only the first message", () => {
    const { result } = renderHook(() =>
      useChat({ userId: "u", sessionId: "s", initialMessages: initial })
    );

    act(() => {
      result.current.pushMessage({ text: "extra", isBot: false });
      result.current.pushMessage({ text: "more", isBot: true });
    });
    expect(result.current.messages.length).toBe(3);

    act(() => result.current.resetMessages());
    expect(result.current.messages).toEqual(initial);
  });

  it("clearTypingMessageId nulls the value", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: "x", intent: "i", confidence: 1, message_id: 1 }),
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
