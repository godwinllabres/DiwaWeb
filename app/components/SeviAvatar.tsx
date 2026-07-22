import { useId } from "react";

/**
 * Sevi's avatar — the official "sevi v2" vector mark (public/sevi-avatar.svg),
 * used everywhere Sevi's likeness appears (header, chat, landing hero).
 * Expressive moments (typing, fallback, landing showcase) use the animated
 * sticker set instead — see SeviSticker.
 *
 * `.sevi-animated` (see index.css) adds idle floating motion; it respects
 * prefers-reduced-motion.
 */

const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

interface SeviAvatarProps {
  readonly className?: string;
  readonly title?: string;
  /** Enable idle motion (float). Respects prefers-reduced-motion. */
  readonly animated?: boolean;
}

/** Stable 0–5s offset from the instance id so a stack of avatars desyncs. */
function delayFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + (id.codePointAt(i) ?? 0)) & 0xffff;
  return `-${(h % 50) / 10}s`;
}

export function SeviAvatar({ className, title = "Sevi", animated = false }: SeviAvatarProps) {
  const gid = useId();
  const cls = [animated ? "sevi-animated" : "", className].filter(Boolean).join(" ") || undefined;
  const style = animated ? ({ "--sevi-delay": delayFromId(gid) } as React.CSSProperties) : undefined;
  return (
    <img
      src={`${BASE_URL}sevi-avatar.svg`}
      alt={title}
      className={cls}
      style={style}
    />
  );
}
