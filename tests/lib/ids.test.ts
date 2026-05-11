import { describe, it, expect, beforeEach } from "vitest";
import { getUserId, getSessionId, resetSession } from "@/lib/ids";

describe("getUserId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and persists a UUID on first call", () => {
    const id = getUserId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(localStorage.getItem("sevi_user_id")).toBe(id);
  });

  it("returns the same id across multiple calls", () => {
    const a = getUserId();
    const b = getUserId();
    expect(a).toBe(b);
  });

  it("reads pre-existing id from localStorage", () => {
    localStorage.setItem("sevi_user_id", "preset-id-123");
    expect(getUserId()).toBe("preset-id-123");
  });
});

describe("getSessionId", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates and persists a UUID on first call", () => {
    const id = getSessionId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem("sevi_session_id")).toBe(id);
  });

  it("returns the same id across multiple calls", () => {
    expect(getSessionId()).toBe(getSessionId());
  });

  it("differs from user id", () => {
    expect(getUserId()).not.toBe(getSessionId());
  });
});

describe("resetSession", () => {
  it("clears the session id so the next call creates a new one", () => {
    const first = getSessionId();
    resetSession();
    const second = getSessionId();
    expect(second).not.toBe(first);
  });
});
