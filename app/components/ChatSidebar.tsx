import { Plus, Lock } from "lucide-react";
import { SeviAvatar } from "./SeviAvatar";
import { pickIcon } from "@/lib/iconMap";
import type { TopicCard } from "@/lib/topicCatalog";

interface ChatSidebarProps {
  readonly className?: string;
  readonly topics: TopicCard[];
  readonly onStartOver: () => void;
  readonly onTopic: (topic: TopicCard) => void;
}

// Desktop-only conversation rail (shown at ≥ lg via the parent's `hidden
// lg:flex`). The widget iframe caps at 420 px on desktop and goes fullscreen
// on mobile, so this rail only appears when Sevi is opened as a full-page
// chat. Mirrors the ChatGPT/Claude shell: brand, a fresh-start action, quick
// topics, and a privacy footer — all wired to the same handlers the phone
// widget already uses.
export function ChatSidebar({ className = "", topics, onStartOver, onTopic }: ChatSidebarProps) {
  return (
    <aside className={`w-64 flex-shrink-0 flex-col border-r border-green-100 bg-green-50/40 ${className}`}>
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <SeviAvatar className="h-8 w-8" title="Sevi" />
        <span className="text-base font-semibold text-gray-900">Sevi</span>
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onStartOver}
          className="flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:border-green-400 hover:text-green-800"
        >
          <Plus className="h-4 w-4 text-green-600" />
          New conversation
        </button>
      </div>

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto px-3">
        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
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
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-white hover:text-gray-900"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-green-600" />
                <span className="min-w-0 truncate">{topic.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto border-t border-gray-200 px-4 py-3 text-[11px] text-gray-500">
        <p className="font-medium text-gray-600">Language · EN · FIL · Taglish</p>
        <p className="mt-1 flex items-center gap-1.5">
          <Lock className="h-3 w-3" />
          No login · anonymous by default
        </p>
      </div>
    </aside>
  );
}
