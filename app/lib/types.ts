export interface MapData {
  place_id: string;
  label: string;
}

export interface Message {
  id: number;
  text: string;
  isBot: boolean;
  timestamp: string;
  intent?: string;
  confidence?: number;
  messageId?: number;
  followUp?: boolean;
  mapData?: MapData | null;
}

export type Sender = "bot" | "user";
