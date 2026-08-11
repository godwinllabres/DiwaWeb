// Disbursement-voucher workflow presentation and transition rules.
//
// Extracted from app/components/ChatMessage.tsx. These are data, not
// rendering, and they belong beside the WriteAction type that AisWriteModals
// also consumes rather than buried in a chat bubble component.
/**
 * The write operations the AIS exposes for a disbursement voucher.
 *
 * Defined here rather than in AisWriteModals, where it used to live: it is
 * domain vocabulary shared by the modals, the DV card and the transition
 * matrix below, and app/lib must not import from app/components. The modal
 * re-exports it so its existing consumers are unaffected.
 */
export type WriteAction =
  | "approve_dv"
  | "post_dv"
  | "cancel_dv"
  | "set_dv_status";

/**
 * Workflow status → badge tint. Colours are kept aligned with the Frappe Desk
 * badges so a clerk's eye-pattern transfers between Sevi and the workspace.
 */
export const DV_STATUS_TINT: Record<string, string> = {
  Draft:          "bg-gray-100 text-gray-700 border-gray-300",
  Submitted:      "bg-blue-100 text-blue-800 border-blue-300",
  Approved:       "bg-emerald-100 text-emerald-800 border-emerald-300",
  Posted:         "bg-emerald-100 text-emerald-800 border-emerald-300",
  Released:       "bg-emerald-100 text-emerald-800 border-emerald-300",
  Closed:         "bg-gray-200 text-gray-800 border-gray-400",
  "IA Audit":     "bg-amber-100 text-amber-800 border-amber-300",
  Returned:       "bg-rose-100 text-rose-800 border-rose-300",
  Cancelled:      "bg-rose-100 text-rose-800 border-rose-300",
};

/** Fallback tint for a status the UI does not know about. */
export const DV_STATUS_TINT_FALLBACK =
  "bg-paper-deep text-ink-700 border-ink-200";

export interface DvAction {
  readonly action: WriteAction;
  readonly label: string;
  readonly newStatus?: string;
}

/**
 * Which write actions are valid from a given workflow status. Mirrors the
 * transition matrix in accounting/.../ais_disbursement_voucher.py:
 * set_workflow_status, keeping the buttons honest so a user cannot even
 * attempt an illegal transition. The server still enforces the docstatus
 * rules — this is UX, not the authorization boundary.
 */
export const DV_AVAILABLE_ACTIONS: Record<string, ReadonlyArray<DvAction>> = {
  Submitted: [
    { action: "approve_dv",    label: "Approve" },
    { action: "set_dv_status", label: "Send to IA Audit", newStatus: "IA Audit Required" },
    { action: "cancel_dv",     label: "Cancel" },
  ],
  "IA Audit Required": [
    { action: "approve_dv", label: "Approve" },
    { action: "cancel_dv",  label: "Cancel" },
  ],
  Approved: [
    { action: "post_dv",   label: "Post" },
    { action: "cancel_dv", label: "Cancel" },
  ],
  Posted: [
    { action: "set_dv_status", label: "Mark Released", newStatus: "Released" },
    { action: "cancel_dv",     label: "Cancel" },
  ],
  Released: [
    { action: "set_dv_status", label: "Mark Closed", newStatus: "Closed" },
  ],
};
