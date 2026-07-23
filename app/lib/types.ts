// Re-export the v2 wire types from api.ts so consumers don't have to
// remember which module owns which type.
export type {
  ChatCard,
  ChatContext,
  ChatResponse,
  ContentBlock,
  DisplayHint,
  DirectoryCard,
  DvCard,
  MapCard,
  RefusalReason,
  ResponseSource,
  TableCard,
  TableCell,
  TableCellLink,
  TableColumn,
  UacsContext,
} from "@/lib/api";
import type {
  ChatCard,
  ChatContext,
  ContentBlock,
  DisplayHint,
  RefusalReason,
  ResponseSource,
} from "@/lib/api";

// Plain { place_id, label } pair used by the CampusMap component as its
// minimum-info input shape (separate from the v2 MapCard which carries
// the `kind` discriminator + default_open).
export interface MapData {
  place_id: string;
  label: string;
}

export interface Message {
  id: number;
  text: string;            // full response body
  blocks?: ContentBlock[]; // typed structure for `text`, as sent by the API
  summary?: string | null; // short lead-in, used when collapsed
  isBot: boolean;
  timestamp: string;
  intent?: string;
  confidence?: number;
  messageId?: number;
  followUp?: boolean;
  // v2 response envelope
  cards?: ChatCard[];
  context?: ChatContext | null;
  suggestions?: string[];
  source?: ResponseSource;
  refusalReason?: RefusalReason | null;
  displayHint?: DisplayHint;
}

export type Sender = "bot" | "user";
