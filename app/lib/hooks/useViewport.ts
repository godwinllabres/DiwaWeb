import { useEffect, useState } from "react";

/** Matches the `short:` Tailwind variant in app/styles/tailwind.css. Keep the two
 *  in step — components use the class for styling and the hook for the few
 *  decisions CSS cannot make (a `<details open>` default, an aria-label). */
export const SHORT_VIEWPORT_QUERY = "(max-height: 560px)";

const canQuery = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function";

/**
 * True when the viewport is too short for a stacked layout — a phone held in
 * landscape, or any browser with the on-screen keyboard up.
 *
 * Re-evaluated on rotation, so a student who turns the phone mid-conversation
 * gets the landscape treatment without a reload.
 */
export function useIsShortViewport(): boolean {
  const [isShort, setIsShort] = useState(
    () => canQuery() && window.matchMedia(SHORT_VIEWPORT_QUERY).matches,
  );

  useEffect(() => {
    if (!canQuery()) return;
    const mq = window.matchMedia(SHORT_VIEWPORT_QUERY);
    const onChange = () => setIsShort(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isShort;
}

/**
 * Publish the *visual* viewport height as `--sevi-vh` on <html>.
 *
 * `100dvh` tracks the browser's collapsing toolbars but NOT the on-screen
 * keyboard: on iOS the keyboard overlays the layout viewport, so a `h-dvh`
 * chat column keeps its full height and the composer ends up underneath the
 * keys — which in landscape, where the keyboard eats most of a 390px-tall
 * screen, means the user cannot see what they are typing. `visualViewport`
 * reports the space actually left over, so the shell can size to that.
 *
 * `interactive-widget=resizes-content` (index.html) already handles this on
 * Chromium; this is the Safari half. Both are safe together — where the
 * layout viewport already shrank, visualViewport.height simply agrees with it.
 */
export function useVisualViewportHeight(): void {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : undefined;
    if (!vv) return;

    const root = document.documentElement;
    const apply = () => {
      // offsetTop is non-zero when iOS has scrolled the visual viewport up to
      // reveal the focused input; subtracting it keeps the bottom of the shell
      // pinned to the top of the keyboard instead of drifting behind it.
      root.style.setProperty("--sevi-vh", `${Math.round(vv.height - vv.offsetTop)}px`);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--sevi-vh");
    };
  }, []);
}
