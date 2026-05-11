import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSmartScroll } from "@/lib/hooks/useSmartScroll";

function attachContainer(api: ReturnType<typeof useSmartScroll>, scrollHeight: number, scrollTop: number, clientHeight: number) {
  const el = {
    scrollHeight,
    scrollTop,
    clientHeight,
  } as HTMLDivElement;
  // @ts-expect-error - test mutation of refs
  api.containerRef.current = el;

  const endEl = { scrollIntoView: vi.fn() } as unknown as HTMLDivElement;
  // @ts-expect-error - test mutation of refs
  api.endRef.current = endEl;
  return { el, endEl };
}

describe("useSmartScroll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with showScrollDown=false and hasNewMessage=false", () => {
    const { result } = renderHook(() => useSmartScroll());
    expect(result.current.showScrollDown).toBe(false);
    expect(result.current.hasNewMessage).toBe(false);
  });

  it("sets showScrollDown=true when user scrolls up", () => {
    const { result } = renderHook(() => useSmartScroll(80));
    attachContainer(result.current, 1000, 0, 500);

    act(() => {
      result.current.onScroll();
    });

    expect(result.current.showScrollDown).toBe(true);
  });

  it("clears showScrollDown when scrolled near bottom", () => {
    const { result } = renderHook(() => useSmartScroll(80));
    attachContainer(result.current, 1000, 950, 50);

    act(() => {
      result.current.onScroll();
    });

    expect(result.current.showScrollDown).toBe(false);
  });

  it("notifyNewMessage(true) for user messages always scrolls", () => {
    const { result } = renderHook(() => useSmartScroll());
    const { endEl } = attachContainer(result.current, 1000, 0, 500);

    // Simulate user scrolled up
    act(() => result.current.onScroll());

    act(() => result.current.notifyNewMessage(true));

    expect(endEl.scrollIntoView).toHaveBeenCalled();
  });

  it("notifyNewMessage(false) sets hasNewMessage when user is scrolled up", () => {
    const { result } = renderHook(() => useSmartScroll());
    attachContainer(result.current, 1000, 0, 500);

    act(() => result.current.onScroll());
    act(() => result.current.notifyNewMessage(false));

    expect(result.current.hasNewMessage).toBe(true);
  });

  it("scrollToBottom(force=true) bypasses user-scrolled-up state", () => {
    const { result } = renderHook(() => useSmartScroll());
    const { endEl } = attachContainer(result.current, 1000, 0, 500);

    act(() => result.current.onScroll());
    act(() => result.current.scrollToBottom(true));

    expect(endEl.scrollIntoView).toHaveBeenCalled();
    expect(result.current.showScrollDown).toBe(false);
  });
});
