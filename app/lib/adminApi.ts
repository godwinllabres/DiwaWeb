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

/** Admin endpoints require the X-Admin-Pin header (matches DASHBOARD_PIN). */
function adminRequest<T>(path: string, pin: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: { "X-Admin-Pin": pin, ...(init?.headers || {}) },
  });
}

/** PIN read back from the tab's session, set by the admin app's unlock screen. */
function pin(): string {
  try {
    return sessionStorage.getItem("admin_pin") || "";
  } catch {
    return "";
  }
}

export const adminApi = {
  // ── Unlock ──────────────────────────────────────────────────────────────
  verifyPin: (value: string) =>
    request<{ status: string }>("/admin/verify", {
      method: "POST",
      body: JSON.stringify({ pin: value }),
    }),

  // ── System panel ────────────────────────────────────────────────────────
  getAdminStatus: (p: string = pin()) => adminRequest<AdminStatus>("/admin/status", p),

  getModeration: (p: string = pin()) => adminRequest<ModerationSnapshot>("/admin/moderation", p),

  getLlmConfig: (p: string = pin()) => adminRequest<LlmConfig>("/admin/llm", p),

  setLlmConfig: (p: string, body: { provider: string; model?: string }) =>
    adminRequest<LlmConfig>("/admin/llm", p, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Dashboard reads ─────────────────────────────────────────────────────
  getTodayStats: () => adminRequest<any>("/logs/today", pin()),

  getIntentLogs: () => adminRequest<any>("/logs/intents", pin()),

  getFallbacks: (limit = 100) => adminRequest<any>(`/logs/fallbacks?limit=${limit}`, pin()),

  getFeedbackStats: () => adminRequest<any>("/feedback/stats", pin()),

  getConversation: (userId: string) =>
    adminRequest<any>(`/conversation/${encodeURIComponent(userId)}`, pin()),

  clearConversation: (userId: string) =>
    adminRequest<any>(`/conversation/${encodeURIComponent(userId)}`, pin(), {
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
    }>("/admin/intents/sanitize", pin(), {
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
    }>(`/admin/intents${options.force ? "?force=true" : ""}`, pin(), {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Map editor (reads are public; writes are gated) ──────────────────────
  getMapCoords: () => request<MapCoordsResponse>("/map/coords"),

  saveMapCoords: (body: MapCoordsUpdate) =>
    adminRequest<any>("/map/coords", pin(), {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  resetMapCoords: () => adminRequest<any>("/map/coords", pin(), { method: "DELETE" }),

  getMapWaypoints: () => request<MapWaypointsResponse>("/map/waypoints"),

  saveMapWaypoints: (body: MapWaypointsUpdate | MapCoordsUpdate) =>
    adminRequest<any>("/map/waypoints", pin(), {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteMapWaypoint: (waypointId: string) =>
    adminRequest<any>(`/map/waypoints/${encodeURIComponent(waypointId)}`, pin(), {
      method: "DELETE",
    }),

  resetMapWaypoints: () => adminRequest<any>("/map/waypoints", pin(), { method: "DELETE" }),

  getCustomMarkers: () => adminRequest<CustomMarkersResponse>("/map/custom_markers", pin()),

  saveCustomMarker: (body: CustomMarker) =>
    adminRequest<any>("/map/custom_markers", pin(), {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteCustomMarker: (markerId: string) =>
    adminRequest<any>(`/map/custom_markers/${encodeURIComponent(markerId)}`, pin(), {
      method: "DELETE",
    }),
};
