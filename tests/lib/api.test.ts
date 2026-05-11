import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "@/lib/api";

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  function mockJson<T>(payload: T, ok = true, status = 200) {
    fetchMock.mockResolvedValueOnce({
      ok,
      status,
      json: async () => payload,
    } as Response);
  }

  it("chat() POSTs JSON body to /chat and returns the parsed response", async () => {
    mockJson({
      response: "Hi!",
      intent: "greeting",
      confidence: 0.9,
      message_id: 1,
    });

    const result = await api.chat({ message: "hello", user_id: "u1", session_id: "s1" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/chat$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ message: "hello", user_id: "u1", session_id: "s1" });
    expect(result.intent).toBe("greeting");
  });

  it("submitFeedback() POSTs to /feedback with the request body", async () => {
    mockJson({ ok: true });

    await api.submitFeedback({ message_id: 5, helpful: true, rating: 5 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/feedback$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toMatchObject({ message_id: 5, helpful: true });
  });

  it("getIntents() makes a GET request without a body", async () => {
    mockJson({ intents: [] });

    await api.getIntents();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/intents$/);
    // Either undefined method (default GET) or explicit GET
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("encodes URL components in path params", async () => {
    mockJson({});
    await api.getConversation("user with spaces");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(encodeURIComponent("user with spaces"));
  });

  it("throws an Error with status info on non-ok responses", async () => {
    mockJson({ detail: "boom" }, false, 500);
    await expect(api.chat({ message: "x" })).rejects.toThrow(/500/);
  });

  it("getFallbacks() includes the limit query param", async () => {
    mockJson([]);
    await api.getFallbacks(25);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("limit=25");
  });
});
