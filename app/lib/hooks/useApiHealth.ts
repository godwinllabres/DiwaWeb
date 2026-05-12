import { useEffect, useState } from "react";

/**
 * Poll the backend /health endpoint and surface a simple online/offline
 * signal so the chat header can reflect reality instead of hardcoded
 * "Online". Marks offline immediately on a failed fetch (network drop or
 * 5xx) and recovers on the next successful poll.
 */

export type ApiHealthStatus = "checking" | "online" | "offline";

interface UseApiHealthOptions {
  /** Poll interval in ms while the page is visible. */
  readonly intervalMs?: number;
  /** Per-request timeout in ms before declaring offline. */
  readonly timeoutMs?: number;
}

const DEFAULT_INTERVAL_MS = 15_000;
const DEFAULT_TIMEOUT_MS = 4_000;

async function probeHealth(timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const base =
      (import.meta as any).env?.VITE_API_URL || "/api";
    const res = await fetch(`${base}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return false;
    // Health payload looks like { status: "healthy", ... }
    const body = await res.json().catch(() => null);
    if (body && typeof body === "object" && "status" in body) {
      return String(body.status).toLowerCase() === "healthy";
    }
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useApiHealth(opts: UseApiHealthOptions = {}): ApiHealthStatus {
  const { intervalMs = DEFAULT_INTERVAL_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;
  const [status, setStatus] = useState<ApiHealthStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      const ok = await probeHealth(timeoutMs);
      if (cancelled) return;
      setStatus(ok ? "online" : "offline");
      timer = setTimeout(tick, intervalMs);
    };

    tick();

    // Re-check immediately when the tab becomes visible again — covers
    // laptop sleep / mobile lock screen scenarios where the old timer
    // would otherwise drift behind.
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, timeoutMs]);

  return status;
}
