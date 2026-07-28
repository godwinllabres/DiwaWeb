import { beforeEach, describe, expect, it, vi } from "vitest";

// Two module-level mutable singletons (coordsStore, waypointsStore) are shared
// by BOTH Vite entries and had no tests. They are reset per test by
// re-importing the module, since their state lives in module scope.

const getMapCoords = vi.fn();
vi.mock("@/lib/api", () => ({ api: { getMapCoords: (...a: unknown[]) => getMapCoords(...a) } }));

type Store = typeof import("@/lib/coordsStore");
let store: Store;

beforeEach(async () => {
  vi.resetModules();
  getMapCoords.mockReset();
  store = await import("@/lib/coordsStore");
});

describe("coordsStore subscriptions", () => {
  it("starts with an empty snapshot", () => {
    expect(store.getCoordsSnapshot().size).toBe(0);
  });

  it("notifies every subscriber on a local set", () => {
    const a = vi.fn();
    const b = vi.fn();
    store.subscribeCoords(a);
    store.subscribeCoords(b);

    store.setCoordsLocal(new Map([["lib", { x: 1, y: 2 }]]));

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(store.getCoordsSnapshot().get("lib")).toEqual({ x: 1, y: 2 });
  });

  it("stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeCoords(listener);

    store.setCoordsLocal(new Map());
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    store.setCoordsLocal(new Map());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("coordsStore loadCoords", () => {
  it("populates the snapshot from the API and notifies", async () => {
    getMapCoords.mockResolvedValue({ coords: { lib: { x: 10, y: 20 } } });
    const listener = vi.fn();
    store.subscribeCoords(listener);

    await store.loadCoords();

    expect(store.getCoordsSnapshot().get("lib")).toEqual({ x: 10, y: 20 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("single-flights concurrent callers onto one request", async () => {
    let resolve!: (v: unknown) => void;
    getMapCoords.mockReturnValue(new Promise((r) => { resolve = r; }));

    const first = store.loadCoords();
    const second = store.loadCoords();
    resolve({ coords: {} });
    await Promise.all([first, second]);

    // Both callers awaited the same in-flight promise.
    expect(getMapCoords).toHaveBeenCalledTimes(1);
  });

  it("issues a fresh request once the previous one settled", async () => {
    getMapCoords.mockResolvedValue({ coords: {} });
    await store.loadCoords();
    await store.loadCoords();
    // loadPromise is cleared in `finally`, so this is not a cached result.
    expect(getMapCoords).toHaveBeenCalledTimes(2);
  });

  it("keeps the previous snapshot when the request fails", async () => {
    store.setCoordsLocal(new Map([["lib", { x: 3, y: 4 }]]));
    getMapCoords.mockRejectedValue(new Error("offline"));

    await expect(store.loadCoords()).resolves.toBeUndefined();

    // The chat map falls back to bundled BUILDINGS coords; it must not be
    // handed an empty override map just because the network blipped.
    expect(store.getCoordsSnapshot().get("lib")).toEqual({ x: 3, y: 4 });
  });

  it("clears the in-flight promise after a failure so a retry can run", async () => {
    getMapCoords.mockRejectedValueOnce(new Error("offline"));
    await store.loadCoords();

    getMapCoords.mockResolvedValue({ coords: { lib: { x: 9, y: 9 } } });
    await store.loadCoords();

    expect(store.getCoordsSnapshot().get("lib")).toEqual({ x: 9, y: 9 });
  });
});
