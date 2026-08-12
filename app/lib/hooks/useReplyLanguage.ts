import { useCallback, useState } from "react";
import { readLocal, writeLocal } from "@/lib/storage";
import type { ReplyLanguage } from "@/lib/api";

const KEY = "sevi.replyLanguage";

const VALUES: readonly ReplyLanguage[] = ["auto", "en", "fil"];

function isReplyLanguage(v: string | null): v is ReplyLanguage {
  return v !== null && (VALUES as readonly string[]).includes(v);
}

/**
 * The reader's language preference, persisted per browser.
 *
 * Asked for in UAT by staff fielding walk-in inquiries: "allow users to select
 * their preferred language (English or Filipino) before initiating the
 * conversation". Detection alone cannot serve that case — the person typing
 * and the person who has to read the answer are often not the same, and a
 * parent who opens with a few English words gets an English reply back.
 *
 * Persisted rather than per-session because it is a property of the reader,
 * not of the conversation: someone who needs Filipino needs it every visit.
 * Reads go through lib/storage, so a blocked-storage browser degrades to an
 * in-memory preference for the session instead of throwing at mount.
 */
export function useReplyLanguage() {
  const [language, setLanguageState] = useState<ReplyLanguage>(() => {
    const stored = readLocal(KEY);
    return isReplyLanguage(stored) ? stored : "auto";
  });

  const setLanguage = useCallback((next: ReplyLanguage) => {
    setLanguageState(next);
    writeLocal(KEY, next);
  }, []);

  return { language, setLanguage };
}
