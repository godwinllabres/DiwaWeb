import { useEffect, useState } from "react";

/**
 * Tracks the OS-level `prefers-reduced-motion` setting, live — flipping the
 * setting mid-session updates every consumer without a reload. Used to swap
 * animated GIF stickers for their static SVG counterparts.
 */
const canQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => canQuery() && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!canQuery()) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
