import { describe, it, expect, afterEach } from "vitest";
import {
  keysWithPrefix,
  readLocal,
  removeLocal,
  storageAvailable,
  writeLocal,
} from "@/lib/storage";

const real = Object.getOwnPropertyDescriptor(window, "localStorage")!;

/** Reproduces a browser that has blocked storage outright: the *property
 *  access* throws, before any method is reached. Safari with "block all
 *  cookies" and some third-party iframe contexts behave this way, which is
 *  what used to take the whole app down at mount. */
function blockStorage() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
}

/** And a browser that hands out a localStorage whose writes always fail —
 *  the shape older Safari private mode took, and what a full quota looks like. */
function fillStorage() {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      length: 0,
      key: () => null,
      getItem: () => null,
      setItem: () => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      },
      removeItem: () => {},
      clear: () => {},
    },
  });
}

afterEach(() => {
  Object.defineProperty(window, "localStorage", real);
  localStorage.clear();
});

describe("with working storage", () => {
  it("round-trips a value", () => {
    expect(writeLocal("k", "v")).toBe(true);
    expect(readLocal("k")).toBe("v");
    removeLocal("k");
    expect(readLocal("k")).toBeNull();
  });

  it("lists keys by prefix", () => {
    writeLocal("sevi_x:1", "a");
    writeLocal("sevi_x:2", "b");
    writeLocal("other", "c");
    expect(keysWithPrefix("local", "sevi_x:").sort()).toEqual(["sevi_x:1", "sevi_x:2"]);
  });

  it("reports availability", () => {
    expect(storageAvailable()).toBe(true);
  });
});

describe("when storage access throws", () => {
  it("reads return null instead of propagating", () => {
    blockStorage();
    expect(() => readLocal("k")).not.toThrow();
    expect(readLocal("k")).toBeNull();
  });

  it("writes report failure instead of propagating", () => {
    blockStorage();
    expect(writeLocal("k", "v")).toBe(false);
  });

  it("removes and key listing stay quiet", () => {
    blockStorage();
    expect(() => removeLocal("k")).not.toThrow();
    expect(keysWithPrefix("local", "sevi_")).toEqual([]);
  });

  it("reports itself unavailable", () => {
    blockStorage();
    expect(storageAvailable()).toBe(false);
  });
});

describe("when storage is present but full", () => {
  // Presence proves nothing, so availability is probed with a real write.
  it("reports unavailable and fails writes without throwing", () => {
    fillStorage();
    expect(storageAvailable()).toBe(false);
    expect(writeLocal("k", "v")).toBe(false);
  });
});
