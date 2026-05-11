import { useCallback, useRef, useState, type RefObject } from "react";

export interface SmartScrollApi {
  containerRef: RefObject<HTMLDivElement>;
  endRef: RefObject<HTMLDivElement>;
  scrollToBottom: (force?: boolean) => void;
  onScroll: () => void;
  showScrollDown: boolean;
  hasNewMessage: boolean;
  notifyNewMessage: (fromUser: boolean) => void;
}

export function useSmartScroll(thresholdPx = 80): SmartScrollApi {
  const containerRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const endRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const userScrolledUpRef = useRef(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const scrollToBottom = useCallback(
    (force = false) => {
      if (!force && userScrolledUpRef.current) return;
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setShowScrollDown(false);
      setHasNewMessage(false);
    },
    []
  );

  const onScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < thresholdPx;
    userScrolledUpRef.current = !nearBottom;
    setShowScrollDown(!nearBottom);
    if (nearBottom) setHasNewMessage(false);
  }, [thresholdPx]);

  const notifyNewMessage = useCallback(
    (fromUser: boolean) => {
      if (fromUser || !userScrolledUpRef.current) {
        scrollToBottom(true);
      } else {
        setHasNewMessage(true);
      }
    },
    [scrollToBottom]
  );

  return {
    containerRef,
    endRef,
    scrollToBottom,
    onScroll,
    showScrollDown,
    hasNewMessage,
    notifyNewMessage,
  };
}
