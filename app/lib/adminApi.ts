/**
 * Admin-only API client (Phase 2 of the admin decoupling).
 *
 * Split out of ./api.ts on purpose: this module is imported ONLY by the admin
 * app (app/admin/*) and the admin components, so the bundler keeps it in the
 * admin bundle. The public chat bundle therefore contains none of the admin
 * route names and no X-Admin-Pin plumbing — nothing to read off the wire as
 * reconnaissance for the gated surface.
 *
 * The PIN is a key to the server-side gate, never the gate itself: every route
 * below is enforced by `require_admin` in api/app.py.
 */
import {
  request,
  type MapCoordsResponse,
  type MapCoordsUpdate,
  type MapWaypointsResponse,
  type MapWaypointsUpdate,
  type WaypointOverride,
} from "./api";

export type {
  MapCoordsResponse,
  MapCoordsUpdate,
  MapWaypointsResponse,
  MapWaypointsUpdate,
  WaypointOverride,
};

export interface AdminStatus {
  service: string;
  uptime_seconds: number;
  brain: {
    classifier_ready: boolean;
    neural_net_ready: boolean;
    charter_rag: { available?: boolean; chunks?: number };
    usage: Record<string, number>;
  };
  llm: { provider: string; model: string | null; available: boolean; second_opinion: boolean };
  moderation: Record<string, number>;
  connectors_bridge: Record<string, any>;
  ais_bridge: Record<string, any>;
  campus_context: Record<string, number>;
}

export interface LlmConfig {
  provider: string;
  model: string | null;
  available: boolean;
  ollama_models?: string[];
}

export interface ModerationSnapshot {
  counts: Record<string, number>;
  recent: Array<{
    at: string;
    category: string;
    severity?: number | null;
    message: string;
    session_id?: string | null;
  }>;
  lexicon: { loaded: boolean; version?: string | null; entries?: number; forms?: number };
}

export interface CustomMarker {
  id: string;
  name: string;
  abbr: string;
  x: number;
  y: number;
  num?: number;
}

export interface CustomMarkersResponse {
  markers: Record<string, CustomMarker>;
}

/**
 * Admin endpoints authenticate with the httpOnly session cookie that
 * /admin/verify sets. The PIN is presented exactly once, at unlock, and is
 * never stored or re-sent: it used to sit in sessionStorage and ride every
 * admin request, so one XSS on this origin lifted the shared secret itself.
 *
 * `credentials: "same-origin"` is what actually attaches the cookie — the admin
 * app is served from the same origin as /api (nginx in production, the Vite
 * proxy in dev), so no CORS credentials are involved.
 *
 * The `pin` parameter is retained on the exported signatures for compatibility
 * with existing callers and is ignored.
 */
/**
 * True when the API lives on a DIFFERENT origin than this page — the GitHub
 * Pages build, where VITE_API_URL points at the Render API.
 *
 * A cookie cannot work there: it would be cross-site, the API sends
 * `allow_credentials=False`, and the cookie is SameSite=Strict. So that
 * deployment keeps the original X-Admin-Pin header path. It is strictly the
 * pre-existing behaviour, not a new weakness — and the deployment that actually
 * matters (the tunnel/nginx stack, where /api is same-origin) gets the cookie
 * and never stores the PIN.
 */
const API_IS_CROSS_ORIGIN = (() => {
  const base = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL;
  if (!base || base.startsWith("/")) return false;
  try {
    return new URL(base, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
})();

/** Legacy PIN, only read on a cross-origin deployment (see above). */
function legacyPin(): string {
  try {
    return sessionStorage.getItem("admin_pin") || "";
  } catch {
    return "";
  }
}

/** True when this deployment must fall back to the PIN header. */
export const adminUsesPinHeader = API_IS_CROSS_ORIGIN;

function adminRequest<T>(path: string, pin?: string, init?: RequestInit): Promise<T> {
  if (API_IS_CROSS_ORIGIN) {
    const value = pin || legacyPin();
    return request<T>(path, {
      ...init,
      headers: { "X-Admin-Pin": value, ...(init?.headers || {}) },
    });
  }
  return request<T>(path, { ...init, credentials: "same-origin" });
}

export const adminApi = {
  // ── Unlock ──────────────────────────────────────────────────────────────
  /** Exchange the PIN for the httpOnly admin session cookie. The only call
   *  that ever sees the PIN — nothing stores it afterwards. */
  verifyPin: (value: string) =>
    request<{ status: string; expires_in: number }>("/admin/verify", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ pin: value }),
    }),

  /** Revoke this browser's admin session server-side and clear the cookie. */
  logout: () =>
    request<{ status: string }>("/admin/logout", {
      method: "POST",
      credentials: "same-origin",
    }),

  // ── System panel ────────────────────────────────────────────────────────
  // `p` is accepted for call-site compatibility and ignored: the cookie
  // authenticates these now.
  getAdminStatus: (p?: string) => adminRequest<AdminStatus>("/admin/status", p),

  getModeration: (p?: string) => adminRequest<ModerationSnapshot>("/admin/moderation", p),

  getLlmConfig: (p?: string) => adminRequest<LlmConfig>("/admin/llm", p),

  setLlmConfig: (p: string | undefined, body: { provider: string; model?: string }) =>
    adminRequest<LlmConfig>("/admin/llm", p, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Dashboard reads ─────────────────────────────────────────────────────
  getTodayStats: () => adminRequest<any>("/logs/today"),

  getIntentLogs: () => adminRequest<any>("/logs/intents"),

  /** Device-usage rollup — distinct devices, form factor, orientation. */
  getDeviceStats: (days = 30) => adminRequest<any>(`/logs/devices?days=${days}`),

  getFallbacks: (limit = 100) => adminRequest<any>(`/logs/fallbacks?limit=${limit}`),

  getFeedbackStats: () => adminRequest<any>("/feedback/stats"),

  getConversation: (userId: string) =>
    adminRequest<any>(`/conversation/${encodeURIComponent(userId)}`),

  clearConversation: (userId: string) =>
    adminRequest<any>(`/conversation/${encodeURIComponent(userId)}`, undefined, {
      method: "DELETE",
    }),

  // ── Intent authoring ────────────────────────────────────────────────────
  sanitizeCandidateIntent: (body: { tag: string; patterns: string[]; responses: string[] }) =>
    adminRequest<{
      candidate_tag: string;
      pattern_count: number;
      response_count: number;
      has_errors: boolean;
      has_warnings: boolean;
      findings: Array<{
        severity: "error" | "warning" | "info";
        code: string;
        message: string;
        detail?: Record<string, any> | null;
      }>;
    }>("/admin/intents/sanitize", undefined, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createIntent: (
    body: { tag: string; patterns: string[]; responses: string[] },
    options: { force?: boolean } = {},
  ) =>
    adminRequest<{
      status: string;
      tag: string;
      warnings: boolean;
      report: any;
      next_step: string;
    }>(`/admin/intents${options.force ? "?force=true" : ""}`, undefined, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Map editor (reads are public; writes are gated) ──────────────────────
  getMapCoords: () => request<MapCoordsResponse>("/map/coords"),

  saveMapCoords: (body: MapCoordsUpdate) =>
    adminRequest<any>("/map/coords", undefined, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  resetMapCoords: () => adminRequest<any>("/map/coords", undefined, { method: "DELETE" }),

  getMapWaypoints: () => request<MapWaypointsResponse>("/map/waypoints"),

  saveMapWaypoints: (body: MapWaypointsUpdate | MapCoordsUpdate) =>
    adminRequest<any>("/map/waypoints", undefined, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteMapWaypoint: (waypointId: string) =>
    adminRequest<any>(`/map/waypoints/${encodeURIComponent(waypointId)}`, undefined, {
      method: "DELETE",
    }),

  resetMapWaypoints: () => adminRequest<any>("/map/waypoints", undefined, { method: "DELETE" }),

  getCustomMarkers: () => adminRequest<CustomMarkersResponse>("/map/custom_markers"),

  saveCustomMarker: (body: CustomMarker) =>
    adminRequest<any>("/map/custom_markers", undefined, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteCustomMarker: (markerId: string) =>
    adminRequest<any>(`/map/custom_markers/${encodeURIComponent(markerId)}`, undefined, {
      method: "DELETE",
    }),
};
