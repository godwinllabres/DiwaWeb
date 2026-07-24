/**
 * Sevi web — AIS user authentication state (Phase 2A, Wave 2).
 *
 * Wraps the Diwa /auth/* endpoints. The session_id is borrowed from
 * the existing useChat session so login state survives across chat
 * messages but evaporates when the tab closes (sessionStorage-backed).
 *
 * The auth state is NOT cached in localStorage — closing the tab forces
 * a fresh login. This matches the threat model: a shared workstation
 * should not leave AIS credentials accessible to the next user.
 */
import { useCallback, useEffect, useState } from "react";

const API_BASE_URL = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || "/api";

export interface AisIdentity {
  user: string;
  full_name: string;
  roles: string[];
  expires_in: number;  // seconds remaining on the current token
}

export interface UseAuthApi {
  /** Identity snapshot, or null when not logged in. */
  readonly identity: AisIdentity | null;
  /** True while a login / logout / whoami request is in flight. */
  readonly busy: boolean;
  /** Last error message from /auth/* (e.g. "Invalid credentials."). */
  readonly error: string | null;
  /** Exchange CvSU credentials for an AIS session bound to session_id. */
  login(username: string, password: string): Promise<boolean>;
  /** Drop the cached AIS token for this session. */
  logout(): Promise<void>;
  /** True if the user has at least one of `requiredRoles`. */
  hasAnyRole(requiredRoles: readonly string[]): boolean;
}

/**
 * @param sessionId  must match the chat session_id so /ais/write picks
 *                   up the cached token under the same key.
 */
export function useAuth(sessionId: string): UseAuthApi {
  const [identity, setIdentity] = useState<AisIdentity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial whoami check on mount — useful when the user reloads the
  // tab AFTER a fresh login (sessionStorage holds the session_id, but
  // the React state is freshly empty). The Diwa side still has the
  // token cached as long as uvicorn hasn't restarted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // session_id is a bearer capability for the cached AIS token, so it
        // goes in a header — never the URL query string, which the tunnel/nginx
        // access log would capture (CWE-598). Server reads X-Sevi-Session.
        const res = await fetch(`${API_BASE_URL}/auth/whoami`, {
          headers: { "X-Sevi-Session": sessionId },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.logged_in) {
          setIdentity({
            user: data.user,
            full_name: data.full_name ?? "",
            roles: data.roles ?? [],
            expires_in: data.expires_in ?? 0,
          });
        }
      } catch {
        // Whoami failures are non-fatal — user can still log in.
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const login = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, username, password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.message || (res.status === 401
            ? "Invalid email or password."
            : "Couldn't log in — please try again.");
          setError(msg);
          return false;
        }
        const data = await res.json();
        setIdentity({
          user: data.user,
          full_name: data.full_name ?? "",
          roles: data.roles ?? [],
          expires_in: data.expires_in ?? 3600,
        });
        return true;
      } catch (e) {
        setError("Network error — try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [sessionId],
  );

  const logout = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {
      // Best-effort — even if the server is unreachable, drop local state.
    } finally {
      setIdentity(null);
      setError(null);
      setBusy(false);
    }
  }, [sessionId]);

  const hasAnyRole = useCallback(
    (required: readonly string[]) => {
      if (!identity) return false;
      const userRoles = new Set(identity.roles);
      return required.some((r) => userRoles.has(r));
    },
    [identity],
  );

  return { identity, busy, error, login, logout, hasAnyRole };
}
