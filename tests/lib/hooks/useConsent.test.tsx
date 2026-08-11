import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useConsent } from "@/lib/hooks/useConsent";

// Consent gates whether this service processes a student's messages, so its
// persistence rules are a Data Privacy Act concern, not a UI preference.
// The key is versioned precisely so a policy update can invalidate stored
// consent — that behaviour needs a test, not just a comment.
const KEY = "diwa_privacy_consent_v1";

beforeEach(() => {
  sessionStorage.clear();
});

describe("useConsent hydration", () => {
  it("reports not-consented and hydrated with nothing stored", () => {
    const { result } = renderHook(() => useConsent());
    expect(result.current.consented).toBe(false);
    expect(result.current.record).toBeNull();
    expect(result.current.hydrated).toBe(true);
  });

  it("restores a stored acceptance", () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ accepted: true, timestamp: "2026-01-01T00:00:00.000Z" }),
    );
    const { result } = renderHook(() => useConsent());
    expect(result.current.consented).toBe(true);
    expect(result.current.record?.timestamp).toBe("2026-01-01T00:00:00.000Z");
  });

  it("ignores a malformed record instead of throwing", () => {
    sessionStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useConsent());
    // The parser swallows this deliberately: a corrupt record must re-prompt,
    // never crash the app before the chat renders.
    expect(result.current.record).toBeNull();
    expect(result.current.consented).toBe(false);
  });

  it("ignores a record whose accepted flag is not a boolean", () => {
    sessionStorage.setItem(KEY, JSON.stringify({ accepted: "yes" }));
    const { result } = renderHook(() => useConsent());
    expect(result.current.record).toBeNull();
  });

  it("does not read consent stored under a previous policy version", () => {
    sessionStorage.setItem(
      "diwa_privacy_consent_v0",
      JSON.stringify({ accepted: true, timestamp: "2026-01-01T00:00:00.000Z" }),
    );
    const { result } = renderHook(() => useConsent());
    // Bumping the version constant is the documented way to force re-consent
    // after a policy change; an old key must not satisfy the new one.
    expect(result.current.consented).toBe(false);
  });
});

describe("useConsent transitions", () => {
  it("persists an acceptance", () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.accept());

    expect(result.current.consented).toBe(true);
    expect(JSON.parse(sessionStorage.getItem(KEY)!).accepted).toBe(true);
  });

  it("persists a decline as an explicit record, not an absent one", () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.decline());

    expect(result.current.consented).toBe(false);
    expect(result.current.record?.accepted).toBe(false);
    // Declining is a decision and is recorded, so the gate does not re-prompt
    // on every render of the same session.
    expect(JSON.parse(sessionStorage.getItem(KEY)!).accepted).toBe(false);
  });

  it("clears the stored record on reset", () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.accept());
    act(() => result.current.reset());

    expect(result.current.record).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("stamps an ISO timestamp on the record", () => {
    const { result } = renderHook(() => useConsent());
    act(() => result.current.accept());
    expect(result.current.record?.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });
});
