/**
 * On-device transcript archive.
 *
 * Keeps past conversations in localStorage so a student can close the tab and
 * come back to what Sevi told them. Off unless the student turns it on: campus
 * lab and library PCs are shared, and a transcript left behind on a shared
 * browser profile is readable by whoever sits down next. See
 * sevi-api/docs/privacy_compliance.md for the processing record.
 *
 * Layout — one key per conversation, plus an index:
 *
 *   sevi_hist_index_v1:<deviceId>                  → ConversationMeta[]
 *   sevi_hist_conv_v1:<deviceId>:<conversationId>   → PersistedMessage[]
 *
 * The split is what makes concurrent tabs safe. `conversationId` comes from
 * getConversationId(), which is sessionStorage-backed and therefore already
 * per-tab, so two open tabs write to two different keys instead of racing a
 * read-modify-write over one large blob. It also means restoring one
 * conversation does not parse the entire archive, and pruning is a delete
 * rather than a rewrite.
 *
 * Nothing here is keyed by the chat `session_id`: that value is a bearer
 * capability for the AIS token (see lib/ids.ts getConversationId), and none of
 * it belongs in localStorage.
 */

import type { ChatCard, DisplayHint, ResponseSource } from "@/lib/api";
import type { Message } from "@/lib/types";
import { keysWithPrefix, readLocal, removeLocal, writeLocal } from "@/lib/storage";

const INDEX_PREFIX = "sevi_hist_index_v1";
const CONV_PREFIX = "sevi_hist_conv_v1";
const OPT_IN_KEY = "sevi_hist_opt_in_v1";

/** Caps. Generous enough that no real student hits them, low enough that the
 *  archive cannot grow into the ~5MB localStorage ceiling and start evicting
 *  the consent record and device id alongside itself. */
export const MAX_CONVERSATIONS = 30;
export const MAX_MESSAGES = 200;
export const RETENTION_DAYS = 30;

const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const MAX_TITLE_CHARS = 60;

export interface ConversationMeta {
  /** Opaque local id from getConversationId() — never the chat session id. */
  id: string;
  title: string;
  /** Epoch ms — stored as numbers so sorting needs no date parsing. */
  startedAt: number;
  updatedAt: number;
  turns: number;
}

/**
 * A saved turn. Deliberately narrower than `Message`.
 *
 * `confidence` and `context` are dropped: neither is rendered on a restored
 * bubble, and `context` carries live DV/UACS lookup keys. `messageId` is kept
 * on purpose — it is the join back to the server's `chat_messages` row.
 */
export interface PersistedMessage {
  text: string;
  summary?: string;
  isBot: boolean;
  timestamp: string;
  intent?: string;
  messageId?: number;
  followUp?: boolean;
  suggestions?: string[];
  displayHint?: DisplayHint;
  source?: ResponseSource;
  cards?: ChatCard[];
  /** Set when scrubbing replaced live-record content on this turn. */
  redacted?: boolean;
}

/**
 * Replies that came from an authenticated AIS/connector lookup, and the card
 * kinds that carry their payload.
 *
 * These are never written to disk. A disbursement voucher holds a payee and an
 * amount, and the privacy record states plainly that AIS data is not persisted
 * client-side — writing one into a shared lab PC's localStorage is what would
 * turn a convenience feature into an incident. The turn is kept as a
 * placeholder so the restored conversation still reads as a conversation.
 */
const LIVE_RECORD_SOURCES: ReadonlySet<string> = new Set(["ais_mcp", "connectors_mcp"]);
const LIVE_RECORD_CARDS: ReadonlySet<string> = new Set(["dv"]);

const REDACTED_TEXT =
  "This reply showed live CvSU records, so it is not saved on this device. Ask again to see it.";

/**
 * Set once a write fails for a reason eviction cannot fix, so the app stops
 * re-serialising the transcript on every keystroke-free render for the rest of
 * the page's life. Reset on reload, which is the right granularity: the user
 * may have freed space by then.
 */
let degraded = false;

// ─── keys ────────────────────────────────────────────────────────────────────

const indexKey = (deviceId: string) => `${INDEX_PREFIX}:${deviceId}`;
const convKey = (deviceId: string, id: string) => `${CONV_PREFIX}:${deviceId}:${id}`;

// ─── opt-in ──────────────────────────────────────────────────────────────────

/** Off unless explicitly switched on — see the module note on shared PCs. */
export function isHistoryEnabled(): boolean {
  return readLocal(OPT_IN_KEY) === "1";
}

/** Turning it off deletes what was already saved. A toggle that only stops
 *  future writes would leave the student believing the old transcripts are
 *  gone from the shared machine when they are not. */
export function setHistoryEnabled(deviceId: string, on: boolean): void {
  if (on) {
    writeLocal(OPT_IN_KEY, "1");
    degraded = false;
  } else {
    removeLocal(OPT_IN_KEY);
    clearHistory(deviceId);
  }
}

// ─── message ⇄ storage ───────────────────────────────────────────────────────

function scrubCards(cards: ChatCard[] | undefined): ChatCard[] | undefined {
  if (!cards?.length) return undefined;
  const kept = cards.filter((c) => !LIVE_RECORD_CARDS.has(c.kind));
  return kept.length ? kept : undefined;
}

export function toPersisted(msg: Message): PersistedMessage {
  if (msg.isBot && msg.source && LIVE_RECORD_SOURCES.has(msg.source)) {
    return {
      text: REDACTED_TEXT,
      isBot: true,
      timestamp: msg.timestamp,
      // followUp suppresses the feedback thumbs — there is nothing here to
      // rate, and the original turn was already rated when it was live.
      followUp: true,
      redacted: true,
    };
  }

  const out: PersistedMessage = {
    text: msg.text,
    isBot: msg.isBot,
    timestamp: msg.timestamp,
  };
  if (msg.summary) out.summary = msg.summary;
  if (msg.intent) out.intent = msg.intent;
  if (msg.messageId !== undefined) out.messageId = msg.messageId;
  if (msg.followUp) out.followUp = true;
  if (msg.suggestions?.length) out.suggestions = msg.suggestions;
  if (msg.displayHint) out.displayHint = msg.displayHint;
  if (msg.source) out.source = msg.source;

  const cards = scrubCards(msg.cards);
  if (cards) out.cards = cards;
  // Counted, not compared by identity: an empty `cards: []` normalises to
  // undefined here, and that is not a redaction.
  if ((cards?.length ?? 0) < (msg.cards?.length ?? 0)) out.redacted = true;

  return out;
}

function fromPersisted(p: PersistedMessage, id: number): Message {
  return {
    id,
    text: p.text,
    summary: p.summary,
    isBot: p.isBot,
    timestamp: p.timestamp,
    intent: p.intent,
    messageId: p.messageId,
    followUp: p.followUp,
    suggestions: p.suggestions,
    displayHint: p.displayHint,
    source: p.source,
    cards: p.cards,
  };
}

// ─── index ───────────────────────────────────────────────────────────────────

function parseIndex(raw: string | null): ConversationMeta[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is ConversationMeta =>
        !!m &&
        typeof (m as ConversationMeta).id === "string" &&
        typeof (m as ConversationMeta).updatedAt === "number",
    );
  } catch {
    return [];
  }
}

/** Newest first. */
export function loadIndex(deviceId: string): ConversationMeta[] {
  return parseIndex(readLocal(indexKey(deviceId))).sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeIndex(deviceId: string, metas: ConversationMeta[]): boolean {
  return writeLocal(indexKey(deviceId), JSON.stringify(metas));
}

function titleFor(messages: readonly Message[], fallback: string): string {
  const first = messages.find((m) => !m.isBot && m.text.trim());
  if (!first) return fallback;
  const text = first.text.trim().replace(/\s+/g, " ");
  return text.length > MAX_TITLE_CHARS ? `${text.slice(0, MAX_TITLE_CHARS - 1)}…` : text;
}

// ─── read ────────────────────────────────────────────────────────────────────

/**
 * Restore one conversation, ready to hand to `useChat`'s `initialMessages`.
 *
 * Ids are renumbered from 1 rather than restored, because they are render keys
 * owned by useChat's counter, which seeds from `initialMessages.length + 1`.
 */
export function loadConversation(deviceId: string, id: string): Message[] {
  const raw = readLocal(convKey(deviceId, id));
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is PersistedMessage => !!p && typeof (p as PersistedMessage).text === "string")
      .map((p, i) => fromPersisted(p, i + 1));
  } catch {
    return [];
  }
}

// ─── write ───────────────────────────────────────────────────────────────────

/**
 * Persist the live conversation under `id`, updating its index entry.
 *
 * Only the last MAX_MESSAGES turns are kept: a transcript long enough to hit
 * that is one where the top has stopped being useful, and a bounded write is
 * what keeps a runaway conversation from evicting every other key in the
 * origin. Silently does nothing when history is off or storage is unusable.
 */
export function saveConversation(deviceId: string, id: string, messages: readonly Message[]): void {
  if (degraded || !isHistoryEnabled()) return;

  if (messages.length === 0) {
    deleteConversation(deviceId, id);
    return;
  }

  const recent = messages.slice(-MAX_MESSAGES);
  const body = JSON.stringify(recent.map(toPersisted));

  if (!writeLocal(convKey(deviceId, id), body)) {
    // Almost always QuotaExceededError. Drop the oldest conversation that is
    // not the one being written and try once more; if the retry also fails the
    // problem is not size, so stop hammering it.
    const evictable = loadIndex(deviceId).filter((m) => m.id !== id);
    const oldest = evictable[evictable.length - 1];
    if (!oldest) {
      degraded = true;
      return;
    }
    deleteConversation(deviceId, oldest.id);
    if (!writeLocal(convKey(deviceId, id), body)) {
      degraded = true;
      return;
    }
  }

  // Re-read rather than caching: another tab may have added a conversation
  // since this one last looked.
  const metas = loadIndex(deviceId);
  const now = Date.now();
  const existing = metas.find((m) => m.id === id);
  const meta: ConversationMeta = {
    id,
    title: titleFor(recent, existing?.title ?? "New conversation"),
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    turns: recent.length,
  };

  const next = [meta, ...metas.filter((m) => m.id !== id)].slice(0, MAX_CONVERSATIONS);
  for (const dropped of metas.filter((m) => !next.some((n) => n.id === m.id))) {
    removeLocal(convKey(deviceId, dropped.id));
  }
  writeIndex(deviceId, next);
}

// ─── delete ──────────────────────────────────────────────────────────────────

export function deleteConversation(deviceId: string, id: string): void {
  removeLocal(convKey(deviceId, id));
  const metas = loadIndex(deviceId).filter((m) => m.id !== id);
  writeIndex(deviceId, metas);
}

/** Remove every transcript for this device, index included. Sweeps by key
 *  prefix rather than by index so a corrupted or partially-written index
 *  cannot leave real transcripts behind on a machine the student believes
 *  they have just cleared. */
export function clearHistory(deviceId: string): void {
  for (const key of keysWithPrefix("local", `${CONV_PREFIX}:${deviceId}:`)) {
    removeLocal(key);
  }
  removeLocal(indexKey(deviceId));
  degraded = false;
}

/**
 * Enforce the retention window and collect orphans.
 *
 * Runs on mount. Two jobs: drop conversations past RETENTION_DAYS, and delete
 * conversation blobs with no index entry — the residue of an interrupted write
 * or of a `MAX_CONVERSATIONS` eviction that failed partway.
 */
export function pruneHistory(deviceId: string): ConversationMeta[] {
  const cutoff = Date.now() - RETENTION_MS;
  const metas = loadIndex(deviceId);
  const kept = metas.filter((m) => m.updatedAt >= cutoff).slice(0, MAX_CONVERSATIONS);

  for (const dropped of metas.filter((m) => !kept.some((k) => k.id === m.id))) {
    removeLocal(convKey(deviceId, dropped.id));
  }

  const live = new Set(kept.map((m) => convKey(deviceId, m.id)));
  for (const key of keysWithPrefix("local", `${CONV_PREFIX}:${deviceId}:`)) {
    if (!live.has(key)) removeLocal(key);
  }

  if (kept.length !== metas.length) writeIndex(deviceId, kept);
  return kept;
}
