import { useEffect, useRef, useState } from "react";

export interface TypewriterState {
  displayed: string;
  done: boolean;
}

export function useTypewriter(
  message: string,
  enabled: boolean,
  onDone?: () => void,
  charDelayMs = 18,
  charsPerTick = 4
): TypewriterState {
  // The typewriter is purely cosmetic, so a missing/undefined message must
  // never crash rendering (a bot message can arrive without text). Coerce to
  // an empty string rather than reading `.length` off undefined.
  message = message ?? "";
  const [displayed, setDisplayed] = useState(enabled ? "" : message);
  const [done, setDone] = useState(!enabled);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(message);
      setDone(true);
      return;
    }

    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current = Math.min(indexRef.current + charsPerTick, message.length);
      setDisplayed(message.slice(0, indexRef.current));
      if (indexRef.current >= message.length) {
        clearInterval(interval);
        setDone(true);
        onDone?.();
      }
    }, charDelayMs);

    return () => clearInterval(interval);
  }, [message, enabled, charDelayMs, charsPerTick]);

  return { displayed, done };
}
