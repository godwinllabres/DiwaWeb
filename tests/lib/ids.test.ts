import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  getUserId,
  getSessionId,
  resetSession,
  getDeviceId,
  getDeviceClass,
  getConversationId,
  setConversationId,
  newConversationId,
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

describe("getConversationId", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates and persists an id so a refresh reopens the same conversation", () => {
    const id = getConversationId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem("sevi_conversation_id")).toBe(id);
    expect(getConversationId()).toBe(id);
  });

  // The archive key must never be the session id: that value is a bearer
  // capability for the AIS token, and the archive lives in localStorage.
  it("is not the session id", () => {
    expect(getConversationId()).not.toBe(getSessionId());
  });

  it("newConversationId starts a fresh one without touching the session", () => {
    const session = getSessionId();
    const first = getConversationId();

    const second = newConversationId();
    expect(second).not.toBe(first);
    expect(getConversationId()).toBe(second);
    // Rotating the session would sign a staff user out of AIS mid-workflow.
    expect(getSessionId()).toBe(session);
  });

  it("setConversationId points the tab at an existing conversation", () => {
    setConversationId("restored-1");
    expect(getConversationId()).toBe("restored-1");
  });
});

describe("when storage is blocked", () => {
  const realLocal = Object.getOwnPropertyDescriptor(window, "localStorage")!;
  const realSession = Object.getOwnPropertyDescriptor(window, "sessionStorage")!;

  const block = (name: "localStorage" | "sessionStorage") =>
    Object.defineProperty(window, name, {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", realLocal);
    Object.defineProperty(window, "sessionStorage", realSession);
  });

  // Sevi is normally in a cross-origin iframe, where Safari and a
  // block-all-cookies setting can make storage access itself throw. Ids used
  // to be read bare, so that took the app down at mount rather than costing
  // one metric.
  it("still returns usable ids instead of throwing", () => {
    block("localStorage");
    block("sessionStorage");

    expect(() => getUserId()).not.toThrow();
    expect(getDeviceId()).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getSessionId()).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("keeps them stable for the life of the page", () => {
    block("localStorage");
    expect(getDeviceId()).toBe(getDeviceId());
    expect(getUserId()).toBe(getUserId());
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
