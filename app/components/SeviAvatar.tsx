import { useId } from "react";

/**
 * Sevi's avatar — Concept A "scholar-orb": a rounded CvSU-green head with a
 * cream face-plate, a tilted mortarboard and a gold tassel. One character,
 * four expressions that map to how Sevi answers (see the avatar design system).
 *
 * Renders as a self-contained SVG (its own head + cap), so drop it straight
 * into a sized box — no green circle wrapper needed. Sized via `className`
 * (e.g. "h-8 w-8"); the gradient id is per-instance so multiples don't clash.
 */

export type SeviExpression = "answering" | "greeting" | "thinking" | "careful";

/* Eyes live in a `.sevi-eyes` group so the blink animation can scale just the
   eyes; the mouth and any brows/spark sit outside it. */
const FACE: Record<SeviExpression, React.ReactNode> = {
  answering: (
    <>
      <g className="sevi-eyes">
        <circle cx="83" cy="112" r="7" fill="#0E2A1E" />
        <circle cx="117" cy="112" r="7" fill="#0E2A1E" />
        <circle cx="85.4" cy="109.4" r="2.2" fill="#FBF7EC" />
        <circle cx="119.4" cy="109.4" r="2.2" fill="#FBF7EC" />
      </g>
      <path d="M82 128 Q100 145 118 128" fill="none" stroke="#0E2A1E" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  greeting: (
    <>
      <g className="sevi-eyes">
        <path d="M75 114 Q83 105 91 114" fill="none" stroke="#0E2A1E" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M109 114 Q117 105 125 114" fill="none" stroke="#0E2A1E" strokeWidth="4.6" strokeLinecap="round" />
      </g>
      <path d="M79 125 Q100 151 121 125 Z" fill="#0E2A1E" />
      <path d="M90 133 Q100 141 110 133 Z" fill="#E27F84" />
    </>
  ),
  thinking: (
    <>
      <g className="sevi-eyes">
        <circle cx="84" cy="109" r="6.6" fill="#0E2A1E" />
        <circle cx="118" cy="109" r="6.6" fill="#0E2A1E" />
        <circle cx="86.2" cy="106.6" r="2" fill="#FBF7EC" />
        <circle cx="120.2" cy="106.6" r="2" fill="#FBF7EC" />
      </g>
      <path d="M77 99 Q84 96 91 99" fill="none" stroke="#0E2A1E" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
      <path d="M111 99 Q118 96 125 99" fill="none" stroke="#0E2A1E" strokeWidth="2.6" strokeLinecap="round" opacity="0.8" />
      <path d="M104 133 Q112 130 118 134" fill="none" stroke="#0E2A1E" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M150 34 l2.4 6.4 6.4 2.4 -6.4 2.4 -2.4 6.4 -2.4 -6.4 -6.4 -2.4 6.4 -2.4 z" fill="#F4C95D" />
    </>
  ),
  careful: (
    <>
      <g className="sevi-eyes">
        <path d="M76 111 Q83 117 90 111" fill="#0E2A1E" />
        <path d="M110 111 Q117 117 124 111" fill="#0E2A1E" />
      </g>
      <path d="M84 132 Q100 138 116 132" fill="none" stroke="#0E2A1E" strokeWidth="4.4" strokeLinecap="round" />
    </>
  ),
};

interface SeviAvatarProps {
  readonly expression?: SeviExpression;
  readonly className?: string;
  readonly title?: string;
  /** Enable idle motion (blink + tassel sway). Respects prefers-reduced-motion. */
  readonly animated?: boolean;
}

/** Stable 0–5s offset from the instance id so a stack of avatars desyncs. */
function delayFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + (id.codePointAt(i) ?? 0)) & 0xffff;
  return `-${(h % 50) / 10}s`;
}

export function SeviAvatar({ expression = "answering", className, title = "Sevi", animated = false }: SeviAvatarProps) {
  const gid = useId();
  const headGrad = `sevi-head-${gid}`;
  const cls = [animated ? "sevi-animated" : "", className].filter(Boolean).join(" ") || undefined;
  const style = animated ? ({ "--sevi-delay": delayFromId(gid) } as React.CSSProperties) : undefined;
  return (
    <svg viewBox="0 0 200 200" className={cls} style={style} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={headGrad} cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#1E8A5A" />
          <stop offset="100%" stopColor="#0A5A3A" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="112" r="60" fill={`url(#${headGrad})`} />
      <circle cx="100" cy="112" r="59" fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2" />
      <ellipse cx="100" cy="118" rx="43" ry="39" fill="#FBF7EC" />
      <circle cx="71" cy="127" r="8" fill="#E8B44A" opacity="0.26" />
      <circle cx="129" cy="127" r="8" fill="#E8B44A" opacity="0.26" />
      {FACE[expression]}
      <g>
        <path d="M63 66 Q100 85 137 66 L133 57 Q100 74 67 57 Z" fill="#0E2A1E" />
        <polygon points="100,29 147,52 100,75 53,52" fill="#0F3325" />
        <polygon points="100,29 147,52 100,75 53,52" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1.4" />
        <circle cx="100" cy="52" r="4.4" fill="#E8B44A" />
        <g className="sevi-tassel">
          <path d="M100 52 Q139 53 141 62 L141 80" fill="none" stroke="#E8B44A" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="141" cy="82" r="4.6" fill="#F4C95D" />
          <path d="M138 84 L137 95 M141 85 L141 97 M144 84 L145 95" stroke="#E8B44A" strokeWidth="2.3" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}
