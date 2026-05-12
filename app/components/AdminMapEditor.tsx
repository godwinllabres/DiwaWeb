import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  X,
  Save,
  RotateCcw,
  Crosshair,
  Search,
  Map as MapIcon,
  Lock,
  Unlock,
  ChevronRight,
  Eye,
  Pencil,
  Move,
  Waypoints as WaypointsIcon,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  BUILDINGS,
  CAMPUS_H,
  CAMPUS_IMAGE_URL,
  CAMPUS_W,
  WAYPOINTS,
  type Waypoint,
} from "@/lib/campusMap";
import { loadCoords, setCoordsLocal } from "@/lib/coordsStore";
import { loadWaypoints, setWaypointsLocal } from "@/lib/waypointsStore";

interface AdminMapEditorProps {
  readonly onClose: () => void;
}

interface Coord {
  x: number;
  y: number;
}

type Coords = Record<string, Coord>;
type Mode = "markers" | "waypoints";

const MARKER_RADIUS = 26;
const WAYPOINT_RADIUS = 14;

function buildBaselineMarkerCoords(): Coords {
  const out: Coords = {};
  for (const b of BUILDINGS) out[b.id] = { x: b.x, y: b.y };
  return out;
}

function buildBaselineWaypointCoords(): Coords {
  const out: Coords = {};
  for (const w of Object.values(WAYPOINTS)) out[w.id] = { x: w.x, y: w.y };
  return out;
}

const WAYPOINT_LIST: Waypoint[] = Object.values(WAYPOINTS);

interface AdjacencyEdge {
  a: string;
  b: string;
}

function buildAdjacencyEdges(): AdjacencyEdge[] {
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

const WP_EDGES = buildAdjacencyEdges();

/**
 * Full-screen admin editor. Two modes:
 *   - Markers: drag building markers to the calibrated map position.
 *   - Waypoints: drag routing-graph nodes onto the white roads; adjacency
 *     lines remain visible so you can see which nodes connect.
 * Saves persist via PUT /map/coords (markers) or PUT /map/waypoints
 * (waypoints) and propagate to the live chat map without a reload.
 */
export function AdminMapEditor({ onClose }: AdminMapEditorProps) {
  const [mode, setMode] = useState<Mode>("markers");

  // Marker state.
  const [coords, setCoords] = useState<Coords>(() => buildBaselineMarkerCoords());
  const [serverCoords, setServerCoords] = useState<Coords | null>(null);
  const [selectedId, setSelectedId] = useState<string>(BUILDINGS[0]?.id ?? "");

  // Waypoint state.
  const [wpCoords, setWpCoords] = useState<Coords>(() => buildBaselineWaypointCoords());
  const [wpServerCoords, setWpServerCoords] = useState<Coords | null>(null);
  const [selectedWpId, setSelectedWpId] = useState<string>(WAYPOINT_LIST[0]?.id ?? "");

  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number } | null>(null);

  // Load marker overrides from /map/coords.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMapCoords();
        if (cancelled) return;
        const next = buildBaselineMarkerCoords();
        for (const [id, c] of Object.entries(data.coords)) {
          if (id in next) next[id] = { x: c.x, y: c.y };
        }
        setCoords(next);
        setServerCoords(next);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load marker coords");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load waypoint overrides from /map/waypoints.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getMapWaypoints();
        if (cancelled) return;
        const next = buildBaselineWaypointCoords();
        for (const [id, c] of Object.entries(data.overrides ?? {})) {
          if (id in next) next[id] = { x: c.x, y: c.y };
        }
        setWpCoords(next);
        setWpServerCoords(next);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load waypoints");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markerDirty = useMemo(() => {
    if (!serverCoords) return false;
    for (const b of BUILDINGS) {
      const cur = coords[b.id];
      const srv = serverCoords[b.id];
      if (!cur || !srv) continue;
      if (cur.x !== srv.x || cur.y !== srv.y) return true;
    }
    return false;
  }, [coords, serverCoords]);

  const waypointDirty = useMemo(() => {
    if (!wpServerCoords) return false;
    for (const w of WAYPOINT_LIST) {
      const cur = wpCoords[w.id];
      const srv = wpServerCoords[w.id];
      if (!cur || !srv) continue;
      if (cur.x !== srv.x || cur.y !== srv.y) return true;
    }
    return false;
  }, [wpCoords, wpServerCoords]);

  const dirty = mode === "markers" ? markerDirty : waypointDirty;

  const filteredBuildings = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return BUILDINGS;
    return BUILDINGS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.abbr.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        String(b.num).includes(q),
    );
  }, [filter]);

  const filteredWaypoints = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return WAYPOINT_LIST;
    return WAYPOINT_LIST.filter((w) => w.id.toLowerCase().includes(q));
  }, [filter]);

  const selectedBuilding = useMemo(
    () => BUILDINGS.find((b) => b.id === selectedId) ?? BUILDINGS[0],
    [selectedId],
  );

  const selectedWaypoint = useMemo(
    () => WAYPOINTS[selectedWpId] ?? WAYPOINT_LIST[0],
    [selectedWpId],
  );

  // Convert a pointer event's clientX/Y into viewBox coords.
  const screenToSvg = (clientX: number, clientY: number): Coord | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.round(Math.max(0, Math.min(CAMPUS_W, local.x))),
      y: Math.round(Math.max(0, Math.min(CAMPUS_H, local.y))),
    };
  };

  // Generic node pointer handlers, dispatch by mode.
  const onNodePointerDown = (id: string, e: React.PointerEvent<SVGGElement>) => {
    if (mode === "markers") setSelectedId(id);
    else setSelectedWpId(id);
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { id, pointerId: e.pointerId };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onNodePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!editMode) return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const next = screenToSvg(e.clientX, e.clientY);
    if (!next) return;
    if (mode === "markers") {
      setCoords((prev) => ({ ...prev, [drag.id]: next }));
    } else {
      setWpCoords((prev) => ({ ...prev, [drag.id]: next }));
    }
  };

  const onNodePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  const handleToggleEdit = () => {
    if (editMode && dirty) {
      setConfirmDiscard(true);
      return;
    }
    setEditMode((m) => !m);
    setStatusMsg(null);
    setError(null);
  };

  const handleDiscardAndLock = () => {
    if (mode === "markers" && serverCoords) setCoords({ ...serverCoords });
    if (mode === "waypoints" && wpServerCoords) setWpCoords({ ...wpServerCoords });
    setConfirmDiscard(false);
    setEditMode(false);
    setStatusMsg(null);
    setError(null);
  };

  const handleSwitchMode = (target: Mode) => {
    if (target === mode) return;
    if (editMode && dirty) {
      setError("Save or discard changes before switching mode.");
      return;
    }
    setMode(target);
    setStatusMsg(null);
    setError(null);
    setFilter("");
  };

  const handleManualEdit = (axis: "x" | "y", raw: string) => {
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n)) return;
    const max = axis === "x" ? CAMPUS_W : CAMPUS_H;
    const clamped = Math.max(0, Math.min(max, n));
    if (mode === "markers") {
      if (!selectedBuilding) return;
      setCoords((prev) => ({
        ...prev,
        [selectedBuilding.id]: {
          ...(prev[selectedBuilding.id] ?? { x: 0, y: 0 }),
          [axis]: clamped,
        },
      }));
    } else {
      if (!selectedWaypoint) return;
      setWpCoords((prev) => ({
        ...prev,
        [selectedWaypoint.id]: {
          ...(prev[selectedWaypoint.id] ?? { x: 0, y: 0 }),
          [axis]: clamped,
        },
      }));
    }
  };

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    setStatusMsg(null);
    try {
      if (mode === "markers") {
        const payload: Coords = {};
        for (const b of BUILDINGS) {
          const cur = coords[b.id];
          const srv = serverCoords?.[b.id];
          if (!cur) continue;
          if (!srv || cur.x !== srv.x || cur.y !== srv.y) payload[b.id] = cur;
        }
        await api.saveMapCoords({ coords: payload });
        setServerCoords({ ...coords });
        setStatusMsg(`Saved ${Object.keys(payload).length} marker(s).`);
        const live = new Map<string, Coord>();
        for (const [id, c] of Object.entries(coords)) live.set(id, c);
        setCoordsLocal(live);
      } else {
        const payload: Coords = {};
        for (const w of WAYPOINT_LIST) {
          const cur = wpCoords[w.id];
          const srv = wpServerCoords?.[w.id];
          if (!cur) continue;
          // Persist any waypoint whose current position differs from its
          // server snapshot — that catches both new overrides and reverts.
          if (!srv || cur.x !== srv.x || cur.y !== srv.y) payload[w.id] = cur;
        }
        await api.saveMapWaypoints({ coords: payload });
        setWpServerCoords({ ...wpCoords });
        setStatusMsg(`Saved ${Object.keys(payload).length} waypoint(s).`);
        // Propagate only the entries that differ from bundled defaults so
        // the chat sees them as overrides.
        const live = new Map<string, Coord>();
        for (const w of WAYPOINT_LIST) {
          const cur = wpCoords[w.id];
          if (!cur) continue;
          if (cur.x !== w.x || cur.y !== w.y) live.set(w.id, cur);
        }
        setWaypointsLocal(live);
      }
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    setError(null);
    setStatusMsg(null);
    try {
      if (mode === "markers") {
        await api.resetMapCoords();
        const baseline = buildBaselineMarkerCoords();
        setCoords(baseline);
        setServerCoords(baseline);
        await loadCoords(true);
        setStatusMsg("All marker overrides cleared.");
      } else {
        await api.resetMapWaypoints();
        const baseline = buildBaselineWaypointCoords();
        setWpCoords(baseline);
        setWpServerCoords(baseline);
        await loadWaypoints(true);
        setStatusMsg("All waypoint overrides cleared.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleRevertSelected = () => {
    if (mode === "markers") {
      if (!selectedBuilding) return;
      setCoords((prev) => ({
        ...prev,
        [selectedBuilding.id]: { x: selectedBuilding.x, y: selectedBuilding.y },
      }));
    } else {
      if (!selectedWaypoint) return;
      setWpCoords((prev) => ({
        ...prev,
        [selectedWaypoint.id]: { x: selectedWaypoint.x, y: selectedWaypoint.y },
      }));
    }
  };

  /** Translate every node by the selected one's offset from its default. */
  const handleCalibrateFromSelected = () => {
    if (!editMode) return;
    if (mode === "markers") {
      if (!selectedBuilding) return;
      const cur = coords[selectedBuilding.id];
      if (!cur) return;
      const dx = cur.x - selectedBuilding.x;
      const dy = cur.y - selectedBuilding.y;
      if (dx === 0 && dy === 0) {
        setStatusMsg("No offset on this marker — nothing to calibrate.");
        return;
      }
      setCoords(() => {
        const next: Coords = {};
        for (const b of BUILDINGS) {
          next[b.id] = {
            x: Math.max(0, Math.min(CAMPUS_W, b.x + dx)),
            y: Math.max(0, Math.min(CAMPUS_H, b.y + dy)),
          };
        }
        return next;
      });
      setStatusMsg(`Translated all markers by (${dx >= 0 ? "+" : ""}${dx}, ${dy >= 0 ? "+" : ""}${dy}).`);
    } else {
      if (!selectedWaypoint) return;
      const cur = wpCoords[selectedWaypoint.id];
      if (!cur) return;
      const dx = cur.x - selectedWaypoint.x;
      const dy = cur.y - selectedWaypoint.y;
      if (dx === 0 && dy === 0) {
        setStatusMsg("No offset on this waypoint — nothing to calibrate.");
        return;
      }
      setWpCoords(() => {
        const next: Coords = {};
        for (const w of WAYPOINT_LIST) {
          next[w.id] = {
            x: Math.max(0, Math.min(CAMPUS_W, w.x + dx)),
            y: Math.max(0, Math.min(CAMPUS_H, w.y + dy)),
          };
        }
        return next;
      });
      setStatusMsg(`Translated all waypoints by (${dx >= 0 ? "+" : ""}${dx}, ${dy >= 0 ? "+" : ""}${dy}).`);
    }
  };

  const selCoord =
    mode === "markers"
      ? (selectedBuilding ? coords[selectedBuilding.id] : undefined)
      : (selectedWaypoint ? wpCoords[selectedWaypoint.id] : undefined);

  const selectedLabel =
    mode === "markers"
      ? selectedBuilding
        ? `${selectedBuilding.num}. ${selectedBuilding.name}`
        : ""
      : selectedWaypoint?.id ?? "";

  const breadcrumbTitle = mode === "markers" ? "Map Markers" : "Map Waypoints";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col bg-gray-50"
    >
      <div className="flex flex-shrink-0 flex-col gap-2 bg-gradient-to-r from-green-700 to-green-800 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <MapIcon className="h-5 w-5 flex-shrink-0 text-white sm:h-6 sm:w-6" />
            <h2 className="truncate text-lg font-semibold text-white sm:text-xl">
              {breadcrumbTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
            aria-label="Close map editor"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-green-100 sm:text-sm">
          <nav className="flex items-center gap-1 truncate" aria-label="Breadcrumb">
            <span>Admin Dashboard</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
            <span>{breadcrumbTitle}</span>
            <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
            <span className="font-semibold text-white">
              {editMode ? "Edit mode" : "View mode"}
            </span>
          </nav>

          <button
            onClick={handleToggleEdit}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
              editMode
                ? "bg-amber-400 text-amber-950 hover:bg-amber-300"
                : "bg-white text-green-800 hover:bg-green-50"
            }`}
            title={editMode ? "Lock and exit edit mode" : "Unlock to drag nodes"}
          >
            {editMode ? (
              <>
                <Lock className="h-4 w-4" />
                Lock & exit edit
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4" />
                Enter edit mode
              </>
            )}
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1.5">
          <button
            onClick={() => handleSwitchMode("markers")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === "markers"
                ? "bg-white text-green-800"
                : "bg-white/10 text-green-100 hover:bg-white/20"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Markers ({BUILDINGS.length})
          </button>
          <button
            onClick={() => handleSwitchMode("waypoints")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              mode === "waypoints"
                ? "bg-white text-green-800"
                : "bg-white/10 text-green-100 hover:bg-white/20"
            }`}
          >
            <WaypointsIcon className="h-3.5 w-3.5" />
            Waypoints ({WAYPOINT_LIST.length})
          </button>
        </div>
      </div>

      {confirmDiscard && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              Discard unsaved changes?
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              You moved one or more nodes but haven&apos;t saved. Exiting edit
              mode will revert them to the last saved positions.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Keep editing
              </button>
              <button
                onClick={handleDiscardAndLock}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Discard & lock
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        <div className="relative flex-1 min-h-[420px] overflow-auto bg-[#1f3d1f]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CAMPUS_W} ${CAMPUS_H}`}
            className="block h-full w-full"
            style={{ touchAction: "none" }}
            aria-label="Drag-and-drop campus map editor"
          >
            <image
              href={CAMPUS_IMAGE_URL}
              x={0}
              y={0}
              width={CAMPUS_W}
              height={CAMPUS_H}
              preserveAspectRatio="xMidYMid meet"
              pointerEvents="none"
            />

            {/* Waypoint adjacency lines, drawn first so nodes sit on top. */}
            {mode === "waypoints" && (
              <g>
                {WP_EDGES.map(({ a, b }) => {
                  const pa = wpCoords[a];
                  const pb = wpCoords[b];
                  if (!pa || !pb) return null;
                  return (
                    <line
                      key={`${a}|${b}`}
                      x1={pa.x}
                      y1={pa.y}
                      x2={pb.x}
                      y2={pb.y}
                      stroke="#22d3ee"
                      strokeWidth={6}
                      strokeLinecap="round"
                      opacity={0.7}
                      pointerEvents="none"
                    />
                  );
                })}
              </g>
            )}

            {/* Marker nodes */}
            {mode === "markers" &&
              BUILDINGS.map((b) => {
                const c = coords[b.id] ?? { x: b.x, y: b.y };
                const isSel = b.id === selectedId;
                return (
                  <g
                    key={b.id}
                    onPointerDown={(e) => onNodePointerDown(b.id, e)}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                    onPointerCancel={onNodePointerUp}
                    style={{ cursor: editMode ? "grab" : "pointer", touchAction: "none" }}
                  >
                    <title>{b.num}. {b.name}</title>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={MARKER_RADIUS + 6}
                      fill={isSel ? "#16a34a" : "#facc15"}
                      opacity={isSel ? 0.35 : 0.0}
                    />
                    <rect
                      x={c.x - MARKER_RADIUS}
                      y={c.y - MARKER_RADIUS}
                      width={MARKER_RADIUS * 2}
                      height={MARKER_RADIUS * 2}
                      rx={8}
                      fill={isSel ? "#16a34a" : "#facc15"}
                      stroke={isSel ? "#ffffff" : "#1a3d1a"}
                      strokeWidth={isSel ? 4 : 2}
                    />
                    <text
                      x={c.x}
                      y={c.y + 11}
                      textAnchor="middle"
                      fontSize="30"
                      fontWeight={800}
                      fill={isSel ? "#ffffff" : "#1a3d1a"}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      pointerEvents="none"
                    >
                      {b.num}
                    </text>
                  </g>
                );
              })}

            {/* Waypoint nodes */}
            {mode === "waypoints" &&
              WAYPOINT_LIST.map((w) => {
                const c = wpCoords[w.id] ?? { x: w.x, y: w.y };
                const isSel = w.id === selectedWpId;
                return (
                  <g
                    key={w.id}
                    onPointerDown={(e) => onNodePointerDown(w.id, e)}
                    onPointerMove={onNodePointerMove}
                    onPointerUp={onNodePointerUp}
                    onPointerCancel={onNodePointerUp}
                    style={{ cursor: editMode ? "grab" : "pointer", touchAction: "none" }}
                  >
                    <title>{w.id}</title>
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={WAYPOINT_RADIUS + 6}
                      fill="#22d3ee"
                      opacity={isSel ? 0.4 : 0.0}
                    />
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={WAYPOINT_RADIUS}
                      fill={isSel ? "#0ea5e9" : "#06b6d4"}
                      stroke="#ffffff"
                      strokeWidth={isSel ? 4 : 2}
                    />
                  </g>
                );
              })}
          </svg>
        </div>

        <aside className="flex w-full flex-col border-t border-gray-200 bg-white lg:w-[360px] lg:flex-shrink-0 lg:border-l lg:border-t-0">
          {selectedLabel && (
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Selected {mode === "markers" ? "marker" : "waypoint"}
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-gray-900">
                {selectedLabel}
              </p>
              {mode === "waypoints" && selectedWaypoint && (
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Connects to: {selectedWaypoint.neighbors.join(", ") || "—"}
                </p>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-xs text-gray-600">
                  X
                  <input
                    type="number"
                    min={0}
                    max={CAMPUS_W}
                    value={selCoord?.x ?? 0}
                    onChange={(e) => handleManualEdit("x", e.target.value)}
                    readOnly={!editMode}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400 read-only:cursor-not-allowed read-only:bg-gray-50 read-only:text-gray-500"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-gray-600">
                  Y
                  <input
                    type="number"
                    min={0}
                    max={CAMPUS_H}
                    value={selCoord?.y ?? 0}
                    onChange={(e) => handleManualEdit("y", e.target.value)}
                    readOnly={!editMode}
                    className="rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400 read-only:cursor-not-allowed read-only:bg-gray-50 read-only:text-gray-500"
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    editMode ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {editMode ? (
                    <>
                      <Pencil className="h-3 w-3" />
                      Editable
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3" />
                      Locked
                    </>
                  )}
                </span>
                {editMode && (
                  <button
                    onClick={handleRevertSelected}
                    className="inline-flex items-center gap-1.5 font-medium text-gray-600 hover:text-gray-900"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    Revert
                  </button>
                )}
              </div>
              {editMode && (
                <button
                  onClick={handleCalibrateFromSelected}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
                  title="Apply this node's offset to every other node of the same kind"
                >
                  <Move className="h-3.5 w-3.5" />
                  Calibrate all from this {mode === "markers" ? "marker" : "waypoint"}
                </button>
              )}
            </div>
          )}

          <div className="border-b border-gray-200 px-4 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={mode === "markers" ? "Search buildings…" : "Search waypoints…"}
                className="w-full rounded-md border border-gray-300 bg-white pl-8 pr-2.5 py-1.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
              />
            </div>
          </div>

          <ul className="flex-1 min-h-0 overflow-y-auto">
            {mode === "markers" &&
              filteredBuildings.map((b) => {
                const isSel = b.id === selectedId;
                const cur = coords[b.id];
                const moved = !!cur && (cur.x !== b.x || cur.y !== b.y);
                return (
                  <li key={b.id}>
                    <button
                      onClick={() => setSelectedId(b.id)}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                        isSel ? "bg-green-50 text-green-900" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-xs font-bold ${
                          isSel ? "bg-green-600 text-white" : "bg-yellow-300 text-gray-900"
                        }`}
                      >
                        {b.num}
                      </span>
                      <span className="flex-1 truncate" title={b.name}>
                        {b.abbr}
                      </span>
                      {moved && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          edited
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            {mode === "waypoints" &&
              filteredWaypoints.map((w) => {
                const isSel = w.id === selectedWpId;
                const cur = wpCoords[w.id];
                const moved = !!cur && (cur.x !== w.x || cur.y !== w.y);
                return (
                  <li key={w.id}>
                    <button
                      onClick={() => setSelectedWpId(w.id)}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors ${
                        isSel ? "bg-cyan-50 text-cyan-900" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isSel ? "bg-cyan-600 text-white" : "bg-cyan-200 text-cyan-900"
                        }`}
                      >
                        wp
                      </span>
                      <span className="flex-1 truncate font-mono text-xs" title={w.id}>
                        {w.id}
                      </span>
                      {moved && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          edited
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            {((mode === "markers" && filteredBuildings.length === 0) ||
              (mode === "waypoints" && filteredWaypoints.length === 0)) && (
              <li className="px-4 py-6 text-center text-sm text-gray-500">
                No match for "{filter}"
              </li>
            )}
          </ul>

          <div className="flex-shrink-0 border-t border-gray-200 px-4 py-3">
            {error && (
              <p className="mb-2 rounded-md bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                {error}
              </p>
            )}
            {statusMsg && !error && (
              <p className="mb-2 rounded-md bg-green-50 px-2.5 py-1.5 text-xs text-green-700">
                {statusMsg}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!editMode || !dirty || saving}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                title={!editMode ? "Enter edit mode to save changes" : "Save edits"}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleReset}
                disabled={!editMode || resetting}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  !editMode
                    ? "Enter edit mode to reset"
                    : `Clear all ${mode === "markers" ? "marker" : "waypoint"} overrides`
                }
              >
                <RotateCcw className="h-4 w-4" />
                {resetting ? "Resetting…" : "Reset all"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}
