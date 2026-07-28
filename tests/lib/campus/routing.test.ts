import { describe, expect, it } from "vitest";
import {
  applyWaypointOverrides,
  nearestWaypoint,
  routeBetween,
} from "@/lib/campus/routing";
import {
  BUILDINGS,
  WAYPOINTS,
  applyCoordOverrides,
  findBuilding,
  type Building,
} from "@/lib/campus/data";

// The walking-route solver had no tests. It is the most consequential pure
// logic in the app — a wrong route sends a visitor across a campus — and it
// needs no DOM, so it is also the cheapest thing here to cover.

const building = (id: string): Building => {
  const b = findBuilding(id);
  if (!b) throw new Error(`fixture building ${id} missing from BUILDINGS`);
  return b;
};

describe("nearestWaypoint", () => {
  it("returns the closest waypoint to a point", () => {
    const target = Object.values(WAYPOINTS)[0];
    // Sit one unit away from a known waypoint; it must win.
    expect(nearestWaypoint({ x: target.x + 1, y: target.y + 1 }).id).toBe(target.id);
  });

  it("honours a substituted graph rather than the bundled one", () => {
    const only = Object.values(WAYPOINTS)[3];
    const graph = { [only.id]: only };
    // Far from `only`, but it is the only candidate in this graph.
    expect(nearestWaypoint({ x: 0, y: 0 }, graph).id).toBe(only.id);
  });
});

describe("routeBetween", () => {
  it("returns an empty route for the same building (caller skips drawing)", () => {
    const b = BUILDINGS[0];
    expect(routeBetween(b, b)).toEqual([]);
  });

  it("connects two distinct buildings along the waypoint graph", () => {
    const route = routeBetween(building("gate_1"), BUILDINGS[10]);
    expect(route.length).toBeGreaterThan(1);
    // Every emitted point must be an actual waypoint position — the whole
    // point of the solver is that the line never leaves the road network.
    const positions = new Set(Object.values(WAYPOINTS).map((w) => `${w.x},${w.y}`));
    for (const p of route) expect(positions.has(`${p.x},${p.y}`)).toBe(true);
  });

  it("starts and ends at the waypoints nearest each building", () => {
    const from = building("gate_1");
    const to = BUILDINGS[12];
    const route = routeBetween(from, to);
    expect(route[0]).toEqual({
      x: nearestWaypoint(from).x,
      y: nearestWaypoint(from).y,
    });
    expect(route[route.length - 1]).toEqual({
      x: nearestWaypoint(to).x,
      y: nearestWaypoint(to).y,
    });
  });

  it("is symmetric in length — the walk back is the same distance", () => {
    const a = building("gate_1");
    const b = BUILDINGS[15];
    expect(routeBetween(a, b).length).toBe(routeBetween(b, a).length);
  });
});

describe("applyWaypointOverrides", () => {
  it("returns the bundled graph untouched when there are no overrides", () => {
    expect(applyWaypointOverrides(new Map())).toBe(WAYPOINTS);
  });

  it("moves only the overridden waypoint, and only its coordinates", () => {
    const target = Object.values(WAYPOINTS)[2];
    const moved = applyWaypointOverrides(new Map([[target.id, { x: 1, y: 2 }]]));

    expect(moved[target.id].x).toBe(1);
    expect(moved[target.id].y).toBe(2);
    // Neighbours are the graph edges — an admin dragging a pin must not
    // silently rewire the road network.
    expect(moved[target.id].neighbors).toEqual(target.neighbors);

    const untouched = Object.values(WAYPOINTS)[3];
    expect(moved[untouched.id]).toEqual(untouched);
  });

  it("leaves the bundled WAYPOINTS unmutated", () => {
    const target = Object.values(WAYPOINTS)[1];
    const before = { x: target.x, y: target.y };
    applyWaypointOverrides(new Map([[target.id, { x: 999, y: 999 }]]));
    expect({ x: WAYPOINTS[target.id].x, y: WAYPOINTS[target.id].y }).toEqual(before);
  });
});

describe("applyCoordOverrides", () => {
  it("returns BUILDINGS unchanged when nothing is overridden", () => {
    const out = applyCoordOverrides(new Map());
    expect(out.length).toBe(BUILDINGS.length);
    expect(out[0]).toEqual(BUILDINGS[0]);
  });

  it("repositions only the overridden building", () => {
    const target = BUILDINGS[4];
    const out = applyCoordOverrides(new Map([[target.id, { x: 7, y: 9 }]]));
    const moved = out.find((b) => b.id === target.id)!;

    expect({ x: moved.x, y: moved.y }).toEqual({ x: 7, y: 9 });
    expect(moved.name).toBe(target.name);
    expect(out.find((b) => b.id === BUILDINGS[5].id)).toEqual(BUILDINGS[5]);
  });

  it("leaves the bundled BUILDINGS unmutated", () => {
    const target = BUILDINGS[6];
    const before = { x: target.x, y: target.y };
    applyCoordOverrides(new Map([[target.id, { x: 111, y: 222 }]]));
    expect({ x: BUILDINGS[6].x, y: BUILDINGS[6].y }).toEqual(before);
  });
});
