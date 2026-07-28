import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, BusyError } from "@/lib/api";
// Admin-only calls moved to the admin client so they stay out of the public
// bundle (Phase 2 admin decoupling); they share the same request() plumbing.
// Lives here rather than under tests/admin/: these two cases exercise URL
// encoding in the `request` helper that app/lib/api.ts owns and app/admin/api.ts
// reuses — they are api-client tests reached through the admin surface.
import { adminApi } from "@/admin/api";

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

  it("submitFeedback() forwards structured reason + comment when provided", async () => {
    mockJson({ ok: true });

    await api.submitFeedback({
      message_id: 9,
      helpful: false,
      rating: 2,
      reason: "wrong_info",
      comment: "phone number is outdated",
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      message_id: 9,
      helpful: false,
      reason: "wrong_info",
      comment: "phone number is outdated",
    });
  });

  it("getFeedbackReasons() GETs /feedback/reasons", async () => {
    mockJson({ positive: [], negative: [] });

    await api.getFeedbackReasons();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/feedback\/reasons$/);
    expect(init?.method ?? "GET").toBe("GET");
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
    await adminApi.getConversation("user with spaces");
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(encodeURIComponent("user with spaces"));
  });

  it("throws an Error with status info on non-ok responses", async () => {
    mockJson({ detail: "boom" }, false, 500);
    await expect(api.chat({ message: "x" })).rejects.toThrow(/500/);
  });

  it("getFallbacks() includes the limit query param", async () => {
    mockJson([]);
    await adminApi.getFallbacks(25);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("limit=25");
  });
});

// ── Backpressure retry ──────────────────────────────────────────────────────
// The API sheds load with 503 + Retry-After (turn gate saturated) and 429
// (rate limit). Chat retries once; everything else must fail fast so an admin
// action never silently doubles.
describe("api client — 503/429 backpressure", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function mockBusy(status: number, retryAfter: string | null = "1") {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status,
      headers: { get: (k: string) => (k === "Retry-After" ? retryAfter : null) },
      json: async () => ({ detail: "busy" }),
    } as unknown as Response);
  }

  function mockOk<T>(payload: T) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      json: async () => payload,
    } as unknown as Response);
  }

  it("chat() retries once after a 503 and returns the second response", async () => {
    vi.useFakeTimers();
    mockBusy(503, "1");
    mockOk({ text: "hi", intent: "greeting" });

    const pending = api.chat({ message: "x" });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(pending).resolves.toMatchObject({ text: "hi" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("chat() retries a 429 as well", async () => {
    vi.useFakeTimers();
    mockBusy(429, "1");
    mockOk({ text: "ok" });

    const pending = api.chat({ message: "x" });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(pending).resolves.toMatchObject({ text: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("chat() surfaces BusyError when the retry is also shed", async () => {
    vi.useFakeTimers();
    mockBusy(503, "1");
    mockBusy(503, "1");

    const pending = api.chat({ message: "x" });
    // Attach the rejection handler before advancing so the rejection is never
    // momentarily unhandled.
    const assertion = expect(pending).rejects.toBeInstanceOf(BusyError);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;

    // Exactly two attempts — a retry loop that kept going would hammer a
    // server that is already telling us it is saturated.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("BusyError carries a message a student can read", async () => {
    vi.useFakeTimers();
    mockBusy(503, "1");
    mockBusy(503, "1");

    const pending = api.chat({ message: "x" }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(5_000);
    const err = await pending;

    expect(err).toBeInstanceOf(BusyError);
    expect(err.status).toBe(503);
    expect(err.message).toMatch(/lot of students/i);
    expect(err.message).not.toMatch(/\b503\b/);
  });

  it("does NOT retry non-chat calls — an admin action must not double", async () => {
    mockBusy(503, "1");

    await expect(api.getIntents()).rejects.toThrow(/503/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tolerates a missing Retry-After header", async () => {
    vi.useFakeTimers();
    mockBusy(503, null);
    mockOk({ text: "hi" });

    const pending = api.chat({ message: "x" });
    await vi.advanceTimersByTimeAsync(5_000);

    await expect(pending).resolves.toMatchObject({ text: "hi" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
