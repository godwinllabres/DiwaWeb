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
  comment?: string;
  suggested_intent?: string;
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

export interface MapWaypointsResponse {
  overrides: Record<string, { x: number; y: number }>;
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

  getIntent: (tag: string) =>
    request<any>(`/intents/${encodeURIComponent(tag)}`),

  submitFeedback: (body: FeedbackRequest) =>
    request<any>("/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),

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

  saveMapWaypoints: (body: MapCoordsUpdate) =>
    request<any>("/map/waypoints", {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  resetMapWaypoints: () =>
    request<any>("/map/waypoints", { method: "DELETE" }),
};
