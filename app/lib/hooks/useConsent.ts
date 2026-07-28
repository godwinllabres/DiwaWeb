import { useCallback, useEffect, useState } from "react";
import { readSession, writeSession, removeSession } from "@/lib/storage";

// Versioned key — bump the suffix when the privacy policy is updated so
// every user re-consents on next visit. Stored in sessionStorage so
// consent expires when the browser session ends (tab/window closed) and
// the next session re-prompts.
const STORAGE_KEY = "diwa_privacy_consent_v1";

export interface ConsentRecord {
  accepted: boolean;
  timestamp: string; // ISO 8601
}

function readConsent(): ConsentRecord | null {
  // storage.ts already absorbs SSR, blocked-storage and partitioned-iframe
  // failures, returning null. The try/catch here is only for malformed JSON,
  // which is a different failure and must stay.
  const raw = readSession(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (!parsed || typeof parsed.accepted !== "boolean") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(accepted: boolean) {
  const record: ConsentRecord = { accepted, timestamp: new Date().toISOString() };
  // Reports false when storage is unavailable; losing a consent record is
  // survivable, so the outcome is deliberately ignored.
  writeSession(STORAGE_KEY, JSON.stringify(record));
}

export interface UseConsentApi {
  /** Hydrated from sessionStorage on mount; null until then (SSR-safe). */
  record: ConsentRecord | null;
  /** True only when the user has explicitly accepted in this session. */
  consented: boolean;
  /** True after the first sessionStorage read so the gate can avoid flashing. */
  hydrated: boolean;
  accept: () => void;
  decline: () => void;
  reset: () => void;
}

/**
 * Track whether the user has accepted the privacy policy. State is
 * persisted in sessionStorage so every new browser session re-prompts.
 * The versioned key also allows policy updates to invalidate any stored
 * consent by bumping the version constant.
 */
export function useConsent(): UseConsentApi {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setRecord(readConsent());
    setHydrated(true);
  }, []);

  const accept = useCallback(() => {
    writeConsent(true);
    setRecord({ accepted: true, timestamp: new Date().toISOString() });
  }, []);

  const decline = useCallback(() => {
    writeConsent(false);
    setRecord({ accepted: false, timestamp: new Date().toISOString() });
  }, []);

  const reset = useCallback(() => {
    removeSession(STORAGE_KEY);
    setRecord(null);
  }, []);

  return {
    record,
    consented: !!record?.accepted,
    hydrated,
    accept,
    decline,
    reset,
  };
}
