/**
 * Web Storage access that cannot take the app down.
 *
 * Sevi is normally reached through a cross-origin iframe (see public/widget.js,
 * which points at a different host than the page embedding it), and browsers do
 * not agree on what storage means in that position: Chrome partitions it per
 * top-level site, Safari hands out an ephemeral partition that dies with the
 * tab, and a user who has blocked all cookies gets a SecurityError thrown on
 * the *property access* itself — before any method is called. A bare
 * `localStorage.getItem` therefore takes down the whole app at mount rather
 * than losing one preference, which is what this module exists to prevent.
 *
 * Every read returns null and every write reports false when storage is
 * unavailable, so callers degrade to in-memory behaviour instead of each
 * growing its own try/catch.
 */

type Kind = "local" | "session";

function store(kind: Kind): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    // Property access throws when storage is blocked outright.
    return null;
  }
}

/** True when writes actually persist. Probes with a real round-trip: Safari's
 *  private mode historically exposed a `localStorage` whose setItem always
 *  threw, so presence alone proves nothing. */
export function storageAvailable(kind: Kind = "local"): boolean {
  const s = store(kind);
  if (!s) return false;
  try {
    const probe = "__sevi_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function readItem(kind: Kind, key: string): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Reports success rather than throwing — a full quota is a normal outcome
 *  here (see historyStore's eviction), not an exceptional one. */
export function writeItem(kind: Kind, key: string, value: string): boolean {
  try {
    const s = store(kind);
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(kind: Kind, key: string): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* nothing to remove if storage is unreachable */
  }
}

/** Every key carrying the given prefix. Used to sweep orphaned conversation
 *  blobs whose index entry was lost (see pruneHistory). */
export function keysWithPrefix(kind: Kind, prefix: string): string[] {
  try {
    const s = store(kind);
    if (!s) return [];
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const key = s.key(i);
      if (key && key.startsWith(prefix)) out.push(key);
    }
    return out;
  } catch {
    return [];
  }
}

export const readLocal = (key: string) => readItem("local", key);
export const writeLocal = (key: string, value: string) => writeItem("local", key, value);
export const removeLocal = (key: string) => removeItem("local", key);
export const readSession = (key: string) => readItem("session", key);
export const writeSession = (key: string, value: string) => writeItem("session", key, value);
export const removeSession = (key: string) => removeItem("session", key);
