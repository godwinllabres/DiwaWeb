// "Check this answer" source citations. Extracted from ChatMessage.tsx, where
// the list rendered permanently expanded under every cited answer.
//
// Collapsed to a count chip by default: the citations are a trust affordance,
// not part of the answer, and the always-open list spent three lines of a
// phone screen per cited reply before the conversation could continue. This is
// a disclosure, not a dialog — a plain button toggling a plain list, so there
// is no focus trap, no Escape handler, and no open/close animation (nothing to
// gate behind prefers-reduced-motion). Focus stays on the chip across a
// toggle; the expanded rows are ordinary DOM for the reader to tab into.
import { useId, useState } from "react";

import { ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";

import type { SourceCitation } from "@/lib/types";

/**
 * Host shown as plain text under a row — `URL.host`, NOT `URL.hostname`.
 * hostname drops the port, and a dropped port is exactly the bug the proxy
 * layer fixed for these links ("stop citation links losing their port",
 * deploy/nginx.conf: `$host` vs `$http_host`). A stack published on :8090
 * must say "localhost:8090", or the row names an origin the link won't open.
 * The href itself is always `s.url` verbatim for the same reason — never
 * rebuilt from parsed parts.
 */
function citationHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    // Relative or malformed — show no host rather than a wrong one.
    return null;
  }
}

/** "Official" means the link stays on a cvsu.edu.ph host. Checked against
 *  `hostname` (port-independent, unlike the display host above) with a dot
 *  boundary, so "notcvsu.edu.ph" never earns the tag. */
function isOfficialHost(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "cvsu.edu.ph" || hostname.endsWith(".cvsu.edu.ph");
  } catch {
    return false;
  }
}

export function SourcesCard({ sources }: { readonly sources?: SourceCitation[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // An answer with nothing to cite gets no chip at all — "Sources · 0" would
  // be a control that opens an empty list.
  if (!sources?.length) return null;

  // Icon swap, not a rotating transform, matching TableCard's sort chevrons —
  // one fewer animation to think about under prefers-reduced-motion.
  const Chevron = open ? ChevronUp : ChevronDown;

  return (
    <div className="w-full">
      {/* px-3 py-2 around 16px-line text makes the chip ~32px tall, clear of
          the 24x24 floor (WCAG 2.5.8). Styled like the suggestion chips one
          block up so the two read as the same family of tap targets. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-forest-900/10 bg-paper-raised px-3 py-2 text-xs font-medium text-forest-800 transition-colors hover:border-forest-900/15 hover:bg-forest-50 active:bg-forest-100"
      >
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Sources · {sources.length}
        <Chevron className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>
      {/* The aria-controls target exists in both states; only the list inside
          it mounts on demand, so a collapsed card truly renders no rows. */}
      <div id={panelId}>
        {open && (
          <ul className="mt-1.5 flex w-full flex-col gap-0.5 rounded-2xl border border-forest-900/10 bg-paper-raised p-1.5">
            {sources.map((s, i) => {
              // `url` is what makes the citation checkable — a "#page=N" deep
              // link into the published charter PDF, or the site URL. It is
              // null when no PDF is published, and a dead link is worse than
              // plain text, so fall back to the rendered citation string.
              const host = s.url ? citationHost(s.url) : null;
              const official = !!s.url && isOfficialHost(s.url);
              // Only what the citation line does not already say. The charter
              // citation string spells out the section and office in full, so
              // showing both unconditionally printed them twice, one line apart.
              const chips = [s.section, s.office].filter(
                (c): c is string => !!c && !s.citation.includes(c),
              );
              const body = (
                <>
                  <FileText className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className={`block break-words ${s.url ? "underline decoration-forest-900/25 underline-offset-2 group-hover:decoration-forest-900/50" : ""}`}>
                      {s.citation}
                    </span>
                    {host && (
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                        <span className="[overflow-wrap:anywhere]">{host}</span>
                        {official && (
                          // Forest, not gold — gold is reserved for live and
                          // attention states, and this tag is neither.
                          <span className="rounded-full border border-forest-900/10 bg-forest-50 px-1.5 py-px text-[10px] font-medium text-forest-800">
                            Official
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  {s.url && <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />}
                </>
              );
              return (
                <li key={`${s.kind}-${s.locator}-${i}`} className="flex flex-col gap-0.5">
                  {s.url ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open the source document at this page"
                      className="group flex items-start gap-1.5 rounded-xl px-2 py-1.5 text-[12px] leading-[1.5] text-forest-800 transition-colors hover:bg-forest-50 sm:text-[13px]"
                    >
                      {body}
                    </a>
                  ) : (
                    <span className="flex items-start gap-1.5 px-2 py-1.5 text-[12px] leading-[1.5] text-ink-600 sm:text-[13px]">
                      {body}
                    </span>
                  )}
                  {chips.length > 0 && (
                    // The one line that names WHICH section of the charter the
                    // answer came from — keep it readable, not the smallest
                    // text in the app.
                    <span className="px-2 text-[11px] text-ink-700 sm:text-xs">{chips.join(" · ")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
