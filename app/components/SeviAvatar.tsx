import { useId } from "react";

/**
 * Sevi's avatar — the animated mascot GIF (public/sevi-avatar.gif), used
 * everywhere Sevi's likeness appears (header, chat, typing, landing hero).
 *
 * `.sevi-animated` (see index.css) adds idle floating motion on top of the
 * GIF's own built-in loop; it's the same rule the old hand-drawn SVG used,
 * so it still respects prefers-reduced-motion.
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
      src={`${BASE_URL}sevi-avatar.gif`}
      alt={title}
      className={cls}
      style={style}
    />
  );
}
