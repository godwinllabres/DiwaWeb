import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTypewriter } from "@/lib/hooks/useTypewriter";

describe("useTypewriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the full message immediately when not enabled", () => {
    const { result } = renderHook(() => useTypewriter("hello", false));
    expect(result.current.displayed).toBe("hello");
    expect(result.current.done).toBe(true);
  });

  it("starts empty and reveals characters when enabled", () => {
    const { result } = renderHook(() => useTypewriter("abc", true, undefined, 10));
    expect(result.current.displayed).toBe("");
    expect(result.current.done).toBe(false);

    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.displayed).toBe("a");

    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current.displayed).toBe("abc");
    expect(result.current.done).toBe(true);
  });

  it("calls onDone exactly once when finished", () => {
    const onDone = vi.fn();
    renderHook(() => useTypewriter("hi", true, onDone, 5));

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("clears the interval on unmount", () => {
    const onDone = vi.fn();
    const { unmount } = renderHook(() => useTypewriter("long-message", true, onDone, 10));

    unmount();
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onDone).not.toHaveBeenCalled();
  });

  it("restarts when message changes", () => {
    const { result, rerender } = renderHook(
      ({ msg }: { msg: string }) => useTypewriter(msg, true, undefined, 5),
      { initialProps: { msg: "first" } }
    );

    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current.done).toBe(true);

    rerender({ msg: "second" });
    expect(result.current.displayed).toBe("");
    expect(result.current.done).toBe(false);
  });
});
