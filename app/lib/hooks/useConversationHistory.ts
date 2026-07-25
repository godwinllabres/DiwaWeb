/**
 * React binding for the on-device transcript archive (lib/historyStore.ts).
 *
 * Owns three things the store deliberately does not: when to write, keeping
 * the conversation list fresh across tabs, and the opt-in switch's state.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import {
  type ConversationMeta,
  clearHistory,
  deleteConversation,
  isHistoryEnabled,
  loadConversation,
  loadIndex,
  pruneHistory,
  saveConversation,
  setHistoryEnabled,
} from "@/lib/historyStore";

/**
 * Long enough that a burst of pushes inside one turn (user bubble, bot reply,
 * low-confidence follow-up) collapses into a single serialise-and-write;
 * short enough that closing the tab right after reading a reply still keeps
 * it. localStorage writes are synchronous and block the main thread, so this
 * is the difference between one and three jank points per turn on a phone.
 */
const WRITE_DEBOUNCE_MS = 400;

export interface UseConversationHistoryOptions {
  deviceId: string;
  /** The conversation currently on screen — see getConversationId(). */
  conversationId: string;
  /** Live transcript from useChat. Identity changes drive the write. */
  messages: readonly Message[];
  /** Privacy consent. Nothing is written before it is given, whatever the
   *  toggle says, so a decline is not quietly overridden by a stale setting. */
  canPersist: boolean;
}

export interface UseConversationHistoryApi {
  /** Whether the student has opted in to keeping chats on this device. */
  enabled: boolean;
  /** Turning it off also deletes what was already saved. */
  setEnabled: (on: boolean) => void;
  /** Saved conversations, newest first, excluding the one on screen. */
  conversations: ConversationMeta[];
  /** Messages for a saved conversation, ready for useChat.replaceMessages. */
  restore: (id: string) => Message[];
  remove: (id: string) => void;
  clearAll: () => void;
}

export function useConversationHistory({
  deviceId,
  conversationId,
  messages,
  canPersist,
}: UseConversationHistoryOptions): UseConversationHistoryApi {
  const [enabled, setEnabledState] = useState(false);
  const [conversations, setConversations] = useState<ConversationMeta[]>([]);
  // Read in the write effect without making it a dependency: a change of
  // conversation must not re-run the write against the previous id's messages.
  const conversationRef = useRef(conversationId);
  conversationRef.current = conversationId;

  // Hydrate after mount rather than during render, so a blocked-storage read
  // can never throw during the first paint (lib/storage.ts returns null there,
  // but the mount-effect shape also keeps this SSR-safe alongside useConsent).
  useEffect(() => {
    const on = isHistoryEnabled();
    setEnabledState(on);
    if (on) setConversations(pruneHistory(deviceId));
  }, [deviceId]);

  // Another tab saving a turn, or clearing history, should be visible here —
  // "clear chats on this device" that leaves a stale list in a second tab is
  // exactly the kind of thing a student reads as "it did not work".
  useEffect(() => {
    if (!enabled) return;
    const onStorage = () => setConversations(loadIndex(deviceId));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [enabled, deviceId]);

  useEffect(() => {
    if (!enabled || !canPersist || messages.length === 0) return;
    const id = conversationRef.current;
    const timer = window.setTimeout(() => {
      saveConversation(deviceId, id, messages);
      setConversations(loadIndex(deviceId));
    }, WRITE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, canPersist, deviceId, messages]);

  const setEnabled = useCallback(
    (on: boolean) => {
      setHistoryEnabled(deviceId, on);
      setEnabledState(on);
      setConversations(on ? pruneHistory(deviceId) : []);
    },
    [deviceId],
  );

  const restore = useCallback(
    (id: string) => loadConversation(deviceId, id),
    [deviceId],
  );

  const remove = useCallback(
    (id: string) => {
      deleteConversation(deviceId, id);
      setConversations(loadIndex(deviceId));
    },
    [deviceId],
  );

  const clearAll = useCallback(() => {
    clearHistory(deviceId);
    setConversations([]);
  }, [deviceId]);

  return {
    enabled,
    setEnabled,
    // The open conversation is the screen, not a history entry.
    conversations: conversations.filter((c) => c.id !== conversationId),
    restore,
    remove,
    clearAll,
  };
}
