import { memo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { User, ThumbsUp, ThumbsDown, Check, X, MapPin, Mail, Phone, Clock, Building2, ChevronDown, Map as MapIcon, FileText, ExternalLink, ChevronUp, ArrowUpDown, Search, ArrowLeft } from "lucide-react";
import { SeviAvatar } from "./SeviAvatar";
import { SeviSticker, type SeviStickerKey } from "./SeviSticker";

// Reason taxonomy — keep in sync with backend FEEDBACK_REASONS in api/app.py
// and the /feedback/reasons endpoint. Inlined so the picker renders without
// an extra API round-trip on first use.
const POSITIVE_REASONS: { code: string; label: string }[] = [
  { code: "accurate", label: "Got my answer" },
  { code: "clear",    label: "Easy to understand" },
  { code: "helpful",  label: "Pointed me the right way" },
  { code: "other",    label: "Something else" },
];

const NEGATIVE_REASONS: { code: string; label: string }[] = [
  { code: "wrong_info",  label: "Contains incorrect info" },
  { code: "wrong_topic", label: "Answered something else" },
  { code: "incomplete",  label: "Missing key details" },
  { code: "outdated",    label: "Looks out of date" },
  { code: "confusing",   label: "Hard to understand" },
  { code: "other",       label: "Something else" },
];

export interface FeedbackSubmission {
  readonly helpful: boolean;
  readonly reason?: string;
  readonly comment?: string;
}
import { useWordReveal } from "@/lib/hooks/useWordReveal";
import { CampusMap } from "@/components/CampusMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { findCard } from "@/lib/api";
import { readLocal, writeLocal, storageAvailable } from "@/lib/storage";
import { isLinkCell, cellToString, cellToSortKey } from "@/lib/tableCell";
import {
  DV_STATUS_TINT,
  DV_STATUS_TINT_FALLBACK,
  DV_AVAILABLE_ACTIONS,
} from "@/lib/dvWorkflow";
import type {
  ChatCard,
  ChatContext,
  DisplayHint,
  DirectoryCard as DirectoryCardData,
  DvCard as DvCardData,
  MapCard as MapCardData,
  RefusalReason,
  ResponseSource,
  TableCard as TableCardData,
  TableCell,
} from "@/lib/types";
import type { UseAuthApi } from "@/lib/hooks/useAuth";
import {
  LoginModal,
  ConfirmWriteModal,
  type WriteAction,
  type WriteResult,
} from "@/components/AisWriteModals";
import { MessageBody } from "./MessageBody";

// Human-readable provenance for the tier that produced an answer — an
// AI-transparency cue (see sevi-api/docs/privacy_compliance.md §3.11). Knowledge-base
// tiers (naive_bayes/neural_network) and fallback/refusal show nothing; only
// answers that came from an AI model, live data, or the charter are labeled.
const SOURCE_LABEL: Partial<Record<ResponseSource, string>> = {
  llm_local: "AI answer · on CvSU servers",
  llm_claude: "AI answer",
  charter_rag: "CvSU Citizens' Charter",
  ais_mcp: "Live CvSU record",
  connectors_mcp: "Live CvSU lookup",
  campus_directory: "CvSU office directory",
};

interface ChatMessageProps {
  readonly message: string;
  readonly isBot: boolean;
  readonly timestamp: string;
  readonly confidence?: number;
  readonly messageId?: number;
  readonly isGrouped?: boolean;
  /**
   * Takes the message's own intent and id alongside the submission so the
   * parent can pass one stable callback for every bubble. Building the
   * closure at the call site instead (`(s) => submit(intent, id, s)`) mints a
   * new function on every App render, which silently defeats the memo below —
   * and re-rendering 30 bubbles on every keystroke is what that memo exists to
   * prevent.
   */
  readonly onFeedback?: (
    submission: FeedbackSubmission,
    intent: string | undefined,
    messageId: number | undefined,
  ) => void;
  /** Follow-up bubbles ("I may have missed your question") carry no thumbs. */
  readonly followUp?: boolean;
  readonly typing?: boolean;
  readonly onTypingDone?: () => void;
  // v2 envelope
  readonly cards?: ChatCard[];
  readonly context?: ChatContext | null;
  readonly suggestions?: string[];
  readonly source?: ResponseSource;
  readonly refusalReason?: RefusalReason | null;
  readonly displayHint?: DisplayHint;
  readonly onSuggestion?: (text: string) => void | Promise<void>;
  readonly intent?: string;
  /** Override the bot avatar with an animated sticker (e.g. "excited" on the
      welcome message). Fallback answers get "confused" automatically. */
  readonly mood?: SeviStickerKey;
  // Phase 2A Wave 2 — write actions on DV card.
  readonly writeEnabled?: boolean;
  readonly sessionId?: string;
  readonly ais?: UseAuthApi;
}

function formatContextChip(ctx: ChatContext): string | null {
  if (ctx.dv) return `talking about ${ctx.dv}`;
  if (ctx.report) return `last report: ${ctx.report}`;
  if (ctx.uacs) {
    const label = ctx.uacs.kind === "funding_source" ? "funding source" : ctx.uacs.kind;
    return ctx.uacs.query ? `last lookup: ${label} "${ctx.uacs.query}"` : `last lookup: ${label}`;
  }
  return null;
}

// One-time coachmark: the first time a map card appears, teach the user the
// map exists and let them choose to open it — instead of the modal springing
// open unbidden. Persisted so it only ever shows once per browser.
const MAP_COACHMARK_KEY = "diwa_map_coachmark_seen";
function mapCoachmarkSeen(): boolean {
  if (readLocal(MAP_COACHMARK_KEY) === "1") return true;
  // readLocal cannot distinguish "never set" from "storage unreachable", and
  // the two must behave differently: a browser blocking site data has to count
  // as seen, or the coachmark returns on every single map card. Probe only on
  // the miss, so the common path stays a plain read.
  return !storageAvailable("local");
}
function markMapCoachmarkSeen() {
  writeLocal(MAP_COACHMARK_KEY, "1");
}

function MapAccordion({
  mapData,
}: {
  readonly mapData: MapCardData;
}) {
  // The map NEVER auto-opens. Tap-to-expand opens a fullscreen Dialog (mobile)
  // / large modal (desktop) with editable From/To pickers.
  const [open, setOpen] = useState(false);
  // Show the first-run coachmark above the button (only once per browser).
  const [showCoachmark, setShowCoachmark] = useState(() => !mapCoachmarkSeen());

  const dismissCoachmark = () => {
    markMapCoachmarkSeen();
    setShowCoachmark(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showCoachmark && (
        <div className="mb-2 flex items-start gap-2 rounded-2xl border border-forest-900/15 bg-forest-50 px-3 py-2.5 text-sm">
          <MapPin className="h-4 w-4 flex-shrink-0 text-forest-700 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-forest-900">
              This spot is on the campus map.
            </p>
            <p className="mt-0.5 text-xs text-forest-800">
              You can open an interactive map with walking directions.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  dismissCoachmark();
                  setOpen(true);
                }}
                className="rounded-full bg-forest-600 px-3 py-1 text-xs font-medium text-white hover:bg-forest-700 active:bg-forest-800"
              >
                View map
              </button>
              <button
                type="button"
                onClick={dismissCoachmark}
                className="rounded-full border border-forest-900/15 bg-paper-raised px-3 py-1 text-xs font-medium text-forest-800 hover:bg-forest-50 active:bg-forest-100"
              >
                Not now
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissCoachmark}
            aria-label="Dismiss map tip"
            className="flex-shrink-0 rounded-md p-0.5 text-forest-700 hover:bg-forest-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-2xl border border-forest-900/10 bg-forest-50 px-3 py-2 text-left text-sm font-medium text-forest-900 active:bg-forest-100"
          aria-label={`Open campus map for ${mapData.label}`}
        >
          <MapIcon className="h-4 w-4 flex-shrink-0 text-forest-700" />
          <span className="flex-1 min-w-0 truncate">
            View campus map — {mapData.label}
          </span>
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-forest-700" />
        </button>
      </DialogTrigger>
      <DialogContent
        // Fullscreen on mobile, large centered modal on desktop. `gap-0` /
        // `p-0` override DialogContent defaults so the map fills the frame
        // edge-to-edge. `[&>button.absolute]:hidden` suppresses the default
        // Radix close X (we provide our own "Back to chat" affordance below
        // — the floating X confused users into thinking it closed the chat
        // widget itself, since the widget's own close X is at the same screen
        // position when embedded).
        // The sm: block turns the sheet into a centered modal, which a phone in
        // landscape also matches on width — and 90dvh of a 390px-tall screen is
        // a 351px window with a map in it. The short: block hands that case back
        // to the fullscreen treatment, which is the only way the map gets room.
        className="!grid !max-w-none !translate-x-0 !translate-y-0 !top-0 !left-0 !inset-0 !rounded-none !p-0 !gap-0 !border-0 grid-rows-[auto_1fr] h-[100dvh] w-screen overflow-hidden sm:!inset-auto sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-2xl sm:!max-w-[min(900px,95vw)] sm:!h-[min(900px,90dvh)] short:!inset-0 short:!top-0 short:!left-0 short:!translate-x-0 short:!translate-y-0 short:!rounded-none short:!max-w-none short:!h-[100dvh] [&>button.absolute]:hidden"
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b border-forest-900/10 bg-paper-raised px-3 py-2.5 sm:rounded-t-2xl sm:px-4 sm:py-3 short:py-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Back to chat"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-forest-700 hover:bg-forest-50 active:bg-forest-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to chat</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="min-w-0 flex-1 text-left">
            <DialogTitle className="text-sm font-semibold text-ink-900 sm:text-base">
              Campus map
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-ink-500">
              Pick a From and To — the route updates instantly.
            </DialogDescription>
          </div>
        </DialogHeader>
        {/* Portrait scrolls the whole sheet; landscape hands scrolling to
            CampusMap's own rail so the map pane beside it stays put. Gated on
            `short-wide:` and not `short:` — in the 420px chat widget the map
            stays stacked, so the rail that would have scrolled does not exist
            and hiding the overflow here just clipped the page with no way to
            reach the rest of it. */}
        <div className="overflow-y-auto short-wide:overflow-hidden lg:overflow-hidden">
          <CampusMap place_id={mapData.place_id} label={mapData.label} editableTarget zoomable />
        </div>
      </DialogContent>
    </Dialog>
  );
}


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

function DvDetailCard({ dv, writeEnabled, sessionId, ais }: DvDetailCardProps) {
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

function renderCell(cell: TableCell) {
  if (isLinkCell(cell)) {
    // Identifiers (DV names, codes) — never wrap mid-string. Overflow is
    // handled by the parent's overflow-x-auto, so horizontal scroll kicks
    // in only when the cell is genuinely too wide.
    return cell.href ? (
      <a
        href={cell.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-forest-700 underline decoration-forest-600/40 underline-offset-2 hover:text-forest-900 whitespace-nowrap"
      >
        {cell.text}
      </a>
    ) : (
      <span className="whitespace-nowrap">{cell.text}</span>
    );
  }
  return <span>{String(cell ?? "")}</span>;
}

function TableCard({ table }: { readonly table: TableCardData }) {
  const alignClass: Record<string, string> = {
    left:   "text-left",
    right:  "text-right tabular-nums",
    center: "text-center",
  };
  // Right-aligned and center-aligned columns should never wrap (numbers,
  // status badges). Left-aligned text columns wrap on word boundaries so
  // long payee names stay inside the cell instead of forcing horizontal
  // scroll for the whole row.
  const wrapClass = (align?: string) =>
    align === "right" || align === "center" ? "whitespace-nowrap" : "break-words";

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState("");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Filter first, then sort. Both are pure derived state — no rebuild of
  // the source rows from the backend.
  const filterLower = filter.trim().toLowerCase();
  const visibleRows = filterLower
    ? table.rows.filter((row) =>
        table.columns.some((c) =>
          cellToString(row[c.key]).toLowerCase().includes(filterLower)
        )
      )
    : table.rows;

  const sortedRows = sortKey
    ? [...visibleRows].sort((a, b) => {
        const av = cellToSortKey(a[sortKey]);
        const bv = cellToSortKey(b[sortKey]);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      })
    : visibleRows;

  return (
    <div className="w-full rounded-2xl border border-forest-900/10 bg-forest-50 p-3 text-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
        {table.title && (
          <p className="text-xs font-semibold text-forest-900 flex-1 min-w-0 truncate">
            {table.title}
          </p>
        )}
        {table.rows.length > 3 && (
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="text-xs pl-6 pr-2 py-1 rounded border border-forest-900/10 bg-paper-raised/80 placeholder:text-ink-400 focus:outline-none focus:border-forest-600/30 w-28 sm:w-36"
            />
          </div>
        )}
      </div>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-forest-900/10">
              {table.columns.map((c) => {
                const isActive = sortKey === c.key;
                let SortIcon = ArrowUpDown;
                if (isActive) {
                  SortIcon = sortDir === "asc" ? ChevronUp : ChevronDown;
                }
                return (
                  <th
                    key={c.key}
                    scope="col"
                    className={`px-2 py-1.5 font-medium text-forest-900 whitespace-nowrap ${alignClass[c.align ?? "left"]}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSort(c.key)}
                      className={`inline-flex items-center gap-1 hover:text-forest-700 ${
                        c.align === "right" ? "flex-row-reverse" : ""
                      } ${c.align === "center" ? "justify-center" : ""}`}
                    >
                      {c.label}
                      <SortIcon className={`h-3 w-3 ${isActive ? "text-forest-700" : "text-ink-400"}`} />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-2 py-3 text-center text-ink-500 italic"
                >
                  No rows match {`"${filter}"`}.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => {
                // Derive a stable key from row content (first column's value
                // is unique for our tables: DV name, group key, or UACS code).
                const firstCell = row[table.columns[0]?.key];
                const rowKey = isLinkCell(firstCell)
                  ? firstCell.text
                  : String(firstCell ?? `r${idx}`);
                const stripe = idx % 2 === 0 ? "bg-paper-raised/50" : "bg-transparent";
                return (
                  <tr key={rowKey} className={stripe}>
                    {table.columns.map((c) => (
                      <td
                        key={c.key}
                        className={`px-2 py-1 text-ink-800 align-middle ${alignClass[c.align ?? "left"]} ${wrapClass(c.align)}`}
                      >
                        {renderCell(row[c.key])}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {table.footer && !filter && (
        <p className="mt-2 px-1 text-[11px] text-ink-500">{table.footer}</p>
      )}
      {filter && (
        <p className="mt-2 px-1 text-[11px] text-ink-500">
          Showing {sortedRows.length} of {table.rows.length} on this list.
        </p>
      )}
    </div>
  );
}

function DirectoryCard({ directory }: { readonly directory: DirectoryCardData }) {
  return (
    <div className="w-full rounded-2xl border border-forest-900/10 bg-forest-50 p-3 text-sm">
      <div className="flex items-start gap-2">
        <Building2 className="h-4 w-4 flex-shrink-0 text-forest-700 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-forest-900 break-words">{directory.office}</p>
          {directory.location && (
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-ink-700">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-forest-700 mt-0.5" />
              <span className="break-words">{directory.location}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {directory.email && (
          <a
            href={`mailto:${directory.email}`}
            className="flex items-center gap-1.5 text-forest-800 hover:text-forest-900 break-all"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.email}
          </a>
        )}
        {directory.phone && (
          <a
            href={`tel:${directory.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-1.5 text-forest-800 hover:text-forest-900"
          >
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.phone}
          </a>
        )}
        {directory.hours && (
          <p className="flex items-center gap-1.5 text-ink-600 sm:col-span-2">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.hours}
          </p>
        )}
      </div>
    </div>
  );
}

interface FeedbackButtonsProps {
  readonly thumb: boolean | null;
  readonly submitted: boolean;
  readonly onThumb: (helpful: boolean) => void;
}

function FeedbackButtons({ thumb, submitted, onThumb }: FeedbackButtonsProps) {
  // Keep tap targets 36 px wide on mobile (still WCAG-compliant when paired
  // with the gap), but drop the bordered-circle treatment that doubled the
  // visual weight against the small timestamp.
  const base = "rounded-full p-1 transition-colors";
  const disabled = thumb !== null;
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onThumb(true)}
        disabled={disabled}
        aria-label="Helpful"
        className={`${base} ${
          thumb === true
            ? "text-forest-600"
            : "text-ink-400 active:bg-paper-deep hover:text-ink-600 disabled:opacity-40"
        }`}
      >
        {submitted && thumb === true
          ? <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          : <ThumbsUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
      </button>
      <button
        onClick={() => onThumb(false)}
        disabled={disabled}
        aria-label="Not helpful"
        className={`${base} ${
          thumb === false
            ? "text-red-500"
            : "text-ink-400 active:bg-paper-deep hover:text-ink-600 disabled:opacity-40"
        }`}
      >
        <ThumbsDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </button>
    </div>
  );
}

interface FeedbackReasonPanelProps {
  readonly helpful: boolean;
  readonly selectedReason: string | null;
  readonly comment: string;
  readonly onReasonChange: (code: string | null) => void;
  readonly onCommentChange: (v: string) => void;
  readonly onSubmit: () => void;
  readonly onSkip: () => void;
  readonly onCancel: () => void;
}

function FeedbackReasonPanel({
  helpful,
  selectedReason,
  comment,
  onReasonChange,
  onCommentChange,
  onSubmit,
  onSkip,
  onCancel,
}: FeedbackReasonPanelProps) {
  const reasons = helpful ? POSITIVE_REASONS : NEGATIVE_REASONS;
  const activeChip = helpful
    ? "bg-forest-600 text-white border-forest-600"
    : "bg-red-600 text-white border-red-600";
  const submitBtn = helpful
    ? "bg-forest-600 text-white hover:bg-forest-700"
    : "bg-red-600 text-white hover:bg-red-700";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2 }}
      className="w-full mt-2"
    >
      <div className="rounded-2xl border border-forest-900/10 bg-paper-raised p-3 text-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-ink-700">
            {helpful ? "What worked well?" : "What went wrong?"}{" "}
            <span className="text-ink-400">(optional)</span>
          </span>
          <button
            onClick={onCancel}
            aria-label="Cancel feedback"
            className="text-ink-400 hover:text-ink-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {reasons.map((opt) => {
            const active = selectedReason === opt.code;
            return (
              <button
                key={opt.code}
                onClick={() => onReasonChange(active ? null : opt.code)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  active ? activeChip : "bg-paper-sunken text-ink-700 border-forest-900/10 hover:border-ink-300"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={
            helpful
              ? "Anything else you'd like us to know? (optional)"
              : "Tell us more so we can fix it (optional)"
          }
          rows={2}
          maxLength={500}
          className="w-full text-xs rounded-md border border-forest-900/10 px-2 py-1.5 resize-none focus:outline-none focus:border-ink-300"
        />

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={onSkip}
            className="text-xs px-2 py-1 rounded text-ink-500 hover:text-ink-700"
          >
            Skip
          </button>
          <button
            onClick={onSubmit}
            className={`text-xs px-3 py-1 rounded font-medium ${submitBtn}`}
          >
            Send feedback
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const AVATAR_SIZE = "h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9";

function BotAvatar({ grouped, mood }: { readonly grouped: boolean; readonly mood?: SeviStickerKey }) {
  if (grouped) return <div className={AVATAR_SIZE} />;
  if (mood) return <SeviSticker sticker={mood} className={AVATAR_SIZE} title="Sevi" />;
  return <SeviAvatar className={AVATAR_SIZE} title="Sevi" animated />;
}

function UserAvatar({ grouped }: { readonly grouped: boolean }) {
  if (grouped) return <div className={AVATAR_SIZE} />;
  return (
    <div className={`${AVATAR_SIZE} rounded-full bg-forest-900 flex items-center justify-center`}>
      <User className="h-4 w-4 text-white sm:h-5 sm:w-5" />
    </div>
  );
}

function ChatMessageImpl({
  message,
  isBot,
  timestamp,
  confidence,
  messageId,
  isGrouped = false,
  onFeedback,
  followUp = false,
  typing = false,
  onTypingDone,
  cards,
  context,
  suggestions,
  onSuggestion,
  intent,
  writeEnabled,
  sessionId,
  ais,
  source,
  mood,
}: ChatMessageProps) {
  // Pull each typed card out of the discriminated union. `findCard` keeps
  // the narrowed type so JSX below gets full IntelliSense. Directory is a
  // list (contact/directory intents return several offices).
  const directories = (cards ?? []).filter((c) => c.kind === "directory") as DirectoryCardData[];
  const mapCard   = findCard(cards, "map");
  const dvCard    = findCard(cards, "dv");
  const table     = findCard(cards, "table");
  const contextChipText = context ? formatContextChip(context) : null;
  // Three-state UI: thumb=null = not yet picked; thumb=true|false = picked
  // but not finalized (reason panel visible); submitted=true = locked in.
  const [thumb, setThumb] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const { done, staggerMs, animate } = useWordReveal(message, typing, onTypingDone);
  const hasSuggestions = done && isBot && !!suggestions?.length && !!onSuggestion;

  const handleThumb = (helpful: boolean) => {
    if (submitted || thumb !== null) return;
    setThumb(helpful);
    // Don't submit yet — let the user pick a reason first.
  };

  const handleSubmit = () => {
    if (thumb === null || submitted) return;
    onFeedback?.(
      {
        helpful: thumb,
        reason: selectedReason ?? undefined,
        comment: comment.trim() ? comment.trim() : undefined,
      },
      intent,
      messageId,
    );
    setSubmitted(true);
  };

  const handleSkip = () => {
    if (thumb === null || submitted) return;
    // Bare thumb signal, no reason/comment.
    onFeedback?.({ helpful: thumb }, intent, messageId);
    setSubmitted(true);
  };

  const handleCancel = () => {
    if (submitted) return;
    setThumb(null);
    setSelectedReason(null);
    setComment("");
  };

  // `followUp` moved in from the call site, where App used to suppress the
  // thumbs by passing `onFeedback={undefined}` — a conditional that rebuilt the
  // prop every render.
  const showFeedback = done && isBot && !followUp && messageId !== undefined && !!onFeedback;
  const showReasonPanel = showFeedback && thumb !== null && !submitted;
  const showHint = done && isBot && confidence !== undefined && confidence < 0.5;

  // Bot replies are a card on the page — paper-white, hairline border, no
  // fill — rather than a grey pill. The student's own messages keep the solid
  // institutional green so the two voices stay instantly distinguishable at a
  // glance (white on #16803C clears AA at 5.0:1).
  const bubbleColors = isBot
    ? "border border-forest-900/[0.08] bg-paper-raised text-ink-900"
    : "bg-forest-600 text-white";
  // Asymmetric on purpose, always: the corner nearest the speaker's avatar is
  // squarer, which points the card at whoever said it. A run of messages from
  // the same speaker tightens that corner further instead of repeating the
  // full radius.
  let bubbleRounding = isBot
    ? "rounded-[1.5rem] rounded-tl-lg"
    : "rounded-[1.5rem] rounded-tr-lg";
  if (isGrouped) {
    bubbleRounding = isBot
      ? "rounded-[1.5rem] rounded-tl-md"
      : "rounded-[1.5rem] rounded-tr-md";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 sm:gap-3 ${isBot ? "justify-start" : "justify-end"} ${
        isGrouped ? "mb-0.5 mt-0.5" : "mb-3"
      }`}
    >
      {isBot && (
        <BotAvatar
          grouped={isGrouped}
          // A canned miss gets a visibly puzzled Sevi; explicit moods
          // (welcome message) win over the derived one.
          mood={mood ?? (source === "fallback" ? "confused" : undefined)}
        />
      )}

      <div
        className={`flex min-w-0 flex-col ${
          // Bot side gets the wider cap unconditionally so the bubble and
          // any attached cards (directory, dvCard, map, table) share a
          // right edge. User bubbles stay narrower.
          isBot
            ? "max-w-[96%] sm:max-w-[88%] items-start"
            : "max-w-[88%] sm:max-w-[76%] items-end"
        }`}
      >
        {/* When a structured table is available, render it in place of the
            text bubble — the title carries the same lead-in. Text still
            renders during the reveal so the user sees something immediately
            while the table waits for `done`.

            Attached cards (table, DV, directory, map) take the column's full
            width; the text bubble stops at its 52ch measure, so the two share
            a LEFT edge rather than a right one. Prose gets a readable line
            length and tabular data gets room, which is the right trade. */}
        {!(done && isBot && table) && (
          <div className={`px-4 py-3.5 sm:px-6 sm:py-4 ${bubbleColors} ${bubbleRounding}`}>
            {/* `.sevi-reveal` scopes the word animation and carries the stagger
                for every span MessageBody emits below it (app/styles/index.css).
                It lives on this existing element rather than a wrapper inside
                MessageBody, which renders block content a <span> cannot hold. */}
            {/* 52ch, measured rather than guessed: Plus Jakarta Sans has a
                wide "0", so its ch unit runs ~1.4x the average lowercase
                advance — 52ch lands at ~70 real characters per line, inside
                the comfortable 45–75 range. Capping here rather than on each
                paragraph in MessageBody keeps headings, steps and bullets to
                the same measure, and lets the bubble size itself to it. */}
            <div
              className={`max-w-[52ch] text-[15px] leading-[1.7] break-words ${animate ? "sevi-reveal" : ""}`}
              style={animate ? ({ "--sevi-stagger": `${staggerMs}ms` } as CSSProperties) : undefined}
            >
              <MessageBody text={message} isBot={isBot} reveal={animate} />
            </div>
          </div>
        )}

        {showHint && (
          <div className="mt-2 px-1">
            <span className="rounded-full border border-gold-200 bg-gold-50 px-3 py-1 text-xs text-gold-700">
              This answer may not fully match your question.
            </span>
          </div>
        )}

        {done && isBot && table && (
          <div className="w-full">
            <TableCard table={table} />
          </div>
        )}

        {done && isBot && dvCard && (
          <div className="w-full mt-2">
            <DvDetailCard
              dv={dvCard}
              writeEnabled={writeEnabled}
              sessionId={sessionId}
              ais={ais}
            />
          </div>
        )}

        {done && isBot && directories.length > 0 && (
          <div className="w-full mt-2 flex flex-col gap-2">
            {directories.map((d, i) => (
              <DirectoryCard key={`${d.office}-${i}`} directory={d} />
            ))}
          </div>
        )}

        {done && isBot && mapCard && (
          <div className="w-full mt-2">
            <MapAccordion mapData={mapCard} />
          </div>
        )}

        {hasSuggestions && (
          <div className="w-full mt-2 flex flex-wrap gap-1.5">
            {suggestions?.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion?.(s)}
                className="rounded-full border border-forest-900/10 bg-paper-raised px-4 py-2 text-xs font-medium text-forest-800 transition-colors hover:border-forest-900/15 hover:bg-forest-50 active:bg-forest-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1.5 sm:gap-2 sm:px-2">
          <span className="text-[11px] text-ink-500 sm:text-xs">{timestamp}</span>
          {done && isBot && source && SOURCE_LABEL[source] && (
            <span
              title="Where this answer came from"
              className="text-[10px] text-ink-500 sm:text-[11px]"
            >
              · {SOURCE_LABEL[source]}
            </span>
          )}
          {done && isBot && contextChipText && (
            <span
              title="Follow-up questions like 'what's its status?' will resolve to this."
              className="rounded-full border border-forest-900/10 bg-forest-50 px-2.5 py-1 text-[10px] text-forest-800 sm:text-[11px]"
            >
              {contextChipText}
            </span>
          )}
          {showFeedback && (
            <FeedbackButtons thumb={thumb} submitted={submitted} onThumb={handleThumb} />
          )}
        </div>

        {showReasonPanel && thumb !== null && (
          <FeedbackReasonPanel
            helpful={thumb}
            selectedReason={selectedReason}
            comment={comment}
            onReasonChange={setSelectedReason}
            onCommentChange={setComment}
            onSubmit={handleSubmit}
            onSkip={handleSkip}
            onCancel={handleCancel}
          />
        )}
      </div>

      {!isBot && <UserAvatar grouped={isGrouped} />}
    </motion.div>
  );
}

/**
 * Memoized because the transcript re-renders far more often than it changes.
 *
 * `inputValue` is App state and the message list renders in the same
 * component, so without this every keystroke in the composer re-ran this
 * function for every bubble on screen — and each run re-parses the reply's
 * markdown (parseBlocks + a regex scan per block in MessageBody). Thirty
 * messages deep on a phone that is a full re-parse of the conversation per
 * character typed, at exactly the moment the user needs the main thread.
 *
 * This only holds while the props stay referentially stable, which is why
 * `onFeedback` takes intent/messageId as arguments and App memoizes the
 * handlers it passes. A new inline arrow at the call site turns this back into
 * a plain component with extra steps.
 */
export const ChatMessage = memo(ChatMessageImpl);