import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SeviSticker } from "./SeviSticker";

/**
 * Typing indicator that tells the user *why* the wait is dragging on,
 * instead of bouncing dots forever. Stages escalate at 4s, 10s, 20s,
 * and 35s; within each stage the line rotates every ~6s so the bot
 * feels like it's actually thinking, not stuck.
 *
 * Lines are tier-tagged so we never claim "almost done" before we've
 * actually waited a while.
 */

type Tier = "quick" | "thinking" | "deep" | "slow" | "patience";

interface TierConfig {
  readonly atSec: number;
  readonly lines: readonly string[];
}

const TIERS: ReadonlyArray<{ tier: Tier; config: TierConfig }> = [
  // 0-4s: pure dots, no text yet. Empty `lines` array signals "no text".
  { tier: "quick", config: { atSec: 0, lines: [] } },
  {
    tier: "thinking",
    config: {
      atSec: 4,
      lines: [
        "Looking that up…",
        "Pulling the right info…",
        "One sec — checking my notes.",
      ],
    },
  },
  {
    tier: "deep",
    config: {
      atSec: 10,
      lines: [
        "Cross-checking sources for you…",
        "Making sure this is the latest answer…",
        "Comparing a few possibilities — almost there.",
      ],
    },
  },
  {
    tier: "slow",
    config: {
      atSec: 20,
      lines: [
        "This one needs a closer look — bear with me.",
        "Still on it. The model is reasoning through your question.",
        "Long question, taking a bit more thought.",
      ],
    },
  },
  {
    tier: "patience",
    config: {
      atSec: 35,
      lines: [
        "Sorry, this is taking longer than usual. The server may be busy.",
        "Still here — pinging the backend again.",
        "Hang tight, almost there. If this keeps happening, try sending again.",
      ],
    },
  },
];

function pickTier(elapsedSec: number): TierConfig {
  let chosen = TIERS[0].config;
  for (const { config } of TIERS) {
    if (elapsedSec >= config.atSec) chosen = config;
  }
  return chosen;
}

export function TypingIndicator() {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);

  // Tick every 500ms so we don't miss tier transitions but also don't
  // burn render budget.
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsedSec((Date.now() - start) / 1000);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  // Rotate within the current tier every 6 seconds for variety.
  useEffect(() => {
    const rot = window.setInterval(() => setLineIdx((n) => n + 1), 6000);
    return () => window.clearInterval(rot);
  }, []);

  const config = pickTier(elapsedSec);
  const line = config.lines.length > 0 ? config.lines[lineIdx % config.lines.length] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-end justify-start gap-2 sm:gap-3"
    >
      <SeviSticker sticker="thinking" className="h-8 w-8 flex-shrink-0 sm:h-9 sm:w-9" title="Sevi is thinking" />
      <div className="flex flex-col items-start gap-1">
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
        <AnimatePresence mode="wait">
          {line && (
            <motion.p
              key={`${config.atSec}-${lineIdx % config.lines.length}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="px-1 text-[11px] italic leading-tight text-gray-500 sm:text-xs"
            >
              {line}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
