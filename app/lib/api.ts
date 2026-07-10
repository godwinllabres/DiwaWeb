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

// ─── ChatResponse v2 ─────────────────────────────────────────────────────────
// Mirrors api/app.py ChatResponse + ChatCard discriminated union.

export type ResponseSource =
  | "naive_bayes"
  | "neural_network"
  | "llm_local"
  | "llm_claude"
  | "ais_mcp"
  | "connectors_mcp"
  | "charter_rag"
  | "fallback"
  | "refusal";

export type RefusalReason = "nonsense" | "out_of_scope" | "prohibited";

export type DisplayHint = "default" | "map_first" | "card_first" | "text_only";

export interface DirectoryCard {
  kind: "directory";
  office: string;
  location?: string | null;
  place_id?: string | null;
  email?: string | null;
  phone?: string | null;
  hours?: string | null;
}

export interface MapCard {
  kind: "map";
  place_id: string;
  label: string;
  default_open?: boolean;
}

export interface DvCard {
  kind: "dv";
  name: string;
  control_number?: string | null;
  payee: string;
  amount: number;
  workflow_status: string;
  posting_date?: string | null;
  fund_cluster?: string | null;
  ors_burs_reference?: string | null;
  dv_type?: string | null;
  desk_url: string;
  modified?: string | null;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface TableCellLink {
  text: string;
  href?: string | null;
}
export type TableCell = string | number | TableCellLink;

export interface TableCard {
  kind: "table";
  title: string;
  columns: TableColumn[];
  rows: Record<string, TableCell>[];
  footer?: string | null;
  total_rows?: number | null;
}

export type ChatCard = DirectoryCard | MapCard | DvCard | TableCard;

export interface UacsContext {
  kind: "object" | "funding_source" | "responsibility_center";
  query?: string | null;
}

export interface ChatContext {
  dv?: string | null;
  uacs?: UacsContext | null;
  report?: string | null;
}

export interface ChatResponse {
  // Identity
  message_id: number;
  user_id?: string | null;
  session_id?: string | null;

  // Content
  text: string;
  summary?: string | null;

  // Classification + provenance
  intent: string;
  confidence: number;
  source: ResponseSource;
  refusal_reason?: RefusalReason | null;

  // Structured attachments
  cards: ChatCard[];
  context?: ChatContext | null;
  suggestions: string[];

  // Layout hint for the renderer
  display_hint: DisplayHint;
}

// Type-narrowing helpers — use these to pluck a specific card kind out of cards[].
export function findCard<K extends ChatCard["kind"]>(
  cards: ChatCard[] | undefined,
  kind: K,
): Extract<ChatCard, { kind: K }> | undefined {
  return cards?.find((c) => c.kind === kind) as Extract<ChatCard, { kind: K }> | undefined;
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

  verifyPin: (pin: string) =>
    request<{ status: string }>("/admin/verify", {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),
};
