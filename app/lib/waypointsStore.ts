// Singleton store for live waypoint coordinate overrides. Mirrors
// coordsStore. Subscribers (e.g. CampusMap) re-render when admin saves
// new waypoint positions from the editor.

import { api } from "@/lib/api";

export type WaypointsMap = ReadonlyMap<string, { x: number; y: number }>;

let snapshot: WaypointsMap = new Map();
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;

function notify() {
  for (const l of listeners) l();
}

export function getWaypointsSnapshot(): WaypointsMap {
  return snapshot;
}

export function subscribeWaypoints(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setWaypointsLocal(next: WaypointsMap) {
  snapshot = next;
  notify();
}

export async function loadWaypoints(force = false): Promise<void> {
  if (loadPromise && !force) return loadPromise;
  loadPromise = (async () => {
    try {
      const data = await api.getMapWaypoints();
      const map = new Map<string, { x: number; y: number }>();
      for (const [id, c] of Object.entries(data.overrides ?? {})) {
        map.set(id, { x: c.x, y: c.y });
      }
      snapshot = map;
      notify();
    } catch {
      // Ignore — fall back to hardcoded waypoint defaults.
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}
