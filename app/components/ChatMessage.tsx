import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, User, ThumbsUp, ThumbsDown, Check, X, MapPin, Mail, Phone, Clock, Building2, ChevronDown, Map as MapIcon } from "lucide-react";

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
import { useTypewriter } from "@/lib/hooks/useTypewriter";
import { CampusMap } from "@/components/CampusMap";
import type { MapData, Directory } from "@/lib/types";

// ── inline text formatting ────────────────────────────────────────────────────

type SegKind = "text" | "url" | "bold" | "code" | "path" | "mdlink";
interface Seg { id: number; k: SegKind; v: string; href?: string }

// Markdown link is matched first so a bare-URL inside [text](url) doesn't
// get captured by the standalone URL alternative.
const SEG_RE =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(\*\*(.+?)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s<>"]+)|([A-Za-z]:\\[^\s<>"]+)/g;

function parseSegments(text: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  SEG_RE.lastIndex = 0;

  while ((m = SEG_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ id: n++, k: "text", v: text.slice(last, m.index) });

    if (m[1])      out.push({ id: n++, k: "mdlink", v: m[1], href: m[2] });
    else if (m[3]) out.push({ id: n++, k: "bold", v: m[4] });
    else if (m[5]) out.push({ id: n++, k: "code", v: m[6] });
    else if (m[7]) out.push({ id: n++, k: "url",  v: m[7] });
    else if (m[8]) out.push({ id: n++, k: "path", v: m[8] });

    last = m.index + m[0].length;
  }

  if (last < text.length) out.push({ id: n++, k: "text", v: text.slice(last) });
  return out;
}

function FormattedText({
  text,
  done,
  isBot,
}: {
  readonly text: string;
  readonly done: boolean;
  readonly isBot: boolean;
}) {
  const segs = parseSegments(text);
  const linkCls = isBot
    ? "underline underline-offset-2 text-green-700 font-medium break-all hover:text-green-800"
    : "underline underline-offset-2 text-white/90 font-medium break-all";
  // Markdown links carry human-readable labels, so wrap at word
  // boundaries instead of mid-character like raw-URL links do.
  const mdLinkCls = isBot
    ? "underline underline-offset-2 text-green-700 font-medium hover:text-green-800"
    : "underline underline-offset-2 text-white/90 font-medium";
  const codeCls = isBot
    ? "bg-gray-200/80 text-gray-800 rounded px-1 py-0.5 text-[0.82em] font-mono"
    : "bg-white/20 text-white rounded px-1 py-0.5 text-[0.82em] font-mono";
  const pathCls = isBot
    ? "bg-gray-200/80 text-gray-700 rounded px-1 py-0.5 text-[0.82em] font-mono"
    : "bg-white/20 text-white/90 rounded px-1 py-0.5 text-[0.82em] font-mono";

  return (
    <>
      {segs.map((seg) => {
        switch (seg.k) {
          case "url":
            return (
              <a key={seg.id} href={seg.v} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {seg.v}
              </a>
            );
          case "mdlink":
            return (
              <a key={seg.id} href={seg.href} target="_blank" rel="noopener noreferrer" className={mdLinkCls}>
                {seg.v}
              </a>
            );
          case "bold":
            return <strong key={seg.id} className="font-semibold">{seg.v}</strong>;
          case "code":
            return <code key={seg.id} className={codeCls}>{seg.v}</code>;
          case "path":
            return <span key={seg.id} className={pathCls}>{seg.v}</span>;
          default:
            return <span key={seg.id}>{seg.v}</span>;
        }
      })}
      {!done && (
        <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-gray-500 align-middle animate-pulse" />
      )}
    </>
  );
}

interface ChatMessageProps {
  readonly message: string;
  readonly isBot: boolean;
  readonly timestamp: string;
  readonly confidence?: number;
  readonly messageId?: number;
  readonly isGrouped?: boolean;
  readonly onFeedback?: (submission: FeedbackSubmission) => void;
  readonly typing?: boolean;
  readonly onTypingDone?: () => void;
  readonly mapData?: MapData | null;
  readonly directory?: Directory | null;
  readonly intent?: string;
}

// Intents where the user clearly wants to see the map/directions —
// for everything else, the map is hidden behind a collapsed accordion.
const MAP_FIRST_INTENT_RE = /direction|location|where|map|find_place|navigate|route/i;

function MapAccordion({
  mapData,
  defaultOpen,
}: {
  readonly mapData: MapData;
  readonly defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="w-full rounded-2xl border border-green-200 bg-green-50/60 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-green-900 active:bg-green-100"
      >
        <MapIcon className="h-4 w-4 flex-shrink-0 text-green-700" />
        <span className="flex-1 min-w-0 truncate">
          {open ? "Hide campus map" : `Show on campus map — ${mapData.label}`}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-green-700 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2">
              <CampusMap place_id={mapData.place_id} label={mapData.label} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DirectoryCard({ directory }: { readonly directory: Directory }) {
  return (
    <div className="w-full rounded-2xl border border-green-200 bg-green-50/60 p-3 text-sm shadow-sm">
      <div className="flex items-start gap-2">
        <Building2 className="h-4 w-4 flex-shrink-0 text-green-700 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-green-900 break-words">{directory.office}</p>
          {directory.location && (
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-gray-700">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-green-700 mt-0.5" />
              <span className="break-words">{directory.location}</span>
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {directory.email && (
          <a
            href={`mailto:${directory.email}`}
            className="flex items-center gap-1.5 text-green-800 hover:text-green-900 break-all"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.email}
          </a>
        )}
        {directory.phone && (
          <a
            href={`tel:${directory.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-1.5 text-green-800 hover:text-green-900"
          >
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            {directory.phone}
          </a>
        )}
        {directory.hours && (
          <p className="flex items-center gap-1.5 text-gray-600 sm:col-span-2">
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
  const base = "rounded-full border p-1.5 transition-colors sm:border-0 sm:p-1";
  const disabled = thumb !== null;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onThumb(true)}
        disabled={disabled}
        aria-label="Helpful"
        className={`${base} ${
          thumb === true
            ? "border-green-600 text-green-600"
            : "border-gray-300 text-gray-600 active:bg-gray-100 disabled:opacity-40 sm:border-transparent"
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
            ? "border-red-500 text-red-500"
            : "border-gray-300 text-gray-600 active:bg-gray-100 disabled:opacity-40 sm:border-transparent"
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
    ? "bg-green-600 text-white border-green-600"
    : "bg-red-600 text-white border-red-600";
  const submitBtn = helpful
    ? "bg-green-600 text-white hover:bg-green-700"
    : "bg-red-600 text-white hover:bg-red-700";

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2 }}
      className="w-full mt-2"
    >
      <div className="rounded-2xl border border-gray-200 bg-white p-3 text-sm shadow-sm">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-gray-700">
            {helpful ? "What worked well?" : "What went wrong?"}{" "}
            <span className="text-gray-400">(optional)</span>
          </span>
          <button
            onClick={onCancel}
            aria-label="Cancel feedback"
            className="text-gray-400 hover:text-gray-600"
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
                  active ? activeChip : "bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-400"
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
          className="w-full text-xs rounded-md border border-gray-200 px-2 py-1.5 resize-none focus:outline-none focus:border-gray-400"
        />

        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            onClick={onSkip}
            className="text-xs px-2 py-1 rounded text-gray-500 hover:text-gray-700"
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

function BotAvatar({ grouped }: { readonly grouped: boolean }) {
  if (grouped) return <div className={AVATAR_SIZE} />;
  return (
    <div className={`${AVATAR_SIZE} rounded-full bg-green-600 flex items-center justify-center`}>
      <Bot className="h-4 w-4 text-white sm:h-5 sm:w-5" />
    </div>
  );
}

function UserAvatar({ grouped }: { readonly grouped: boolean }) {
  if (grouped) return <div className={AVATAR_SIZE} />;
  return (
    <div className={`${AVATAR_SIZE} rounded-full bg-green-700 flex items-center justify-center`}>
      <User className="h-4 w-4 text-white sm:h-5 sm:w-5" />
    </div>
  );
}

export function ChatMessage({
  message,
  isBot,
  timestamp,
  confidence,
  messageId,
  isGrouped = false,
  onFeedback,
  typing = false,
  onTypingDone,
  mapData,
  directory,
  intent,
}: ChatMessageProps) {
  // Three-state UI: thumb=null = not yet picked; thumb=true|false = picked
  // but not finalized (reason panel visible); submitted=true = locked in.
  const [thumb, setThumb] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const { displayed, done } = useTypewriter(message, typing, onTypingDone);

  const handleThumb = (helpful: boolean) => {
    if (submitted || thumb !== null) return;
    setThumb(helpful);
    // Don't submit yet — let the user pick a reason first.
  };

  const handleSubmit = () => {
    if (thumb === null || submitted) return;
    onFeedback?.({
      helpful: thumb,
      reason: selectedReason ?? undefined,
      comment: comment.trim() ? comment.trim() : undefined,
    });
    setSubmitted(true);
  };

  const handleSkip = () => {
    if (thumb === null || submitted) return;
    // Bare thumb signal, no reason/comment.
    onFeedback?.({ helpful: thumb });
    setSubmitted(true);
  };

  const handleCancel = () => {
    if (submitted) return;
    setThumb(null);
    setSelectedReason(null);
    setComment("");
  };

  const showFeedback = done && isBot && messageId !== undefined && !!onFeedback;
  const showReasonPanel = showFeedback && thumb !== null && !submitted;
  const showHint = done && isBot && confidence !== undefined && confidence < 0.5;

  const bubbleColors = isBot ? "bg-gray-100 text-gray-900" : "bg-green-600 text-white";
  let bubbleRounding = "rounded-2xl";
  if (isGrouped) {
    bubbleRounding = isBot ? "rounded-2xl rounded-tl-md" : "rounded-2xl rounded-tr-md";
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
      {isBot && <BotAvatar grouped={isGrouped} />}

      <div
        className={`flex flex-col ${
          mapData
            ? "max-w-[96%] sm:max-w-[85%]"
            : "max-w-[88%] sm:max-w-[75%]"
        } ${isBot ? "items-start" : "items-end"}`}
      >
        <div className={`px-3.5 py-2.5 sm:px-4 sm:py-3 ${bubbleColors} ${bubbleRounding}`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            <FormattedText text={displayed} done={done} isBot={isBot} />
          </p>
        </div>

        {showHint && (
          <div className="mt-1.5 px-1">
            <span className="rounded-full px-2.5 py-0.5 text-xs border border-amber-200 bg-amber-50 text-amber-800">
              This answer may not fully match your question.
            </span>
          </div>
        )}

        {done && isBot && directory && (
          <div className="w-full mt-2">
            <DirectoryCard directory={directory} />
          </div>
        )}

        {done && isBot && mapData && (
          <div className="w-full mt-2">
            <MapAccordion
              mapData={mapData}
              defaultOpen={!!intent && MAP_FIRST_INTENT_RE.test(intent)}
            />
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1 sm:gap-2">
          <span className="text-[11px] text-gray-400 sm:text-xs">{timestamp}</span>
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
