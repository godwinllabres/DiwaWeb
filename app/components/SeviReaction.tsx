/**
 * SeviReaction — a full-character Sevi sticker for one of 11 reactions
 * (the auto-traced sevi-asset exports in public/sevi-reactions/). Unlike
 * `SeviAvatar`'s flat hand-drawn head, these are vtraced from the AI-rendered
 * animated sticker set (scripts/vectorize_gifs.py), so they keep the shaded,
 * illustrated look and a baked-in caption.
 */

const BASE_URL = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";

export type SeviReactionKey =
  | "approve"
  | "cheerup"
  | "confuse"
  | "excited"
  | "happy"
  | "idea"
  | "listening"
  | "love"
  | "ok"
  | "sleepy"
  | "thinking";

interface SeviReactionProps {
  readonly reaction: SeviReactionKey;
  readonly className?: string;
  readonly title?: string;
}

export function SeviReaction({ reaction, className, title }: SeviReactionProps) {
  return (
    <img
      src={`${BASE_URL}sevi-reactions/sevi-${reaction}.svg`}
      alt={title ?? `Sevi ${reaction}`}
      className={className}
      loading="lazy"
    />
  );
}
