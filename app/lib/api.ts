// Default to the same-origin `/api` path. In dev, Vite proxies it to the
// local SeviAI server (see vite.config.ts), so this works both locally and
// when the web UI is shared via a tunnel — no separate API tunnel needed.
// Override with VITE_API_URL to point at a different backend.
const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "/api";

export interface ChatRequest {
  message: string;
  user_id?: string;
  session_id?: string;
}

export interface MapData {
  place_id: string;
  label: string;
}

export interface Directory {
  office: string;
  location?: string | null;
  place_id?: string | null;
  email?: string | null;
  phone?: string | null;
  hours?: string | null;
}

export interface ChatResponse {
  response: string;
  summary?: string | null;
  intent: string;
  confidence: number;
  model_used?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  message_id?: number | null;
  map_data?: MapData | null;
  directory?: Directory | null;
}

export interface FeedbackRequest {
  message_id?: number;
  user_id?: string;
  session_id?: string;
  intent?: string;
  rating?: number;
  helpful?: boolean;
  /** Structured reason code from /feedback/reasons (e.g. "wrong_info", "accurate"). */
  reason?: string;
  /** Optional free-text reason supplied by the user. */
  comment?: string;
  suggested_intent?: string;
}

export interface FeedbackReasonOption {
  code: string;
  label: string;
}

export interface FeedbackReasonsResponse {
  positive: FeedbackReasonOption[];
  negative: FeedbackReasonOption[];
}

export interface IntentSummary {
  tag: string;
  description?: string;
  patterns?: string[];
  responses?: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface MapCoordsResponse {
  coords: Record<string, { x: number; y: number }>;
  overrides: Record<string, { x: number; y: number }>;
}

export interface MapCoordsUpdate {
  coords: Record<string, { x: number; y: number }>;
}

export interface WaypointOverride {
  x: number;
  y: number;
  neighbors?: string[];
}

export interface MapWaypointsResponse {
  overrides: Record<string, WaypointOverride>;
}

export interface MapWaypointsUpdate {
  coords: Record<string, WaypointOverride>;
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

export const api = {
  chat: (body: ChatRequest) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  batchChat: (requests: ChatRequest[]) =>
    request<ChatResponse[]>("/batch", {
      method: "POST",
      body: JSON.stringify(requests),
    }),

  getIntents: () => request<any>("/intents"),

  getRecommendedTopics: () =>
    request<{
      today: string;
      season: string;
      label: string;
      reason: string;
      tags: string[];
    }>("/topics/recommended"),

  sanitizeCandidateIntent: (body: { tag: string; patterns: string[]; responses: string[] }) =>
    request<{
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
    }>("/admin/intents/sanitize", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  createIntent: (
    body: { tag: string; patterns: string[]; responses: string[] },
    options: { force?: boolean } = {},
  ) =>
    request<{
      status: string;
      tag: string;
      warnings: boolean;
      report: any;
      next_step: string;
    }>(`/admin/intents${options.force ? "?force=true" : ""}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getIntent: (tag: string) =>
    request<any>(`/intents/${encodeURIComponent(tag)}`),

  submitFeedback: (body: FeedbackRequest) =>
    request<any>("/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getFeedbackReasons: () => request<FeedbackReasonsResponse>("/feedback/reasons"),

  getFeedbackStats: () => request<any>("/feedback/stats"),

  getConversation: (userId: string) =>
    request<any>(`/conversation/${encodeURIComponent(userId)}`),

  clearConversation: (userId: string) =>
    request<any>(`/conversation/${encodeURIComponent(userId)}`, {
      method: "DELETE",
    }),

  getTodayStats: () => request<any>("/logs/today"),

  getFallbacks: (limit = 100) =>
    request<any>(`/logs/fallbacks?limit=${limit}`),

  getIntentLogs: () => request<any>("/logs/intents"),

  getModelInfo: () => request<any>("/model/info"),

  getMap: () => request<any>("/map"),

  getMapCoords: () => request<MapCoordsResponse>("/map/coords"),

  saveMapCoords: (body: MapCoordsUpdate) =>
    request<any>("/map/coords", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  resetMapCoords: () =>
    request<any>("/map/coords", { method: "DELETE" }),

  getMapWaypoints: () => request<MapWaypointsResponse>("/map/waypoints"),

  saveMapWaypoints: (body: MapWaypointsUpdate | MapCoordsUpdate) =>
    request<any>("/map/waypoints", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteMapWaypoint: (waypointId: string) =>
    request<any>(`/map/waypoints/${encodeURIComponent(waypointId)}`, {
      method: "DELETE",
    }),

  resetMapWaypoints: () =>
    request<any>("/map/waypoints", { method: "DELETE" }),

  getCustomMarkers: () => request<CustomMarkersResponse>("/map/custom_markers"),

  saveCustomMarker: (body: CustomMarker) =>
    request<any>("/map/custom_markers", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteCustomMarker: (markerId: string) =>
    request<any>(`/map/custom_markers/${encodeURIComponent(markerId)}`, {
      method: "DELETE",
    }),
};
