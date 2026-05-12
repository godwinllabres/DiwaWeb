// Singleton store for live campus marker coordinates. Mirrors the
// backend's effective coords (defaults + admin overrides). The chat-side
// <CampusMap> subscribes via useCoordsOverrides so admin edits propagate
// without a page reload.

import { api } from "@/lib/api";

export type CoordsMap = ReadonlyMap<string, { x: number; y: number }>;

let snapshot: CoordsMap = new Map();
const listeners = new Set<() => void>();
let loadPromise: Promise<void> | null = null;

function notify() {
  for (const l of listeners) l();
}

export function getCoordsSnapshot(): CoordsMap {
  return snapshot;
}

export function subscribeCoords(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCoordsLocal(next: CoordsMap) {
  snapshot = next;
  notify();
}

export async function loadCoords(force = false): Promise<void> {
  if (loadPromise && !force) return loadPromise;
  loadPromise = (async () => {
    try {
      const data = await api.getMapCoords();
      const map = new Map<string, { x: number; y: number }>();
      for (const [id, c] of Object.entries(data.coords)) {
        map.set(id, { x: c.x, y: c.y });
      }
      snapshot = map;
      notify();
    } catch {
      // Network failure — keep current snapshot (likely empty), the chat
      // map falls back to the hardcoded BUILDINGS coords.
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}
