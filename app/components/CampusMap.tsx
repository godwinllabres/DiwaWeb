import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation, ArrowRight, Info, Plus, Minus, Maximize2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  applyCoordOverrides,
  applyWaypointOverrides,
  CAMPUS_H,
  CAMPUS_IMAGE_URL,
  CAMPUS_W,
  pointsToPath,
  routeBetween,
} from "@/lib/campusMap";
import { useCoordsOverrides, useWaypointOverrides } from "@/lib/hooks/useCoords";
import { useIsShortViewport } from "@/lib/hooks/useViewport";
import type { MapData } from "@/lib/types";

const HIGHLIGHT_RADIUS = 100;    // outer pulsing ring on the target
const TARGET_BADGE_R = 44;       // green badge over the target's number
const MARKER_BADGE_R = 22;       // yellow marker for every other building
const SOURCE_BADGE_R = 38;       // red badge over the source ("from") number

export interface CampusMapProps extends MapData {
  /** When true, surface a To-picker so the user can pick the destination
   *  in addition to the starting point. Defaults to false (read-only target),
   *  which is what the inline chat preview wants. */
  readonly editableTarget?: boolean;
  /** When true, wrap the SVG in a pan/zoom container with pinch support and
   *  on-screen +/-/fit controls. Inline preview leaves this off. */
  readonly zoomable?: boolean;
}

export function CampusMap({
  place_id,
  label,
  editableTarget = false,
  zoomable = false,
}: Readonly<CampusMapProps>) {
  const overrides = useCoordsOverrides();
  const wpOverrides = useWaypointOverrides();
  // Landscape phone (or any viewport under 560px tall). The stacked layout
  // below turns into two columns there — see `paneCls` — and the legend, the
  // longest block on the page, starts collapsed so the directions are what
  // the rail actually shows.
  const isShort = useIsShortViewport();
  const [legendOpen, setLegendOpen] = useState(true);
  useEffect(() => setLegendOpen(!isShort), [isShort]);
  const buildings = useMemo(() => applyCoordOverrides(overrides), [overrides]);
  const waypointGraph = useMemo(
    () => applyWaypointOverrides(wpOverrides),
    [wpOverrides],
  );
  const findB = (id: string) => buildings.find((b) => b.id === id);

  // To-picker (only surfaced when editableTarget). Starts at the place_id
  // the chat passed in so the user's last question still wins by default.
  const [toId, setToId] = useState<string>(place_id);
  const effectiveTargetId = editableTarget ? toId : place_id;
  const target = findB(effectiveTargetId);
  const isFullCampus = effectiveTargetId === "main" || !target;

  // From-picker — defaults to Gate 1 (Main Gate). User can switch to any place.
  const [fromId, setFromId] = useState<string>("gate_1");
  const from = useMemo(
    () => findB(fromId) ?? findB("gate_1")!,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fromId, buildings],
  );

  const route = useMemo(() => {
    if (!target || target.id === from.id) return [];
    return routeBetween(from, target, waypointGraph);
  }, [from, target, waypointGraph]);

  const routePath = useMemo(() => pointsToPath(route), [route]);

  // Pulled out so both the bare-SVG and TransformWrapper-zoom branches can
  // share the same markup without duplication.
  const svgChildren = (
    <>
      <defs>
        <filter id="cm-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="2" />
          </feComponentTransfer>
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      {/* Dark-green fallback for when the poster image hasn't been saved
          yet (no /cvsu-campus-map.png in /public). */}
      <rect x="0" y="0" width={CAMPUS_W} height={CAMPUS_H} fill="#1f3d1f" />

      {/* Official Matayuyon Crop Science Society campus poster. 2048x2048,
          fills the SVG viewBox 1:1. */}
      <image
        href={CAMPUS_IMAGE_URL}
        x={0}
        y={0}
        width={CAMPUS_W}
        height={CAMPUS_H}
        preserveAspectRatio="xMidYMid meet"
      />

      {/* Animated route polyline (only when from ≠ to and we have a target) */}
      {target && route.length > 1 && (
        <g>
          <path
            d={routePath}
            fill="none"
            stroke="#000000"
            strokeWidth="22"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.25"
          />
          <path
            d={routePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="28 18"
          >
            <animate
              attributeName="stroke-dashoffset"
              values="0;-92"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      )}

      {/* Yellow numbered markers for every building (skip source/target —
          those get larger label badges below). */}
      <g>
        {buildings.map((b) => {
          const isTarget = target && b.id === target.id;
          const isSource = target && b.id === from.id && b.id !== target.id;
          if (isTarget || isSource) return null;
          return (
            <g key={`mk-${b.id}`}>
              <title>{b.num}. {b.name}</title>
              <rect
                x={b.x - MARKER_BADGE_R}
                y={b.y - MARKER_BADGE_R}
                width={MARKER_BADGE_R * 2}
                height={MARKER_BADGE_R * 2}
                rx="6"
                fill="#facc15"
                stroke="#1a3d1a"
                strokeWidth="1.5"
                opacity="0.95"
              />
              <text
                x={b.x}
                y={b.y + 9}
                textAnchor="middle"
                fontSize="26"
                fontWeight="800"
                fill="#1a3d1a"
                fontFamily="system-ui, -apple-system, sans-serif"
              >
                {b.num}
              </text>
            </g>
          );
        })}
      </g>

      {/* Source pin (red badge with FROM label) — drawn after generic markers */}
      {target && from.id !== target.id && (
        <g>
          <circle cx={from.x} cy={from.y} r={SOURCE_BADGE_R + 8} fill="#ffffff" />
          <circle
            cx={from.x}
            cy={from.y}
            r={SOURCE_BADGE_R}
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth="5"
          />
          <text
            x={from.x}
            y={from.y + 10}
            textAnchor="middle"
            fontSize="28"
            fontWeight="900"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {from.num}
          </text>
          <g transform={`translate(${from.x}, ${from.y - SOURCE_BADGE_R - 38})`}>
            <rect
              x={-90}
              y={-22}
              width={180}
              height={40}
              rx={20}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <text x="0" y="6" textAnchor="middle" fontSize="22" fontWeight="700" fill="#ffffff" fontFamily="system-ui, -apple-system, sans-serif">
              FROM
            </text>
          </g>
        </g>
      )}

      {/* Target pin (pulsing green) — drawn last so it sits on top */}
      {target && (
        <g>
          <circle
            cx={target.x}
            cy={target.y}
            r={HIGHLIGHT_RADIUS}
            fill="#facc15"
            opacity="0.4"
            filter="url(#cm-glow)"
          >
            <animate
              attributeName="r"
              values={`${HIGHLIGHT_RADIUS};${HIGHLIGHT_RADIUS + 50};${HIGHLIGHT_RADIUS}`}
              dur="2s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.5;0.15;0.5"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx={target.x} cy={target.y} r={TARGET_BADGE_R + 8} fill="#ffffff" />
          <circle
            cx={target.x}
            cy={target.y}
            r={TARGET_BADGE_R}
            fill="#16a34a"
            stroke="#ffffff"
            strokeWidth="6"
          />
          <text
            x={target.x}
            y={target.y + 12}
            textAnchor="middle"
            fontSize="34"
            fontWeight="900"
            fill="#ffffff"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {target.num}
          </text>

          {/* TO label above the target pin */}
          <g transform={`translate(${target.x}, ${target.y - TARGET_BADGE_R - 46})`}>
            <rect
              x={-Math.max(110, target.abbr.length * 14)}
              y={-26}
              width={Math.max(220, target.abbr.length * 28)}
              height={48}
              rx={24}
              fill="#16a34a"
              stroke="#ffffff"
              strokeWidth="4"
            />
            <text x="0" y="7" textAnchor="middle" fontSize="24" fontWeight="700" fill="#ffffff" fontFamily="system-ui, -apple-system, sans-serif">
              {target.abbr}
            </text>
          </g>
        </g>
      )}

      {/* Footer label inside the canvas */}
      <text
        x={CAMPUS_W / 2}
        y={CAMPUS_H - 24}
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="#dcfce7"
        opacity="0.85"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        CvSU Don Severino delas Alas Campus — Indang, Cavite
      </text>
    </>
  );

  // Landscape layout (fullscreen dialog only — the inline chat preview stays
  // stacked, it lives inside a scrolling bubble). Stacking a header, a
  // disclaimer, two pickers, the map, three directions and a 48-row legend
  // down a 390px-tall screen leaves the map a letterbox, so on a short
  // viewport the map takes the whole left column at full height and all the
  // chrome moves into a rail on the right that scrolls on its own.
  // `short-wide:`, not `short:` — the rail needs 19rem of WIDTH to exist, and
  // the chat widget is a 420px iframe that goes under 560px tall on a tablet.
  // Splitting there left the map 116px wide. See styles/tailwind.css.
  const LANDSCAPE_GRID =
    " short-wide:mt-0 short-wide:grid short-wide:h-full short-wide:grid-cols-[minmax(0,1fr)_19rem]" +
    " short-wide:grid-rows-[auto_minmax(0,1fr)] short-wide:rounded-none short-wide:border-0 short-wide:shadow-none" +
    // Desktop dialog (wide viewport): the same map-left + scrolling-rail grid,
    // so the tall map + legend fit the fixed-height modal instead of stacking
    // to ~1500px and overflowing (the map got cut off in fullscreen view).
    " lg:mt-0 lg:grid lg:h-full lg:grid-cols-[minmax(0,1fr)_19rem]" +
    " lg:grid-rows-[auto_minmax(0,1fr)] lg:rounded-none lg:border-0 lg:shadow-none";
  const rootCls =
    "mt-2 rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white" +
    (zoomable ? LANDSCAPE_GRID : "");
  // Right rail, top cell: title + coverage note + the From/To pickers.
  const controlsCls = zoomable
    ? "short-wide:col-start-2 short-wide:row-start-1 short-wide:border-l short-wide:border-gray-200" +
      " lg:col-start-2 lg:row-start-1 lg:border-l lg:border-gray-200"
    : "";
  // Right rail, bottom cell: walking directions + legend, scrolling on its own
  // so the map beside it never moves.
  const detailsCls = zoomable
    ? "short-wide:col-start-2 short-wide:row-start-2 short-wide:min-h-0 short-wide:overflow-y-auto short-wide:border-l short-wide:border-gray-200" +
      " lg:col-start-2 lg:row-start-2 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-gray-200"
    : "";
  // In the rail, "From [select] → To [select]" wraps mid-sentence. Stack the
  // two pickers instead and drop the arrow that used to join them.
  const pickerStackCls = zoomable
    ? " short-wide:flex-col short-wide:items-stretch short-wide:gap-1.5 lg:flex-col lg:items-stretch lg:gap-1.5"
    : "";

  return (
    <div className={rootCls}>
      <div className={controlsCls}>
      <div className="flex items-start gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200 sm:items-center">
        <MapPin className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
        <span className="text-xs font-medium text-gray-700 leading-snug sm:truncate">
          {target ? `${target.num}. ${target.name}` : label}
        </span>
      </div>

      {/* Coverage disclaimer — map data is limited to the Indang main campus for now. */}
      <div className="flex items-start gap-1.5 px-3 py-1.5 bg-amber-50 border-b border-amber-200">
        <Info className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" />
        <span className="text-[11px] text-amber-800 leading-snug">
          Map coverage is currently limited to CvSU Main (Don Severino delas Alas, Indang).
          Other campuses (CCAT, Silang, etc.) are not yet supported.
        </span>
      </div>

      {/* From / To pickers — touch-friendly on mobile (44px+ tap target).
          When editableTarget is true the destination is a select too; otherwise
          we render the target as a read-only label so the inline preview stays
          compact. */}
      {target && (
        <div className={`px-3 py-2.5 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2 text-xs sm:text-sm${pickerStackCls}`}>
          <span className="text-gray-600 font-medium">From</span>
          <select
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
            className="min-h-9 flex-1 min-w-[140px] px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            aria-label="Starting location"
          >
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.num}. {b.abbr}</option>
            ))}
          </select>
          <ArrowRight
            className={`h-3.5 w-3.5 text-gray-500 flex-shrink-0${zoomable ? " short-wide:hidden lg:hidden" : ""}`}
          />
          {editableTarget ? (
            <>
              <span className="text-gray-600 font-medium">To</span>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="min-h-9 flex-1 min-w-[140px] px-2.5 py-1.5 rounded-md border border-gray-300 bg-white text-gray-800 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                aria-label="Destination"
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.num}. {b.abbr}</option>
                ))}
              </select>
            </>
          ) : (
            <span className="text-gray-800 font-semibold truncate" title={target.name}>
              {target.num}. {target.abbr}
            </span>
          )}
        </div>
      )}
      </div>

      {/* Illustrated campus map. When `zoomable`, wrap the SVG in
          TransformWrapper so pinch / wheel / drag pan the canvas. Floating
          +/-/fit buttons sit in the top-right for non-touch users. */}
      <div
        className={`relative bg-[#1f3d1f] ${
          zoomable
            ? "h-full min-h-[60vh] overflow-hidden short-wide:col-start-1 short-wide:row-start-1 short-wide:row-span-2 short-wide:min-h-0 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:min-h-0"
            : "overflow-x-auto"
        }`}
      >
        {zoomable ? (
          <TransformWrapper
            initialScale={1}
            minScale={1}
            maxScale={6}
            wheel={{ step: 0.2 }}
            pinch={{ step: 8 }}
            doubleClick={{ mode: "toggle", step: 1.5 }}
            limitToBounds
            centerOnInit
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperClass="!h-full !w-full"
                  contentClass="!h-full !w-full"
                >
                  <svg
                    viewBox={`0 0 ${CAMPUS_W} ${CAMPUS_H}`}
                    className="block h-full w-full select-none"
                    aria-label={`CvSU Indang campus map highlighting ${target ? target.name : "the full campus"}`}
                    role="img"
                  >
                    {svgChildren}
                  </svg>
                </TransformComponent>
                <div className="absolute right-3 top-3 flex flex-col gap-1.5 rounded-lg bg-white/95 p-1 shadow-md backdrop-blur">
                  <button
                    type="button"
                    onClick={() => zoomIn()}
                    aria-label="Zoom in"
                    className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => zoomOut()}
                    aria-label="Zoom out"
                    className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => resetTransform()}
                    aria-label="Reset zoom"
                    className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
                {/* The full hint wraps to two lines over the map once the pane
                    is only a landscape phone wide — say less there. */}
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-medium text-white">
                  {isShort
                    ? "Pinch to zoom · drag to pan"
                    : "Pinch / scroll to zoom · drag to pan · double-tap to toggle"}
                </div>
              </>
            )}
          </TransformWrapper>
        ) : (
          <svg
            viewBox={`0 0 ${CAMPUS_W} ${CAMPUS_H}`}
            className="block w-full"
            style={{ maxHeight: 640 }}
            aria-label={`CvSU Indang campus map highlighting ${target ? target.name : "the full campus"}`}
            role="img"
          >
            {svgChildren}
          </svg>
        )}
      </div>

      <div className={detailsCls}>
      {/* Walking directions panel */}
      {target && (
        <div className="px-3 py-3 border-t border-gray-100 bg-white sm:px-3 sm:py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-2 sm:text-[11px]">
            <Navigation className="h-3.5 w-3.5 text-green-600 sm:h-3 sm:w-3" />
            {from.id === target.id
              ? "You are already there"
              : `Easiest path: ${from.abbr} → ${target.abbr}`}
          </p>
          {from.id === target.id ? (
            <p className="text-sm text-gray-700 sm:text-xs">{target.steps[0]}</p>
          ) : (
            <ol className="space-y-2 sm:space-y-1.5">
              <li className="flex items-start gap-2 text-sm text-gray-700 leading-snug sm:text-xs">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-bold sm:w-4 sm:h-4 sm:text-[9px]">
                  A
                </span>
                <span>Start at <strong>{from.num}. {from.name}</strong>.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 leading-snug sm:text-xs">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold sm:w-4 sm:h-4 sm:text-[9px]">
                  →
                </span>
                <span>
                  Follow the highlighted red path through {Math.max(1, route.length - 1)} road
                  {route.length - 1 === 1 ? " segment" : " segments"}.
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-700 leading-snug sm:text-xs">
                <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-bold sm:w-4 sm:h-4 sm:text-[9px]">
                  B
                </span>
                <span>Arrive at <strong>{target.num}. {target.name}</strong>.</span>
              </li>
              {target.steps[0] && (
                <li className="flex items-start gap-2 text-sm text-gray-600 leading-snug italic pt-1 border-t border-gray-100 sm:text-xs">
                  <span className="flex-shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center text-[11px] sm:w-4 sm:h-4 sm:text-[10px]">
                    💡
                  </span>
                  <span>{target.steps[0]}</span>
                </li>
              )}
            </ol>
          )}
        </div>
      )}

      {isFullCampus && (
        <div className="px-3 py-2.5 border-t border-gray-100 bg-white">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 mb-1">
            <Navigation className="h-3 w-3 text-green-600" />
            CvSU Don Severino delas Alas Campus — Indang, Cavite
          </p>
          <p className="text-xs text-gray-600 leading-snug">
            The campus has {buildings.length} numbered locations — 3 gates,
            10+ colleges, the Library, the Oval, OSAS/Registrar, the Chapel,
            the Lagoon, and the CvSU Star Farm at the far north. Ask about a
            specific place (e.g. &ldquo;Where is OSAS?&rdquo;, &ldquo;Where is
            the lagoon?&rdquo;) for walking directions and a route from your
            chosen starting point.
          </p>
        </div>
      )}

      {/* Legend — the map's numbered key, matching the side list on the
          official campus schematic. FROM and TO rows get color highlights so
          you can quickly find them in the list. */}
      <details
        className="border-t border-gray-100 bg-white"
        open={legendOpen}
        onToggle={(e) => setLegendOpen(e.currentTarget.open)}
      >
        <summary className="px-3 py-2 text-[11px] font-semibold text-gray-600 cursor-pointer select-none flex items-center justify-between">
          <span>Legend ({buildings.length} locations)</span>
          <span className="text-gray-400 font-normal">tap to toggle</span>
        </summary>
        {/* Three columns is right for a full-width phone; in the landscape
            rail the same grid has 19rem to work with, so drop back to two. */}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 px-3 pb-3 sm:grid-cols-3 short-wide:grid-cols-2 lg:grid-cols-2">
          {buildings.map((b) => {
            const isFromRow = target && b.id === from.id && b.id !== target.id;
            const isToRow = target && b.id === target.id;
            const rowCls = isToRow
              ? "bg-green-50 text-green-900 border-l-2 border-green-600 pl-1.5"
              : isFromRow
              ? "bg-red-50 text-red-900 border-l-2 border-red-600 pl-1.5"
              : "text-gray-700";
            return (
              <li
                key={b.id}
                className={`flex items-baseline gap-1.5 py-0.5 text-[11px] leading-tight rounded-r ${rowCls}`}
              >
                <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-sm bg-yellow-300 px-1 text-[10px] font-bold text-gray-900">
                  {b.num}
                </span>
                <span className="truncate" title={b.name}>{b.abbr}</span>
              </li>
            );
          })}
        </ul>
      </details>
      </div>
    </div>
  );
}
