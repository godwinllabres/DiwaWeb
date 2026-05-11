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
