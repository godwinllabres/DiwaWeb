import { useEffect, useState } from "react";

/**
 * SeviHatCycle — one Sevi that quietly cycles through his profession hats
 * (the official sevi-asset exports in public/sevi-professions/). Sits beside
 * the landing heading as a small living accent; it replaces the old
 * twelve-card profession grid.
 *
 * Two stacked <img>s crossfade on an interval. Users who prefer reduced
 * motion get a single static scholar — no cycling, no fades.
 */

const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

const HATS = [
  "scholar",
  "salakot",
  "engineer",
  "nurse",
  "technologist",
  "chef",
  "officer",
  "artist",
  "veterinarian",
  "athlete",
  "doctor",
  "analyst",
] as const;

const CYCLE_MS = 2600;
const FADE_MS = 450;

function hatUrl(key: string): string {
  return `${BASE_URL}sevi-professions/sevi-${key}.svg`;
}

export function SeviHatCycle({ className }: { readonly className?: string }) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % HATS.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [reduced]);

  if (reduced) {
    return (
      <img
        src={hatUrl("scholar")}
        alt="Sevi"
        className={className}
        loading="lazy"
      />
    );
  }

  const current = HATS[index];
  const next = HATS[(index + 1) % HATS.length];

  return (
    <div className={`relative ${className ?? ""}`} aria-label="Sevi, for every CvSU course" role="img">
      {/* Preload the upcoming hat invisibly so the swap never flashes. */}
      <img src={hatUrl(next)} alt="" aria-hidden className="absolute inset-0 h-full w-full opacity-0" />
      <img
        key={current}
        src={hatUrl(current)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full animate-sevi-hat-in"
        style={{ animationDuration: `${FADE_MS}ms` }}
      />
    </div>
  );
}
