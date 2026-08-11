// Disbursement-voucher card and its write actions. Extracted from ChatMessage.tsx.
import { useState } from "react";

import { FileText, ExternalLink } from "lucide-react";

import { DV_STATUS_TINT, DV_STATUS_TINT_FALLBACK, DV_AVAILABLE_ACTIONS } from "@/lib/dvWorkflow";
import type { DvCard as DvCardData } from "@/lib/types";
import type { UseAuthApi } from "@/lib/hooks/useAuth";
import { LoginModal, ConfirmWriteModal, type WriteAction, type WriteResult } from "@/components/AisWriteModals";
interface WriteActionsProps {
  readonly dv: DvCardData;
  readonly sessionId: string;
  readonly ais: UseAuthApi;
}

function WriteActions({ dv, sessionId, ais }: WriteActionsProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: WriteAction; newStatus?: string } | null>(null);
  const [resultToast, setResultToast] = useState<string | null>(null);

  const available = DV_AVAILABLE_ACTIONS[dv.workflow_status];
  if (!available || available.length === 0) return null;

  const startAction = (action: WriteAction, newStatus?: string) => {
    if (!ais.identity) {
      setPendingAction({ action, newStatus });
      setShowLogin(true);
      return;
    }
    setPendingAction({ action, newStatus });
  };

  const onLoginSuccess = () => {
    setShowLogin(false);
    // pendingAction is already set — the ConfirmWriteModal will render
    // immediately because (showLogin === false && pendingAction !== null).
  };

  const onLoginClose = () => {
    setShowLogin(false);
    setPendingAction(null);
  };

  return (
    <>
      <div className="mt-2 border-t border-forest-900/10 pt-2 flex flex-wrap gap-1.5">
        {available.map((opt) => (
          <button
            key={opt.action + (opt.newStatus ?? "")}
            type="button"
            onClick={() => startAction(opt.action, opt.newStatus)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              opt.action === "cancel_dv"
                ? "border-red-300 bg-paper-raised text-red-700 hover:bg-red-50"
                : "border-forest-900/15 bg-paper-raised text-forest-800 hover:bg-forest-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {resultToast && (
        <p className="mt-1.5 px-1 text-[11px] text-forest-800">{resultToast}</p>
      )}

      {showLogin && (
        <LoginModal
          login={ais.login}
          busy={ais.busy}
          error={ais.error}
          onClose={onLoginClose}
          onSuccess={onLoginSuccess}
        />
      )}

      {!showLogin && pendingAction && ais.identity && (
        <ConfirmWriteModal
          action={pendingAction.action}
          dv={dv}
          sessionId={sessionId}
          newStatus={pendingAction.newStatus}
          onClose={() => setPendingAction(null)}
          onResult={(res: WriteResult) => {
            const ok = res.ok;
            if (ok) {
              setResultToast(`✓ ${dv.name} is now ${res.new_status ?? "updated"}.`);
            } else if (res.error_code === "PILOT") {
              setResultToast("Write tools are in pilot — request access from accounting.");
            } else {
              setResultToast(`Action failed: ${res.message ?? res.error_code ?? "unknown error"}`);
            }
          }}
        />
      )}
    </>
  );
}

interface DvDetailCardProps {
  readonly dv: DvCardData;
  readonly writeEnabled?: boolean;
  readonly sessionId?: string;
  readonly ais?: UseAuthApi;
}

export function DvDetailCard({ dv, writeEnabled, sessionId, ais }: DvDetailCardProps) {
  const tint = DV_STATUS_TINT[dv.workflow_status] ?? DV_STATUS_TINT_FALLBACK;
  const amount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(dv.amount || 0);

  return (
    <div className="w-full rounded-2xl border border-forest-900/10 bg-forest-50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <FileText className="h-4 w-4 flex-shrink-0 text-forest-700 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <a
              href={dv.desk_url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-forest-900 underline decoration-forest-600/40 underline-offset-2 hover:text-forest-700 break-all"
            >
              {dv.name}
            </a>
            {dv.control_number && (
              <span className="text-xs text-ink-500 font-mono break-all">{dv.control_number}</span>
            )}
          </div>
          <p className="mt-0.5 text-ink-800 break-words">{dv.payee || "—"}</p>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${tint}`}>
          {dv.workflow_status || "Unknown"}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-ink-500">Amount</dt>
          <dd className="font-semibold text-ink-900">{amount}</dd>
        </div>
        {dv.posting_date && (
          <div>
            <dt className="text-ink-500">Posting date</dt>
            <dd className="text-ink-800">{dv.posting_date}</dd>
          </div>
        )}
        {dv.fund_cluster && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-ink-500">Fund cluster</dt>
            <dd className="text-ink-800 break-words">{dv.fund_cluster}</dd>
          </div>
        )}
        {dv.dv_type && (
          <div>
            <dt className="text-ink-500">Type</dt>
            <dd className="text-ink-800 break-words">{dv.dv_type}</dd>
          </div>
        )}
        {dv.ors_burs_reference && (
          <div className="col-span-2">
            <dt className="text-ink-500">ORS / BURS</dt>
            <dd className="text-ink-800 font-mono break-all">{dv.ors_burs_reference}</dd>
          </div>
        )}
      </dl>

      {writeEnabled && sessionId && ais && (
        <WriteActions dv={dv} sessionId={sessionId} ais={ais} />
      )}

      <div className="mt-2 flex justify-end">
        <a
          href={dv.desk_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-forest-700 hover:text-forest-900"
        >
          Open in AIS Desk
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
