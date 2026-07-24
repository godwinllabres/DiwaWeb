// Default to the same-origin `/api` path. In dev, Vite proxies it to the
// local SeviAI server (see vite.config.ts), so this works both locally and
// when the web UI is shared via a tunnel — no separate API tunnel needed.
// Override with VITE_API_URL to point at a different backend.
//
// PUBLIC surface only. Everything that requires the admin PIN lives in
// ./adminApi.ts so the admin route names and the X-Admin-Pin header never
// ship in the public chat bundle (Phase 2 of the admin decoupling).
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
  | "site_rag"
  | "intent_retrieval"
  | "campus_directory"
  | "fallback"
  | "refusal";

export type RefusalReason =
  | "nonsense"
  | "out_of_scope"
  | "prohibited"
  | "abusive"
  | "safety";

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

// An unreachable host otherwise hangs until the browser's TCP timeout
// (60s+), leaving the typing indicator spinning forever.
export const DEFAULT_TIMEOUT_MS = 15_000;
// Chat replies can legitimately take longer — the LLM fallback (Ollama on
// CPU) needs tens of seconds on hard questions.
const CHAT_TIMEOUT_MS = 45_000;

// ── Internal identity token (Desk embed) ───────────────────────────────────
// When Sevi is embedded in the ERPNext Desk, the parent widget hands us a
// short-lived JWT (minted by cvsu_web.sevi_web.api.sevi_token) so the API can
// authenticate the internal user and unlock AIS/HR tools. It arrives via the
// iframe URL hash (#sevi_token=…) and is refreshed by postMessage. Attached as
// `Authorization: Bearer` on every call; absent for the anonymous public bot.
let _internalToken: string | null = null;
function _readHashToken(): string | null {
  try {
    return new URLSearchParams((location.hash || "").replace(/^#/, "")).get("sevi_token");
  } catch {
    return null;
  }
}
if (typeof window !== "undefined") {
  _internalToken = _readHashToken();
  // Don't leave the token sitting in the address bar / referrer / logs.
  if (_internalToken && location.hash.includes("sevi_token")) {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch {
      /* ignore */
    }
  }
  window.addEventListener("message", (e: MessageEvent) => {
    // Only accept a token from our embedding parent frame. The token is also
    // signature-verified server-side, so this is defence-in-depth, not the gate.
    if (e.source !== window.parent) return;
    const d = e.data;
    if (d?.type === "sevi:token" && typeof d.token === "string") _internalToken = d.token;
  });
  // Ask the parent for a (fresh) token — covers refresh + a missing hash.
  try {
    window.parent?.postMessage({ type: "sevi:need-token" }, "*");
  } catch {
    /* not embedded */
  }
}

// Exported so app/lib/adminApi.ts can reuse the same fetch/timeout plumbing
// without the admin route names living in this (public-bundle) module.
export async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      // Merge headers so per-call headers (e.g. X-Admin-Pin) add to, rather than
      // replace, the default Content-Type + the internal Bearer token.
      headers: {
        "Content-Type": "application/json",
        ...(_internalToken ? { Authorization: `Bearer ${_internalToken}` } : {}),
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`API ${path} failed: ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`API ${path} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // The backend (api/app.py) emits the v2 ChatResponse envelope natively —
  // text, typed cards[], source/refusal_reason, suggestions, display_hint —
  // so no client-side normalization is needed.
  chat: (body: ChatRequest) =>
    request<ChatResponse>(
      "/chat",
      {
        method: "POST",
        body: JSON.stringify(body),
      },
      CHAT_TIMEOUT_MS,
    ),

  batchChat: (requests: ChatRequest[]) =>
    request<ChatResponse[]>(
      "/batch",
      {
        method: "POST",
        body: JSON.stringify(requests),
      },
      CHAT_TIMEOUT_MS * 2,
    ),

  getIntents: () => request<any>("/intents"),

  getRecommendedTopics: () =>
    request<{
      today: string;
      season: string;
      label: string;
      reason: string;
      tags: string[];
    }>("/topics/recommended"),

  getIntent: (tag: string) =>
    request<any>(`/intents/${encodeURIComponent(tag)}`),

  submitFeedback: (body: FeedbackRequest) =>
    request<any>("/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getFeedbackReasons: () => request<FeedbackReasonsResponse>("/feedback/reasons"),

  getModelInfo: () => request<any>("/model/info"),

  getMap: () => request<any>("/map"),

  getMapCoords: () => request<MapCoordsResponse>("/map/coords"),

  getMapWaypoints: () => request<MapWaypointsResponse>("/map/waypoints"),
};
