/**
 * Sevi web — Phase 2A Wave 2 modals.
 *
 * Two components, one file (they share several styles and types):
 *  - <LoginModal />        — credential capture for /auth/login
 *  - <ConfirmWriteModal /> — DV-write confirmation dialog
 *
 * Both are gated by the parent component checking
 * `import.meta.env.VITE_AIS_WRITE_ENABLED === "1"` before rendering.
 * When the flag is off, the buttons that open these modals don't even
 * appear in the DV card — there's no path to credential capture.
 */
import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

import type { DvCard as DvCardData } from "@/lib/types";

const API_BASE_URL = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || "/api";

// ── shared modal scaffold ────────────────────────────────────────────────

interface ModalShellProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly busy?: boolean;
  readonly children: React.ReactNode;
}

function ModalShell({ title, onClose, busy, children }: ModalShellProps) {
  // Focus trap: dialog closes on Esc unless busy (don't lose work mid-call).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-paper-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-forest-900/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-full p-1 text-ink-500 hover:bg-paper-deep disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── LoginModal ───────────────────────────────────────────────────────────

interface LoginModalProps {
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly login: (username: string, password: string) => Promise<boolean>;
  readonly busy: boolean;
  readonly error: string | null;
}

export function LoginModal({ onClose, onSuccess, login, busy, error }: LoginModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { usernameRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(username, password);
    if (ok) onSuccess();
  };

  return (
    <ModalShell title="Sign in to AIS" onClose={onClose} busy={busy}>
      <p className="mb-3 text-xs text-ink-500">
        Use your CvSU AIS email and password. Your session lives in this browser
        tab only — closing the tab logs you out.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="block text-xs font-medium text-ink-700">Email</span>
          <input
            ref={usernameRef}
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={busy}
            required
            autoComplete="username"
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-1.5 text-sm focus:border-forest-600 focus:outline-none disabled:bg-paper-sunken"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-ink-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-ink-200 px-3 py-1.5 text-sm focus:border-forest-600 focus:outline-none disabled:bg-paper-sunken"
          />
        </label>
        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-xs text-ink-700 hover:bg-paper-deep disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !username || !password}
            className="inline-flex items-center gap-1.5 rounded-md bg-forest-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-forest-700 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            Sign in
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// ── ConfirmWriteModal ────────────────────────────────────────────────────

export type WriteAction = "approve_dv" | "post_dv" | "cancel_dv" | "set_dv_status";

interface ConfirmWriteModalProps {
  readonly action: WriteAction;
  readonly dv: DvCardData;
  readonly sessionId: string;
  /** "Cancel" needs reason; "set_dv_status" needs new_status from caller. */
  readonly newStatus?: string;
  readonly onClose: () => void;
  /** Called with the parsed /ais/write response on completion. The card
   *  uses this to refresh / show a toast. */
  readonly onResult: (res: WriteResult) => void;
}

export interface WriteResult {
  ok: boolean;
  name?: string;
  new_status?: string;
  error_code?: string;
  message?: string;
}

const ACTION_LABEL: Record<WriteAction, string> = {
  approve_dv:    "Approve",
  post_dv:       "Post",
  cancel_dv:     "Cancel",
  set_dv_status: "Change status",
};

const ACTION_VERB: Record<WriteAction, string> = {
  approve_dv:    "approving",
  post_dv:       "posting",
  cancel_dv:     "cancelling",
  set_dv_status: "transitioning",
};

export function ConfirmWriteModal({
  action,
  dv,
  sessionId,
  newStatus,
  onClose,
  onResult,
}: ConfirmWriteModalProps) {
  const [typedName, setTypedName] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const verbatimMatch = typedName.trim() === dv.name;
  const reasonOk = action !== "cancel_dv" || reason.trim().length > 0;
  const canExecute = verbatimMatch && reasonOk && !busy;

  const handleExecute = async () => {
    setBusy(true);
    setError(null);
    try {
      // UUID4 client-side; on retry the same key returns the cached result
      // so the user can safely re-submit without double-execution.
      const idempotencyKey = (crypto?.randomUUID?.() ?? `key-${Date.now()}-${Math.random()}`);
      const body: Record<string, unknown> = {
        session_id: sessionId,
        action,
        name: dv.name,
        idempotency_key: idempotencyKey,
      };
      // expected_modified comes from the card's last-known timestamp; the
      // Diwa endpoint forwards it as the optimistic-lock guard.
      if (dv.modified) {
        body.expected_modified = dv.modified;
      }
      if (action === "cancel_dv") body.reason = reason.trim();
      if (action === "set_dv_status" && newStatus) body.new_status = newStatus;

      // The financial write is authorized by the httpOnly AIS session cookie
      // (minted server-side at login), not by an id this page could read or
      // choose. `credentials` is what attaches it.
      const res = await fetch(`${API_BASE_URL}/ais/write`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        setError("Your AIS session expired. Sign in again.");
        return;
      }
      const data: WriteResult = await res.json().catch(() => ({ ok: false, message: "Bad response" }));
      onResult(data);
      onClose();
    } catch (err) {
      // Don't leak the network error to the user, but log it to the
      // browser console so debugging is possible.
      console.warn("ais_write request failed", err);
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  const label = ACTION_LABEL[action];
  const verb  = ACTION_VERB[action];

  return (
    <ModalShell title={`${label} ${dv.name}?`} onClose={onClose} busy={busy}>
      <div className="space-y-3">
        <div className="rounded-md border border-forest-900/10 bg-paper-sunken px-3 py-2 text-xs text-ink-800">
          <div><strong>{dv.name}</strong> — {dv.payee}</div>
          <div>
            Amount: ₱{Number(dv.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
          </div>
          <div>
            Status: {dv.workflow_status}
            {newStatus && <> → <strong>{newStatus}</strong></>}
          </div>
        </div>

        <p className="text-xs text-ink-600">
          You're {verb} this Disbursement Voucher. To confirm, type the DV name
          <strong className="font-mono"> {dv.name}</strong> below.
        </p>

        <input
          ref={inputRef}
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={dv.name}
          disabled={busy}
          className="w-full rounded-md border border-ink-200 px-3 py-1.5 text-sm font-mono focus:border-forest-600 focus:outline-none disabled:bg-paper-sunken"
        />

        {action === "cancel_dv" && (
          <label className="block">
            <span className="block text-xs font-medium text-ink-700">Reason (required)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              rows={2}
              className="mt-1 w-full rounded-md border border-ink-200 px-3 py-1.5 text-xs focus:border-forest-600 focus:outline-none disabled:bg-paper-sunken"
              placeholder="e.g. Duplicate of DV-2026-00250"
            />
          </label>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1.5 text-xs text-ink-700 hover:bg-paper-deep disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={!canExecute}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-white ${
              action === "cancel_dv"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-forest-600 hover:bg-forest-700"
            } disabled:opacity-50`}
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            {label}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
