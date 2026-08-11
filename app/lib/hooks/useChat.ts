import { useCallback, useRef, useState } from "react";
import { api, BusyError, type ChatResponse } from "@/lib/api";
import type { Message } from "@/lib/types";
import { timeNow } from "@/lib/time";
import { getDeviceClass } from "@/lib/ids";

export interface UseChatOptions {
  userId: string;
  sessionId: string;
  /** Stable per-browser id (getDeviceId()). Sent with every turn so usage can
   *  be counted per device, not just per session. */
  deviceId?: string;
  initialMessages: Message[];
  onBotResponse?: (response: ChatResponse, userInput: string) => void;
  onError?: (error: unknown) => void;
}

export interface UseChatApi {
  messages: Message[];
  isTyping: boolean;
  typingMessageId: number | null;
  apiError: string | null;
  pushMessage: (msg: Omit<Message, "id" | "timestamp"> & { timestamp?: string }) => number;
  sendMessage: (text: string) => Promise<void>;
  /** Re-send the last message after a failure — no new user bubble is added. */
  retryLast: () => void;
  /** Swap the whole transcript, e.g. when a saved conversation is reopened
   *  from the history rail. Renumbers the id counter to match. */
  replaceMessages: (next: readonly Message[]) => void;
  /** Clear the transcript back to empty — what "Start Over" means. */
  resetMessages: () => void;
  clearTypingMessageId: () => void;
  setApiError: (err: string | null) => void;
}

const FALLBACK_ERROR_MESSAGE =
  "I'm having trouble connecting right now. Please try again in a moment, or call CvSU at 4839250.";

/**
 * Turn a raw transport failure into a sentence a student can act on.
 *
 * `api.request` throws developer-facing text ("API /chat failed: 500",
 * "API /chat timed out after 45s") — useful in a console, meaningless in a
 * banner. The raw error still reaches `onError` and the console, so nothing
 * is lost for debugging; only the wording the user reads changes.
 */
function plainApiError(error: unknown): string {
  // Already phrased for a student, and already retried once by api.request —
  // checked before the status regexes below, whose 5xx branch would otherwise
  // claim something went wrong when the server is simply busy.
  if (error instanceof BusyError) {
    return error.message;
  }
  const raw = error instanceof Error ? error.message : "";
  if (/timed out/i.test(raw)) {
    return "Sevi took too long to answer. Please try again.";
  }
  if (/\b429\b/.test(raw)) {
    return "That's a lot of questions at once — please wait a moment, then try again.";
  }
  if (/\b5\d\d\b/.test(raw)) {
    return "Something went wrong on the CvSU side. Please try again in a moment.";
  }
  return "Sevi couldn't connect. Please check your internet and try again.";
}

export function useChat({
  userId,
  sessionId,
  deviceId,
  initialMessages,
  onBotResponse,
  onError,
}: UseChatOptions): UseChatApi {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const idCounterRef = useRef(initialMessages.length + 1);

  const pushMessage = useCallback(
    (msg: Omit<Message, "id" | "timestamp"> & { timestamp?: string }) => {
      const id = idCounterRef.current++;
      setMessages((prev) => [
        ...prev,
        { id, timestamp: msg.timestamp ?? timeNow(), ...msg },
      ]);
      return id;
    },
    []
  );

  const lastSentRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      lastSentRef.current = text;
      setIsTyping(true);
      setApiError(null);

      try {
        const res = await api.chat({
          message: text,
          user_id: userId,
          session_id: sessionId,
          device_id: deviceId,
          // Read per turn, not per session: the student may rotate the phone
          // mid-conversation, and which orientation they were actually in is
          // the thing we want to be able to count.
          device_class: getDeviceClass(),
        });

        const botId = pushMessage({
          text: res.text,
          summary: res.summary ?? undefined,
          isBot: true,
          intent: res.intent,
          confidence: res.confidence,
          messageId: res.message_id,
          cards: res.cards,
          context: res.context ?? undefined,
          suggestions: res.suggestions,
          sources: res.sources,
          source: res.source,
          refusalReason: res.refusal_reason ?? undefined,
          displayHint: res.display_hint,
        });
        setTypingMessageId(botId);

        onBotResponse?.(res, text);
      } catch (error: unknown) {
        // Keep the technical detail where developers look for it; the banner
        // gets the plain-language version.
        console.warn("chat request failed", error);
        setApiError(plainApiError(error));
        // followUp: true — no feedback thumbs on the error bubble.
        pushMessage({ text: FALLBACK_ERROR_MESSAGE, isBot: true, followUp: true });
        onError?.(error);
      } finally {
        setIsTyping(false);
      }
    },
    [userId, sessionId, deviceId, pushMessage, onBotResponse, onError]
  );

  const retryLast = useCallback(() => {
    if (lastSentRef.current) void sendMessage(lastSentRef.current);
  }, [sendMessage]);

  /**
   * The id counter is reseeded from the incoming length because ids are render
   * keys, not identities: restored messages are renumbered 1..n by
   * historyStore, so the next push has to continue from n+1 or React sees two
   * bubbles claiming the same key.
   */
  const replaceMessages = useCallback((next: readonly Message[]) => {
    setMessages([...next]);
    idCounterRef.current = next.length + 1;
    setApiError(null);
    setTypingMessageId(null);
    lastSentRef.current = null;
  }, []);

  const resetMessages = useCallback(() => replaceMessages([]), [replaceMessages]);

  const clearTypingMessageId = useCallback(() => setTypingMessageId(null), []);

  return {
    messages,
    isTyping,
    typingMessageId,
    apiError,
    pushMessage,
    sendMessage,
    retryLast,
    replaceMessages,
    resetMessages,
    clearTypingMessageId,
    setApiError,
  };
}
