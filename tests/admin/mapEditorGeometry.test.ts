import { describe, expect, it } from "vitest";
import {
  MARKER_RADIUS,
  WAYPOINT_RADIUS,
  WAYPOINT_LIST,
  WP_EDGES,
  buildBaselineMarkerCoords,
  buildBaselineWaypointCoords,
  nextCustomId,
  findNearest,
} from "@/admin/components/mapEditor/geometry";
import { BUILDINGS, WAYPOINTS } from "@/lib/campusMap";

// These lived inside a 1347-line component with 17 useState calls, so they
// could only ever be reached by rendering the whole editor. Extracted, they
// are ordinary pure functions — and the adjacency dedupe and the id allocator
// both have real edge cases that a render test would never have isolated.

describe("baseline coordinate builders", () => {
  it("gives every bundled building a marker position", () => {
    const coords = buildBaselineMarkerCoords();
    expect(Object.keys(coords)).toHaveLength(BUILDINGS.length);
    for (const b of BUILDINGS) expect(coords[b.id]).toEqual({ x: b.x, y: b.y });
  });

  it("gives every bundled waypoint a position", () => {
    const coords = buildBaselineWaypointCoords();
    const ids = Object.keys(WAYPOINTS);
    expect(Object.keys(coords)).toHaveLength(ids.length);
    for (const id of ids) {
      expect(coords[id]).toEqual({ x: WAYPOINTS[id].x, y: WAYPOINTS[id].y });
    }
  });

  it("returns a fresh object each call, so edits cannot leak into the baseline", () => {
    const first = buildBaselineMarkerCoords();
    const id = BUILDINGS[0].id;
    first[id] = { x: -1, y: -1 };
    expect(buildBaselineMarkerCoords()[id]).toEqual({ x: BUILDINGS[0].x, y: BUILDINGS[0].y });
  });
});

describe("adjacency edges", () => {
  it("emits each undirected edge exactly once", () => {
    // neighbors is declared on both ends, so a naive build double-counts.
    const seen = new Set(WP_EDGES.map((e) => (e.a < e.b ? `${e.a}|${e.b}` : `${e.b}|${e.a}`)));
    expect(seen.size).toBe(WP_EDGES.length);
  });

  it("only references waypoints that exist in the graph", () => {
    const ids = new Set(WAYPOINT_LIST.map((w) => w.id));
    for (const e of WP_EDGES) {
      expect(ids.has(e.a)).toBe(true);
      expect(ids.has(e.b)).toBe(true);
    }
  });

  it("covers every declared neighbour relationship", () => {
    const declared = new Set<string>();
    for (const w of WAYPOINT_LIST) {
      for (const n of w.neighbors) declared.add(w.id < n ? `${w.id}|${n}` : `${n}|${w.id}`);
    }
    expect(WP_EDGES.length).toBe(declared.size);
  });
});

describe("nextCustomId", () => {
  it("starts at 1 when nothing is taken", () => {
    expect(nextCustomId("marker_custom_", [])).toBe("marker_custom_1");
  });

  it("skips taken ids and returns the first free slot", () => {
    expect(nextCustomId("wp_custom_", ["wp_custom_1", "wp_custom_2"])).toBe("wp_custom_3");
  });

  it("fills a HOLE rather than appending past the highest", () => {
    // Deleting the middle of three and adding again must reuse the gap;
    // appending instead would silently collide once ids are reordered.
    expect(nextCustomId("wp_custom_", ["wp_custom_1", "wp_custom_3"])).toBe("wp_custom_2");
  });

  it("ignores ids belonging to another prefix", () => {
    expect(nextCustomId("marker_custom_", ["wp_custom_1", "wp_custom_2"])).toBe("marker_custom_1");
  });
});

describe("findNearest", () => {
  const candidates = [
    { id: "near", x: 10, y: 10 },
    { id: "mid", x: 50, y: 50 },
    { id: "far", x: 900, y: 900 },
  ];

  it("returns the two closest by default, nearest first", () => {
    expect(findNearest({ x: 0, y: 0 }, candidates)).toEqual(["near", "mid"]);
  });

  it("honours an explicit k", () => {
    expect(findNearest({ x: 0, y: 0 }, candidates, 1)).toEqual(["near"]);
    expect(findNearest({ x: 0, y: 0 }, candidates, 3)).toEqual(["near", "mid", "far"]);
  });

  it("returns everything when k exceeds the candidate count", () => {
    expect(findNearest({ x: 0, y: 0 }, candidates, 99)).toHaveLength(3);
  });

  it("returns an empty list for no candidates rather than throwing", () => {
    expect(findNearest({ x: 0, y: 0 }, [])).toEqual([]);
  });

  it("does not mutate the caller's array", () => {
    const order = candidates.map((c) => c.id);
    findNearest({ x: 999, y: 999 }, candidates);
    expect(candidates.map((c) => c.id)).toEqual(order);
  });

  it("measures true euclidean distance, not axis distance", () => {
    // (3,4) is 5 away; (0,4.5) is 4.5 away. A naive |dx|+|dy| would pick wrong.
    const pts = [
      { id: "diagonal", x: 3, y: 4 },
      { id: "straight", x: 0, y: 4.5 },
    ];
    expect(findNearest({ x: 0, y: 0 }, pts, 1)).toEqual(["straight"]);
  });
});

describe("radii", () => {
  it("draws markers larger than waypoints", () => {
    // Waypoints are graph nodes dropped onto roads; markers are buildings.
    expect(MARKER_RADIUS).toBeGreaterThan(WAYPOINT_RADIUS);
  });
});
