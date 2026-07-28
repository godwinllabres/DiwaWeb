// Campus geometry — turning campus data into things an SVG can draw.
// Split out of app/lib/campusMap.ts; see ./data for the source literals.
import type { Building } from "./data";
// import.meta.env.BASE_URL includes the trailing slash (e.g. "/DiwaWeb/")
export const CAMPUS_IMAGE_URL = `${(import.meta as any).env?.BASE_URL ?? "/"}cvsu-campus-map.png`;


// page of pins on green grass.
export function footprintFor(b: Building): { x: number; y: number; w: number; h: number } {
  // Custom footprint sizes for landmark buildings. The Oval is by far the
  // largest single feature on the real campus, so it gets a much bigger
  // green ellipse-style rectangle than everything else.
  const customSizes: Record<string, { w: number; h: number }> = {
    oval: { w: 280, h: 180 },
    cafenr: { w: 200, h: 110 },
    cemds: { w: 200, h: 110 },
    cvmbs: { w: 200, h: 110 },
    icon: { w: 200, h: 110 },
    cas: { w: 200, h: 110 },
    admin: { w: 200, h: 100 },
    library: { w: 200, h: 110 },
    gym: { w: 200, h: 110 },
    agri_eco: { w: 200, h: 110 },
    ncrdec: { w: 220, h: 120 },
    mall: { w: 200, h: 100 },
    star_farm: { w: 220, h: 130 },
    rolle_hall: { w: 200, h: 100 },
  };
  const size = customSizes[b.id] ?? { w: 130, h: 70 };
  return { x: b.x - size.w / 2, y: b.y - size.h / 2, w: size.w, h: size.h };
}

// ============================================================================
// Waypoint graph for shortest-path routing
// ============================================================================
// Each waypoint sits at a major road intersection. Edges connect waypoints
// that share a road segment. Buildings snap to their nearest waypoint, so
// the route from any building A to any building B is:
//   A.center -> A.waypoint -> ... Dijkstra ... -> B.waypoint -> B.center

/** Polyline path attribute string from an array of points. */
export function pointsToPath(points: ReadonlyArray<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ` + rest.map((p) => `L ${p.x} ${p.y}`).join(" ");
}
