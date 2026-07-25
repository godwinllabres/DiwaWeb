import {
  readLocal,
  readSession,
  removeSession,
  writeLocal,
  writeSession,
} from "@/lib/storage";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ids minted this page-load because storage refused to keep them.
 *
 * Storage is unreachable in more situations than it looks — blocked cookies,
 * and the cross-origin widget iframe on Safari (see lib/storage.ts). Falling
 * back to a per-load id keeps chat working; the only casualty is that such a
 * visit counts as a fresh user/device every time, which is why the device
 * rollup in the admin panel should be read as an upper bound.
 */
const ephemeral = new Map<string, string>();

function stableId(
  key: string,
  read: (k: string) => string | null,
  write: (k: string, v: string) => boolean,
): string {
  const stored = read(key);
  if (stored) return stored;

  const existing = ephemeral.get(key);
  if (existing) return existing;

  const id = uuid();
  if (!write(key, id)) ephemeral.set(key, id);
  return id;
}

export function getUserId(): string {
  return stableId("sevi_user_id", readLocal, writeLocal);
}

export function getSessionId(): string {
  return stableId("sevi_session_id", readSession, writeSession);
}

/** Drop the current session id so the next getSessionId() mints a new one.
 *  Note this also drops the AIS login, which useAuth keys on the session id —
 *  so it is a sign-out, not a "new chat". Starting a fresh conversation uses
 *  newConversationId() instead. */
export function resetSession(): void {
  removeSession("sevi_session_id");
  ephemeral.delete("sevi_session_id");
}

const CONVERSATION_KEY = "sevi_conversation_id";

/**
 * Id of the conversation this tab is showing, and the key its transcript is
 * archived under (lib/historyStore.ts).
 *
 * Deliberately NOT the session id, tempting as that is — the session id is a
 * bearer capability for the server-side AIS token (see lib/hooks/useAuth.ts),
 * and the reason it lives in sessionStorage is that a shared workstation must
 * not be left holding it. Using it as the archive key would write that
 * capability into localStorage underneath every saved transcript, next to a
 * comment promising the opposite. This id is an opaque render key with no
 * standing on the server.
 *
 * Session-scoped so each tab shows its own conversation, and so a refresh
 * resumes the one that was open rather than opening a second copy of it.
 */
export function getConversationId(): string {
  return stableId(CONVERSATION_KEY, readSession, writeSession);
}

/** Point this tab at an existing conversation — used when a student picks one
 *  out of the history rail. */
export function setConversationId(id: string): void {
  if (!writeSession(CONVERSATION_KEY, id)) ephemeral.set(CONVERSATION_KEY, id);
}

/** Start a fresh conversation and return its id. Leaves the session id (and
 *  therefore any AIS login) alone. */
export function newConversationId(): string {
  const id = uuid();
  setConversationId(id);
  return id;
}

/**
 * Stable identifier for this browser on this device.
 *
 * Deliberately separate from `getUserId()` even though both live in
 * localStorage: the user id is the conversation subject and may be rotated or
 * cleared (data-subject request, "start over"), while this one answers a
 * different question — how many distinct devices Sevi is being used from, and
 * on what. Keeping them apart means clearing one does not silently distort the
 * other's numbers.
 *
 * It also namespaces the on-device transcript archive (lib/historyStore.ts).
 * localStorage is already per-browser, so the id buys scoping rather than
 * isolation: clearing it leaves that device's transcripts orphaned for the
 * next sweep to collect, and the `messageId` kept on each saved turn is what
 * links a local transcript back to the server's `chat_messages` rows when a
 * student asks what has been recorded about them.
 */
export function getDeviceId(): string {
  return stableId("sevi_device_id", readLocal, writeLocal);
}

/** Form factor + current orientation, e.g. `phone/landscape`. The API
 *  allowlists these exact values, so keep the two in step. */
export type DeviceClass =
  | "phone/portrait"
  | "phone/landscape"
  | "tablet/portrait"
  | "tablet/landscape"
  | "desktop/portrait"
  | "desktop/landscape"
  | "unknown/unknown";

/**
 * Classify the device this turn is being sent from.
 *
 * Form factor comes from the pointer type rather than width — inside the
 * widget's iframe the width is the panel's, not the device's — and phone vs
 * tablet then splits on the shorter viewport edge. Orientation is read fresh
 * on every call because it is the whole point: it changes mid-session when the
 * student rotates the phone.
 */
export function getDeviceClass(): DeviceClass {
  if (typeof window === "undefined") return "unknown/unknown";
  const { innerWidth: w, innerHeight: h } = window;
  if (!w || !h) return "unknown/unknown";

  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const form = !coarse ? "desktop" : Math.min(w, h) < 600 ? "phone" : "tablet";
  return `${form}/${w >= h ? "landscape" : "portrait"}` as DeviceClass;
}
