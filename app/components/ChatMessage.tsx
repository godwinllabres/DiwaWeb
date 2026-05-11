import { useState } from "react";
import { motion } from "motion/react";
import { Bot, User, ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useTypewriter } from "@/lib/hooks/useTypewriter";
import { CampusMap } from "@/components/CampusMap";
import type { MapData } from "@/lib/types";

// ── inline text formatting ────────────────────────────────────────────────────

type SegKind = "text" | "url" | "bold" | "code" | "path";
interface Seg { id: number; k: SegKind; v: string }

// Simplified path pattern ([A-Za-z]:\...) avoids nested quantifiers
const SEG_RE =
  /(\*\*(.+?)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s<>"]+)|([A-Za-z]:\\[^\s<>"]+)/g;

function parseSegments(text: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  SEG_RE.lastIndex = 0;

  while ((m = SEG_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ id: n++, k: "text", v: text.slice(last, m.index) });

    if (m[1])      out.push({ id: n++, k: "bold", v: m[2] });
    else if (m[3]) out.push({ id: n++, k: "code", v: m[4] });
    else if (m[5]) out.push({ id: n++, k: "url",  v: m[5] });
    else if (m[6]) out.push({ id: n++, k: "path", v: m[6] });

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
  readonly onFeedback?: (helpful: boolean) => void;
  readonly typing?: boolean;
  readonly onTypingDone?: () => void;
  readonly mapData?: MapData | null;
}

interface FeedbackProps {
  readonly feedback: boolean | null;
  readonly onFeedback: (helpful: boolean) => void;
}

function FeedbackButtons({ feedback, onFeedback }: FeedbackProps) {
  const base = "rounded-full border p-1.5 transition-colors sm:border-0 sm:p-1";
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onFeedback(true)}
        disabled={feedback !== null}
        aria-label="Helpful"
        className={`${base} ${
          feedback === true
            ? "border-green-600 text-green-600"
            : "border-gray-300 text-gray-600 active:bg-gray-100 disabled:opacity-40 sm:border-transparent"
        }`}
      >
        {feedback === true
          ? <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          : <ThumbsUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
      </button>
      <button
        onClick={() => onFeedback(false)}
        disabled={feedback !== null}
        aria-label="Not helpful"
        className={`${base} ${
          feedback === false
            ? "border-red-500 text-red-500"
            : "border-gray-300 text-gray-600 active:bg-gray-100 disabled:opacity-40 sm:border-transparent"
        }`}
      >
        <ThumbsDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
      </button>
    </div>
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
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const { displayed, done } = useTypewriter(message, typing, onTypingDone);

  const handleFeedback = (helpful: boolean) => {
    if (feedback !== null) return;
    setFeedback(helpful);
    onFeedback?.(helpful);
  };

  const showFeedback = done && isBot && messageId !== undefined && !!onFeedback;
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

        {done && isBot && mapData && (
          <div className="w-full mt-2">
            <CampusMap place_id={mapData.place_id} label={mapData.label} />
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1 sm:gap-2">
          <span className="text-[11px] text-gray-400 sm:text-xs">{timestamp}</span>
          {showFeedback && <FeedbackButtons feedback={feedback} onFeedback={handleFeedback} />}
        </div>
      </div>

      {!isBot && <UserAvatar grouped={isGrouped} />}
    </motion.div>
  );
}
