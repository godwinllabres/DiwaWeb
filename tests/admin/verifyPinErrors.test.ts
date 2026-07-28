import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { adminApi } from "@/admin/api";

/**
 * A live smoke test against the running sevi-api caught this: the API answers
 *
 *   503 {"error":true,"message":"Service unavailable"}   ("Admin access not configured")
 *
 * and AdminApp's catch reported it to the operator as "That PIN didn't work."
 * Someone holding a perfectly good PIN would retry it forever while the real
 * fault was an unprovisioned server.
 *
 * request() now throws ApiError carrying the status, which is what lets
 * AdminApp tell "rejected credential" apart from "server cannot check one".
 */
describe("verifyPin surfaces the HTTP status", () => {
  const fetchMock = vi.fn();

  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  const respond = (status: number) =>
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ error: true, message: "nope" }),
    } as Response);

  it("throws ApiError, not a bare Error", async () => {
    respond(401);
    await expect(adminApi.verifyPin("000000")).rejects.toBeInstanceOf(ApiError);
  });

  it("carries 401 for a rejected PIN", async () => {
    respond(401);
    await expect(adminApi.verifyPin("000000")).rejects.toMatchObject({ status: 401 });
  });

  it("carries 503 when admin access is not configured", async () => {
    respond(503);
    // The exact case from the live run. AdminApp branches on this to tell the
    // operator it is not their PIN.
    await expect(adminApi.verifyPin("000000")).rejects.toMatchObject({ status: 503 });
  });

  it("carries 429 for the brute-force lockout", async () => {
    respond(429);
    await expect(adminApi.verifyPin("000000")).rejects.toMatchObject({ status: 429 });
  });

  it("still reads as an Error to anything catching broadly", async () => {
    respond(500);
    await expect(adminApi.verifyPin("000000")).rejects.toBeInstanceOf(Error);
  });
});
