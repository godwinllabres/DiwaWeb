import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  MAX_CONVERSATIONS,
  MAX_MESSAGES,
  RETENTION_DAYS,
  clearHistory,
  deleteConversation,
  isHistoryEnabled,
  loadConversation,
  loadIndex,
  pruneHistory,
  saveConversation,
  setHistoryEnabled,
  toPersisted,
} from "@/lib/historyStore";
import type { Message } from "@/lib/types";

const DEVICE = "device-1";

function msg(over: Partial<Message> = {}): Message {
  return { id: 1, text: "hello", isBot: false, timestamp: "09:00", ...over };
}

const turn: Message[] = [
  msg({ id: 1, text: "how do I enroll", isBot: false }),
  msg({ id: 2, text: "here is how", isBot: true, intent: "enrollment", messageId: 77 }),
];

beforeEach(() => {
  localStorage.clear();
  setHistoryEnabled(DEVICE, true);
});

describe("opt-in", () => {
  it("is off until switched on", () => {
    localStorage.clear();
    expect(isHistoryEnabled()).toBe(false);
    saveConversation(DEVICE, "c1", turn);
    expect(loadConversation(DEVICE, "c1")).toEqual([]);
  });

  // Turning it off has to delete, not just stop writing — otherwise the
  // transcript is still readable on the shared PC the student just "cleared".
  it("switching off deletes what was already saved", () => {
    saveConversation(DEVICE, "c1", turn);
    expect(loadConversation(DEVICE, "c1")).toHaveLength(2);

    setHistoryEnabled(DEVICE, false);
    expect(loadConversation(DEVICE, "c1")).toEqual([]);
    expect(loadIndex(DEVICE)).toEqual([]);
  });
});

describe("round trip", () => {
  it("saves and restores a conversation with ids renumbered from 1", () => {
    saveConversation(DEVICE, "c1", [
      msg({ id: 41, text: "a", isBot: false }),
      msg({ id: 42, text: "b", isBot: true }),
    ]);

    const restored = loadConversation(DEVICE, "c1");
    expect(restored.map((m) => m.id)).toEqual([1, 2]);
    expect(restored.map((m) => m.text)).toEqual(["a", "b"]);
  });

  it("keeps messageId so a transcript can be traced back to the server rows", () => {
    saveConversation(DEVICE, "c1", turn);
    expect(loadConversation(DEVICE, "c1")[1]?.messageId).toBe(77);
  });

  it("indexes the conversation under the first user message", () => {
    saveConversation(DEVICE, "c1", turn);
    const [meta] = loadIndex(DEVICE);
    expect(meta?.id).toBe("c1");
    expect(meta?.title).toBe("how do I enroll");
    expect(meta?.turns).toBe(2);
  });

  it("survives a corrupted blob instead of throwing", () => {
    localStorage.setItem(`sevi_hist_conv_v1:${DEVICE}:c1`, "{not json");
    expect(loadConversation(DEVICE, "c1")).toEqual([]);
  });

  it("returns nothing for an unknown conversation", () => {
    expect(loadConversation(DEVICE, "never-saved")).toEqual([]);
  });
});

describe("scrubbing live CvSU records", () => {
  it("replaces an AIS-sourced reply with a placeholder", () => {
    const persisted = toPersisted(
      msg({
        isBot: true,
        text: "DV 2026-001 for Juan Dela Cruz, PHP 42,000",
        source: "ais_mcp",
        cards: [
          {
            kind: "dv",
            name: "DV-1",
            payee: "Juan Dela Cruz",
            amount: 42000,
            workflow_status: "Approved",
            desk_url: "https://ais.example/dv/1",
          },
        ],
      }),
    );

    expect(persisted.redacted).toBe(true);
    expect(persisted.cards).toBeUndefined();
    expect(persisted.text).not.toMatch(/Juan Dela Cruz|42,?000|DV 2026-001/);
  });

  it("drops a dv card even when the reply came from elsewhere", () => {
    const persisted = toPersisted(
      msg({
        isBot: true,
        source: "llm_claude",
        cards: [
          { kind: "map", place_id: "lib", label: "Library" },
          {
            kind: "dv",
            name: "DV-2",
            payee: "Someone",
            amount: 1,
            workflow_status: "Draft",
            desk_url: "https://ais.example/dv/2",
          },
        ],
      }),
    );

    expect(persisted.cards).toEqual([{ kind: "map", place_id: "lib", label: "Library" }]);
    expect(persisted.redacted).toBe(true);
  });

  it("does not flag a redaction for a reply that simply has no cards", () => {
    expect(toPersisted(msg({ isBot: true, cards: [] })).redacted).toBeUndefined();
    expect(toPersisted(msg({ isBot: true })).redacted).toBeUndefined();
  });

  it("drops confidence and context, which are not rendered on restore", () => {
    const persisted = toPersisted(
      msg({ isBot: true, confidence: 0.91, context: { dv: "DV-2026-001" } }),
    );
    expect(persisted).not.toHaveProperty("confidence");
    expect(persisted).not.toHaveProperty("context");
  });

  it("never writes an AIS payload into localStorage", () => {
    saveConversation(DEVICE, "c1", [
      msg({ id: 1, text: "show my DV", isBot: false }),
      msg({ id: 2, text: "Payee: Juan Dela Cruz", isBot: true, source: "ais_mcp" }),
    ]);
    expect(localStorage.getItem(`sevi_hist_conv_v1:${DEVICE}:c1`)).not.toMatch(/Juan Dela Cruz/);
  });
});

describe("caps", () => {
  it(`keeps at most the last ${MAX_MESSAGES} messages`, () => {
    const long = Array.from({ length: MAX_MESSAGES + 25 }, (_, i) =>
      msg({ id: i + 1, text: `m${i}`, isBot: i % 2 === 1 }),
    );
    saveConversation(DEVICE, "c1", long);

    const restored = loadConversation(DEVICE, "c1");
    expect(restored).toHaveLength(MAX_MESSAGES);
    // The tail is what is worth keeping — the newest turn must survive.
    expect(restored[restored.length - 1]?.text).toBe(`m${long.length - 1}`);
  });

  it(`keeps at most ${MAX_CONVERSATIONS} conversations, dropping the oldest blob`, () => {
    for (let i = 0; i < MAX_CONVERSATIONS + 3; i++) {
      saveConversation(DEVICE, `c${i}`, [msg({ text: `chat ${i}` })]);
    }

    const index = loadIndex(DEVICE);
    expect(index).toHaveLength(MAX_CONVERSATIONS);
    expect(index.some((m) => m.id === "c0")).toBe(false);
    // Evicted conversations must not linger as orphaned keys.
    expect(localStorage.getItem(`sevi_hist_conv_v1:${DEVICE}:c0`)).toBeNull();
  });
});

describe("retention", () => {
  afterEach(() => vi.useRealTimers());

  it(`drops conversations older than ${RETENTION_DAYS} days`, () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    saveConversation(DEVICE, "old", [msg({ text: "ancient" })]);

    vi.setSystemTime(new Date("2026-01-20T00:00:00Z"));
    saveConversation(DEVICE, "recent", [msg({ text: "fresh" })]);

    vi.setSystemTime(new Date("2026-02-15T00:00:00Z"));
    const kept = pruneHistory(DEVICE);

    expect(kept.map((m) => m.id)).toEqual(["recent"]);
    expect(localStorage.getItem(`sevi_hist_conv_v1:${DEVICE}:old`)).toBeNull();
  });

  it("collects blobs with no index entry", () => {
    saveConversation(DEVICE, "c1", turn);
    // The residue of an interrupted write.
    localStorage.setItem(`sevi_hist_conv_v1:${DEVICE}:orphan`, JSON.stringify([]));

    pruneHistory(DEVICE);
    expect(localStorage.getItem(`sevi_hist_conv_v1:${DEVICE}:orphan`)).toBeNull();
    expect(localStorage.getItem(`sevi_hist_conv_v1:${DEVICE}:c1`)).not.toBeNull();
  });
});

describe("deletion", () => {
  it("removes one conversation and leaves the rest", () => {
    saveConversation(DEVICE, "c1", [msg({ text: "one" })]);
    saveConversation(DEVICE, "c2", [msg({ text: "two" })]);

    deleteConversation(DEVICE, "c1");
    expect(loadIndex(DEVICE).map((m) => m.id)).toEqual(["c2"]);
    expect(loadConversation(DEVICE, "c1")).toEqual([]);
  });

  it("saving an empty transcript removes the conversation", () => {
    saveConversation(DEVICE, "c1", turn);
    saveConversation(DEVICE, "c1", []);
    expect(loadIndex(DEVICE)).toEqual([]);
  });

  // Sweeps by key prefix, so a corrupted index cannot leave real transcripts
  // behind on a device the student believes they have just cleared.
  it("clearHistory removes transcripts the index has lost track of", () => {
    saveConversation(DEVICE, "c1", turn);
    localStorage.setItem(`sevi_hist_index_v1:${DEVICE}`, "garbage");

    clearHistory(DEVICE);
    expect(localStorage.getItem(`sevi_hist_conv_v1:${DEVICE}:c1`)).toBeNull();
    expect(localStorage.getItem(`sevi_hist_index_v1:${DEVICE}`)).toBeNull();
  });

  it("leaves another device's transcripts alone", () => {
    saveConversation(DEVICE, "c1", turn);
    saveConversation("device-2", "c1", turn);

    clearHistory(DEVICE);
    expect(loadConversation("device-2", "c1")).toHaveLength(2);
  });
});
