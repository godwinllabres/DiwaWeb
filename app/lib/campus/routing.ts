// Walking-route solver over the campus waypoint graph.
//
// Split out of app/lib/campusMap.ts. This is the testable half: every export
// below is pure, needs no DOM, and is covered by tests/lib/campus/routing.test.ts.
import { type Building, type Waypoint, WAYPOINTS } from "./data";
const _WAYPOINT_LIST = Object.values(WAYPOINTS);

function dist2(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Merge bundled WAYPOINTS with admin overrides — only x/y change. */
export function applyWaypointOverrides(
  overrides: ReadonlyMap<string, { x: number; y: number }>,
): Record<string, Waypoint> {
  if (overrides.size === 0) return WAYPOINTS;
  const out: Record<string, Waypoint> = {};
  for (const [id, w] of Object.entries(WAYPOINTS)) {
    const o = overrides.get(id);
    out[id] = o ? { ...w, x: o.x, y: o.y } : w;
  }
  return out;
}

/** Nearest waypoint to a building, used as the entry/exit point onto the road graph. */
export function nearestWaypoint(
  p: { x: number; y: number },
  graph: Record<string, Waypoint> = WAYPOINTS,
): Waypoint {
  const list = graph === WAYPOINTS ? _WAYPOINT_LIST : Object.values(graph);
  let best = list[0];
  let bestD = dist2(p, best);
  for (const w of list) {
    const d = dist2(p, w);
    if (d < bestD) { best = w; bestD = d; }
  }
  return best;
}

/** Dijkstra's algorithm on the waypoint graph. Returns the sequence of waypoint ids. */
function dijkstra(
  startId: string,
  goalId: string,
  graph: Record<string, Waypoint>,
): string[] {
  if (startId === goalId) return [startId];
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const unvisited = new Set<string>();
  for (const id of Object.keys(graph)) {
    dist[id] = Infinity;
    prev[id] = null;
    unvisited.add(id);
  }
  dist[startId] = 0;

  while (unvisited.size > 0) {
    // Pick the unvisited node with smallest dist.
    let current: string | null = null;
    let currentD = Infinity;
    for (const id of unvisited) {
      if (dist[id] < currentD) { current = id; currentD = dist[id]; }
    }
    if (current === null || currentD === Infinity) break;
    if (current === goalId) break;
    unvisited.delete(current);
    const node = graph[current];
    for (const nId of node.neighbors) {
      if (!unvisited.has(nId)) continue;
      const alt = dist[current] + Math.sqrt(dist2(node, graph[nId]));
      if (alt < dist[nId]) {
        dist[nId] = alt;
        prev[nId] = current;
      }
    }
  }

  // Reconstruct path.
  const path: string[] = [];
  let cur: string | null = goalId;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return path[0] === startId ? path : [];
}

/**
 * Build a route from building A to building B as an array of points that
 * strictly hugs the waypoint graph (road network). The building centers are
 * **not** included — the polyline ends at the nearest waypoint to each
 * building, so the line never cuts diagonally through other buildings.
 * The FROM/TO badges on the map continue to mark the actual building
 * locations, so the user still sees where the trip starts and ends.
 *
 * Empty array means same building or no path; the caller should skip drawing.
 */
export function routeBetween(
  from: Building,
  to: Building,
  graph: Record<string, Waypoint> = WAYPOINTS,
): ReadonlyArray<{ x: number; y: number }> {
  if (from.id === to.id) return [];
  const fromW = nearestWaypoint(from, graph);
  const toW = nearestWaypoint(to, graph);
  const wpIds = dijkstra(fromW.id, toW.id, graph);
  return wpIds.map((id) => ({ x: graph[id].x, y: graph[id].y }));
}

