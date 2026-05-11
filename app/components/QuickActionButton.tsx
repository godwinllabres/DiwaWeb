import { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly onClick: () => void;
}

export function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 active:bg-gray-100 active:scale-95 transition-transform whitespace-nowrap"
    >
      <Icon className="h-4 w-4 text-green-600 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );
}
