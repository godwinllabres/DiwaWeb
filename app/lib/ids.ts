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

export function getUserId(): string {
  const KEY = "sevi_user_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getSessionId(): string {
  const KEY = "sevi_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

export function resetSession(): void {
  sessionStorage.removeItem("sevi_session_id");
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
 */
export function getDeviceId(): string {
  const KEY = "sevi_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
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
