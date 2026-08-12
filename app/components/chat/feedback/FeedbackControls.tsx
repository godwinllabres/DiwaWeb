// Thumbs + reason panel. Extracted from ChatMessage.tsx.

import { motion } from "motion/react";
import { Check, X, ThumbsUp, ThumbsDown } from "lucide-react";

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
interface FeedbackButtonsProps {
  readonly thumb: boolean | null;
  readonly submitted: boolean;
  readonly onThumb: (helpful: boolean) => void;
  /**
   * Show the "Was this helpful?" label and give the buttons a real border.
   *
   * 7 of 13 UAT testers never rated a single reply, and 6 of those picked
   * "didn't notice them" over "didn't bother" — so this is a discoverability
   * problem, not an unwillingness one. The icons sit in a metadata row beside
   * the timestamp and the source label, all of it deliberately quiet, and at
   * `text-ink-400` they read as part of that furniture rather than as the one
   * thing in the row you can act on.
   *
   * Prompted only on the newest unrated reply. Labelling all thirty would put
   * "Was this helpful?" down the entire transcript, which is how a prompt
   * becomes furniture too — the exact failure being fixed.
   */
  readonly prompt?: boolean;
}

export function FeedbackButtons({ thumb, submitted, onThumb, prompt = false }: FeedbackButtonsProps) {
  // 28x28. Measured, not asserted: the previous comment claimed 36px while the
  // buttons actually rendered 24x24 on phones and — because the icons carried
  // `sm:h-3.5` — shrank to 22x22 on tablet and desktop, so the touch device with
  // the most room got the smallest control and 2.5.8 passed only because the
  // two circles were exactly tangent. p-1.5 around a 16px icon clears 24x24 at
  // every viewport with margin to spare, without the bordered-circle treatment
  // that used to double their visual weight against the timestamp.
  const base = "rounded-full p-1.5 transition-colors";
  const disabled = thumb !== null;
  // The bordered treatment is back, but only while prompting and only until the
  // reply is rated — it buys attention for the one control that needs it
  // without permanently outweighing the timestamp on every bubble.
  const resting = prompt
    ? "border border-forest-900/15 bg-paper-raised text-ink-600 hover:border-forest-900/25 hover:text-forest-900 active:bg-forest-100"
    : "text-ink-400 active:bg-paper-deep hover:text-ink-600 disabled:opacity-40";
  return (
    <div className="flex items-center gap-0.5">
      {prompt && (
        <span className="mr-1 text-[11px] text-ink-500 sm:text-xs">Was this helpful?</span>
      )}
      <button
        onClick={() => onThumb(true)}
        disabled={disabled}
        aria-label="Helpful"
        className={`${base} ${thumb === true ? "text-forest-600" : resting}`}
      >
        {submitted && thumb === true
          ? <Check className="h-4 w-4" />
          : <ThumbsUp className="h-4 w-4" />}
      </button>
      <button
        onClick={() => onThumb(false)}
        disabled={disabled}
        aria-label="Not helpful"
        className={`${base} ${thumb === false ? "text-red-500" : resting}`}
      >
        <ThumbsDown className="h-4 w-4" />
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

export function FeedbackReasonPanel({
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
          {/* The only way to undo a mis-tapped thumb — handleThumb returns
              early once `thumb !== null` — and it was a 14x14 bare icon, the
              smallest control in the reply. */}
          <button
            onClick={onCancel}
            aria-label="Cancel feedback"
            className="-m-1.5 rounded-full p-1.5 text-ink-400 hover:text-ink-600"
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
