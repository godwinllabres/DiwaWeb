import { Plus, Lock } from "lucide-react";
import { SeviAvatar } from "./SeviAvatar";
import { ConversationHistory } from "./ConversationHistory";
import { pickIcon } from "@/lib/iconMap";
import type { ConversationMeta } from "@/lib/historyStore";
import type { TopicCard } from "@/lib/topicCatalog";

interface ChatSidebarProps {
  readonly className?: string;
  readonly topics: TopicCard[];
  readonly onStartOver: () => void;
  readonly onTopic: (topic: TopicCard) => void;
  readonly conversations: ConversationMeta[];
  readonly historyEnabled: boolean;
  readonly onToggleHistory: (on: boolean) => void;
  readonly onOpenConversation: (id: string) => void;
  readonly onDeleteConversation: (id: string) => void;
  readonly onClearHistory: () => void;
}

// Desktop-only conversation rail (shown at ≥ lg via the parent's `hidden
// lg:flex`). The widget iframe caps at 420 px on desktop and goes fullscreen
// on mobile, so this rail only appears when Sevi is opened as a full-page
// chat. Mirrors the ChatGPT/Claude shell: brand, a fresh-start action, quick
// topics, and a privacy footer — all wired to the same handlers the phone
// widget already uses.
export function ChatSidebar({
  className = "",
  topics,
  onStartOver,
  onTopic,
  conversations,
  historyEnabled,
  onToggleHistory,
  onOpenConversation,
  onDeleteConversation,
  onClearHistory,
}: ChatSidebarProps) {
  return (
    <aside className={`w-72 flex-shrink-0 flex-col border-r border-forest-900/10 bg-paper-sunken ${className}`}>
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
        <SeviAvatar className="h-8 w-8" title="Sevi" />
        <span className="text-base font-semibold tracking-tight text-forest-900">Sevi</span>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={onStartOver}
          className="flex w-full items-center gap-2 rounded-2xl border border-forest-900/10 bg-paper-raised px-4 py-3 text-sm font-semibold text-ink-800 transition-colors hover:border-forest-900/15 hover:bg-forest-50 hover:text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-sunken"
        >
          <Plus className="h-4 w-4 text-forest-600" />
          New conversation
        </button>
      </div>

      <nav className="mt-6 min-h-0 flex-1 overflow-y-auto px-4">
        <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          Popular topics
        </p>
        <div className="flex flex-col gap-0.5">
          {topics.slice(0, 6).map((topic) => {
            const Icon = pickIcon(topic.tag);
            return (
              <button
                key={topic.tag}
                type="button"
                onClick={() => onTopic(topic)}
                className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm text-ink-700 transition-colors hover:bg-forest-50 hover:text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-forest-600" />
                <span className="min-w-0 truncate">{topic.title}</span>
              </button>
            );
          })}
        </div>

        <ConversationHistory
          className="mt-7"
          conversations={conversations}
          enabled={historyEnabled}
          onToggle={onToggleHistory}
          onOpen={onOpenConversation}
          onDelete={onDeleteConversation}
          onClearAll={onClearHistory}
        />
      </nav>

      <div className="mt-auto border-t border-forest-900/10 px-5 py-4 text-[11px] text-ink-500">
        <p className="font-medium text-ink-600">Language · EN · FIL · Taglish</p>
        <p className="mt-1 flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          {/* Stays accurate either way: with saved chats on, the transcript is
              on this device only — it is still not an account. */}
          No login · anonymous by default
        </p>
      </div>
    </aside>
  );
}
