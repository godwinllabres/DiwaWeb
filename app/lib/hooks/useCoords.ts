import { useSyncExternalStore } from "react";
import {
  type CoordsMap,
  getCoordsSnapshot,
  subscribeCoords,
} from "@/lib/coordsStore";
import {
  type WaypointsMap,
  getWaypointsSnapshot,
  subscribeWaypoints,
} from "@/lib/waypointsStore";

/** Subscribe to live campus coords. Returns the current effective map. */
export function useCoordsOverrides(): CoordsMap {
  return useSyncExternalStore(subscribeCoords, getCoordsSnapshot, getCoordsSnapshot);
}

/** Subscribe to live waypoint overrides for the routing graph. */
export function useWaypointOverrides(): WaypointsMap {
  return useSyncExternalStore(
    subscribeWaypoints,
    getWaypointsSnapshot,
    getWaypointsSnapshot,
  );
}
