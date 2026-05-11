import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

export function QuickActionButton({ icon: Icon, label, onClick }: QuickActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex min-w-0 flex-col items-center gap-2 rounded-xl border-2 border-gray-200 bg-white p-3 transition-all hover:border-green-600 hover:shadow-md sm:min-w-[124px] sm:p-4"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 text-green-600 sm:h-6 sm:w-6" />
      </div>
      <span className="text-center text-xs leading-snug text-gray-700 sm:text-sm">{label}</span>
    </motion.button>
  );
}
