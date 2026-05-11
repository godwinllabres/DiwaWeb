import { motion } from "motion/react";
import { Bot } from "lucide-react";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex justify-start gap-2 sm:gap-3"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-600 sm:h-9 sm:w-9">
        <Bot className="h-4 w-4 text-white sm:h-5 sm:w-5" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3.5 py-2.5 sm:px-4 sm:py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-green-600"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
