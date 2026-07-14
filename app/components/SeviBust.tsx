import { useId } from "react";

/**
 * SeviBust — the full uniformed portrait of Sevi: a skin-tone face under a
 * salakot bearing the real CvSU seal, over a green uniform with a gold
 * chin-chain, a green cord bow, and the "SEVI" name tag. This is the hero
 * showcase; the compact inline mark is `SeviAvatar`. Built from flat basic
 * shapes (see docs/mascot/) so it reads hand-made rather than AI-rendered.
 *
 * Idle motion reuses the shared `.sevi-animated` rules (float + `.sevi-eyes`
 * blink); see styles/index.css. The seal is the static `/cvsu-seal.png` asset.
 */

/** Stable 0–5s offset from the instance id so motion doesn't feel robotic. */
function delayFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + (id.codePointAt(i) ?? 0)) & 0xffff;
  return `-${(h % 50) / 10}s`;
}

interface SeviBustProps {
  readonly className?: string;
  readonly title?: string;
  /** Enable idle motion (float + blink). Respects prefers-reduced-motion. */
  readonly animated?: boolean;
}

export function SeviBust({ className, title = "Sevi", animated = false }: SeviBustProps) {
  const gid = useId();
  const cls = [animated ? "sevi-animated" : "", className].filter(Boolean).join(" ") || undefined;
  const style = animated ? ({ "--sevi-delay": delayFromId(gid) } as React.CSSProperties) : undefined;
  return (
    <svg viewBox="0 0 200 238" className={cls} style={style} role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="231" rx="58" ry="7" fill="#073D28" opacity="0.16" />

      {/* green uniform bust */}
      <path d="M22 236 L22 200 Q22 160 74 153 Q100 149 126 153 Q178 160 178 200 L178 236 Z"
        fill="#0C6B45" stroke="#0A2417" strokeWidth="3" strokeLinejoin="round" />
      <path d="M22 200 Q22 160 74 153 Q100 149 126 153 Q178 160 178 200"
        fill="none" stroke="#F4C95D" strokeWidth="2.2" opacity="0.75" />

      {/* neck + ears + skin-tone face */}
      <path d="M86 132 L114 132 L114 152 Q100 160 86 152 Z" fill="#F1CFA8" stroke="#BC844F" strokeWidth="2" />
      <circle cx="55" cy="108" r="8" fill="#F1CFA8" stroke="#BC844F" strokeWidth="2" />
      <circle cx="145" cy="108" r="8" fill="#F1CFA8" stroke="#BC844F" strokeWidth="2" />
      <circle cx="100" cy="106" r="47" fill="#F1CFA8" stroke="#BC844F" strokeWidth="2.6" />

      {/* hair tufts under the brim, brows, eyes, cheeks, smile */}
      <path d="M58 74 Q66 62 82 66 Q70 70 66 82 Z" fill="#2A1E12" />
      <path d="M142 74 Q134 62 118 66 Q130 70 134 82 Z" fill="#2A1E12" />
      <path d="M74 92 Q82 88 90 91" stroke="#2A1E12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M110 91 Q118 88 126 92" stroke="#2A1E12" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <g className="sevi-eyes">
        <circle cx="82" cy="104" r="7.5" fill="#0A2417" />
        <circle cx="118" cy="104" r="7.5" fill="#0A2417" />
        <circle cx="84.5" cy="101" r="2.4" fill="#FFFDF6" />
        <circle cx="120.5" cy="101" r="2.4" fill="#FFFDF6" />
      </g>
      <ellipse cx="70" cy="120" rx="9" ry="6" fill="#E8776B" opacity="0.4" />
      <ellipse cx="130" cy="120" rx="9" ry="6" fill="#E8776B" opacity="0.4" />
      <path d="M84 124 Q100 141 116 124 Q100 130 84 124 Z" fill="#0A2417" />
      <path d="M93 130 Q100 127 107 130 Q104 136 100 136 Q96 136 93 130 Z" fill="#E8776B" />

      {/* jacket front: lapels, gold chin-chain, cord bow, name tag */}
      <path d="M76 152 L100 190 L100 152 Z" fill="#0E3A24" />
      <path d="M124 152 L100 190 L100 152 Z" fill="#0E3A24" />
      <path d="M76 152 L100 190 L124 152" fill="none" stroke="#F4C95D" strokeWidth="2" opacity="0.8" />
      <path d="M60 150 Q100 196 140 150" fill="none" stroke="#E0A93C" strokeWidth="6.5" strokeLinecap="round" />
      <path d="M60 150 Q100 196 140 150" fill="none" stroke="#F4C95D" strokeWidth="5" strokeLinecap="round" strokeDasharray="1.6 3.6" />
      <g fill="#0C6B45" stroke="#0A2417" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M100 159 q-10 -5 -13 3 q-2 7 6 6 q5 -1 7 -9 Z" />
        <path d="M100 159 q10 -5 13 3 q2 7 -6 6 q-5 -1 -7 -9 Z" />
        <circle cx="100" cy="160" r="3.4" />
      </g>
      <text x="100" y="218" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="1.6"
        fill="#F4C95D" fontFamily="system-ui, sans-serif">SEVI</text>

      {/* salakot: brim + cone + the real CvSU seal */}
      <ellipse cx="100" cy="66" rx="60" ry="12" fill="#FBF7EC" stroke="#0A2417" strokeWidth="3" />
      <path d="M100 12 L156 66 Q100 78 44 66 Z" fill="#FBF7EC" stroke="#0A2417" strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 12 L128 39 M100 12 L72 39" stroke="#0E3A24" strokeWidth="2.4" opacity="0.5" fill="none" />
      <image href="/cvsu-seal.png" x="79" y="24" width="42" height="37.5" />
    </svg>
  );
}
