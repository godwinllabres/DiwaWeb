import { Languages } from "lucide-react";
import type { ReplyLanguage } from "@/lib/api";

const OPTIONS: { value: ReplyLanguage; label: string; title: string }[] = [
  { value: "auto", label: "Auto", title: "Answer in whichever language you ask in" },
  { value: "en", label: "English", title: "Always answer in English" },
  { value: "fil", label: "Filipino", title: "Sumagot palagi sa Filipino" },
];

interface LanguageToggleProps {
  readonly value: ReplyLanguage;
  readonly onChange: (next: ReplyLanguage) => void;
  readonly className?: string;
}

/**
 * Three-way segmented control for the reply language.
 *
 * A segmented control rather than a dropdown because the whole point is that
 * the setting be visible: the UAT complaint was that answers came back in a
 * language the reader had not chosen, and a preference hidden behind a menu
 * would not have told them it was theirs to change. Three fixed options fit on
 * a 360px phone, so nothing is gained by collapsing them.
 *
 * `radiogroup` rather than a row of buttons so the arrow keys move between
 * options and a screen reader announces which one is selected — a set of
 * plain buttons announces three unrelated controls with no current value.
 */
export function LanguageToggle({ value, onChange, className = "" }: LanguageToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Reply language"
      className={`flex flex-shrink-0 items-center gap-1 rounded-full border border-forest-900/10 bg-paper-raised p-1 ${className}`}
    >
      <Languages className="ml-1.5 h-4 w-4 flex-shrink-0 text-forest-600" aria-hidden="true" />
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 ${
              active
                ? "bg-forest-900 text-white"
                : "text-ink-600 hover:bg-forest-50 hover:text-forest-900"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
