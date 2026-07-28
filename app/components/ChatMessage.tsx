import { memo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { User, FileText, ExternalLink } from "lucide-react";
import { SeviAvatar } from "./SeviAvatar";
import { SeviSticker, type SeviStickerKey } from "./SeviSticker";

// Card and feedback modules extracted from this file. ChatMessage is now the
// bubble shell that decides WHICH of these to render; each module owns HOW.
import { MapAccordion } from "./chat/cards/MapAccordion";
import { DvDetailCard } from "./chat/cards/DvDetailCard";
import { TableCard } from "./chat/cards/TableCard";
import { DirectoryCard } from "./chat/cards/DirectoryCard";
import { FeedbackButtons, FeedbackReasonPanel, type FeedbackSubmission } from "./chat/feedback/FeedbackControls";

// Re-exported so App.tsx and the tests keep importing it from here — this is
// the module's public surface, regardless of where the type now lives.
export type { FeedbackSubmission };
import { useWordReveal } from "@/lib/hooks/useWordReveal";

import { findCard, type SourceCitation } from "@/lib/api";

import type { ChatCard, ChatContext, DisplayHint, DirectoryCard as DirectoryCardData, RefusalReason, ResponseSource } from "@/lib/types";
import type { UseAuthApi } from "@/lib/hooks/useAuth";

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
  /** Official documents the answer is grounded in. The API has emitted these
      since the charter-citation work; the UI ignored them until 2026-07-28, so
      "p. 948" reached the reader as a number they could not check. */
  readonly sources?: SourceCitation[];
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
  sources,
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
  const hasSources = done && isBot && !!sources?.length;

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

        {hasSources && (
          <div className="w-full mt-2 flex flex-col gap-1">
            {sources?.map((s, i) => {
              // `url` is what makes the citation checkable — a "#page=N" deep
              // link into the published charter PDF, or the site URL. It is
              // null when no PDF is published, and a dead link is worse than
              // plain text, so fall back to the rendered citation string.
              const chips = [s.section, s.office].filter(Boolean) as string[];
              const body = (
                <>
                  <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{s.citation}</span>
                  {s.url && <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />}
                </>
              );
              return (
                <div key={`${s.kind}-${s.locator}-${i}`} className="flex flex-col gap-0.5">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open the source document at this page"
                      className="inline-flex items-start gap-1.5 rounded-md px-1.5 py-1 text-[10px] text-forest-800 underline decoration-forest-900/25 underline-offset-2 transition-colors hover:bg-forest-50 hover:decoration-forest-900/50 sm:text-[11px]"
                    >
                      {body}
                    </a>
                  ) : (
                    <span className="inline-flex items-start gap-1.5 px-1.5 py-1 text-[10px] text-ink-500 sm:text-[11px]">
                      {body}
                    </span>
                  )}
                  {chips.length > 0 && (
                    <span className="px-1.5 text-[10px] text-ink-500">{chips.join(" · ")}</span>
                  )}
                </div>
              );
            })}
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
