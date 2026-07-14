import { useId } from "react";

/**
 * Sevi's avatar — flat, geometric mark: a CvSU-green head with a cream face,
 * a salakot bearing the real CvSU seal, and a small gold tassel. Four
 * expressions map to how Sevi answers. The full uniformed portrait lives in
 * `SeviBust`; this compact head is what appears inline (header, chat, typing).
 *
 * Inlined as SVG (rather than <img>) so the idle animation can move sub-parts:
 * the eyes live in `.sevi-eyes` (blink) and the tassel in `.sevi-tassel` (sway),
 * with the whole mark floating — see the `.sevi-animated` rules in index.css.
 * The seal is a static asset (`/cvsu-seal.png`) so it isn't re-encoded per SVG.
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
  const cls = [animated ? "sevi-animated" : "", className].filter(Boolean).join(" ") || undefined;
  const style = animated ? ({ "--sevi-delay": delayFromId(gid) } as React.CSSProperties) : undefined;
  return (
    <svg viewBox="0 0 400 400" className={cls} style={style} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="200" cy="366" rx="96" ry="18" fill="#073D28" opacity="0.22" />

      {/* head + cream face */}
      <circle cx="200" cy="228" r="118" fill="#0C6B45" stroke="#0A2417" strokeWidth="3" />
      <circle cx="200" cy="232" r="93" fill="#FBF7EC" stroke="#0A2417" strokeWidth="2.4" />
      <ellipse cx="158" cy="252" rx="13" ry="9" fill="#E8776B" opacity="0.45" />
      <ellipse cx="242" cy="252" rx="13" ry="9" fill="#E8776B" opacity="0.45" />
      {face(expression)}

      {/* salakot: brim + cone + the real CvSU seal */}
      <ellipse cx="200" cy="150" rx="132" ry="28" fill="#FBF7EC" stroke="#0A2417" strokeWidth="3" />
      <path d="M200 58 L332 150 Q200 162 68 150 Z" fill="#FBF7EC" stroke="#0A2417" strokeWidth="3" strokeLinejoin="round" />
      <path d="M200 58 L268 128 M200 58 L132 128" stroke="#0E3A24" strokeWidth="3" opacity="0.4" fill="none" />
      <image href="/cvsu-seal.png" x="151" y="75" width="98" height="87" />

      {/* gold tassel — sways in idle */}
      <g className="sevi-tassel">
        <path d="M300 150 L316 154 L322 196" fill="none" stroke="#E0A93C" strokeWidth="5" strokeLinecap="round" />
        <path d="M322 196 l-6 22 M322 196 l0 24 M322 196 l6 22" stroke="#F4C95D" strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle cx="322" cy="195" r="6" fill="#F4C95D" />
        <circle cx="322" cy="224" r="7" fill="#E0A93C" />
      </g>
    </svg>
  );
}
