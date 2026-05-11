import { describe, it, expect } from "vitest";
import {
  getTopicCard,
  getDefaultTopicCards,
  buildTopicCards,
  rankRelevantTopicCards,
} from "@/lib/topicCatalog";

describe("getTopicCard", () => {
  it("returns the catalog entry for a known tag", () => {
    const card = getTopicCard("admissions_requirements");
    expect(card.tag).toBe("admissions_requirements");
    expect(card.title.length).toBeGreaterThan(0);
    expect(card.prompt.length).toBeGreaterThan(0);
  });

  it("synthesises a card for an unknown tag", () => {
    const card = getTopicCard("never_heard_of_this");
    expect(card.tag).toBe("never_heard_of_this");
    expect(card.title).toMatch(/Never Heard Of This/i);
    expect(card.description).toContain(card.title.toLowerCase());
  });
});

describe("buildTopicCards", () => {
  it("dedupes input tags", () => {
    const cards = buildTopicCards(["contact_info", "contact_info", "tuition_fees"]);
    expect(cards).toHaveLength(2);
  });

  it("preserves input order after dedupe", () => {
    const cards = buildTopicCards(["tuition_fees", "contact_info"]);
    expect(cards[0].tag).toBe("tuition_fees");
    expect(cards[1].tag).toBe("contact_info");
  });
});

describe("getDefaultTopicCards", () => {
  it("returns at least one card with no available filter", () => {
    const cards = getDefaultTopicCards();
    expect(cards.length).toBeGreaterThan(0);
  });

  it("filters by available tags when provided", () => {
    const cards = getDefaultTopicCards(["admissions_requirements"]);
    expect(cards.every((c) => c.tag === "admissions_requirements")).toBe(true);
  });
});

describe("rankRelevantTopicCards", () => {
  it("returns the requested number of cards", () => {
    const cards = rankRelevantTopicCards("how do I apply", undefined, [], 3);
    expect(cards).toHaveLength(3);
  });

  it("prioritises admissions topics for application queries", () => {
    const cards = rankRelevantTopicCards("admission requirements", undefined, []);
    expect(cards[0].tag).toMatch(/admissions/);
  });

  it("prioritises tuition topics for cost-related queries", () => {
    const cards = rankRelevantTopicCards("how much is tuition fee", undefined, []);
    const tags = cards.map((c) => c.tag);
    expect(tags).toContain("tuition_fees");
  });

  it("falls back to a default group when no keyword matches", () => {
    const cards = rankRelevantTopicCards("zzzzz qqqqq", undefined, []);
    expect(cards.length).toBeGreaterThan(0);
  });

  it("respects the limit parameter", () => {
    const cards = rankRelevantTopicCards("admissions", undefined, [], 2);
    expect(cards.length).toBeLessThanOrEqual(2);
  });
});
