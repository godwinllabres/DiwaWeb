import { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly onClick: () => void;
}

/**
 * A pill in the quick-actions strip above the composer.
 *
 * px-4 py-2 is the floor for any button in this design language — a 2:1
 * horizontal-to-vertical ratio, and a hit area that clears the 44px touch
 * target once the icon's line-height is counted.
 */
export function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-forest-900/10 bg-paper-raised px-4 py-2 text-sm text-ink-700 transition-colors hover:border-forest-900/15 hover:bg-forest-50 hover:text-forest-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:bg-forest-100"
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-forest-600" />
      <span>{label}</span>
    </button>
  );
}
