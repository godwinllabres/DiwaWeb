import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface CategoryCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function CategoryCard({ icon: Icon, title, description, onClick }: CategoryCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border-2 border-gray-200 bg-white p-3 text-left transition-all hover:border-green-600 hover:shadow-lg sm:gap-4 sm:p-4"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-700 sm:h-12 sm:w-12">
        <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
      </div>
      <div className="flex-1">
        <h3 className="mb-1 text-sm text-gray-900 sm:text-base">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-600">{description}</p>
      </div>
    </motion.button>
  );
}
