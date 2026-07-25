import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getUserId,
  getSessionId,
  resetSession,
  getDeviceId,
  getDeviceClass,
} from "@/lib/ids";

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

describe("getDeviceId", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and persists a UUID on first call", () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(localStorage.getItem("sevi_device_id")).toBe(id);
  });

  it("returns the same id across multiple calls", () => {
    expect(getDeviceId()).toBe(getDeviceId());
  });

  it("survives a user-id reset — the two identities are independent", () => {
    const device = getDeviceId();
    localStorage.removeItem("sevi_user_id");
    expect(getUserId()).not.toBe(device);
    expect(getDeviceId()).toBe(device);
  });

  it("matches the shape the API allowlists (8-64 of [A-Za-z0-9_-])", () => {
    expect(getDeviceId()).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
  });
});

describe("getDeviceClass", () => {
  const setViewport = (width: number, height: number, coarse: boolean) => {
    vi.stubGlobal("innerWidth", width);
    vi.stubGlobal("innerHeight", height);
    vi.stubGlobal(
      "matchMedia",
      (q: string) => ({ matches: q.includes("pointer: coarse") ? coarse : false }) as MediaQueryList,
    );
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports a rotated phone as phone/landscape", () => {
    setViewport(844, 390, true);
    expect(getDeviceClass()).toBe("phone/landscape");
  });

  it("reports the same phone upright as phone/portrait", () => {
    setViewport(390, 844, true);
    expect(getDeviceClass()).toBe("phone/portrait");
  });

  it("splits tablet from phone on the short edge", () => {
    setViewport(1024, 768, true);
    expect(getDeviceClass()).toBe("tablet/landscape");
  });

  it("uses pointer type, not width, for desktop", () => {
    // Same 1024x768 box — a fine pointer makes it a desktop, not a tablet.
    setViewport(1024, 768, false);
    expect(getDeviceClass()).toBe("desktop/landscape");
  });

  it("falls back to unknown when the viewport cannot be read", () => {
    setViewport(0, 0, true);
    expect(getDeviceClass()).toBe("unknown/unknown");
  });
});
