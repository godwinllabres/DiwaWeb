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
}

export type Sender = "bot" | "user";
