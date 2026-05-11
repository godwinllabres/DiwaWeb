import { useState } from "react";
import { motion } from "motion/react";
import { Bot, User, ThumbsUp, ThumbsDown, Check } from "lucide-react";

interface ChatMessageProps {
  message: string;
  isBot: boolean;
  timestamp: string;
  confidence?: number;
  messageId?: number;
  onFeedback?: (helpful: boolean) => void;
}

export function ChatMessage({
  message,
  isBot,
  timestamp,
  confidence,
  messageId,
  onFeedback,
}: ChatMessageProps) {
  const [feedback, setFeedback] = useState<boolean | null>(null);

  const handleFeedback = (helpful: boolean) => {
    if (feedback !== null) return;
    setFeedback(helpful);
    onFeedback?.(helpful);
  };

  const showFeedback = isBot && messageId !== undefined && !!onFeedback;
  const answerHint =
    isBot && confidence !== undefined && confidence < 0.5
      ? {
          text: "This answer may not fully match your question.",
          color: "border border-amber-200 bg-amber-50 text-amber-800",
        }
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`mb-4 flex gap-2 sm:gap-3 ${isBot ? "justify-start" : "justify-end"}`}
    >
      {isBot && (
        <div className="h-8 w-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0 sm:h-9 sm:w-9">
          <Bot className="h-4 w-4 text-white sm:h-5 sm:w-5" />
        </div>
      )}
      <div className={`flex max-w-[88%] flex-col ${isBot ? "items-start" : "items-end"} sm:max-w-[75%]`}>
        <div
          className={`rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 ${
            isBot ? "bg-gray-100 text-gray-900" : "bg-green-600 text-white"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message}</p>
        </div>

        {answerHint && (
          <div className="mt-1.5 px-2">
            <span className={`rounded-full px-2 py-0.5 text-xs ${answerHint.color}`}>{answerHint.text}</span>
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-1.5 px-2 sm:gap-2">
          <span className="text-[11px] text-gray-500 sm:text-xs">{timestamp}</span>
          {showFeedback && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleFeedback(true)}
                disabled={feedback !== null}
                aria-label="Helpful"
                className={`rounded-full border p-1.5 transition-colors sm:border-0 sm:p-1 ${
                  feedback === true
                    ? "border-green-600 text-green-600"
                    : "border-gray-300 text-gray-600 hover:border-green-600 hover:text-green-600 disabled:hover:border-gray-300 disabled:hover:text-gray-600 sm:border-transparent"
                }`}
              >
                {feedback === true ? <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> : <ThumbsUp className="h-4 w-4 sm:h-3.5 sm:w-3.5" />}
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={feedback !== null}
                aria-label="Not helpful"
                className={`rounded-full border p-1.5 transition-colors sm:border-0 sm:p-1 ${
                  feedback === false
                    ? "border-red-600 text-red-600"
                    : "border-gray-300 text-gray-600 hover:border-red-600 hover:text-red-600 disabled:hover:border-gray-300 disabled:hover:text-gray-600 sm:border-transparent"
                }`}
              >
                <ThumbsDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
      {!isBot && (
        <div className="h-8 w-8 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 sm:h-9 sm:w-9">
          <User className="h-4 w-4 text-white sm:h-5 sm:w-5" />
        </div>
      )}
    </motion.div>
  );
}
