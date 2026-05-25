import { useCallback, useRef, useState } from "react";
import { api, type ChatResponse } from "@/lib/api";
import type { Message } from "@/lib/types";
import { timeNow } from "@/lib/time";

export interface UseChatOptions {
  userId: string;
  sessionId: string;
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
  resetMessages: () => void;
  clearTypingMessageId: () => void;
  setApiError: (err: string | null) => void;
}

const FALLBACK_ERROR_MESSAGE =
  "I'm having trouble reaching the server right now. Please try again in a moment, or contact CvSU at (046) 430-6332.";

export function useChat({
  userId,
  sessionId,
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

  const sendMessage = useCallback(
    async (text: string) => {
      setIsTyping(true);
      setApiError(null);

      try {
        const res = await api.chat({
          message: text,
          user_id: userId,
          session_id: sessionId,
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
          source: res.source,
          refusalReason: res.refusal_reason ?? undefined,
          displayHint: res.display_hint,
        });
        setTypingMessageId(botId);

        onBotResponse?.(res, text);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error";
        setApiError(message);
        pushMessage({ text: FALLBACK_ERROR_MESSAGE, isBot: true });
        onError?.(error);
      } finally {
        setIsTyping(false);
      }
    },
    [userId, sessionId, pushMessage, onBotResponse, onError]
  );

  const resetMessages = useCallback(() => {
    setMessages((prev) => prev.slice(0, 1));
    idCounterRef.current = 2;
    setApiError(null);
    setTypingMessageId(null);
  }, []);

  const clearTypingMessageId = useCallback(() => setTypingMessageId(null), []);

  return {
    messages,
    isTyping,
    typingMessageId,
    apiError,
    pushMessage,
    sendMessage,
    resetMessages,
    clearTypingMessageId,
    setApiError,
  };
}
