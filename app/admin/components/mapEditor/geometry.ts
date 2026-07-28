// Pure geometry and identity helpers for the admin map editor.
//
// Extracted from AdminMapEditor.tsx, which is 1347 lines holding 17 useState
// calls in one component. Everything here is free of hooks and JSX, so it is
// unit-testable directly - see tests/admin/mapEditorGeometry.test.ts.
import { BUILDINGS, WAYPOINTS, type Waypoint } from "@/lib/campusMap";
export interface Coord {
  x: number;
  y: number;
}

export type Coords = Record<string, Coord>;
export type Mode = "markers" | "waypoints";

export const MARKER_RADIUS = 26;
export const WAYPOINT_RADIUS = 14;

export function buildBaselineMarkerCoords(): Coords {
  const out: Coords = {};
  for (const b of BUILDINGS) out[b.id] = { x: b.x, y: b.y };
  return out;
}

export function buildBaselineWaypointCoords(): Coords {
  const out: Coords = {};
  for (const w of Object.values(WAYPOINTS)) out[w.id] = { x: w.x, y: w.y };
  return out;
}

export const WAYPOINT_LIST: Waypoint[] = Object.values(WAYPOINTS);

export interface AdjacencyEdge {
  a: string;
  b: string;
}

export function buildAdjacencyEdges(): AdjacencyEdge[] {
  const seen = new Set<string>();
  const out: AdjacencyEdge[] = [];
  for (const w of WAYPOINT_LIST) {
    for (const nId of w.neighbors) {
      const key = w.id < nId ? `${w.id}|${nId}` : `${nId}|${w.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ a: w.id, b: nId });
    }
  }
  return out;
}

export const WP_EDGES = buildAdjacencyEdges();

/** A custom waypoint that admin added at runtime. Lives alongside the
 *  bundled WAYPOINTS but ships its own adjacency. */
export interface CustomWaypoint {
  id: string;
  x: number;
  y: number;
  neighbors: string[];
}

export function nextCustomId(prefix: string, existing: Iterable<string>): string {
  const taken = new Set<string>(existing);
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n += 1;
  return `${prefix}${n}`;
}

/** Two nearest neighbors among the supplied positions. */
export function findNearest(
  point: Coord,
  candidates: Array<{ id: string; x: number; y: number }>,
  k: number = 2,
): string[] {
  return [...candidates]
    .map((c) => ({ id: c.id, d: Math.hypot(c.x - point.x, c.y - point.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k)
    .map((c) => c.id);
}
