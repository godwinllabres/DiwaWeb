import { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly onClick: () => void;
}

export function CategoryCard({ icon: Icon, title, description, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 text-left active:bg-green-50 active:border-green-400 active:scale-[0.98] transition-all duration-75 sm:gap-4 sm:p-4"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-700 sm:h-11 sm:w-11">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="mb-0.5 text-sm font-medium text-gray-900 sm:text-base">{title}</h3>
        <p className="text-xs leading-relaxed text-gray-500 sm:text-sm">{description}</p>
      </div>
    </button>
  );
}
