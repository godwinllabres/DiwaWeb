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

export interface DvCard {
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
  /** Optimistic-lock timestamp — re-sent on /ais/write to catch stale writes. */
  modified?: string | null;
}

// Conversation context carried across turns by the AIS MCP bridge. The
// frontend uses this to show a "talking about …" chip so the user knows a
// follow-up like "what's its status?" will resolve correctly.
export interface AisContext {
  dv?: string | null;
  uacs_kind?: string | null;
  uacs_query?: string | null;
  report?: string | null;
}

// Linkable cell — used for DV-name columns that should be clickable.
export interface TableCellLink {
  text: string;
  href?: string | null;
}
export type TableCell = string | number | TableCellLink;

export interface TableColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface TableData {
  title?: string | null;
  columns: TableColumn[];
  rows: Record<string, TableCell>[];
  footer?: string | null;
}

export interface Message {
  id: number;
  text: string;            // full response body
  summary?: string | null; // short lead-in, used when collapsed
  isBot: boolean;
  timestamp: string;
  intent?: string;
  confidence?: number;
  messageId?: number;
  followUp?: boolean;
  mapData?: MapData | null;
  directory?: Directory | null;
  dvCard?: DvCard | null;
  contextSet?: AisContext | null;
  table?: TableData | null;
  suggestions?: string[] | null;
  modelUsed?: string | null;  // which backend served the reply (dev badge)
}

export type Sender = "bot" | "user";
