import { beforeEach, describe, expect, it, vi } from "vitest";

// Sibling of coordsStore with the same singleton shape, but NOT interchangeable:
// coordsStore reads `data.coords` while this one reads `data.overrides ?? {}`.
// A shared test factory would paper over exactly that kind of asymmetry, so the
// two suites stay separate and each pins its own response contract.

const getMapWaypoints = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { getMapWaypoints: (...a: unknown[]) => getMapWaypoints(...a) },
}));

type Store = typeof import("@/lib/waypointsStore");
let store: Store;

beforeEach(async () => {
  vi.resetModules();
  getMapWaypoints.mockReset();
  store = await import("@/lib/waypointsStore");
});

describe("waypointsStore subscriptions", () => {
  it("starts empty", () => {
    expect(store.getWaypointsSnapshot().size).toBe(0);
  });

  it("notifies subscribers on a local set and stops after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribeWaypoints(listener);

    store.setWaypointsLocal(new Map([["w1", { x: 5, y: 6 }]]));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getWaypointsSnapshot().get("w1")).toEqual({ x: 5, y: 6 });

    unsubscribe();
    store.setWaypointsLocal(new Map());
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("waypointsStore loadWaypoints", () => {
  it("populates from the API and notifies", async () => {
    getMapWaypoints.mockResolvedValue({ overrides: { w1: { x: 1, y: 2 } } });
    const listener = vi.fn();
    store.subscribeWaypoints(listener);

    await store.loadWaypoints();

    expect(store.getWaypointsSnapshot().get("w1")).toEqual({ x: 1, y: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("single-flights concurrent callers", async () => {
    let resolve!: (v: unknown) => void;
    getMapWaypoints.mockReturnValue(new Promise((r) => { resolve = r; }));

    const first = store.loadWaypoints();
    const second = store.loadWaypoints();
    resolve({ overrides: {} });
    await Promise.all([first, second]);

    expect(getMapWaypoints).toHaveBeenCalledTimes(1);
  });

  it("keeps the previous snapshot when the request fails", async () => {
    store.setWaypointsLocal(new Map([["w1", { x: 7, y: 8 }]]));
    getMapWaypoints.mockRejectedValue(new Error("offline"));

    await expect(store.loadWaypoints()).resolves.toBeUndefined();

    expect(store.getWaypointsSnapshot().get("w1")).toEqual({ x: 7, y: 8 });
  });
});
