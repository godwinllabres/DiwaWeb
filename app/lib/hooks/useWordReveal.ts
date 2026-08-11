import { useEffect, useMemo, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Timing for the word-by-word reveal of a bot reply.
 *
 * This hook deliberately holds no per-frame state. The reveal itself is a CSS
 * animation over spans that already exist (see `.sevi-word` in
 * app/styles/index.css and MessageBody); all that is needed from React is the
 * stagger to publish as a custom property, and one state flip at the end so
 * the feedback thumbs and suggestion chips know to appear.
 *
 * That is the whole reason this replaced the old typewriter: the reply arrives
 * complete in a single JSON response — nothing is actually streaming — so
 * growing the string on a 18ms interval bought a simulation of streaming at
 * the cost of re-parsing the markdown on every tick, in a component with no
 * memoization. One timeout does the same job.
 */

/** The reveal always finishes inside this, however long the answer runs. */
const REVEAL_BUDGET_MS = 700;

/** Ceiling on the per-word step, so a three-word reply still reads as a
 *  reveal rather than a flash. */
const MAX_STAGGER_MS = 45;

/** Must match the animation-duration of `sevi-word-in` in app/styles/index.css —
 *  it is the tail the last word still needs after its delay elapses. */
const WORD_FADE_MS = 240;

export interface WordRevealState {
  /** True once every word is up. Gates the feedback thumbs and suggestions. */
  done: boolean;
  /** Per-word delay step in ms, published to CSS as `--sevi-stagger`. */
  staggerMs: number;
  /** False when the reply should simply appear: reduced motion, a restored
   *  transcript, or a message the user wrote themselves. */
  animate: boolean;
}

export function countWords(text: string): number {
  const trimmed = text?.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * @param text     the complete reply — never a partial one
 * @param enabled  whether this message is the one that just arrived
 * @param onDone   fired once, when the last word has finished fading
 */
export function useWordReveal(
  text: string,
  enabled: boolean,
  onDone?: () => void,
): WordRevealState {
  // Honour the OS setting rather than animating and hoping: a reveal is
  // decorative, so prefers-reduced-motion means show the answer (WCAG 2.3.3).
  const reduced = usePrefersReducedMotion();
  const animate = enabled && !reduced;

  // Held in a ref so a caller passing an inline arrow cannot restart the
  // reveal on every parent render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const { staggerMs, totalMs } = useMemo(() => {
    const words = countWords(text);
    if (!animate || words === 0) return { staggerMs: 0, totalMs: 0 };
    // No floor: a very long answer collapses toward revealing at once, which
    // is the right behaviour — nobody wants to watch a wall of text arrive
    // word by word for ten seconds.
    const stagger = Math.min(MAX_STAGGER_MS, REVEAL_BUDGET_MS / words);
    return { staggerMs: stagger, totalMs: stagger * (words - 1) + WORD_FADE_MS };
  }, [text, animate]);

  const [done, setDone] = useState(!animate);

  useEffect(() => {
    if (!animate) {
      setDone(true);
      return;
    }
    setDone(false);
    const timer = window.setTimeout(() => {
      setDone(true);
      onDoneRef.current?.();
    }, totalMs);
    return () => window.clearTimeout(timer);
  }, [text, animate, totalMs]);

  return { done, staggerMs, animate };
}
