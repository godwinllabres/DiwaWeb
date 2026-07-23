// Reusable chat-message renderer — the single source of truth for how Sevi's
// replies are displayed everywhere the chat appears (the phone widget iframe,
// the tablet panel, and the desktop full-screen shell all render through this).
//
// Responsibilities:
//   • inline formatting — URLs, [md](links), **bold**, `code`, C:\paths
//   • de-shouting — calm the knowledge base's ALL-CAPS pseudo-formatting
//   • block structure — paragraphs, numbered steps (green badges), nested
//     bullets (green dots), and short ALL-CAPS headings (green, accent bar)
//
// Keeping this out of ChatMessage guarantees the widget and full-screen views
// can never drift apart, and lets the pure helpers be unit-tested directly.

import type { ContentBlock } from "@/lib/api";

// ── inline text formatting ────────────────────────────────────────────────────

type SegKind = "text" | "url" | "bold" | "code" | "path" | "mdlink";
interface Seg { id: number; k: SegKind; v: string; href?: string }

// Markdown link is matched first so a bare-URL inside [text](url) doesn't
// get captured by the standalone URL alternative.
const SEG_RE =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(\*\*(.+?)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s<>"]+)|([A-Za-z]:\\[^\s<>"]+)/g;

function parseSegments(text: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  SEG_RE.lastIndex = 0;

  while ((m = SEG_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ id: n++, k: "text", v: text.slice(last, m.index) });

    if (m[1])      out.push({ id: n++, k: "mdlink", v: m[1], href: m[2] });
    else if (m[3]) out.push({ id: n++, k: "bold", v: m[4] });
    else if (m[5]) out.push({ id: n++, k: "code", v: m[6] });
    else if (m[7]) out.push({ id: n++, k: "url",  v: m[7] });
    else if (m[8]) out.push({ id: n++, k: "path", v: m[8] });

    last = m.index + m[0].length;
  }

  if (last < text.length) out.push({ id: n++, k: "text", v: text.slice(last) });
  return out;
}

// ── de-shout ALL-CAPS pseudo-formatting ───────────────────────────────────────
// The knowledge base marks headers and emphasis in ALL CAPS ("PREPARE THESE
// DOCUMENTS", "FILE THE ONLINE APPLICATION"). Rendered verbatim it reads as
// shouting. We lower such text to sentence case — but conservatively, so real
// acronyms are never harmed:
//   • a run of 2+ adjacent caps words is always calmed (clearly emphasis), and
//   • a lone caps word is calmed only when it's 4+ letters (PRINT, PAYMENT).
// Lone tokens of ≤3 letters (GWA, PWD, LTS), anything in KEEP_ACRONYMS, and any
// token bearing a digit or lowercase letter (CvSU, RA 10931) pass through
// untouched. Inline spans matched by SEG_RE — URLs, `code`, **bold**, C:\paths,
// [md](links) — are skipped entirely, so their casing is preserved.
const KEEP_ACRONYMS = new Set([
  "CVSU", "NOA", "COR", "RA", "SUC", "SUCS", "TES", "CHED", "DOST", "SEI",
  "LGU", "OSAS", "GPA", "GWA", "STEM", "CS", "IT", "SHS", "BS", "NCAE",
  "UACS", "PWD", "ID", "OJT", "NBC", "NSTP", "CWTS", "ROTC", "COA", "CSC",
  "PRC", "TESDA", "GSIS", "DV", "HRIS", "AIS", "OSA", "URS", "TOR",
]);

const lettersOf = (w: string) => w.replace(/[^A-Za-z]/g, "");
const isAllCapsWord = (w: string) => {
  const L = lettersOf(w);
  return L.length >= 2 && !/[a-z]/.test(w) && L === L.toUpperCase();
};
const shouldCalm = (w: string) =>
  isAllCapsWord(w) && !/\d/.test(w) && !KEEP_ACRONYMS.has(lettersOf(w).toUpperCase());
// A caps word for RUN detection excludes digit-bearing tokens, so a time range
// like "AM–6 PM" isn't read as a shouting run (which would calm the lone "PM").
const isRunCaps = (w: string) => isAllCapsWord(w) && !/\d/.test(w);

// De-shout the plain-text portion between inline spans.
function deshoutPlain(text: string): string {
  const parts = text.split(/(\s+)/);
  const wordIdx: number[] = [];
  parts.forEach((p, i) => {
    if (p && !/^\s+$/.test(p)) wordIdx.push(i);
  });
  // Mark words that sit inside a run of 2+ consecutive caps words.
  const inRun = new Set<number>();
  for (let k = 0; k < wordIdx.length; ) {
    if (isRunCaps(parts[wordIdx[k]])) {
      let j = k;
      while (j < wordIdx.length && isRunCaps(parts[wordIdx[j]])) j++;
      if (j - k >= 2) for (let x = k; x < j; x++) inRun.add(wordIdx[x]);
      k = j;
    } else {
      k++;
    }
  }
  // Capitalize the first calmed word of each maximal calmed span; whitespace
  // keeps the span open so "FILE THE" → "File the", not "File The".
  let calmedPrev = false;
  return parts
    .map((p, i) => {
      if (!p || /^\s+$/.test(p)) return p;
      const lone = !inRun.has(i) && lettersOf(p).length >= 4;
      const doCalm = shouldCalm(p) && (inRun.has(i) || lone);
      if (!doCalm) {
        calmedPrev = false;
        return p;
      }
      const low = p.toLowerCase();
      const out = calmedPrev ? low : low.replace(/[a-z]/, (c) => c.toUpperCase());
      calmedPrev = true;
      return out;
    })
    .join("");
}

// Calm shouting text while leaving URLs / code / bold / paths / md-links intact.
export function deshout(text: string): string {
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  SEG_RE.lastIndex = 0;
  while ((m = SEG_RE.exec(text)) !== null) {
    if (m.index > last) out += deshoutPlain(text.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  if (last < text.length) out += deshoutPlain(text.slice(last));
  return out;
}

function FormattedText({
  text,
  done,
  isBot,
}: {
  readonly text: string;
  readonly done: boolean;
  readonly isBot: boolean;
}) {
  const segs = parseSegments(text);
  const linkCls = isBot
    ? "underline underline-offset-2 text-green-700 font-medium break-all hover:text-green-800"
    : "underline underline-offset-2 text-white/90 font-medium break-all";
  // Markdown links carry human-readable labels, so wrap at word
  // boundaries instead of mid-character like raw-URL links do.
  const mdLinkCls = isBot
    ? "underline underline-offset-2 text-green-700 font-medium hover:text-green-800"
    : "underline underline-offset-2 text-white/90 font-medium";
  const codeCls = isBot
    ? "bg-gray-200/80 text-gray-800 rounded px-1 py-0.5 text-[0.82em] font-mono"
    : "bg-white/20 text-white rounded px-1 py-0.5 text-[0.82em] font-mono";
  const pathCls = isBot
    ? "bg-gray-200/80 text-gray-700 rounded px-1 py-0.5 text-[0.82em] font-mono"
    : "bg-white/20 text-white/90 rounded px-1 py-0.5 text-[0.82em] font-mono";

  return (
    <>
      {segs.map((seg) => {
        switch (seg.k) {
          case "url":
            return (
              <a key={seg.id} href={seg.v} target="_blank" rel="noopener noreferrer" className={linkCls}>
                {seg.v}
              </a>
            );
          case "mdlink":
            return (
              <a key={seg.id} href={seg.href} target="_blank" rel="noopener noreferrer" className={mdLinkCls}>
                {seg.v}
              </a>
            );
          case "bold":
            return <strong key={seg.id} className="font-semibold">{seg.v}</strong>;
          case "code":
            return <code key={seg.id} className={codeCls}>{seg.v}</code>;
          case "path":
            return <span key={seg.id} className={pathCls}>{seg.v}</span>;
          default:
            return <span key={seg.id}>{seg.v}</span>;
        }
      })}
      {!done && (
        <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-gray-500 align-middle animate-pulse" />
      )}
    </>
  );
}

// ── block-level rendering ─────────────────────────────────────────────────────
// Splits a response into paragraphs, numbered lists, bulleted lists, and
// short ALL-CAPS headings so the bubble doesn't read like a wall of text.
// Inline content (URLs, bold, code) is still handled by FormattedText.

// The block kinds are the server's `ChatResponse.blocks` DTO (SeviAI
// api/response_blocks.py). When the API sends blocks we render them directly;
// parseBlocks is the local fallback, used for older payloads and — because the
// typewriter feeds this a growing prefix of the text — for partial reveals.
type Block = ContentBlock;

const OL_LINE_RE = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const UL_LINE_RE = /^\s*[-*•]\s+(.*)$/;
const HEADING_RE = /^[A-Z0-9][A-Z0-9 ,()\/&'’.:–—-]{2,}$/;
const NOTE_PREFIX_RE = /^(📖|ℹ️|⚠️|📌)\s*/;

export function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let paraBuf: string[] = [];
  let listBuf:
    | Extract<Block, { kind: "ordered_list" }>
    | Extract<Block, { kind: "bullet_list" }>
    | null = null;

  const flushPara = () => {
    if (!paraBuf.length) return;
    const text = paraBuf.join("\n").trim();
    paraBuf = [];
    if (!text) return;
    const note = NOTE_PREFIX_RE.exec(text);
    if (note) {
      blocks.push({ kind: "note", text: text.slice(note[0].length).trim(), icon: note[1] });
      return;
    }
    // Treat a single short ALL-CAPS line as a heading.
    if (!text.includes("\n") && text.length < 80 && HEADING_RE.test(text.replace(/:$/, ""))) {
      blocks.push({ kind: "heading", text: text.replace(/:$/, "").trim() });
    } else {
      blocks.push({ kind: "paragraph", text });
    }
  };
  const flushList = () => {
    if (listBuf) { blocks.push(listBuf); listBuf = null; }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (line.trim() === "") { flushPara(); flushList(); continue; }
    const ol = OL_LINE_RE.exec(line);
    const ul = !ol ? UL_LINE_RE.exec(line) : null;
    if (ol) {
      flushPara();
      const n = parseInt(ol[1], 10);
      if (listBuf?.kind !== "ordered_list") {
        flushList();
        listBuf = { kind: "ordered_list", items: [], start: n };
      }
      listBuf.items.push({ text: ol[2].trim(), subs: [] });
    } else if (ul) {
      flushPara();
      if (listBuf?.kind === "ordered_list" && listBuf.items.length > 0) {
        // A bullet directly under a numbered step nests inside it, instead of
        // detaching into its own flush-left list.
        listBuf.items[listBuf.items.length - 1].subs.push(ul[1].trim());
      } else {
        if (listBuf?.kind !== "bullet_list") { flushList(); listBuf = { kind: "bullet_list", items: [] }; }
        listBuf.items.push(ul[1].trim());
      }
    } else {
      flushList();
      paraBuf.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

export function MessageBody({
  text,
  done,
  isBot,
  blocks: serverBlocks,
}: {
  readonly text: string;
  readonly done: boolean;
  readonly isBot: boolean;
  /** Structure as decided by the API (`ChatResponse.blocks`). Preferred once
   *  the reveal has finished; mid-typewriter we still parse the prefix so the
   *  text appears progressively rather than all at once. */
  readonly blocks?: ContentBlock[];
}) {
  const blocks = done && serverBlocks?.length ? serverBlocks : parseBlocks(text);
  // Bot answers carry the ALL-CAPS pseudo-formatting from the knowledge base;
  // calm it. User messages are shown verbatim.
  const tx = isBot ? deshout : (s: string) => s;
  const lastIdx = blocks.length - 1;
  return (
    <>
      {blocks.map((b, i) => {
        const isLast = i === lastIdx;
        // Only the trailing block carries the typewriter cursor.
        const cursorDone = done || !isLast;
        switch (b.kind) {
          case "heading":
            return (
              <p
                key={i}
                className={`flex items-start gap-1.5 font-semibold ${isBot ? "text-green-800" : ""} ${i === 0 ? "mt-0" : "mt-2.5"} mb-1`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 inline-block h-3.5 w-1 flex-shrink-0 rounded-full ${isBot ? "bg-green-500" : "bg-white/60"}`}
                />
                <span className="min-w-0">
                  <FormattedText text={tx(b.text.replace(/:$/, ""))} done={cursorDone} isBot={isBot} />
                </span>
              </p>
            );
          case "ordered_list":
            return (
              <ol key={i} className="my-1.5 space-y-1.5 list-none pl-0">
                {b.items.map((it, j) => {
                  const itemLast = j === b.items.length - 1;
                  const hasSubs = it.subs.length > 0;
                  return (
                    <li key={j} className="relative pl-7">
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                          isBot ? "bg-green-100 text-green-700" : "bg-white/25 text-white"
                        }`}
                      >
                        {b.start + j}
                      </span>
                      <FormattedText
                        text={tx(it.text)}
                        // Cursor sits on the last visible text node only: skip
                        // this item if it isn't last, or if its sub-bullets
                        // will carry the cursor instead.
                        done={cursorDone || !itemLast || hasSubs}
                        isBot={isBot}
                      />
                      {hasSubs && (
                        <ul className="mt-1 space-y-1 list-none pl-1">
                          {it.subs.map((s, k) => (
                            <li key={k} className="relative pl-4">
                              <span
                                aria-hidden="true"
                                className={`absolute left-1 top-2 h-1.5 w-1.5 rounded-full ${
                                  isBot ? "bg-green-500" : "bg-white/70"
                                }`}
                              />
                              <FormattedText
                                text={tx(s)}
                                done={cursorDone || !itemLast || k !== it.subs.length - 1}
                                isBot={isBot}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            );
          case "bullet_list":
            return (
              <ul key={i} className="my-1.5 space-y-1 list-none pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="relative pl-4">
                    <span
                      aria-hidden="true"
                      className={`absolute left-1 top-2 h-1.5 w-1.5 rounded-full ${
                        isBot ? "bg-green-500" : "bg-white/70"
                      }`}
                    />
                    <FormattedText
                      text={tx(it)}
                      done={cursorDone || j !== b.items.length - 1}
                      isBot={isBot}
                    />
                  </li>
                ))}
              </ul>
            );
          case "note":
            // Provenance / advisory footnote — same content as before, set
            // apart from the answer body rather than reading as another
            // paragraph of it.
            return (
              <p
                key={i}
                className={`${i === 0 ? "mt-0" : "mt-2.5"} text-[0.85em] ${
                  isBot ? "text-gray-500" : "text-white/70"
                } break-words`}
              >
                {b.icon && <span aria-hidden="true" className="mr-1">{b.icon}</span>}
                <FormattedText text={tx(b.text)} done={cursorDone} isBot={isBot} />
              </p>
            );
          default:
            return (
              <p
                key={i}
                className={`${i === 0 ? "mt-0" : "mt-2"} whitespace-pre-wrap break-words`}
              >
                <FormattedText text={tx(b.text)} done={cursorDone} isBot={isBot} />
              </p>
            );
        }
      })}
    </>
  );
}
