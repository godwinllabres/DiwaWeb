import { useId } from "react";

/**
 * Sevi's avatar — rendered from the official Sevi asset geometry
 * (sevi-asset/exports/states/*.svg): a CvSU-green head with a cream face-plate,
 * a mortarboard and a gold tassel. Four expressions map to how Sevi answers.
 *
 * Inlined as SVG (rather than <img>) so the idle animation can move sub-parts:
 * the eyes live in `.sevi-eyes` (blink) and the tassel in `.sevi-tassel` (sway),
 * with the whole mark floating — see the `.sevi-animated` rules in index.css.
 * Gradient ids are per-instance so multiple avatars don't collide.
 */

export type SeviExpression = "answering" | "greeting" | "thinking" | "careful";

/* Per-state eyes (in a `.sevi-eyes` group so blink scales only the eyes) + mouth. */
function face(expression: SeviExpression): React.ReactNode {
  switch (expression) {
    case "greeting":
      return (
        <>
          <g className="sevi-eyes">
            <path d="M166 224 Q176 214 186 224" fill="none" stroke="#0A2417" strokeWidth="6" strokeLinecap="round" />
            <path d="M214 224 Q224 214 234 224" fill="none" stroke="#0A2417" strokeWidth="6" strokeLinecap="round" />
          </g>
          <path d="M170 244 Q200 250 230 244 Q226 276 200 278 Q174 276 170 244 Z" fill="#0A2417" />
          <path d="M188 268 Q200 263 212 268 Q210 280 200 280 Q190 280 188 268 Z" fill="#E86A5C" />
        </>
      );
    case "thinking":
      return (
        <>
          <g className="sevi-eyes">
            <circle cx="176" cy="217" r="9" fill="#0A2417" />
            <circle cx="224" cy="217" r="9" fill="#0A2417" />
            <circle cx="178" cy="213" r="2.6" fill="#FBF7EC" />
            <circle cx="226" cy="213" r="2.6" fill="#FBF7EC" />
          </g>
          <path d="M188 255 Q200 250 212 255" fill="none" stroke="#0A2417" strokeWidth="6" strokeLinecap="round" />
          <path d="M252 176 L255 187 L266 190 L255 193 L252 204 L249 193 L238 190 L249 187 Z" fill="#F4C95D" />
        </>
      );
    case "careful":
      return (
        <>
          <g className="sevi-eyes">
            <circle cx="176" cy="222" r="9.5" fill="#0A2417" />
            <circle cx="179" cy="219" r="3" fill="#FBF7EC" />
            <path d="M214 224 Q224 216 234 224" fill="none" stroke="#0A2417" strokeWidth="5.5" strokeLinecap="round" />
          </g>
          <path d="M178 248 Q200 262 222 248" fill="none" stroke="#0A2417" strokeWidth="7" strokeLinecap="round" />
        </>
      );
    default: // answering
      return (
        <>
          <g className="sevi-eyes">
            <circle cx="176" cy="222" r="9.5" fill="#0A2417" />
            <circle cx="224" cy="222" r="9.5" fill="#0A2417" />
            <circle cx="179" cy="219" r="3" fill="#FBF7EC" />
            <circle cx="227" cy="219" r="3" fill="#FBF7EC" />
          </g>
          <path d="M172 250 A 30 30 0 0 0 228 250 Z" fill="#0A2417" />
        </>
      );
  }
}

interface SeviAvatarProps {
  readonly expression?: SeviExpression;
  readonly className?: string;
  readonly title?: string;
  /** Enable idle motion (float + blink + tassel sway). Respects prefers-reduced-motion. */
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
  const hg = `sevi-hg-${gid}`;
  const cg = `sevi-cg-${gid}`;
  const fg = `sevi-fg-${gid}`;
  const cls = [animated ? "sevi-animated" : "", className].filter(Boolean).join(" ") || undefined;
  const style = animated ? ({ "--sevi-delay": delayFromId(gid) } as React.CSSProperties) : undefined;
  return (
    <svg viewBox="0 0 400 400" className={cls} style={style} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={hg} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#1E8A5A" />
          <stop offset="0.55" stopColor="#0C6B45" />
          <stop offset="1" stopColor="#073D28" />
        </linearGradient>
        <linearGradient id={cg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#123A26" />
          <stop offset="1" stopColor="#08281A" />
        </linearGradient>
        <radialGradient id={fg} cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#FFFDF6" />
          <stop offset="1" stopColor="#FBF7EC" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="366" rx="96" ry="18" fill="#073D28" opacity="0.28" />
      <circle cx="200" cy="228" r="118" fill={`url(#${hg})`} />
      <circle cx="200" cy="228" r="118" fill="none" stroke="#052A1C" strokeWidth="2" opacity="0.35" />
      <circle cx="200" cy="232" r="93" fill={`url(#${fg})`} />
      <ellipse cx="158" cy="252" rx="13" ry="9" fill="#EE9F97" opacity="0.55" />
      <ellipse cx="242" cy="252" rx="13" ry="9" fill="#EE9F97" opacity="0.55" />
      {face(expression)}
      <path d="M148 122 Q 200 100 258 122 L 250 154 Q 200 168 152 154 Z" fill={`url(#${cg})`} />
      <polygon points="110,112 214,84 300,114 196,144" fill={`url(#${cg})`} />
      <polygon points="110,112 214,84 300,114 196,144" fill="none" stroke="#052A1C" strokeWidth="1.5" opacity="0.4" />
      <circle cx="205" cy="114" r="6" fill="#E8B44A" />
      <g className="sevi-tassel">
        <path d="M205 114 L298 115 L298 172" fill="none" stroke="#E8B44A" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M298 172 l-6 22 M298 172 l0 24 M298 172 l6 22" stroke="#F4C95D" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <circle cx="298" cy="171" r="5.5" fill="#F4C95D" />
        <circle cx="298" cy="200" r="6.5" fill="#E8B44A" />
      </g>
    </svg>
  );
}
