import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

/**
 * SeviSticker — the official animated Sevi sticker set (public/sevi-stickers/,
 * from "sevi gif final"). Full-character chibi GIFs with transparent
 * backgrounds, used for expressive moments: thinking while typing, confused on
 * a fallback answer, excited on the welcome message, and the landing showcase.
 *
 * Reduced-motion users get the matching static vtraced SVG from
 * public/sevi-reactions/ instead of the looping GIF.
 */

const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

export type SeviStickerKey =
  | "approve"
  | "cheerup"
  | "confused"
  | "excited"
  | "idea"
  | "listening"
  | "ok"
  | "sleepy"
  | "thinking"
  | "wow";

/** The static sevi-reactions set predates the GIFs and differs in two keys:
    "confused" is spelled "confuse", and there is no official vtraced "wow" —
    reduced-motion wow borrows the excited pose rather than shipping draft art. */
const STATIC_KEY: Partial<Record<SeviStickerKey, string>> = {
  confused: "confuse",
  wow: "excited",
};

function gifUrl(sticker: SeviStickerKey): string {
  return `${BASE_URL}sevi-stickers/sevi-${sticker}.gif`;
}

function staticUrl(sticker: SeviStickerKey): string {
  return `${BASE_URL}sevi-reactions/sevi-${STATIC_KEY[sticker] ?? sticker}.svg`;
}

/** Fire-and-forget prefetch so a sticker is already cached when its moment
    arrives (the typing indicator must not start a 700KB download in the middle
    of the user's wait). Safe to call repeatedly — the browser cache dedupes. */
export function warmSeviStickers(keys: readonly SeviStickerKey[], reduced: boolean): void {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    const img = new Image();
    img.src = reduced ? staticUrl(key) : gifUrl(key);
  }
}

interface SeviStickerProps {
  readonly sticker: SeviStickerKey;
  readonly className?: string;
  readonly title?: string;
}

export function SeviSticker({ sticker, className, title }: SeviStickerProps) {
  const reduced = usePrefersReducedMotion();
  return (
    <img
      src={reduced ? staticUrl(sticker) : gifUrl(sticker)}
      alt={title ?? `Sevi ${sticker}`}
      // object-contain: the static fallbacks are viewBox-less vtraced SVGs
      // with non-square intrinsic sizes — without it they stretch to fill
      // the square avatar slots.
      className={["object-contain", className].filter(Boolean).join(" ")}
    />
  );
}

/**
 * SeviMoodCycle — one Sevi cycling through a handful of moods. A curated
 * subset, not all ten: each GIF is ~700 KB and the landing page has to stay
 * usable on campus Wi-Fi. Three guards keep that promise honest:
 *
 *  - Nothing downloads until the section actually scrolls into view
 *    (IntersectionObserver; the landing showcase sits far below the fold).
 *  - The cycle only advances once the next GIF has finished loading, and the
 *    previous sticker stays mounted underneath the incoming fade so a slow
 *    fetch never leaves a blank hole (a real crossfade, unlike the tiny-SVG
 *    remount this pattern started from).
 *  - A pause button stops the auto-cycle (WCAG 2.2.2); reduced-motion users
 *    get a single static sticker instead.
 */
const MOODS: readonly SeviStickerKey[] = ["excited", "idea", "approve", "thinking", "wow"];
const CYCLE_MS = 4000;
const FADE_MS = 450;

export function SeviMoodCycle({ className }: { readonly className?: string }) {
  const [cycle, setCycle] = useState<{ index: number; prevIndex: number | null }>({
    index: 0,
    prevIndex: null,
  });
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  // Ref, not state: the interval reads it without re-arming, and onLoad
  // setting it must not re-render or trigger updater side effects.
  const nextLoadedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  // Start (and start downloading) only when the showcase is actually visible.
  useEffect(() => {
    if (reduced) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setInView(true);
    }, { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  // Advance only when the preloaded next GIF is ready — a slow fetch just
  // holds the current sticker instead of swapping to an empty slot.
  useEffect(() => {
    if (reduced || !inView || paused) return;
    const t = setInterval(() => {
      if (!nextLoadedRef.current) return;
      nextLoadedRef.current = false;
      setCycle((c) => ({ index: (c.index + 1) % MOODS.length, prevIndex: c.index }));
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [reduced, inView, paused]);

  if (reduced) {
    return (
      <img
        src={staticUrl("excited")}
        alt="Sevi"
        className={["object-contain", className].filter(Boolean).join(" ")}
        loading="lazy"
      />
    );
  }

  const current = MOODS[cycle.index];
  const next = MOODS[(cycle.index + 1) % MOODS.length];
  const prev = cycle.prevIndex === null ? null : MOODS[cycle.prevIndex];

  return (
    <div
      ref={containerRef}
      className={`relative ${className ?? ""}`}
      aria-label="Sevi, in many moods"
      role="img"
    >
      {inView && (
        <>
          {/* Preload the upcoming mood invisibly; its load event gates the cycle. */}
          <img
            src={gifUrl(next)}
            alt=""
            aria-hidden
            onLoad={() => {
              nextLoadedRef.current = true;
            }}
            className="absolute inset-0 h-full w-full object-contain opacity-0"
          />
          {/* Previous sticker stays underneath while the new one fades in. */}
          {prev && prev !== current && (
            <img src={gifUrl(prev)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-contain" />
          )}
          <img
            key={current}
            src={gifUrl(current)}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain animate-sevi-hat-in"
            style={{ animationDuration: `${FADE_MS}ms` }}
          />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Play Sevi's mood animation" : "Pause Sevi's mood animation"}
            className="absolute bottom-1 right-1 z-10 rounded-full bg-paper-raised/85 px-3 py-1 text-[11px] font-semibold text-forest-800 shadow-ambient ring-1 ring-forest-900/10 backdrop-blur hover:bg-paper-raised"
          >
            {paused ? "▶ Play" : "❚❚ Pause"}
          </button>
        </>
      )}
    </div>
  );
}
