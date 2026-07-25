import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { countWords, useWordReveal } from "@/lib/hooks/useWordReveal";

/** jsdom has no real matchMedia; usePrefersReducedMotion reads it. */
function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("prefers-reduced-motion") ? reduced : false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  stubReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("countWords", () => {
  it("counts whitespace-separated words and tolerates empties", () => {
    expect(countWords("one two three")).toBe(3);
    expect(countWords("  padded \n out  ")).toBe(2);
    expect(countWords("")).toBe(0);
    expect(countWords("   ")).toBe(0);
  });
});

describe("when disabled", () => {
  it("is done immediately with no animation", () => {
    const { result } = renderHook(() => useWordReveal("a b c", false));
    expect(result.current.done).toBe(true);
    expect(result.current.animate).toBe(false);
  });
});

describe("stagger", () => {
  // A short reply would otherwise flash past: 700/3 exceeds the ceiling, so
  // the ceiling wins.
  it("caps the per-word step for short replies", () => {
    const { result } = renderHook(() => useWordReveal("one two three", true));
    expect(result.current.staggerMs).toBe(45);
  });

  // The point of a budget rather than a fixed delay: a long answer compresses
  // instead of taking ten seconds to arrive.
  it("compresses the step so long replies stay inside the budget", () => {
    const long = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    const { result } = renderHook(() => useWordReveal(long, true));

    expect(result.current.staggerMs).toBeCloseTo(700 / 200, 5);
    // Total reveal = stagger * (words - 1) + fade, i.e. under a second.
    expect(result.current.staggerMs * 199).toBeLessThanOrEqual(700);
  });

  it("never exceeds the budget however long the answer", () => {
    for (const n of [1, 5, 50, 500, 2000]) {
      const text = Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
      const { result } = renderHook(() => useWordReveal(text, true));
      expect(result.current.staggerMs * Math.max(n - 1, 0)).toBeLessThanOrEqual(700);
    }
  });
});

describe("completion", () => {
  it("stays pending until the last word has faded, then fires onDone once", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useWordReveal("one two three", true, onDone));

    expect(result.current.done).toBe(false);
    expect(onDone).not.toHaveBeenCalled();

    // stagger 45 x 2 gaps + 240ms fade = 330ms.
    act(() => {
      vi.advanceTimersByTime(320);
    });
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current.done).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  // The old typewriter re-rendered ~55 times a second; this is the whole
  // point of the rewrite.
  it("flips done exactly once, with no per-frame state in between", () => {
    let renders = 0;
    renderHook(() => {
      renders++;
      return useWordReveal("a fairly ordinary length of reply here", true);
    });

    const afterMount = renders;
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(renders - afterMount).toBe(1);
  });

  // An inline arrow from the caller must not restart the reveal.
  it("does not restart when onDone changes identity", () => {
    const { result, rerender } = renderHook(
      ({ cb }: { cb: () => void }) => useWordReveal("one two three", true, cb),
      { initialProps: { cb: () => {} } },
    );

    act(() => {
      vi.advanceTimersByTime(340);
    });
    expect(result.current.done).toBe(true);

    rerender({ cb: () => {} });
    expect(result.current.done).toBe(true);
  });
});

describe("reduced motion", () => {
  // WCAG 2.3.3 — the reveal is decorative, so honour the OS setting and just
  // show the answer.
  it("shows the answer at once and reports done", () => {
    stubReducedMotion(true);
    const onDone = vi.fn();
    const { result } = renderHook(() => useWordReveal("one two three", true, onDone));

    expect(result.current.animate).toBe(false);
    expect(result.current.done).toBe(true);
  });
});
