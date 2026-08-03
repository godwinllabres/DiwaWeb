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

import type { CSSProperties, ReactNode } from "react";

// ── word reveal ───────────────────────────────────────────────────────────────

/**
 * Reading-order counter for the fade-in reveal.
 *
 * Mutable on purpose. React renders synchronously and depth-first, so
 * incrementing as each unit is emitted numbers them in the order they appear
 * on screen — across paragraphs, list items and nested bullets alike, which a
 * per-block index could not do. Created fresh per MessageBody render and never
 * read after it, so nothing outlives the pass.
 */
interface Reveal {
  n: number;
}

/** Marks one animation unit and claims the next index. Inline spans (links,
 *  `code`, bold) fade as a single unit — a URL revealing letter-group by
 *  letter-group would read as a glitch. */
function unit(reveal: Reveal | undefined, cls?: string): {
  className?: string;
  style?: CSSProperties;
} {
  if (!reveal) return cls ? { className: cls } : {};
  return {
    className: cls ? `${cls} sevi-word` : "sevi-word",
    style: { "--i": reveal.n++ } as CSSProperties,
  };
}

/**
 * Split plain text into per-word units, keeping whitespace as bare text nodes.
 *
 * Whitespace stays outside the spans so it is never itself animated, and so
 * the character stream is byte-for-byte what it was — `whitespace-pre-wrap`
 * paragraphs keep their newlines.
 */
function revealWords(text: string, reveal: Reveal, keyBase: number): ReactNode[] {
  return text.split(/(\s+)/).map((part, i) => {
    if (!part) return null;
    if (/^\s+$/.test(part)) return part;
    return (
      <span key={`${keyBase}:${i}`} {...unit(reveal)}>
        {part}
      </span>
    );
  });
}

// ── inline text formatting ────────────────────────────────────────────────────

type SegKind = "text" | "url" | "bold" | "code" | "path" | "mdlink";
interface Seg { id: number; k: SegKind; v: string; href?: string }

// Markdown link is matched first so a bare-URL inside [text](url) doesn't
// get captured by the standalone URL alternative.
const SEG_RE =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(\*\*(.+?)\*\*)|(`([^`]+)`)|(https?:\/\/[^\s<>"]+)|([A-Za-z]:\\[^\s<>"]+)/g;

// A bare URL is matched up to the next whitespace, so it also eats the
// punctuation that ends the sentence AROUND it: "verify at https://cvsu.edu.ph.)"
// linkified "https://cvsu.edu.ph.)" and the browser tried to resolve a host that
// doesn't exist. Only a bare URL has this problem — a [md](link) is delimited by
// its own parens, so the reader's punctuation can never leak in.
//
// Give the tail back to the surrounding prose. Closing brackets are trimmed only
// when they are unmatched, because a URL may legitimately end in one
// (…/wiki/Cavite_(province)); a sentence's "." "," ";" "!" "?" never can.
const TRAILING_PUNCT = ".,;:!?'\"";
const CLOSERS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

function trimUrlTail(url: string): string {
  let end = url.length;
  while (end > 0) {
    const c = url[end - 1];
    if (TRAILING_PUNCT.includes(c)) {
      end--;
      continue;
    }
    const open = CLOSERS[c];
    if (open) {
      const head = url.slice(0, end);
      const opened = head.split(open).length - 1;
      const closed = head.split(c).length - 1;
      if (closed > opened) {
        end--;
        continue;
      }
    }
    break;
  }
  return url.slice(0, end);
}

function parseSegments(text: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  let n = 0;
  let m: RegExpExecArray | null;
  SEG_RE.lastIndex = 0;

  while ((m = SEG_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ id: n++, k: "text", v: text.slice(last, m.index) });
    // How much of the match this segment claims. Only the bare-URL branch gives
    // any of it back (see trimUrlTail); for every other branch m[0] is consumed
    // whole and this stays put.
    let consumed = m[0].length;

    if (m[1])      out.push({ id: n++, k: "mdlink", v: m[1], href: m[2] });
    else if (m[3]) out.push({ id: n++, k: "bold", v: m[4] });
    else if (m[5]) out.push({ id: n++, k: "code", v: m[6] });
    else if (m[7]) {
      // m[0] === m[7] here: this alternative IS the whole match.
      const url = trimUrlTail(m[7]);
      out.push({ id: n++, k: "url", v: url });
      consumed = url.length;
    }
    else if (m[8]) out.push({ id: n++, k: "path", v: m[8] });

    last = m.index + consumed;
    // Rewind the scanner to match, so anything handed back is re-examined rather
    // than silently skipped. Always > m.index (a URL keeps its scheme at
    // minimum), so the loop still advances.
    SEG_RE.lastIndex = last;
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
  isBot,
  reveal,
}: {
  readonly text: string;
  readonly isBot: boolean;
  readonly reveal?: Reveal;
}) {
  const segs = parseSegments(text);
  const linkCls = isBot
    ? "underline underline-offset-2 decoration-forest-600/40 text-forest-700 font-medium break-all hover:decoration-forest-700 hover:text-forest-900"
    : "underline underline-offset-2 text-white/90 font-medium break-all";
  // Markdown links carry human-readable labels, so wrap at word
  // boundaries instead of mid-character like raw-URL links do.
  const mdLinkCls = isBot
    ? "underline underline-offset-2 decoration-forest-600/40 text-forest-700 font-medium hover:decoration-forest-700 hover:text-forest-900"
    : "underline underline-offset-2 text-white/90 font-medium";
  const codeCls = isBot
    ? "bg-paper-deep text-ink-800 rounded px-1.5 py-0.5 text-[0.82em] font-mono"
    : "bg-white/20 text-white rounded px-1.5 py-0.5 text-[0.82em] font-mono";
  const pathCls = isBot
    ? "bg-paper-deep text-ink-700 rounded px-1.5 py-0.5 text-[0.82em] font-mono"
    : "bg-white/20 text-white/90 rounded px-1.5 py-0.5 text-[0.82em] font-mono";

  return (
    <>
      {segs.map((seg) => {
        switch (seg.k) {
          case "url":
            return (
              <a key={seg.id} href={seg.v} target="_blank" rel="noopener noreferrer" {...unit(reveal, linkCls)}>
                {seg.v}
              </a>
            );
          case "mdlink":
            return (
              <a key={seg.id} href={seg.href} target="_blank" rel="noopener noreferrer" {...unit(reveal, mdLinkCls)}>
                {seg.v}
              </a>
            );
          case "bold":
            return <strong key={seg.id} {...unit(reveal, "font-semibold")}>{seg.v}</strong>;
          case "code":
            return <code key={seg.id} {...unit(reveal, codeCls)}>{seg.v}</code>;
          case "path":
            return <span key={seg.id} {...unit(reveal, pathCls)}>{seg.v}</span>;
          default:
            // Plain prose is the only kind that splits — everything above is a
            // single atom.
            return reveal ? (
              <span key={seg.id}>{revealWords(seg.v, reveal, seg.id)}</span>
            ) : (
              <span key={seg.id}>{seg.v}</span>
            );
        }
      })}
    </>
  );
}

// ── block-level rendering ─────────────────────────────────────────────────────
// Splits a response into paragraphs, numbered lists, bulleted lists, and
// short ALL-CAPS headings so the bubble doesn't read like a wall of text.
// Inline content (URLs, bold, code) is still handled by FormattedText.

interface OlItem { text: string; subs: string[] }
type Block =
  | { kind: "heading"; text: string }
  | { kind: "ol"; items: OlItem[]; start: number }
  | { kind: "ul"; items: string[] }
  | { kind: "p"; text: string };

const OL_LINE_RE = /^\s*(\d+)\.\s+(.*)$/;
const UL_LINE_RE = /^\s*[-*•]\s+(.*)$/;
const HEADING_RE = /^[A-Z0-9][A-Z0-9 ,()\/&'’.-]{2,}:?$/;

export function parseBlocks(raw: string): Block[] {
  const lines = raw.split("\n");
  const blocks: Block[] = [];
  let paraBuf: string[] = [];
  let listBuf: Extract<Block, { kind: "ol" }> | Extract<Block, { kind: "ul" }> | null = null;

  const flushPara = () => {
    if (!paraBuf.length) return;
    const text = paraBuf.join("\n").trim();
    paraBuf = [];
    if (!text) return;
    // Treat a single short ALL-CAPS line as a heading.
    if (!text.includes("\n") && text.length < 80 && HEADING_RE.test(text.replace(/:$/, ""))) {
      blocks.push({ kind: "heading", text });
    } else {
      blocks.push({ kind: "p", text });
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
      if (listBuf?.kind !== "ol") { flushList(); listBuf = { kind: "ol", items: [], start: n }; }
      listBuf.items.push({ text: ol[2], subs: [] });
    } else if (ul) {
      flushPara();
      if (listBuf?.kind === "ol" && listBuf.items.length > 0) {
        // A bullet directly under a numbered step nests inside it, instead of
        // detaching into its own flush-left list.
        listBuf.items[listBuf.items.length - 1].subs.push(ul[1]);
      } else {
        if (listBuf?.kind !== "ul") { flushList(); listBuf = { kind: "ul", items: [] }; }
        listBuf.items.push(ul[1]);
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
  isBot,
  reveal = false,
}: {
  readonly text: string;
  readonly isBot: boolean;
  /**
   * Wrap each word so the CSS reveal can stagger it. Off for user messages,
   * restored transcripts, and reduced motion.
   *
   * The matching `.sevi-reveal` class and `--sevi-stagger` value go on the
   * bubble in ChatMessage rather than a wrapper here: a `<span>` cannot
   * legally contain the `<p>`/`<ol>`/`<ul>` this renders, and the bubble is an
   * element that already exists.
   */
  readonly reveal?: boolean;
}) {
  const blocks = parseBlocks(text);
  // Bot answers carry the ALL-CAPS pseudo-formatting from the knowledge base;
  // calm it. User messages are shown verbatim.
  const tx = isBot ? deshout : (s: string) => s;
  const counter: Reveal | undefined = reveal ? { n: 0 } : undefined;
  const body = (
    <>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "heading":
            return (
              <p
                key={i}
                className={`flex items-start gap-2 font-semibold tracking-tight ${isBot ? "text-forest-900" : ""} ${i === 0 ? "mt-0" : "mt-4"} mb-1.5`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-[0.45em] inline-block h-3.5 w-[3px] flex-shrink-0 rounded-full ${isBot ? "bg-forest-600" : "bg-white/60"}`}
                />
                <span className="min-w-0">
                  <FormattedText text={tx(b.text.replace(/:$/, ""))} isBot={isBot} reveal={counter} />
                </span>
              </p>
            );
          case "ol":
            return (
              <ol key={i} className="my-2.5 space-y-2 list-none pl-0">
                {b.items.map((it, j) => {
                  const hasSubs = it.subs.length > 0;
                  return (
                    <li key={j} className="relative pl-7">
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                          isBot ? "bg-forest-50 text-forest-800 ring-1 ring-inset ring-forest-900/[0.06]" : "bg-white/25 text-white"
                        }`}
                      >
                        {b.start + j}
                      </span>
                      <FormattedText text={tx(it.text)} isBot={isBot} reveal={counter} />
                      {hasSubs && (
                        <ul className="mt-1 space-y-1 list-none pl-1">
                          {it.subs.map((s, k) => (
                            <li key={k} className="relative pl-4">
                              <span
                                aria-hidden="true"
                                className={`absolute left-1 top-[0.65em] h-1.5 w-1.5 rounded-full ${
                                  isBot ? "bg-forest-500" : "bg-white/70"
                                }`}
                              />
                              <FormattedText text={tx(s)} isBot={isBot} reveal={counter} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ol>
            );
          case "ul":
            return (
              <ul key={i} className="my-2.5 space-y-1.5 list-none pl-1">
                {b.items.map((it, j) => (
                  <li key={j} className="relative pl-4">
                    <span
                      aria-hidden="true"
                      className={`absolute left-1 top-[0.65em] h-1.5 w-1.5 rounded-full ${
                        isBot ? "bg-forest-500" : "bg-white/70"
                      }`}
                    />
                    <FormattedText text={tx(it)} isBot={isBot} reveal={counter} />
                  </li>
                ))}
              </ul>
            );
          default:
            return (
              <p
                key={i}
                className={`${i === 0 ? "mt-0" : "mt-3"} whitespace-pre-wrap break-words`}
              >
                <FormattedText text={tx(b.text)} isBot={isBot} reveal={counter} />
              </p>
            );
        }
      })}
    </>
  );

  return body;
}
