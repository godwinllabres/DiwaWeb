import { MessageSquareText, Trash2, X } from "lucide-react";
import type { ConversationMeta } from "@/lib/historyStore";
import { RETENTION_DAYS } from "@/lib/historyStore";
import { relativeDay } from "@/lib/time";

interface ConversationHistoryProps {
  readonly conversations: ConversationMeta[];
  readonly enabled: boolean;
  readonly onToggle: (on: boolean) => void;
  readonly onOpen: (id: string) => void;
  readonly onDelete: (id: string) => void;
  readonly onClearAll: () => void;
  readonly className?: string;
}

/**
 * The saved-conversations surface: opt-in switch, the list, and the way out.
 *
 * Presentational and shared — the desktop rail renders it inline, the phone
 * layout renders it in an overlay. Both need the same guarantee that the
 * switch and "Delete all" sit next to the list rather than behind a settings
 * screen the student has to go looking for.
 *
 * Written with plain markup and a role="switch" button instead of the Radix
 * primitive in components/ui: this ships in the public chat bundle, the
 * surrounding rail is plain Tailwind already, and a toggle is not worth a
 * dependency.
 */
export function ConversationHistory({
  conversations,
  enabled,
  onToggle,
  onOpen,
  onDelete,
  onClearAll,
  className = "",
}: ConversationHistoryProps) {
  return (
    <div className={className}>
      {/* The whole row is the switch: the visible text is the control's
          accessible name (it previously had only an aria-label, leaving
          sighted users to infer what the bare toggle did), and a full-width
          hit area is easier to land on a phone. */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-forest-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
      >
        <span className="text-[13px] font-medium text-ink-700">
          Save chats on this device
        </span>
        {/* Track and knob are laid out with flex + padding rather than
            absolute positioning. A <button> centres its content and Tailwind's
            preflight does not reset that, so an absolutely positioned knob
            with no `left` starts from the middle of the track — and the
            translate then pushed it out through the right-hand edge. */}
        <span
          aria-hidden="true"
          className={`inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors ${
            enabled ? "bg-forest-600" : "bg-ink-300"
          }`}
        >
          <span
            className={`h-4 w-4 rounded-full bg-white ring-1 ring-forest-900/10 transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </span>
      </button>

      {!enabled && (
        <p className="mt-1.5 px-2 text-[11px] leading-snug text-ink-500">
          Off. Turn this on to keep your chats in this browser so you can read them
          later. Please leave it off on shared or library computers — anyone using
          this device afterwards would be able to read them.
        </p>
      )}

      {enabled && conversations.length === 0 && (
        <p className="mt-1.5 px-2 text-[11px] leading-snug text-ink-500">
          Your chats are kept in this browser only — never on another device — and
          are removed after {RETENTION_DAYS} days.
        </p>
      )}

      {enabled && conversations.length > 0 && (
        <>
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {conversations.map((c) => (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="flex w-full items-center gap-2.5 rounded-xl py-2.5 pl-3 pr-9 text-left transition-colors hover:bg-forest-50"
                >
                  <MessageSquareText className="h-4 w-4 flex-shrink-0 text-forest-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-700 group-hover:text-forest-900">
                      {c.title}
                    </span>
                    <span className="block text-[11px] text-ink-500">
                      {relativeDay(c.updatedAt)}
                    </span>
                  </span>
                </button>
                {/* Always present for touch, which has no hover to reveal it. */}
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  aria-label={`Delete chat: ${c.title}`}
                  className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onClearAll}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-medium text-ink-500 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
            Delete all chats on this device
          </button>
        </>
      )}
    </div>
  );
}
